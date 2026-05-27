import { eq, db } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db/schema/audit-log";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:middleware:audit");

interface AuditContext {
	clientId: string;
	resource: string;
	action: string;
	resourceType?: string;
	resourceId?: string;
	metadata?: Record<string, unknown>;
}

export async function recordAudit(ctx: AuditContext): Promise<void> {
	const start = performance.now();

	try {
		await db.insert(auditLog).values({
			userEmail: `agent:${ctx.clientId}`,
			userRole: "agent",
			action: ctx.action,
			resourceType: ctx.resourceType ?? "mcp_resource",
			resourceId: ctx.resourceId,
			resourceName: ctx.resource,
			actor_type: "agent",
			actor_id: ctx.clientId,
			payload: ctx.metadata ?? { resource: ctx.resource, action: ctx.action },
		});

		const elapsed = performance.now() - start;
		logger.debug({ elapsed: Math.round(elapsed), clientId: ctx.clientId, resource: ctx.resource, action: ctx.action }, "audit recorded");
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error({ err: msg, clientId: ctx.clientId, resource: ctx.resource }, "failed to record audit");
	}
}

export function auditMiddleware(clientId: string, resource: string, action: string) {
	return recordAudit({ clientId, resource, action });
}
