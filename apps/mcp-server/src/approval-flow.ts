import { db, eq } from "@undevops/server/db";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { deployments } from "@undevops/server/db/schema/deployment";
import { auditLog } from "@undevops/server/db/schema/audit-log";
import { nanoid } from "nanoid";
import { createLogger } from "./lib/logger.js";

const logger = createLogger("undevops:mcp:approval-flow");

export interface ApprovalResult {
	actionId: string;
	status: "executing" | "rejected" | "expired";
	deploymentId?: string;
}

export async function executeApprovedAction(actionId: string): Promise<ApprovalResult> {
	const rows = await db
		.select()
		.from(pendingAgentActions)
		.where(eq(pendingAgentActions.actionId, actionId))
		.limit(1);

	const action = rows[0];
	if (!action) {
		throw new Error(`Action '${actionId}' not found`);
	}

	if (action.status !== "approved") {
		return { actionId, status: action.status as "rejected" | "expired" };
	}

	if (action.deploymentId) {
		await db
			.update(deployments)
			.set({ status: "running", startedAt: new Date().toISOString() })
			.where(eq(deployments.deploymentId, action.deploymentId));
	}

	await db.insert(auditLog).values({
		userEmail: `agent:${action.mcpClientId}`,
		userRole: "agent",
		action: action.actionType,
		resourceType: "deployment",
		resourceId: action.deploymentId ?? action.targetId,
		resourceName: `pending-action-${action.actionType}`,
		actor_type: "agent",
		actor_id: action.mcpClientId,
		payload: {
			actionId: action.actionId,
			actionType: action.actionType,
			targetId: action.targetId,
			deploymentId: action.deploymentId,
		},
	});

	logger.info({ actionId, actionType: action.actionType, deploymentId: action.deploymentId }, "approved action executing");

	return {
		actionId,
		status: "executing",
		deploymentId: action.deploymentId ?? undefined,
	};
}

export async function processRejection(actionId: string, rejectedBy: string, note?: string): Promise<void> {
	const rows = await db
		.select()
		.from(pendingAgentActions)
		.where(eq(pendingAgentActions.actionId, actionId))
		.limit(1);

	const action = rows[0];
	if (!action) return;

	if (action.deploymentId) {
		await db
			.update(deployments)
			.set({ status: "cancelled", finishedAt: new Date().toISOString() })
			.where(eq(deployments.deploymentId, action.deploymentId));
	}

	await db.insert(auditLog).values({
		userEmail: `system`,
		userRole: "system",
		action: "cancel",
		resourceType: "deployment",
		resourceId: action.deploymentId ?? action.targetId,
		resourceName: `pending-action-rejected`,
		actor_type: "human",
		actor_id: rejectedBy,
		payload: {
			actionId: action.actionId,
			rejectionNote: note,
		},
	});

	logger.info({ actionId, rejectedBy, deploymentId: action.deploymentId }, "action rejected, deployment cancelled");
}
