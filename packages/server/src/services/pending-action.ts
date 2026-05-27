import { db, eq, and, lt, desc } from "@undevops/server/db";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { TRPCError } from "@trpc/server";

export async function listPendingActions(organizationId: string) {
	return db
		.select()
		.from(pendingAgentActions)
		.where(
			and(
				eq(pendingAgentActions.organizationId, organizationId),
				eq(pendingAgentActions.status, "pending"),
			),
		)
		.orderBy(desc(pendingAgentActions.createdAt));
}

export async function getPendingAction(actionId: string, organizationId: string) {
	const rows = await db
		.select()
		.from(pendingAgentActions)
		.where(
			and(
				eq(pendingAgentActions.actionId, actionId),
				eq(pendingAgentActions.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!rows[0]) {
		throw new TRPCError({ code: "NOT_FOUND", message: `Pending action '${actionId}' not found` });
	}

	return rows[0];
}

export async function approvePendingAction(actionId: string, organizationId: string, resolvedBy: string, note?: string) {
	const action = await getPendingAction(actionId, organizationId);

	if (action.status !== "pending") {
		throw new TRPCError({ code: "BAD_REQUEST", message: `Action is '${action.status}', expected 'pending'` });
	}

	await db
		.update(pendingAgentActions)
		.set({
			status: "approved",
			resolvedBy,
			resolvedAt: new Date().toISOString(),
			resolutionNote: note ?? "Approved via web UI",
		})
		.where(eq(pendingAgentActions.actionId, actionId));

	return { actionId, status: "approved" as const };
}

export async function rejectPendingAction(actionId: string, organizationId: string, resolvedBy: string, note?: string) {
	const action = await getPendingAction(actionId, organizationId);

	if (action.status !== "pending") {
		throw new TRPCError({ code: "BAD_REQUEST", message: `Action is '${action.status}', expected 'pending'` });
	}

	await db
		.update(pendingAgentActions)
		.set({
			status: "rejected",
			resolvedBy,
			resolvedAt: new Date().toISOString(),
			resolutionNote: note ?? "Rejected via web UI",
		})
		.where(eq(pendingAgentActions.actionId, actionId));

	return { actionId, status: "rejected" as const };
}

export async function expireStaleActions() {
	const now = new Date().toISOString();

	const expired = await db
		.update(pendingAgentActions)
		.set({ status: "expired" })
		.where(
			and(
				eq(pendingAgentActions.status, "pending"),
				lt(pendingAgentActions.expiresAt, now),
			),
		)
		.returning({ actionId: pendingAgentActions.actionId });

	return expired;
}
