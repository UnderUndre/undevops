import { db, eq, desc } from "@undevops/server/db";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { deployments } from "@undevops/server/db/schema/deployment";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:action-progress");

export interface ActionProgress {
	actionId: string;
	status: string;
	deploymentStatus: string | null;
	deploymentId: string | null;
	createdAt: string | null;
	resolvedAt: string | null;
}

export async function getActionProgress(actionId: string): Promise<ActionProgress> {
	const rows = await db
		.select({
			actionId: pendingAgentActions.actionId,
			status: pendingAgentActions.status,
			deploymentId: pendingAgentActions.deploymentId,
			createdAt: pendingAgentActions.createdAt,
			resolvedAt: pendingAgentActions.resolvedAt,
		})
		.from(pendingAgentActions)
		.where(eq(pendingAgentActions.actionId, actionId))
		.limit(1);

	const action = rows[0];
	if (!action) {
		throw new Error(`Action '${actionId}' not found`);
	}

	let deploymentStatus: string | null = null;

	if (action.deploymentId) {
		const depRows = await db
			.select({ status: deployments.status })
			.from(deployments)
			.where(eq(deployments.deploymentId, action.deploymentId))
			.limit(1);
		deploymentStatus = depRows[0]?.status ?? null;
	}

	return {
		actionId: action.actionId,
		status: action.status,
		deploymentStatus,
		deploymentId: action.deploymentId,
		createdAt: action.createdAt,
		resolvedAt: action.resolvedAt,
	};
}

export async function pollActionProgress(actionId: string, intervalMs = 2000, timeoutMs = 300_000): Promise<ActionProgress> {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		const progress = await getActionProgress(actionId);

		if (progress.status !== "pending" && progress.status !== "approved") {
			return progress;
		}

		if (progress.deploymentStatus === "done" || progress.deploymentStatus === "error" || progress.deploymentStatus === "cancelled") {
			return progress;
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	logger.warn({ actionId, elapsed: Date.now() - start }, "action progress polling timed out");

	return getActionProgress(actionId);
}
