import { db, asc, eq, lte, and, or, gt } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db";
import { logger } from "../logger.js";
import { computeRowHash } from "@undevops/core";

export interface IntegrityScanResult {
	valid: boolean;
	totalRows: number;
	breakAt?: number;
}

export async function runIntegrityScan(): Promise<IntegrityScanResult> {
	logger.info("Starting audit log integrity scan");

	try {
		const maxDate = new Date();
		let lastCreatedAt: Date | null = null;
		let lastId: string | null = null;
		let totalRows = 0;
		let previousHash: string | null = null;
		const batchSize = 1000;

		while (true) {
			const conditions = [lte(auditLog.createdAt, maxDate)];
			if (lastCreatedAt !== null && lastId !== null) {
				conditions.push(
					or(
						gt(auditLog.createdAt, lastCreatedAt),
						and(
							eq(auditLog.createdAt, lastCreatedAt),
							gt(auditLog.id, lastId)
						)
					)!
				);
			}

			const rows = await db
				.select()
				.from(auditLog)
				.where(and(...conditions))
				.orderBy(asc(auditLog.createdAt), asc(auditLog.id))
				.limit(batchSize);

			if (rows.length === 0) {
				break;
			}

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				const storedHash = (row as Record<string, unknown>).row_hash as string | null;

				if (storedHash === null && totalRows + i > 0) {
					logger.fatal({ breakAt: totalRows + i, rowId: row.id }, "AUDIT LOG INTEGRITY VIOLATION: missing hash");
					return { valid: false, totalRows: totalRows + rows.length, breakAt: totalRows + i };
				}

				if (storedHash !== null) {
					const expectedHash = computeRowHash(row, previousHash);
					if (storedHash !== expectedHash) {
						logger.fatal(
							{ breakAt: totalRows + i, rowId: row.id, expectedHash, storedHash },
							"AUDIT LOG INTEGRITY VIOLATION DETECTED",
						);
						return { valid: false, totalRows: totalRows + rows.length, breakAt: totalRows + i };
					}
					previousHash = storedHash;
				}
			}

			const lastRow = rows[rows.length - 1];
			lastCreatedAt = lastRow.createdAt;
			lastId = lastRow.id;
			totalRows += rows.length;

			if (rows.length < batchSize) {
				break;
			}
		}

		logger.info({ totalRows }, "Integrity scan passed");
		return { valid: true, totalRows };
	} catch (error) {
		logger.error({ err: error }, "Integrity scan failed with error");
		return { valid: false, totalRows: 0 };
	}
}
