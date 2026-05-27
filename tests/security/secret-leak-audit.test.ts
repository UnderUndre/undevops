import { readFile, readdir, stat } from "node:fs/promises";
import { join, extname, relative as pathRelative } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

const REPO_ROOT = join(__dirname, "../..");

interface FileMatch {
	file: string;
	line: number;
	content: string;
}

async function readSourceFile(relPath: string): Promise<string> {
	try {
		return await readFile(join(REPO_ROOT, relPath), "utf-8");
	} catch {
		return "";
	}
}

async function collectFiles(dir: string, extensions: string[]): Promise<string[]> {
	const results: string[] = [];
	const rootRel = pathRelative(REPO_ROOT, dir).replace(/\\/g, "/");
	async function walk(current: string, relPrefix: string) {
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (
				entry.name === "node_modules" ||
				entry.name === "dist" ||
				entry.name === ".git" ||
				entry.name === ".next" ||
				entry.name === "coverage" ||
				entry.name === ".turbo"
			) {
				continue;
			}
			const full = join(current, entry.name);
			const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				await walk(full, rel);
			} else if (extensions.includes(extname(entry.name))) {
				results.push(rel);
			}
		}
	}
	await walk(dir, rootRel);
	return results;
}

async function grepInSource(
	relPath: string,
	pattern: RegExp,
): Promise<FileMatch[]> {
	const content = await readSourceFile(relPath);
	if (!content) return [];
	const lines = content.split("\n");
	const matches: FileMatch[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (pattern.test(lines[i])) {
			matches.push({ file: relPath, line: i + 1, content: lines[i].trim() });
		}
	}
	return matches;
}

describe("T133: Secret Leak Audit", () => {
	describe("A. MCP resource handlers use redaction", () => {
		const resourceFiles = [
			"apps/mcp-server/src/resources/deployments.ts",
			"apps/mcp-server/src/resources/servers.ts",
			"apps/mcp-server/src/resources/projects.ts",
			"apps/mcp-server/src/resources/logs.ts",
			"apps/mcp-server/src/resources/audit.ts",
		];

		it.each(resourceFiles)(
			"%s uses redaction before returning data",
			async (relPath) => {
				const content = await readSourceFile(relPath);
				expect(content.length).toBeGreaterThan(0);

				const hasRedactImport =
					content.includes("redactJson") ||
					content.includes("redactString");
				expect(hasRedactImport).toBe(true);

				const hasRedactCall =
					content.includes("redactJson(") ||
					content.includes("redactString(");
				expect(hasRedactCall).toBe(true);
			},
		);

		it("version.ts is exempt — returns only version/plugin metadata", async () => {
			const content = await readSourceFile(
				"apps/mcp-server/src/resources/version.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const hasSecretPatterns =
				content.includes("secret") ||
				content.includes("password") ||
				content.includes("token") ||
				content.includes("apiKey");
			expect(hasSecretPatterns).toBe(false);
		});

		it("every MCP resource handler that returns DB data calls redactJson or redactString", async () => {
			const allViolations: string[] = [];

			for (const relPath of resourceFiles) {
				const content = await readSourceFile(relPath);
				const exportFns =
					content.match(/export\s+async\s+function\s+\w+/g) ?? [];

				for (const fnMatch of exportFns) {
					const fnName = fnMatch.replace(
						/export\s+async\s+function\s+/,
						"",
					);

					const fnBodyMatch = content.match(
						new RegExp(
							`export\\s+async\\s+function\\s+${fnName}[\\s\\S]*?(?=export\\s+async\\s+function|$)`,
						),
					);
					if (!fnBodyMatch) continue;

					const fnBody = fnBodyMatch[0];
					const hasDbQuery =
						fnBody.includes("db.") ||
						fnBody.includes("await db");
					const hasRedaction =
						fnBody.includes("redactJson(") ||
						fnBody.includes("redactString(");

					if (hasDbQuery && !hasRedaction) {
						allViolations.push(`${relPath} → ${fnName}`);
					}
				}
			}

			expect(allViolations).toEqual([]);
		});
	});

	describe("B. AI reviewer payloads don't include raw secret values", () => {
		it("buildUserMessage does NOT include envVarChanges values", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/providers/review-prompt.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			expect(content).not.toContain("envVarChanges");
			expect(content).not.toContain("previousValue");
			expect(content).not.toContain("newValue");
		});

		it("ReviewRequest schema does not carry env var values", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/types/reviewer.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const reviewRequestBlock = content.match(
				/export interface ReviewRequest \{[\s\S]*?\}/,
			);
			expect(reviewRequestBlock).not.toBeNull();

			const block = reviewRequestBlock![0];
			expect(block).not.toContain("previousValue");
			expect(block).not.toContain("newValue");
			expect(block).not.toContain("envVarChange");
		});

		it("buildChangePayload captures env var values — FINDING: values leak into ChangeSet", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/review/payload-builder.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const hasPreviousValue = content.includes("previousValue:");
			const hasNewValue = content.includes("newValue:");

			expect(
				hasPreviousValue && hasNewValue,
				"FINDING: buildChangePayload includes previousValue/newValue for env vars. " +
					"If ChangeSet is serialized into a ReviewRequest.diff, secret values could reach external AI APIs.",
			).toBe(true);
		});

		it("provider buildUserMessage methods do NOT reference env var values directly", async () => {
			const providerFiles = [
				"packages/ai-pack/src/providers/claude.ts",
				"packages/ai-pack/src/providers/gemini.ts",
				"packages/ai-pack/src/providers/openai.ts",
				"packages/ai-pack/src/providers/codex.ts",
				"packages/ai-pack/src/providers/custom.ts",
			];

			for (const relPath of providerFiles) {
				const content = await readSourceFile(relPath);
				const buildMsg =
					content.match(
						/buildUserMessage[\s\S]*?private buildUserMessage[\s\S]*?\n\s*\}/,
					) ?? [];

				const methodBody = buildMsg[0] ?? "";
				expect(
					methodBody,
					`${relPath} buildUserMessage should not reference envVarChanges`,
				).not.toContain("envVarChange");
			}
		});
	});

	describe("C. Audit log operations don't log secret values", () => {
		it("auditSecretSet does not pass secret values in payload", async () => {
			const content = await readSourceFile(
				"packages/core/src/audit/operations.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const secretSetIdx = content.indexOf("auditSecretSet");
			expect(secretSetIdx).toBeGreaterThan(-1);

			const fromSecretSet = content.slice(secretSetIdx);
			const fnBody = fromSecretSet.slice(
				0,
				fromSecretSet.indexOf("\n}") + 2,
			);
			expect(fnBody).not.toContain("value");
			expect(fnBody).toContain("key");
			expect(fnBody).toContain("scope");
		});

		it("audit middleware does not redact payload — FINDING: unredacted payload stored", async () => {
			const content = await readSourceFile(
				"packages/core/src/audit/middleware.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const hasRedaction =
				content.includes("redact") ||
				content.includes("REDACTED") ||
				content.includes("sanitize");
			expect(
				hasRedaction,
				"FINDING: Audit middleware passes payload directly to createAuditLog without redaction. " +
					"Callers that include secret values in payload will persist them unredacted.",
			).toBe(false);
		});

		it("all audit operation functions pass structured details, not raw values", async () => {
			const content = await readSourceFile(
				"packages/core/src/audit/operations.ts",
			);
			const secretRelatedPatterns =
				/password|secret.*value|token.*value|apiKey.*value/gi;
			const matches = content.match(secretRelatedPatterns);
			expect(
				matches,
				"Audit operations should not reference raw secret/token/password values",
			).toBeNull();
		});
	});

	describe("D. Application logging does not leak secrets", () => {
		let allSourceFiles: string[];

		beforeAll(async () => {
			allSourceFiles = await collectFiles(
				join(REPO_ROOT, "apps/mcp-server/src"),
				[".ts"],
			);
		});

		it("MCP server logger calls do not log secret-sensitive field names", async () => {
			const sensitivePatterns =
				/\b(password|secret|token|apiKey|api_key|private_key|access_key)\s*[:=]/i;
			const violations: FileMatch[] = [];

			for (const relPath of allSourceFiles) {
				const full = join(REPO_ROOT, relPath);
				const content = await readFile(full, "utf-8");

				const lines = content.split("\n");
				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					if (
						(line.includes("logger.") || line.includes("log(")) &&
						sensitivePatterns.test(line)
					) {
						violations.push({
							file: relPath,
							line: i + 1,
							content: line.trim(),
						});
					}
				}
			}

			expect(
				violations,
				`Found logger calls with sensitive field names: ${violations.map((v) => `${v.file}:${v.line}`).join(", ")}`,
			).toEqual([]);
		});

		it("no logger.info/warn/error calls include literal secret values pattern", async () => {
			const violations: FileMatch[] = [];

			for (const relPath of allSourceFiles) {
				const matches = await grepInSource(
					relPath,
					/logger\.(info|warn|error)\(\{[^}]*(?:password|secret|token|apiKey)\s*:/,
				);
				violations.push(...matches);
			}

			expect(violations).toEqual([]);
		});

		it("no console.log/warn/error with sensitive patterns in mcp-server", async () => {
			const violations: FileMatch[] = [];

			for (const relPath of allSourceFiles) {
				const matches = await grepInSource(
					relPath,
					/console\.(log|warn|error)\(.*(?:password|secret.*value|apiKey)/i,
				);
				violations.push(...matches);
			}

			expect(violations).toEqual([]);
		});
	});

	describe("E. Redaction function correctness", () => {
		it("redactString replaces all known secret values", async () => {
			const { registerSecretValues, clearSecretValues, redactString } =
				await import(
					join(
						REPO_ROOT,
						"apps/mcp-server/src/redaction.ts",
					).replace(/\\/g, "/")
				);

			clearSecretValues();
			registerSecretValues([
				"sk-live-abc123def456",
				"db-password-secret-value",
			]);

			const input =
				'apiKey=sk-live-abc123def456 and dbpass=db-password-secret-value';
			const result = redactString(input);

			expect(result).not.toContain("sk-live-abc123def456");
			expect(result).not.toContain("db-password-secret-value");
			expect(result).toContain("***REDACTED***");

			clearSecretValues();
		});

		it("redactJson replaces secrets in nested JSON structures", async () => {
			const { registerSecretValues, clearSecretValues, redactJson } =
				await import(
					join(
						REPO_ROOT,
						"apps/mcp-server/src/redaction.ts",
					).replace(/\\/g, "/")
				);

			clearSecretValues();
			registerSecretValues(["hunter2"]);

			const data = {
				items: [
					{ name: "app1", envVars: { DB_PASS: "hunter2" } },
					{ name: "app2", config: '{"token":"hunter2"}' },
				],
				meta: { nested: { deep: "hunter2" } },
			};

			const result = redactJson(data);
			const serialized = JSON.stringify(result);

			expect(serialized).not.toContain("hunter2");
			expect(serialized).toContain("***REDACTED***");

			clearSecretValues();
		});

		it("redactString skips secrets shorter than 4 characters", async () => {
			const { registerSecretValues, clearSecretValues, redactString } =
				await import(
					join(
						REPO_ROOT,
						"apps/mcp-server/src/redaction.ts",
					).replace(/\\/g, "/")
				);

			clearSecretValues();
			registerSecretValues(["abc"]);

			const result = redactString("password=abc");
			expect(result).toContain("abc");
			expect(result).not.toContain("***REDACTED***");

			clearSecretValues();
		});

		it("FINDING: redactJson throws on null/undefined — upstream should guard", async () => {
			const { registerSecretValues, clearSecretValues, redactJson } =
				await import(
					join(
						REPO_ROOT,
						"apps/mcp-server/src/redaction.ts",
					).replace(/\\/g, "/")
				);

			clearSecretValues();
			registerSecretValues(["secret-value-123"]);

			expect(() => redactJson(null)).not.toThrow();
			expect(() => redactJson({})).not.toThrow();
			expect(() => redactJson([])).not.toThrow();

			expect(
				() => redactJson(undefined),
				"FINDING: redactJson(undefined) throws TypeError. " +
					"Callers may pass undefined accidentally, causing unhandled errors in production.",
			).not.toThrow();

			clearSecretValues();
		});
	});

	describe("F. Gate evaluator does not leak secrets in results", () => {
		it("GateResult and IndividualResult types do not carry credentials", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/review/gate-evaluator.ts",
			);
			expect(content.length).toBeGreaterThan(0);

			const interfaceBlock = content.match(
				/export interface GateResult \{[\s\S]*?\}/,
			);
			expect(interfaceBlock).not.toBeNull();

			const gateResultBody = interfaceBlock![0];
			expect(gateResultBody).not.toContain("apiKey");
			expect(gateResultBody).not.toContain("credential");
			expect(gateResultBody).not.toContain("secret");
			expect(gateResultBody).not.toContain("token");
		});

		it("resolveSecret result is used only as provider input, not returned", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/review/gate-evaluator.ts",
			);

			const evaluateGateFn = content.match(
				/export async function evaluateGate[\s\S]*?\n\}/,
			);
			expect(evaluateGateFn).not.toBeNull();

			const fnBody = evaluateGateFn![0];

			const returnBlockMatch = fnBody.match(/return\s*\{[\s\S]*?\};/g);
			expect(returnBlockMatch).not.toBeNull();

			for (const ret of returnBlockMatch!) {
				expect(
					ret,
					"Return block should not contain apiKey or credentialRef",
				).not.toContain("apiKey");
				expect(ret).not.toContain("credentialRef");
			}
		});
	});

	describe("G. Providers do not include API keys in message bodies", () => {
		const providerFiles = [
			"packages/ai-pack/src/providers/claude.ts",
			"packages/ai-pack/src/providers/openai.ts",
			"packages/ai-pack/src/providers/codex.ts",
			"packages/ai-pack/src/providers/custom.ts",
		];

		it.each(providerFiles)(
			"%s does not embed apiKey in request body JSON",
			async (relPath) => {
				const content = await readSourceFile(relPath);

				const bodyMatch = content.match(
					/body:\s*JSON\.stringify\(\{[\s\S]*?\}\)/,
				);
				if (!bodyMatch) return;

				const bodyConstruction = bodyMatch[0];
				expect(bodyConstruction).not.toContain("this.apiKey");
				expect(bodyConstruction).not.toContain("apiKey");
			},
		);

		it("gemini.ts passes API key via URL query param — documented pattern but audit note", async () => {
			const content = await readSourceFile(
				"packages/ai-pack/src/providers/gemini.ts",
			);

			expect(content).toContain("?key=");
			expect(content).toContain("this.apiKey");

			const urlMatch = content.match(
				/const url = [`'"].*\$\{this\.apiKey\}/,
			);
			expect(
				urlMatch,
				"FINDING: Gemini provider appends API key to URL. " +
					"Standard Gemini API pattern, but key may appear in server/proxy access logs.",
			).not.toBeNull();
		});
	});
});
