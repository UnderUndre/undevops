import { createHash } from "node:crypto";
import { db, eq, desc, sql } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db/schema";

function computeHash(
	row: {
		id: string;
		organizationId: string | null;
		userId: string | null;
		userEmail: string;
		userRole: string;
		action: string;
		resourceType: string;
		resourceId: string | null;
		resourceName: string | null;
		metadata: string | null;
		createdAt: Date;
		actor_type: string;
		actor_id: string | null;
		payload: Record<string, unknown> | null;
	},
	previousHash: string | null,
): string {
	const payload = `${previousHash ?? ""}:${JSON.stringify(row)}`;
	return createHash("sha256").update(payload).digest("hex");
}

export async function computeAndAttachHash(rowId: string): Promise<void> {
	const [lastRow] = await db
		.select({ row_hash: auditLog.row_hash })
		.from(auditLog)
		.where(sql`${auditLog.row_hash} IS NOT NULL`)
		.orderBy(desc(auditLog.createdAt))
		.limit(1);

	const previousHash = lastRow?.row_hash ?? null;

	const [currentRow] = await db
		.select()
		.from(auditLog)
		.where(eq(auditLog.id, rowId))
		.limit(1);

	if (!currentRow) return;

	const { row_hash, previous_hash, ...data } = currentRow;
	const rowHash = computeHash(data, previousHash);

	await db
		.update(auditLog)
		.set({ row_hash: rowHash, previous_hash: previousHash })
		.where(eq(auditLog.id, rowId));
}
