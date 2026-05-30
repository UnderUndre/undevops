import { Command } from "commander";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, unlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	S3Client,
	GetObjectCommand,
	ListObjectsV2Command,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { decryptBuffer } from "@undevops/core/secrets";
import { db, desc, eq } from "@undevops/server/db";
import { controlPlaneBackups } from "@undevops/server/db/schema";
import { getFormatter } from "../output/formatter.js";

const execFileAsync = promisify(execFile);

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getS3Client(opts: {
	s3Endpoint?: string;
	s3AccessKeyId?: string;
	s3SecretAccessKey?: string;
	s3Region?: string;
}): S3Client {
	const config: S3ClientConfig = {
		region: opts.s3Region || process.env.AWS_REGION || "us-east-1",
		credentials: {
			accessKeyId:
				opts.s3AccessKeyId ||
				process.env.AWS_ACCESS_KEY_ID ||
				"",
			secretAccessKey:
				opts.s3SecretAccessKey ||
				process.env.AWS_SECRET_ACCESS_KEY ||
				"",
		},
	};
	if (opts.s3Endpoint || process.env.S3_ENDPOINT) {
		config.endpoint = opts.s3Endpoint || process.env.S3_ENDPOINT;
		config.forcePathStyle = true;
	}
	return new S3Client(config);
}

function parseEncryptedPayload(payload: Buffer): {
	iv: string;
	tag: string;
	encrypted: Buffer;
} {
	const ivBuf = payload.subarray(0, IV_LENGTH);
	const tagBuf = payload.subarray(payload.length - AUTH_TAG_LENGTH);
	const encrypted = payload.subarray(IV_LENGTH, payload.length - AUTH_TAG_LENGTH);
	return {
		iv: ivBuf.toString("base64"),
		tag: tagBuf.toString("base64"),
		encrypted,
	};
}

export const backupCommand = new Command("backup").description(
	"Manage control-plane backups",
);

backupCommand
	.command("restore <s3Key>")
	.description("Restore control-plane from a backup in S3")
	.option(
		"--db-url <url>",
		"Target PostgreSQL connection string",
		process.env.DATABASE_URL,
	)
	.option(
		"--encryption-key <key>",
		"Backup encryption key",
		process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY,
	)
	.option("--s3-endpoint <url>", "S3 endpoint")
	.option("--s3-bucket <bucket>", "S3 bucket", process.env.S3_BUCKET)
	.option("--s3-prefix <prefix>", "S3 key prefix", "backups/")
	.option("--s3-access-key-id <key>", "S3 access key ID")
	.option("--s3-secret-access-key <key>", "S3 secret access key")
	.option("--s3-region <region>", "S3 region")
	.action(async (s3Key, opts) => {
		if (!opts.dbUrl) {
			process.stderr.write("Error: --db-url or DATABASE_URL is required\n");
			process.exit(1);
		}
		if (!opts.encryptionKey) {
			process.stderr.write(
				"Error: --encryption-key or UNDEVOPS_BACKUP_ENCRYPTION_KEY is required\n",
			);
			process.exit(1);
		}
		if (!opts.s3Bucket) {
			process.stderr.write("Error: --s3-bucket or S3_BUCKET is required\n");
			process.exit(1);
		}

		process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY = opts.encryptionKey;

		const s3 = getS3Client(opts);
		const tmpDir = await mkdtemp(join(tmpdir(), "undevops-restore-"));
		const tmpFile = join(tmpDir, "backup.dump");

		try {
			process.stdout.write(`Downloading backup from S3: ${s3Key}\n`);

			const response = await s3.send(
				new GetObjectCommand({
					Bucket: opts.s3Bucket,
					Key: s3Key,
				}),
			);

			if (!response.Body) {
				throw new Error("Empty response body from S3");
			}

			const encryptedPayload = Buffer.from(
				await response.Body.transformToByteArray(),
			);

			process.stdout.write(
				`Downloaded ${encryptedPayload.length} bytes, decrypting...\n`,
			);

			const { iv, tag, encrypted } = parseEncryptedPayload(encryptedPayload);
			const decrypted = await decryptBuffer(encrypted, iv, tag);

			await writeFile(tmpFile, decrypted);

			process.stdout.write(
				`Decrypted dump written to ${tmpFile}, running pg_restore...\n`,
			);

			try {
				const { stderr } = await execFileAsync("pg_restore", [
					"--clean",
					"--if-exists",
					"--dbname",
					opts.dbUrl,
					tmpFile,
				], {
					maxBuffer: 1024 * 1024 * 1024,
				});

				if (stderr) {
					process.stderr.write(`pg_restore warnings: ${stderr}\n`);
				}

				await unlink(tmpFile);
				await rm(tmpDir, { recursive: true });

				const timestamp =
					response.Metadata?.["backup-timestamp"] ?? "unknown";
				process.stdout.write(
					`Restore completed successfully. Backup timestamp: ${timestamp}\n`,
				);
			} catch (restoreError) {
				process.stderr.write(
					`pg_restore failed. Temp file preserved at: ${tmpFile}\n`,
				);
				if (restoreError instanceof Error && "stderr" in restoreError) {
					process.stderr.write(
						`Error: ${(restoreError as { stderr: string }).stderr}\n`,
					);
				}
				process.exit(1);
			}
		} catch (error) {
			process.stderr.write(
				`Restore failed: ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exit(1);
		}
	});

backupCommand
	.command("list")
	.description("List available control-plane backups in S3")
	.option("--s3-endpoint <url>", "S3 endpoint")
	.option("--s3-bucket <bucket>", "S3 bucket", process.env.S3_BUCKET)
	.option("--s3-prefix <prefix>", "S3 key prefix", "backups/")
	.option("--s3-access-key-id <key>", "S3 access key ID")
	.option("--s3-secret-access-key <key>", "S3 secret access key")
	.option("--s3-region <region>", "S3 region")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		if (!opts.s3Bucket) {
			process.stderr.write("Error: --s3-bucket or S3_BUCKET is required\n");
			process.exit(1);
		}

		const s3 = getS3Client(opts);

		try {
			const response = await s3.send(
				new ListObjectsV2Command({
					Bucket: opts.s3Bucket,
					Prefix: opts.s3Prefix,
				}),
			);

			const fmt = getFormatter(opts.format);
			const objects = (response.Contents ?? [])
				.filter((obj: { Key?: string }) => obj.Key?.endsWith(".enc"))
				.map((obj: { Key?: string; Size?: number; LastModified?: Date }) => ({
					key: obj.Key,
					size: obj.Size,
					lastModified: obj.LastModified?.toISOString(),
				}));

			fmt.output(objects, ["key", "size", "lastModified"]);
		} catch (error) {
			process.stderr.write(
				`Failed to list backups: ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exit(1);
		}
	});

backupCommand
	.command("status")
	.description("Show last control-plane backup status")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);

		try {
			const lastRecord = await db
				.select()
				.from(controlPlaneBackups)
				.orderBy(desc(controlPlaneBackups.createdAt))
				.limit(1);

			if (lastRecord.length === 0) {
				process.stdout.write("No control-plane backups recorded.\n");
				return;
			}

			const record = lastRecord[0];
			fmt.output(
				[
					{
						status: record.status,
						s3Key: record.s3Key,
						sizeBytes: record.sizeBytes,
						timestamp: record.backupTimestamp,
						error: record.error,
						createdAt: record.createdAt?.toISOString(),
						completedAt: record.completedAt?.toISOString(),
					},
				],
				["status", "s3Key", "sizeBytes", "timestamp", "error", "completedAt"],
			);
		} catch (error) {
			process.stderr.write(
				`Failed to get backup status: ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exit(1);
		}
	});
