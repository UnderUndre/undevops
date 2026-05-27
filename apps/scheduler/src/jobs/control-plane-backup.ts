import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
	S3Client,
	PutObjectCommand,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { encryptBuffer } from "@undevops/core/secrets/backup-encryption";
import { logger } from "../logger.js";

const execFileAsync = promisify(execFile);

export interface BackupConfig {
	s3Endpoint: string;
	s3Bucket: string;
	s3AccessKeyId: string;
	s3SecretAccessKey: string;
	s3Region: string;
	s3PathPrefix: string;
	databaseUrl: string;
}

export interface BackupResult {
	s3Key: string;
	sizeBytes: number;
	timestamp: string;
	status: "success" | "failed";
	error?: string;
}

async function getS3Client(config: BackupConfig): Promise<S3Client> {
	const clientConfig: S3ClientConfig = {
		region: config.s3Region,
		credentials: {
			accessKeyId: config.s3AccessKeyId,
			secretAccessKey: config.s3SecretAccessKey,
		},
	};
	if (config.s3Endpoint) {
		clientConfig.endpoint = config.s3Endpoint;
		clientConfig.forcePathStyle = !!config.s3Endpoint;
	}
	return new S3Client(clientConfig);
}

async function runPgDump(databaseUrl: string): Promise<Buffer> {
	const { stdout } = await execFileAsync(
		"pg_dump",
		["--single-transaction", "--format=custom", "--dbname", databaseUrl],
		{
			maxBuffer: 1024 * 1024 * 1024,
			encoding: "buffer",
		},
	);
	return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}

export async function runControlPlaneBackup(
	config: BackupConfig,
): Promise<BackupResult> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const s3Key = `${config.s3PathPrefix}control-plane-${timestamp}.enc`;

	try {
		logger.info({ s3Key }, "Starting control-plane backup");

		const rawDump = await runPgDump(config.databaseUrl);
		logger.info(
			{ sizeBytes: rawDump.length },
			"pg_dump completed, encrypting",
		);

		const { encrypted, iv, tag } = await encryptBuffer(rawDump);

		const ivTagHeader = Buffer.concat([
			Buffer.from(iv, "base64"),
			Buffer.from(tag, "base64"),
		]);
		const payload = Buffer.concat([ivTagHeader, encrypted]);

		const s3 = await getS3Client(config);
		await s3.send(
			new PutObjectCommand({
				Bucket: config.s3Bucket,
				Key: s3Key,
				Body: payload,
				Metadata: {
					"encryption-iv": iv,
					"encryption-tag": tag,
					"backup-timestamp": timestamp,
				},
			}),
		);

		logger.info(
			{ s3Key, sizeBytes: payload.length },
			"Control-plane backup uploaded",
		);

		return {
			s3Key,
			sizeBytes: payload.length,
			timestamp,
			status: "success",
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown backup error";
		logger.error(
			{ err: error, s3Key },
			"Control-plane backup failed",
		);
		return {
			s3Key,
			sizeBytes: 0,
			timestamp,
			status: "failed",
			error: message,
		};
	}
}
