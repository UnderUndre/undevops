import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createGzip } from "node:zlib";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import {
	db,
	deployments,
	eq,
	isNull,
} from "@undevops/server/db";
import { getS3Credentials } from "@undevops/server";
import { logger } from "../logger.js";

export interface RotationResult {
	rotatedCount: number;
	errors: Array<{ logPath: string; error: string }>;
}

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

async function gzipFile(inputPath: string, outputPath: string): Promise<void> {
	await mkdir(join(outputPath, ".."), { recursive: true });
	const source = createReadStream(inputPath);
	const dest = createWriteStream(outputPath);
	const gzip = createGzip();
	await pipeline(source, gzip, dest);
}

async function uploadToS3(localGzPath: string, s3Key: string, destination: any): Promise<void> {
	const { execFile } = await import("node:child_process");
	const { promisify } = await import("node:util");
	const execAsync = promisify(execFile);
	const rcloneFlags = getS3Credentials(destination).map(flag => flag.replace(/="([^"]*)"$/, '=$1'));
	const rcloneDest = `:s3:${destination.bucket}/${s3Key}`;
	await execAsync("rclone", ["copyto", ...rcloneFlags, localGzPath, rcloneDest]);
}

export async function rotateDeploymentLogs(): Promise<RotationResult> {
	const result: RotationResult = { rotatedCount: 0, errors: [] };

	const destinationsList = await db.query.destinations.findMany({ limit: 1 });
	if (destinationsList.length === 0) {
		logger.info("No S3 destination configured, skipping log rotation");
		return result;
	}
	const destination = destinationsList[0];

	const staleDeployments = await db
		.select({
			deploymentId: deployments.deploymentId,
			logPath: deployments.logPath,
			logUri: deployments.logUri,
			finishedAt: deployments.finishedAt,
			status: deployments.status,
		})
		.from(deployments)
		.where(isNull(deployments.logUri))
		.limit(500);

	for (const deployment of staleDeployments) {
		const { logPath, deploymentId, finishedAt, status } = deployment;

		if (!logPath || !existsSync(logPath)) {
			continue;
		}

		if (status === "running") {
			continue;
		}

		const finishedTime = finishedAt ? new Date(finishedAt).getTime() : 0;
		if (finishedTime > 0 && finishedTime > Date.now() - GRACE_PERIOD_MS) {
			continue;
		}

		try {
			const fileStat = statSync(logPath);
			if (Date.now() - fileStat.mtimeMs < GRACE_PERIOD_MS) {
				continue;
			}

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const gzPath = `${logPath}.gz`;
			const s3Key = `logs/${deploymentId}/${timestamp}.log.gz`;

			await gzipFile(logPath, gzPath);
			await uploadToS3(gzPath, s3Key, destination);

			const s3Uri = `s3://${destination.bucket}/${s3Key}`;
			await db
				.update(deployments)
				.set({ logUri: s3Uri })
				.where(eq(deployments.deploymentId, deploymentId));

			unlinkSync(logPath);

			try {
				unlinkSync(gzPath);
			} catch {}

			result.rotatedCount++;
			logger.info({ deploymentId, s3Uri }, "Rotated deployment log to S3");
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			result.errors.push({ logPath, error: msg });
			logger.error({ error, deploymentId, logPath }, "Failed to rotate deployment log");
		}
	}

	logger.info(
		{ rotatedCount: result.rotatedCount, errorCount: result.errors.length },
		"Log rotation completed",
	);

	return result;
}
