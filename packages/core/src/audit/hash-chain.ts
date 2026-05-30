import { db, eq, desc, sql } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db/schema";
import { computeRowHash } from "./tamper-evidence.js";

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
	const rowHash = computeRowHash(data, previousHash);

	await db
		.update(auditLog)
		.set({ row_hash: rowHash, previous_hash: previousHash })
		.where(eq(auditLog.id, rowId));
}
