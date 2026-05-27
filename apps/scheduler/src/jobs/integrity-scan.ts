import { db, desc } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db/schema";
import {
	verifyChain,
	generateIntegrityAlert,
	type AuditLogRow,
	type IntegrityAlert,
} from "@undevops/core/audit/tamper-evidence";
import { logger } from "../logger.js";

export interface IntegrityScanResult {
	valid: boolean;
	totalRows: number;
	breakAt?: number;
	alert?: IntegrityAlert;
}

type NotificationHook = (alert: IntegrityAlert) => Promise<void>;

let notificationHook: NotificationHook | null = null;

export function setIntegrityNotificationHook(
	hook: NotificationHook,
): void {
	notificationHook = hook;
}

export async function runIntegrityScan(): Promise<IntegrityScanResult> {
	logger.info("Starting audit log integrity scan");

	try {
		const rows = await db
			.select()
			.from(auditLog)
			.orderBy(desc(auditLog.createdAt));

		const auditRows: AuditLogRow[] = rows.map((row) => ({
			id: row.id,
			organizationId: row.organizationId,
			userId: row.userId,
			userEmail: row.userEmail,
			userRole: row.userRole,
			action: row.action,
			resourceType: row.resourceType,
			resourceId: row.resourceId,
			resourceName: row.resourceName,
			metadata: row.metadata,
			createdAt: row.createdAt,
			actor_type: row.actor_type,
			actor_id: row.actor_id,
			payload: row.payload,
			row_hash: row.row_hash ?? null,
			previous_hash: row.previous_hash ?? null,
		}));

		const result = verifyChain(auditRows);

		if (!result.valid) {
			const breakRow = auditRows[result.breakAt!];
			const alert = generateIntegrityAlert(
				result.breakAt!,
				"",
				breakRow.row_hash ?? "null",
			);

			logger.fatal(
				{
					breakAt: result.breakAt,
					rowId: breakRow.id,
					foundHash: breakRow.row_hash,
				},
				"AUDIT LOG INTEGRITY VIOLATION DETECTED",
			);

			if (notificationHook) {
				await notificationHook(alert).catch((err) => {
					logger.error(
						{ err },
						"Failed to send integrity alert notification",
					);
				});
			}

			return {
				valid: false,
				totalRows: auditRows.length,
				breakAt: result.breakAt,
				alert,
			};
		}

		logger.info(
			{ totalRows: auditRows.length },
			"Integrity scan passed",
		);

		return {
			valid: true,
			totalRows: auditRows.length,
		};
	} catch (error) {
		logger.error(
			{ err: error },
			"Integrity scan failed with error",
		);
		return {
			valid: false,
			totalRows: 0,
		};
	}
}
