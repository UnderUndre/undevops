import { z } from "zod";
import { db, eq, desc } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema/deployment";
import { type ToolContext, McpError, ERROR_CODES, createToolWrapper } from "./shared.js";
import { resolveApplicationForProject } from "./deploy.js";
import { readDeploymentLogs } from "../resources/logs.js";

const inspectInputSchema = {
	deploymentId: z.string().min(1),
	includeLogs: z.boolean().default(false).optional(),
	includeHealthHistory: z.boolean().default(false).optional(),
};

async function handleInspect(input: Record<string, unknown>, _ctx: ToolContext): Promise<Record<string, unknown>> {
	const deploymentId = input.deploymentId as string;

	const deployRows = await db.select().from(deployments).where(eq(deployments.deploymentId, deploymentId)).limit(1);
	const deployment = deployRows[0];

	if (!deployment) {
		throw new McpError(ERROR_CODES.NOT_FOUND, `Deployment '${deploymentId}' not found`);
	}

	const result: Record<string, unknown> = {
		deployment: {
			id: deployment.deploymentId,
			projectId: deployment.applicationId,
			status: deployment.status,
			initiatingActorType: deployment.initiatingActorType,
			initiatingActorId: deployment.initiatingActorId,
			description: deployment.description,
			createdAt: deployment.createdAt,
			finishedAt: deployment.finishedAt,
			errorMessage: deployment.errorMessage,
		},
		health: {
			status: deployment.status === "done" ? "healthy" : deployment.status === "error" ? "unhealthy" : "unknown",
		},
	};

	if (input.includeLogs && deployment.logPath) {
		const logs = await readDeploymentLogs({
			deploymentId: deployment.deploymentId,
			logPath: deployment.logPath,
			tail: 20,
		});
		result.recentLogs = logs.lines;
	}

	return result;
}

const getLogsInputSchema = {
	projectId: z.string().min(1),
	deploymentId: z.string().optional(),
	lines: z.number().int().min(1).max(1000).default(100).optional(),
	level: z.enum(["error", "warn", "info", "debug"]).optional(),
	search: z.string().optional(),
	since: z.string().optional(),
	follow: z.boolean().default(false).optional(),
};

async function handleGetLogs(input: Record<string, unknown>, _ctx: ToolContext): Promise<Record<string, unknown>> {
	const projectId = input.projectId as string;
	let deploymentId = input.deploymentId as string | undefined;
	const lines = (input.lines as number) ?? 100;

	if (!deploymentId) {
		const app = await resolveApplicationForProject(projectId);

		const latestDeploys = await db
			.select({ deploymentId: deployments.deploymentId, logPath: deployments.logPath })
			.from(deployments)
			.where(eq(deployments.applicationId, app.applicationId))
			.orderBy(desc(deployments.createdAt))
			.limit(1);

		if (latestDeploys.length === 0) {
			throw new McpError(ERROR_CODES.NOT_FOUND, `No deployments found for project '${projectId}'`);
		}

		deploymentId = latestDeploys[0].deploymentId;
	}

	const deployRows = await db
		.select()
		.from(deployments)
		.where(eq(deployments.deploymentId, deploymentId))
		.limit(1);

	const deployment = deployRows[0];
	if (!deployment) {
		throw new McpError(ERROR_CODES.NOT_FOUND, `Deployment '${deploymentId}' not found`);
	}

	if (!deployment.logPath) {
		return {
			deploymentId,
			lines: [],
			totalMatched: 0,
			returnedCount: 0,
		};
	}

	const logs = await readDeploymentLogs({
		deploymentId: deployment.deploymentId,
		logPath: deployment.logPath,
		tail: lines,
		level: input.level as string | undefined,
		search: input.search as string | undefined,
		since: input.since as string | undefined,
	});

	return {
		deploymentId,
		lines: logs.lines,
		totalMatched: logs.filtered,
		returnedCount: logs.lines.length,
	};
}

export const inspectTool = {
	name: "undevops_inspect_deployment",
	description: "Get comprehensive deployment status including health, resource usage, and container details.",
	requiredScope: "read" as const,
	inputSchema: inspectInputSchema,
	handler: handleInspect,
};

export const getLogsTool = {
	name: "undevops_get_logs",
	description: "Retrieve structured application logs. Alternative to the resource URI for tool-oriented workflows.",
	requiredScope: "read" as const,
	inputSchema: getLogsInputSchema,
	handler: handleGetLogs,
};

export const registerInspect = createToolWrapper(inspectTool);
export const registerGetLogs = createToolWrapper(getLogsTool);
