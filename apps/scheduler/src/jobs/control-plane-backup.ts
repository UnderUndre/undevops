import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, statSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { finished } from "node:stream/promises";
import {
	S3Client,
	PutObjectCommand,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { logger } from "../logger.js";

const BACKUP_KEY_LENGTH = 32;
const BACKUP_IV_LENGTH = 12; // Standard 12-byte nonce for GCM
const BACKUP_AUTH_TAG_LENGTH = 16;

function getBackupEncryptionKey(): Buffer {
	const key = process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY;
	if (!key) throw new Error("UNDEVOPS_BACKUP_ENCRYPTION_KEY environment variable is not set");
	return scryptSync(key, "undevops-backup-salt", BACKUP_KEY_LENGTH);
}

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

export async function runControlPlaneBackup(
	config: BackupConfig,
): Promise<BackupResult> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const s3Key = `${config.s3PathPrefix}control-plane-${timestamp}.enc`;

	const tmpDir = await mkdtemp(join(tmpdir(), "undevops-backup-"));
	const encPath = join(tmpDir, "enc.dump");
	const finalPath = join(tmpDir, "final.enc");

	try {
		logger.info({ s3Key }, "Starting control-plane backup streaming");

		const iv = randomBytes(BACKUP_IV_LENGTH);
		const cipher = createCipheriv("aes-256-gcm", getBackupEncryptionKey(), iv, {
			authTagLength: BACKUP_AUTH_TAG_LENGTH,
		});

		const child = spawn("pg_dump", [
			"--single-transaction",
			"--format=custom",
			"--dbname",
			config.databaseUrl,
		]);

		const encStream = createWriteStream(encPath);
		child.stdout.pipe(cipher).pipe(encStream);

		let stderrMsg = "";
		child.stderr.on("data", (chunk) => {
			stderrMsg += chunk.toString();
		});

		const childExitPromise = new Promise<void>((resolve, reject) => {
			child.on("close", (code) => {
				if (code !== 0) {
					reject(new Error(`pg_dump failed with exit code ${code}: ${stderrMsg}`));
				} else {
					resolve();
				}
			});
			child.on("error", (err) => {
				reject(err);
			});
		});

		// Wait for both stdout pipe mapping and exit code checking
		await finished(encStream);
		await childExitPromise;

		const tag = cipher.getAuthTag();

		// Construct final payload in O(1) memory: [IV 12 bytes] + [Encrypted Data] + [Tag 16 bytes]
		const finalStream = createWriteStream(finalPath);
		finalStream.write(iv);

		const readEncStream = createReadStream(encPath);
		for await (const chunk of readEncStream) {
			finalStream.write(chunk);
		}
		finalStream.write(tag);
		finalStream.end();

		await new Promise<void>((resolve, reject) => {
			finalStream.on("finish", () => resolve());
			finalStream.on("error", (err) => reject(err));
		});

		const sizeBytes = statSync(finalPath).size;

		const s3 = await getS3Client(config);
		await s3.send(
			new PutObjectCommand({
				Bucket: config.s3Bucket,
				Key: s3Key,
				Body: createReadStream(finalPath),
				ContentLength: sizeBytes,
				Metadata: {
					"encryption-iv": iv.toString("base64"),
					"encryption-tag": tag.toString("base64"),
					"backup-timestamp": timestamp,
				},
			}),
		);

		logger.info(
			{ s3Key, sizeBytes },
			"Control-plane backup stream uploaded to S3",
		);

		return {
			s3Key,
			sizeBytes,
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
	} finally {
		// Guaranteed cleanup of all secure temp files on exit / crash
		await rm(tmpDir, { recursive: true, force: true }).catch((err) => {
			logger.error({ err: err.message }, "Error cleaning up temporary backup files");
		});
	}
}
