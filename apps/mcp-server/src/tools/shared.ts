import { z } from "zod";
import { requireScope, type McpScope } from "../auth/bearer-token.js";
import { recordAudit } from "../middleware/audit.js";
import { checkRateLimit } from "../middleware/rate-limit.js";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:tools");

export interface ToolContext {
	clientId: string;
	scope: McpScope;
	organizationId: string;
	targetId: string | null;
	targetType: string | null;
}

export interface ToolDefinition {
	name: string;
	description: string;
	requiredScope: McpScope;
	inputSchema: Record<string, z.ZodTypeAny>;
	handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>;
}

export class McpError extends Error {
	constructor(
		public readonly code: number,
		message: string,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "McpError";
	}
}

export const ERROR_CODES = {
	AUTH_FAILED: -32001,
	INSUFFICIENT_SCOPE: -32002,
	NOT_FOUND: -32003,
	CONFLICT: -32004,
	VALIDATION: -32005,
	RATE_LIMIT: -32006,
	INTERNAL: -32007,
	UNAVAILABLE: -32008,
	TIMEOUT: -32009,
	BAD_REQUEST: -32010,
} as const;

function scopeToTier(scope: McpScope): "read" | "write" | "exec" {
	if (scope === "admin") return "exec";
	if (scope === "deploy") return "write";
	return "read";
}

export function createToolWrapper(def: ToolDefinition) {
	return async (input: Record<string, unknown>, extra: { _meta?: { authorization?: string } }) => {
		const ctx = (extra as Record<string, unknown>).__toolContext as ToolContext | undefined;
		if (!ctx) {
			throw new McpError(ERROR_CODES.AUTH_FAILED, "Missing tool context");
		}

		const start = performance.now();

		try {
			if (!requireScope(ctx.scope, def.requiredScope)) {
				await recordAudit({
					clientId: ctx.clientId,
					resource: `tool:${def.name}`,
					action: "scope_denied",
					metadata: { requiredScope: def.requiredScope, actualScope: ctx.scope },
				});
				throw new McpError(ERROR_CODES.INSUFFICIENT_SCOPE, `Requires '${def.requiredScope}' scope, got '${ctx.scope}'`);
			}

			const rateLimitResult = await checkRateLimit(ctx.clientId, scopeToTier(def.requiredScope));
			if (!rateLimitResult.allowed) {
				throw new McpError(ERROR_CODES.RATE_LIMIT, "Rate limit exceeded", { suggestion: "Retry after 60 seconds" });
			}

			const result = await def.handler(input, ctx);
			const redacted = redactJson(result);

			const elapsed = performance.now() - start;
			logger.info({ elapsed: Math.round(elapsed), tool: def.name, clientId: ctx.clientId }, "tool executed");

			await recordAudit({
				clientId: ctx.clientId,
				resource: `tool:${def.name}`,
				action: def.name.replace("undevops_", ""),
				resourceId: (input.projectId as string) ?? (input.deploymentId as string),
				metadata: { input: Object.keys(input), elapsed: Math.round(elapsed) },
			});

			return { content: [{ type: "text" as const, text: JSON.stringify(redacted) }] };
		} catch (err: unknown) {
			if (err instanceof McpError) throw err;

			const msg = err instanceof Error ? err.message : String(err);
			logger.error({ err: msg, tool: def.name, clientId: ctx.clientId }, "tool error");
			throw new McpError(ERROR_CODES.INTERNAL, msg);
		}
	};
}
