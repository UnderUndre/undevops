import { desc, sql, db } from "@undevops/server/db";
import { backups } from "@undevops/server/db/schema/backups";
import { destinations } from "@undevops/server/db/schema/destination";
import { deployments } from "@undevops/server/db/schema/deployment";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:backup-status");

interface BackupStatus {
	lastSuccessAt: string | null;
	lastAttemptAt: string | null;
	lastError: string | null;
	totalBackups: number;
	nextScheduledAt: string | null;
	s3Configured: boolean;
}

export async function getBackupStatus(): Promise<BackupStatus> {
	const start = performance.now();

	const [totalResult, s3Result, lastDeployments] = await Promise.all([
		db.select({ count: sql<number>`count(*)::int` }).from(backups),
		db.select({ destinationId: destinations.destinationId }).from(destinations).limit(1),
		db
			.select({
				status: deployments.status,
				title: deployments.title,
				description: deployments.description,
				createdAt: deployments.createdAt,
			})
			.from(deployments)
			.where(sql`${deployments.backupId} IS NOT NULL`)
			.orderBy(desc(deployments.createdAt))
			.limit(1),
	]);

	const total = totalResult[0]?.count ?? 0;
	const s3Configured = s3Result.length > 0;

	let lastSuccessAt: string | null = null;
	let lastAttemptAt: string | null = null;
	let lastError: string | null = null;

	const lastDeployment = lastDeployments[0];
	if (lastDeployment) {
		lastAttemptAt = lastDeployment.createdAt;
		if (lastDeployment.status === "done") {
			lastSuccessAt = lastDeployment.createdAt;
		} else if (lastDeployment.status === "error") {
			lastError = lastDeployment.description ?? lastDeployment.title ?? null;
		}
	}

	const result = redactJson({
		lastSuccessAt,
		lastAttemptAt,
		lastError,
		totalBackups: total,
		nextScheduledAt: null,
		s3Configured,
	});

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), totalBackups: total, s3Configured }, "getBackupStatus");

	return result as BackupStatus;
}
