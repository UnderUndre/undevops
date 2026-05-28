import { db, eq, and } from "@undevops/server/db";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { createLogger } from "./lib/logger.js";
import { McpError, ERROR_CODES } from "./tools/shared.js";

const logger = createLogger("undevops:mcp:concurrency");

const ACTIVE_STATUSES = ["pending", "approved"] as const;

export async function checkNoPendingAction(targetId: string, actionType?: string): Promise<void> {
	const conditions = [
		eq(pendingAgentActions.targetId, targetId),
	];

	const rows = await db
		.select({ actionId: pendingAgentActions.actionId, status: pendingAgentActions.status, actionType: pendingAgentActions.actionType })
		.from(pendingAgentActions)
		.where(and(...conditions))
		.limit(10);

	const conflicting = rows.filter(
		(r) => ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])
			&& (!actionType || r.actionType === actionType),
	);

	if (conflicting.length > 0) {
		logger.warn({ targetId, actionType, conflicting: conflicting.length }, "concurrency conflict detected");
		throw new McpError(ERROR_CODES.CONFLICT, `Another action is already pending for target '${targetId}'`, {
			existingActionId: conflicting[0].actionId,
			existingStatus: conflicting[0].status,
		});
	}
}
