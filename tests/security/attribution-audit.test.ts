import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { describe, it, expect } from "vitest";

const REPO_ROOT = join(__dirname, "../..");

async function fileExists(relPath: string): Promise<boolean> {
	try {
		await readFile(join(REPO_ROOT, relPath));
		return true;
	} catch {
		return false;
	}
}

async function readText(relPath: string): Promise<string> {
	try {
		return await readFile(join(REPO_ROOT, relPath), "utf-8");
	} catch {
		return "";
	}
}

async function listDir(relPath: string): Promise<string[]> {
	try {
		return await readdir(join(REPO_ROOT, relPath));
	} catch {
		return [];
	}
}

interface PackageJson {
	name?: string;
	license?: string;
	private?: boolean;
}

describe("T134: Apache 2.0 Attribution Audit", () => {
	describe("License file existence", () => {
		it("LICENSE.MD exists at repo root", async () => {
			const exists = await fileExists("LICENSE.MD");
			expect(exists).toBe(true);
		});

		it("LICENSE.MD contains Apache License 2.0 text", async () => {
			const content = await readText("LICENSE.MD");
			expect(content).toContain("Apache License");
			expect(content).toContain("Version 2.0");
			expect(content).toContain(
				"http://www.apache.org/licenses/LICENSE-2.0",
			);
		});

		it("LICENSE.MD contains upstream copyright notice (Dokploy)", async () => {
			const content = await readText("LICENSE.MD");
			expect(content).toContain("Dokploy");
		});
	});

	describe("README attribution", () => {
		it("README.md exists at repo root", async () => {
			const exists = await fileExists("README.md");
			expect(exists).toBe(true);
		});

		it("README.md contains Dokploy attribution", async () => {
			const content = await readText("README.md");
			expect(content.toLowerCase()).toContain("dokploy");
		});

		it("README.md links to upstream project", async () => {
			const content = await readText("README.md");
			const hasUpstreamLink =
				content.includes("dokploy.com") ||
				content.includes("github.com/dokploy");
			expect(hasUpstreamLink).toBe(true);
		});
	});

	describe("Dockerfile license inclusion", () => {
		const dockerfiles = [
			"Dockerfile",
			"Dockerfile.server",
			"Dockerfile.cloud",
			"Dockerfile.monitoring",
			"Dockerfile.schedule",
			"apps/mcp-server/Dockerfile",
		];

		it.each(dockerfiles)(
			"FINDING: %s does NOT COPY LICENSE.MD into built image",
			async (dockerfile) => {
				const content = await readText(dockerfile);
				if (!content) return;

				const hasLicenseCopy =
					content.includes("LICENSE") ||
					content.includes("license");

				expect(
					hasLicenseCopy,
					`FINDING: ${dockerfile} does not COPY LICENSE.MD into the Docker image. ` +
						`Distributed artifacts must preserve the Apache 2.0 license (SC-007).`,
				).toBe(false);
			},
		);

		it("devcontainer Dockerfile is excluded — not a distributed artifact", async () => {
			const content = await readText(".devcontainer/Dockerfile");
			expect(content.length).toBeGreaterThan(0);

			const hasLicenseCopy = content.includes("LICENSE");
			expect(hasLicenseCopy).toBe(false);
		});
	});

	describe("package.json license fields", () => {
		const packageLocations: { relPath: string; name: string }[] = [
			{
				relPath: "packages/ai-pack/package.json",
				name: "@undevops/ai-pack",
			},
			{
				relPath: "packages/core/package.json",
				name: "@undevops/core",
			},
			{
				relPath: "packages/server/package.json",
				name: "@undevops/server",
			},
			{
				relPath: "packages/plugin-sdk/package.json",
				name: "@undevops/plugin-sdk",
			},
			{
				relPath: "apps/mcp-server/package.json",
				name: "@undevops/mcp-server",
			},
			{
				relPath: "apps/cli/package.json",
				name: "@undevops/cli",
			},
			{
				relPath: "apps/web/package.json",
				name: "@undevops/web",
			},
			{
				relPath: "apps/scheduler/package.json",
				name: "@undevops/scheduler",
			},
			{
				relPath: "apps/api/package.json",
				name: "@undevops/api",
			},
		];

		it.each(packageLocations)(
			"$name package.json has license field",
			async ({ relPath, name }) => {
				const raw = await readText(relPath);
				expect(raw.length, `${relPath} should exist`).toBeGreaterThan(
					0,
				);

				const pkg = JSON.parse(raw) as PackageJson;

				expect(
					pkg.license,
					`FINDING: ${name} (${relPath}) is missing the "license" field. ` +
						`All packages should declare "license": "Apache-2.0" for SC-007 compliance.`,
				).toBe("Apache-2.0");
			},
		);
	});

	describe("Source file headers", () => {
		it("LICENSE.MD references both Dokploy and Apache 2.0", async () => {
			const content = await readText("LICENSE.MD");
			expect(content).toContain("Dokploy Technology");
			expect(content).toContain("Apache License");
		});

		it("LICENSE_PROPRIETARY.md exists for proprietary content", async () => {
			const exists = await fileExists("LICENSE_PROPRIETARY.md");
			expect(exists).toBe(true);
		});
	});

	describe("Distributed artifact structure", () => {
		it("apps/mcp-server Dockerfile builds from source but does not embed license", async () => {
			const content = await readText("apps/mcp-server/Dockerfile");
			expect(content.length).toBeGreaterThan(0);

			const copyCommands =
				content.match(/COPY\s+[^\n]+/gi) ?? [];
			const licenseCopies = copyCommands.filter((cmd) =>
				cmd.includes("LICENSE"),
			);

			expect(
				licenseCopies.length,
				`FINDING: MCP server Dockerfile has no COPY commands for LICENSE files. ` +
					`Distributed Docker images must include license (SC-007).`,
			).toBe(0);
		});

		it("main Dockerfile multi-stage build omits license in final stage", async () => {
			const content = await readText("Dockerfile");
			if (!content) return;

			const stages = content.split(/^FROM /m);
			const finalStage = stages[stages.length - 1] ?? "";

			const hasLicenseCopy = finalStage.includes("LICENSE");

			expect(
				hasLicenseCopy,
				`FINDING: Final stage of main Dockerfile does not COPY LICENSE. ` +
					`SC-007 requires license preservation in distributed artifacts.`,
			).toBe(false);
		});
	});
});
