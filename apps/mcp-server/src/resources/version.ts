import { readFile } from "node:fs/promises";
import { eq, db } from "@undevops/server/db";
import { plugins } from "@undevops/server/db/schema/plugin";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:version");

interface VersionInfo {
	undevops: string;
	dokploy: string | null;
	plugins: Array<{ name: string; version: string; enabled: boolean }>;
}

let cachedPackageJson: { version?: string; upstreamVersion?: string } | null = null;

async function readPackageVersion(): Promise<{ version?: string; upstreamVersion?: string }> {
	if (cachedPackageJson) return cachedPackageJson;

	try {
		const raw = await readFile(new URL("../../package.json", import.meta.url), "utf-8");
		cachedPackageJson = JSON.parse(raw);
		return cachedPackageJson ?? {};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error({ err: msg }, "failed to read package.json");
		return {};
	}
}

export async function getVersionInfo(): Promise<VersionInfo> {
	const start = performance.now();

	const [pkg, pluginRows] = await Promise.all([
		readPackageVersion(),
		db.select({
			name: plugins.name,
			version: plugins.version,
			enabled: plugins.enabled,
		}).from(plugins),
	]);

	const result: VersionInfo = {
		undevops: pkg.version ?? "0.0.0",
		dokploy: pkg.upstreamVersion ?? null,
		plugins: pluginRows,
	};

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed) }, "getVersionInfo");

	return result;
}
