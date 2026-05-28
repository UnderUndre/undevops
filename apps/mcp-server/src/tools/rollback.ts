import { z } from "zod";
import { db, eq, and, desc } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema/deployment";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { nanoid } from "nanoid";
import { type ToolContext, McpError, ERROR_CODES, createToolWrapper } from "./shared.js";
import { resolveApplicationForProject } from "./deploy.js";

const rollbackInputSchema = {
	projectId: z.string().min(1),
	targetDeploymentId: z.string().optional(),
	reason: z.string().max(512).optional(),
};

async function handleRollback(input: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
	const projectId = input.projectId as string;

	if (ctx.targetId && ctx.targetId !== projectId) {
		throw new McpError(ERROR_CODES.INSUFFICIENT_SCOPE, `Token scoped to '${ctx.targetId}', cannot rollback '${projectId}'`);
	}

	const app = await resolveApplicationForProject(projectId);

	let targetDeploymentId = input.targetDeploymentId as string | undefined;

	if (!targetDeploymentId) {
		const previousDeploys = await db
			.select({ deploymentId: deployments.deploymentId })
			.from(deployments)
			.where(and(eq(deployments.applicationId, app.applicationId), eq(deployments.status, "done")))
			.orderBy(desc(deployments.createdAt))
			.limit(2);

		if (previousDeploys.length < 2) {
			throw new McpError(ERROR_CODES.NOT_FOUND, `No previous successful deployment to rollback to for project '${projectId}'`);
		}

		targetDeploymentId = previousDeploys[1].deploymentId;
	}

	const targetDeploy = await db
		.select({ deploymentId: deployments.deploymentId })
		.from(deployments)
		.where(eq(deployments.deploymentId, targetDeploymentId))
		.limit(1);

	if (!targetDeploy[0]) {
		throw new McpError(ERROR_CODES.NOT_FOUND, `Target deployment '${targetDeploymentId}' not found`);
	}

	const currentDeploys = await db
		.select({ deploymentId: deployments.deploymentId })
		.from(deployments)
		.where(and(eq(deployments.applicationId, app.applicationId), eq(deployments.status, "done")))
		.orderBy(desc(deployments.createdAt))
		.limit(1);

	const currentDeploymentId = currentDeploys[0]?.deploymentId ?? null;
	const deploymentId = nanoid();
	const title = `Rollback: ${(input.reason as string) ?? `to ${targetDeploymentId}`}`;

	await db.insert(deployments).values({
		deploymentId,
		applicationId: app.applicationId,
		serverId: app.serverId,
		title,
		description: (input.reason as string) ?? `Rollback to ${targetDeploymentId} by agent ${ctx.clientId}`,
		status: "running",
		logPath: `/tmp/deploy-${deploymentId}.log`,
		initiatingActorType: "agent",
		initiatingActorId: ctx.clientId,
		createdAt: new Date().toISOString(),
	});

	await db.insert(pendingAgentActions).values({
		actionId: nanoid(),
		mcpClientId: ctx.clientId,
		actionType: "redeploy",
		targetId: app.applicationId,
		targetType: "application",
		payload: {
			requestedAt: new Date().toISOString(),
			reason: (input.reason as string) ?? "MCP rollback request",
			changes: [
				{ field: "rollbackFrom", oldValue: currentDeploymentId ?? undefined },
				{ field: "rollbackTo", newValue: targetDeploymentId },
			],
		},
		status: "pending",
		deploymentId,
		organizationId: ctx.organizationId,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
	});

	return {
		deploymentId,
		rolledBackFrom: currentDeploymentId,
		rolledBackTo: targetDeploymentId,
		status: "queued",
	};
}

export const rollbackTool = {
	name: "undevops_rollback",
	description: "Rollback a project to a previous deployment. Creates a new deployment record linked to the target.",
	requiredScope: "deploy" as const,
	inputSchema: rollbackInputSchema,
	handler: handleRollback,
};

export const registerRollback = createToolWrapper(rollbackTool);
