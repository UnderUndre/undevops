import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

const PROJECT_ROOT = resolve(__dirname, "../..");
const QUICKSTART_PATH = join(PROJECT_ROOT, "specs/001-init/quickstart.md");

interface QuickstartSection {
	title: string;
	lineStart: number;
	content: string;
}

function parseSections(markdown: string): QuickstartSection[] {
	const lines = markdown.split("\n");
	const sections: QuickstartSection[] = [];
	let currentSection: QuickstartSection | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (line.startsWith("## ")) {
			if (currentSection) {
				sections.push(currentSection);
			}
			currentSection = {
				title: line.replace("## ", "").trim(),
				lineStart: i + 1,
				content: "",
			};
		} else if (currentSection) {
			currentSection.content += line + "\n";
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	return sections;
}

function extractCodeBlocks(content: string): string[] {
	const blocks: string[] = [];
	const regex = /```[\w]*\r?\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		blocks.push(match[1]!);
	}
	return blocks;
}

function extractCliCommands(content: string): string[] {
	const commands: string[] = [];
	const blocks = extractCodeBlocks(content);
	for (const block of blocks) {
		const lines = block.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith("undevops ") || trimmed.startsWith("npx @undevops")) {
				commands.push(trimmed);
			}
		}
	}
	return commands;
}

function extractEnvVars(content: string): string[] {
	const vars = new Set<string>();
	const envPattern = /([A-Z_]{3,}[A-Z0-9_]*)/g;
	const blocks = extractCodeBlocks(content);
	for (const block of blocks) {
		let match: RegExpExecArray | null;
		while ((match = envPattern.exec(block)) !== null) {
			vars.add(match[1]!);
		}
	}

	const inlineEnvPattern = /\$([A-Z_]{3,}[A-Z0-9_]*)/g;
	let inlineMatch: RegExpExecArray | null;
	while ((inlineMatch = inlineEnvPattern.exec(content)) !== null) {
		vars.add(inlineMatch[1]!);
	}

	return Array.from(vars).sort();
}

function findDockerfiles(root: string): string[] {
	const results: string[] = [];

	function walk(dir: string) {
		if (!existsSync(dir)) return;
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
				const fullPath = join(dir, entry.name);
				if (entry.isFile() && (entry.name === "Dockerfile" || entry.name.startsWith("Dockerfile."))) {
					results.push(fullPath);
				} else if (entry.isDirectory()) {
					walk(fullPath);
				}
			}
		} catch {
			// permission denied, skip
		}
	}

	walk(root);
	return results;
}

function extractReferencedDockerImages(markdown: string): string[] {
	const images = new Set<string>();
	const blocks = extractCodeBlocks(markdown);
	for (const block of blocks) {
		const lines = block.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.includes("docker compose") || trimmed.includes("docker pull")) {
				const imageMatch = trimmed.match(/([\w./-]+\/[\w.-]+(?::[\w.-]+)?)/g);
				if (imageMatch) {
					for (const img of imageMatch) {
						if (!img.startsWith("http") && !img.includes("compose")) {
							images.add(img);
						}
					}
				}
			}
		}
	}
	return Array.from(images);
}

describe("T136: Quickstart Validation Scaffold", () => {
	let quickstartContent: string;
	let sections: QuickstartSection[];

	beforeAll(() => {
		quickstartContent = readFileSync(QUICKSTART_PATH, "utf-8");
		sections = parseSections(quickstartContent);
	});

	describe("Documentation completeness", () => {
		const requiredSections = [
			"Prerequisites",
			"Installation",
			"First Deployment",
			"MCP Integration",
			"Backup Setup",
			"CLI Usage",
		];

		for (const required of requiredSections) {
			it(`has "${required}" section`, () => {
				const found = sections.some((s) =>
					s.title.toLowerCase().includes(required.toLowerCase()),
				);
				expect(found, `Missing section: ${required}`).toBe(true);
			});
		}

		it("has troubleshooting section", () => {
			const found = sections.some((s) =>
				s.title.toLowerCase().includes("troubleshooting"),
			);
			expect(found).toBe(true);
		});

		it("all sections have content (not just headings)", () => {
			for (const section of sections) {
				expect(
					section.content.trim().length,
					`Section "${section.title}" is empty`,
				).toBeGreaterThan(10);
			}
		});
	});

	describe("CLI commands referenced in quickstart", () => {
		it("extracted commands reference valid CLI subcommands", () => {
			const commands = extractCliCommands(quickstartContent);
			expect(commands.length).toBeGreaterThan(0);

			const subcommandPatterns = [
				/undevops\s+servers?\s/,
				/undevops\s+projects?\s/,
				/undevops\s+deploy\b/,
				/undevops\s+backup\s/,
				/undevops\s+logs\b/,
				/undevops\s+scale\b/,
				/undevops\s+rollback\b/,
				/undevops\s+env\s/,
				/undevops\s+mcp-tokens\s/,
				/undevops\s+plugins?\s/,
				/undevops\s+audit\s/,
			];

			for (const pattern of subcommandPatterns) {
				const found = commands.some((cmd) => pattern.test(cmd));
				expect(found, `No command matching ${pattern} found in quickstart`).toBe(true);
			}
		});
	});

	describe("Environment variables documented", () => {
		it("critical env vars are mentioned", () => {
			const envVars = extractEnvVars(quickstartContent);
			expect(envVars.length).toBeGreaterThan(0);

			const criticalVars = [
				"UNDEVOPS_ENCRYPTION_KEY",
				"DATABASE_URL",
			];

			for (const critical of criticalVars) {
				expect(
					envVars,
					`Critical env var ${critical} not found in quickstart`,
				).toContain(critical);
			}
		});
	});

	describe("Docker images referenced exist as Dockerfiles", () => {
		it("finds Dockerfiles in the project", () => {
			const dockerfiles = findDockerfiles(PROJECT_ROOT);
			expect(dockerfiles.length).toBeGreaterThan(0);
		});

		it("services referenced in quickstart have corresponding Dockerfiles or compose references", () => {
			const serviceRefs = [
				"undevops-server",
				"undevops-mcp",
				"postgres",
				"redis",
				"traefik",
			];

			const servicesSection = sections.find((s) =>
				s.title.toLowerCase().includes("installation") ||
				s.title.toLowerCase().includes("verify"),
			);

			expect(servicesSection).toBeDefined();

			for (const service of serviceRefs) {
				expect(
					servicesSection!.content,
					`Service ${service} not mentioned in installation/verify section`,
				).toContain(service);
			}
		});
	});

	describe("Install script reference", () => {
		it("documents curl-based install command", () => {
			expect(quickstartContent).toContain("curl");
			expect(quickstartContent).toContain("get.undevops.com");
		});

		it("documents wget-based alternative", () => {
			expect(quickstartContent).toContain("wget");
		});

		it("documents manual installation alternative", () => {
			const manualSection = sections.find((s) =>
				s.content.toLowerCase().includes("manual") &&
				s.content.toLowerCase().includes("clone"),
			);
			expect(manualSection).toBeDefined();
		});

		it("documents docker compose up as startup command", () => {
			expect(quickstartContent).toContain("docker compose up");
		});
	});

	describe("Backup and restore documented", () => {
		it("documents backup configure command", () => {
			expect(quickstartContent).toContain("backup configure");
		});

		it("documents backup schedule with cron", () => {
			expect(quickstartContent).toContain("--cron");
		});

		it("documents restore flow", () => {
			expect(quickstartContent).toContain("backup restore");
		});

		it("documents encryption details (AES-256-GCM)", () => {
			expect(quickstartContent).toContain("AES-256-GCM");
		});
	});

	describe("MCP integration documented", () => {
		it("documents MCP token creation", () => {
			expect(quickstartContent).toContain("mcp-tokens create");
		});

		it("documents Claude Code configuration", () => {
			expect(quickstartContent).toContain("mcpServers");
			expect(quickstartContent).toContain("undevops");
		});

		it("lists available MCP operations table", () => {
			const mcpSection = sections.find((s) =>
				s.title.toLowerCase().includes("mcp integration"),
			);
			expect(mcpSection).toBeDefined();
			expect(mcpSection!.content).toContain("undevops_deploy");
			expect(mcpSection!.content).toContain("undevops_rollback");
			expect(mcpSection!.content).toContain("undevops_scale");
		});
	});
});
