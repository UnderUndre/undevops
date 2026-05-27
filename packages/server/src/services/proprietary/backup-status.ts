import { db, desc, eq } from "@undevops/server/db";
import { controlPlaneBackups } from "@undevops/server/db/schema";

export interface BackupStatus {
	lastSuccessAt: string | null;
	lastAttemptAt: string | null;
	lastError: string | null;
	totalBackups: number;
	nextScheduledAt: string | null;
}

export async function getBackupStatus(): Promise<BackupStatus> {
	const lastRecord = await db
		.select()
		.from(controlPlaneBackups)
		.orderBy(desc(controlPlaneBackups.createdAt))
		.limit(1);

	const lastSuccess = await db
		.select()
		.from(controlPlaneBackups)
		.where(eq(controlPlaneBackups.status, "success"))
		.orderBy(desc(controlPlaneBackups.completedAt))
		.limit(1);

	const totalResult = await db
		.select({ count: controlPlaneBackups.id })
		.from(controlPlaneBackups);

	return {
		lastSuccessAt: lastSuccess[0]?.completedAt?.toISOString() ?? null,
		lastAttemptAt: lastRecord[0]?.createdAt?.toISOString() ?? null,
		lastError:
			lastRecord[0]?.status === "failed" ? lastRecord[0].error : null,
		totalBackups: totalResult.length,
		nextScheduledAt: null,
	};
}
