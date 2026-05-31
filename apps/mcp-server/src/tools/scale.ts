import { z } from "zod";
import { db, eq, and } from "@undevops/server/db";
import { applications } from "@undevops/server/db/schema/application";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { nanoid } from "nanoid";
import { type ToolContext, McpError, ERROR_CODES, createToolWrapper } from "./shared.js";
import { resolveApplicationForProject } from "./deploy.js";

const scaleInputSchema = {
	projectId: z.string().min(1),
	replicas: z.number().int().min(0).max(20),
	serverId: z.string().optional(),
};

async function handleScale(input: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
	const projectId = input.projectId as string;
	const replicas = input.replicas as number;

	if (ctx.targetId && ctx.targetId !== projectId) {
		throw new McpError(ERROR_CODES.INSUFFICIENT_SCOPE, `Token scoped to '${ctx.targetId}', cannot scale '${projectId}'`);
	}

	const app = await resolveApplicationForProject(projectId);
	const previousReplicas = app.replicas ?? 1;

	const existingPending = await db
		.select({ actionId: pendingAgentActions.actionId })
		.from(pendingAgentActions)
		.where(
			and(
				eq(pendingAgentActions.targetId, app.applicationId),
				eq(pendingAgentActions.status, "pending"),
			),
		)
		.limit(1);

	if (existingPending.length > 0) {
		throw new McpError(ERROR_CODES.CONFLICT, `Action already pending for project '${projectId}'`);
	}

	await db.insert(pendingAgentActions).values({
		actionId: nanoid(),
		mcpClientId: ctx.clientId,
		actionType: "scale",
		targetId: app.applicationId,
		targetType: "application",
		payload: {
			requestedAt: new Date().toISOString(),
			reason: `Scale from ${previousReplicas} to ${replicas} replicas`,
			changes: [
				{ field: "replicas", oldValue: String(previousReplicas), newValue: String(replicas) },
			],
		},
		status: "pending",
		organizationId: ctx.organizationId,
		expiresAt: new Date(Date.now() + 60 * 60 * 1000),
	});

	return {
		projectId,
		previousReplicas,
		currentReplicas: previousReplicas,
		status: "scaling",
		containersReady: 0,
		pendingApproval: true,
		message: `Scale to ${replicas} replicas queued, awaiting approval`,
	};
}

export const scaleTool = {
	name: "undevops_scale",
	description: "Adjust the number of running replicas for a project. Requires exec scope and approval.",
	requiredScope: "admin" as const,
	inputSchema: scaleInputSchema,
	handler: handleScale,
};

export const registerScale = createToolWrapper(scaleTool);
