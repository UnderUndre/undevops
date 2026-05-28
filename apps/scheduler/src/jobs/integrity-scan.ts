import { db, desc, eq } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db";
import { createHash } from "node:crypto";
import { logger } from "../logger.js";

export interface IntegrityScanResult {
	valid: boolean;
	totalRows: number;
	breakAt?: number;
}

function computeRowHash(row: Record<string, unknown>, previousHash: string | null): string {
	const data = JSON.stringify({
		id: row.id,
		action: row.action,
		resourceType: row.resourceType,
		resourceId: row.resourceId,
		createdAt: row.createdAt,
		actor_type: row.actor_type,
		actor_id: row.actor_id,
	});
	return createHash("sha256").update(previousHash ?? "").update(data).digest("hex");
}

export async function runIntegrityScan(): Promise<IntegrityScanResult> {
	logger.info("Starting audit log integrity scan");

	try {
		const rows = await db
			.select()
			.from(auditLog)
			.orderBy(desc(auditLog.createdAt));

		if (rows.length === 0) {
			logger.info("No audit log rows to verify");
			return { valid: true, totalRows: 0 };
		}

		let previousHash: string | null = null;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const storedHash = (row as Record<string, unknown>).row_hash as string | null;

			if (storedHash === null && i > 0) {
				logger.fatal({ breakAt: i, rowId: row.id }, "AUDIT LOG INTEGRITY VIOLATION: missing hash");
				return { valid: false, totalRows: rows.length, breakAt: i };
			}

			if (storedHash !== null) {
				const expectedHash = computeRowHash(row, previousHash);
				if (storedHash !== expectedHash) {
					logger.fatal(
						{ breakAt: i, rowId: row.id, expectedHash, storedHash },
						"AUDIT LOG INTEGRITY VIOLATION DETECTED",
					);
					return { valid: false, totalRows: rows.length, breakAt: i };
				}
				previousHash = storedHash;
			}
		}

		logger.info({ totalRows: rows.length }, "Integrity scan passed");
		return { valid: true, totalRows: rows.length };
	} catch (error) {
		logger.error({ err: error }, "Integrity scan failed with error");
		return { valid: false, totalRows: 0 };
	}
}
