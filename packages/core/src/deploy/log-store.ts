import { createReadStream, createWriteStream, existsSync, unlinkSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { execAsync } from "@undevops/server/utils/process/execAsync";

export interface S3Config {
	bucket: string;
	accessKey: string;
	secretAccessKey: string;
	region: string;
	endpoint: string;
	provider?: string;
	additionalFlags?: string[];
}

export async function getLogContent(
	logUri: string,
	s3Config?: S3Config,
): Promise<string> {
	if (logUri.startsWith("s3://")) {
		return fetchLogFromS3(logUri, s3Config);
	}

	if (existsSync(logUri)) {
		return readFile(logUri, "utf-8");
	}

	if (logUri.startsWith("/") && s3Config) {
		const s3Key = extractS3KeyFromLocalPath(logUri);
		if (s3Key) {
			const s3Uri = `s3://${s3Config.bucket}/${s3Key}`;
			return fetchLogFromS3(s3Uri, s3Config);
		}
	}

	throw new Error(`Log file not found and no S3 fallback available: ${logUri}`);
}

function extractS3KeyFromLocalPath(localPath: string): string | null {
	const parts = localPath.split("/");
	const logsIdx = parts.indexOf("logs");
	if (logsIdx === -1 || logsIdx + 1 >= parts.length) {
		return null;
	}
	const deploymentId = parts[logsIdx + 1];
	const fileName = parts[parts.length - 1];
	if (!fileName.endsWith(".log.gz")) {
		const gzName = `${fileName}.gz`;
		return `logs/${deploymentId}/${gzName}`;
	}
	return `logs/${deploymentId}/${fileName}`;
}

async function fetchLogFromS3(
	s3Uri: string,
	s3Config?: S3Config,
): Promise<string> {
	if (!s3Config) {
		throw new Error(`S3 config required to fetch log from ${s3Uri}`);
	}

	const s3Path = s3Uri.replace("s3://", "");
	const slashIdx = s3Path.indexOf("/");
	const bucket = s3Path.substring(0, slashIdx);
	const key = s3Path.substring(slashIdx + 1);

	const tmpPath = `/tmp/log-fetch-${Date.now()}.gz`;
	const rcloneFlags = [
		`--s3-access-key-id="${s3Config.accessKey}"`,
		`--s3-secret-access-key="${s3Config.secretAccessKey}"`,
		`--s3-region="${s3Config.region}"`,
		`--s3-endpoint="${s3Config.endpoint}"`,
		"--s3-no-check-bucket",
		"--s3-force-path-style",
	];

	if (s3Config.provider) {
		rcloneFlags.unshift(`--s3-provider="${s3Config.provider}"`);
	}

	if (s3Config.additionalFlags?.length) {
		rcloneFlags.push(...s3Config.additionalFlags);
	}

	const rcloneSource = `:s3:${bucket}/${key}`;
	await execAsync(
		`rclone copyto ${rcloneFlags.join(" ")} "${rcloneSource}" "${tmpPath}"`,
	);

	if (key.endsWith(".gz")) {
		const outPath = tmpPath.replace(".gz", "");
		await pipeline(
			createReadStream(tmpPath),
			createGunzip(),
			createWriteStream(outPath),
		);
		const content = await readFile(outPath, "utf-8");
		try { unlinkSync(tmpPath); } catch {}
		try { unlinkSync(outPath); } catch {}
		return content;
	}

	const content = await readFile(tmpPath, "utf-8");
	try { unlinkSync(tmpPath); } catch {}
	return content;
}
