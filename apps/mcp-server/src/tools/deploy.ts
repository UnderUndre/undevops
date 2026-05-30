import { z } from "zod";
import { db, eq, and, desc } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema/deployment";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { applications } from "@undevops/server/db/schema/application";
import { environments } from "@undevops/server/db/schema/environment";
import { nanoid } from "nanoid";
import { type ToolContext, McpError, ERROR_CODES, createToolWrapper } from "./shared.js";

async function resolveApplicationForProject(projectId: string) {
	const envRows = await db
		.select({ environmentId: environments.environmentId })
		.from(environments)
		.where(eq(environments.projectId, projectId))
		.limit(1);

	if (envRows.length === 0) {
		throw new McpError(ERROR_CODES.NOT_FOUND, `No environment found for project '${projectId}'`);
	}

	const appRows = await db
		.select()
		.from(applications)
		.where(eq(applications.environmentId, envRows[0].environmentId))
		.limit(1);

	if (appRows.length === 0) {
		throw new McpError(ERROR_CODES.NOT_FOUND, `No application found for project '${projectId}'`);
	}

	return appRows[0];
}

const deployInputSchema = {
	projectId: z.string().min(1),
	branch: z.string().optional(),
	commitHash: z.string().regex(/^[0-9a-f]{7,40}$/).optional(),
	buildType: z.enum(["nixpacks", "railpack", "paketo", "dockerfile", "static"]).optional(),
	envOverrides: z.record(z.string(), z.string()).optional(),
	skipReview: z.boolean().default(false).optional(),
	description: z.string().max(512).optional(),
};

async function handleDeploy(input: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
	const projectId = input.projectId as string;

	if (ctx.targetId && ctx.targetId !== projectId) {
		throw new McpError(ERROR_CODES.INSUFFICIENT_SCOPE, `Token scoped to '${ctx.targetId}', cannot deploy '${projectId}'`);
	}

	const app = await resolveApplicationForProject(projectId);

	const activeDeploys = await db
		.select({ deploymentId: deployments.deploymentId })
		.from(deployments)
		.where(and(eq(deployments.applicationId, app.applicationId), eq(deployments.status, "running")))
		.limit(1);

	if (activeDeploys.length > 0) {
		throw new McpError(ERROR_CODES.CONFLICT, `Deployment already in progress for project '${projectId}'`, {
			existingDeploymentId: activeDeploys[0].deploymentId,
		});
	}

	const deploymentId = nanoid();
	const title = input.description ? `Deploy: ${input.description}` : `MCP deploy by agent ${ctx.clientId}`;

	await db.insert(deployments).values({
		deploymentId,
		applicationId: app.applicationId,
		serverId: app.serverId,
		title,
		description: (input.description as string) ?? null,
		status: "running",
		logPath: `/tmp/deploy-${deploymentId}.log`,
		initiatingActorType: "agent",
		initiatingActorId: ctx.clientId,
		createdAt: new Date().toISOString(),
	});

	let needsApproval = true;
	if (app.environmentId) {
		const envRows = await db
			.select({ autoApproveAgents: environments.autoApproveAgents })
			.from(environments)
			.where(eq(environments.environmentId, app.environmentId))
			.limit(1);
		if (envRows.length > 0 && envRows[0].autoApproveAgents === true) {
			needsApproval = false;
		}
	}

	if (needsApproval) {
		await db.insert(pendingAgentActions).values({
			actionId: nanoid(),
			mcpClientId: ctx.clientId,
			actionType: "deploy",
			targetId: app.applicationId,
			targetType: "application",
			payload: {
				requestedAt: new Date().toISOString(),
				reason: (input.description as string) ?? "MCP deploy request",
				changes: [{ field: "deploymentId", newValue: deploymentId }],
				metadata: { branch: input.branch, commitHash: input.commitHash, buildType: input.buildType },
			},
			status: "pending",
			deploymentId,
			organizationId: ctx.organizationId,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		});

		return {
			deploymentId,
			status: "queued",
			pendingApproval: true,
			message: "Deployment queued, awaiting human approval",
		};
	}

	return {
		deploymentId,
		status: "queued",
		pendingApproval: false,
	};
}

export const deployTool = {
	name: "undevops_deploy",
	description: "Trigger a deployment for a project. Queues a build + deploy pipeline. If the environment requires approval, the deployment will be pending until a human approves.",
	requiredScope: "deploy" as const,
	inputSchema: deployInputSchema,
	handler: handleDeploy,
};

export const registerDeploy = createToolWrapper(deployTool);
export { resolveApplicationForProject };
