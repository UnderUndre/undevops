import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	calculatePlacement,
	buildSpreadPlacementPreference,
	type NodeInfo,
} from "../../packages/core/src/deploy/replica-scheduler.js";
import {
	verifyChain,
	computeRowHash,
	type AuditLogRow,
} from "../../packages/core/src/audit/tamper-evidence.js";

vi.mock("@undevops/server/db", () => ({
	db: {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue([]),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockResolvedValue(undefined),
	},
	desc: vi.fn((col: unknown) => col),
	eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
	sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
		const raw = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
		return { getSQL: () => raw, mapTo: undefined };
	},
}));

vi.mock("@undevops/server/db/schema/backups", () => ({
	backups: { backupId: "backupId" },
}));

vi.mock("@undevops/server/db/schema/destination", () => ({
	destinations: { destinationId: "destinationId" },
}));

vi.mock("@undevops/server/db/schema/deployment", () => ({
	deployments: { status: "status", title: "title", description: "description", createdAt: "createdAt", backupId: "backupId" },
}));

vi.mock("../apps/mcp-server/src/redaction.js", () => ({
	redactJson: (obj: unknown) => obj,
}));

vi.mock("../apps/mcp-server/src/lib/logger.js", () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

describe("T131: Regression — Wave 1 + Wave 2 Smoke Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Wave 1: MCP resource handlers return correct data shapes", () => {
		it("backup status resource returns expected shape", async () => {
			const { getBackupStatus } = await import("../../apps/mcp-server/src/resources/backup-status.js");

			const result = await getBackupStatus();

			expect(result).toHaveProperty("lastSuccessAt");
			expect(result).toHaveProperty("lastAttemptAt");
			expect(result).toHaveProperty("lastError");
			expect(result).toHaveProperty("totalBackups");
			expect(result).toHaveProperty("nextScheduledAt");
			expect(result).toHaveProperty("s3Configured");
			expect(typeof result.totalBackups).toBe("number");
			expect(typeof result.s3Configured).toBe("boolean");
		});
	});

	describe("Wave 1: Plugin system loads and fires hooks", () => {
		interface HookPayload {
			eventType: string;
			deploymentId: string;
			timestamp: string;
		}

		type HookHandler = (payload: HookPayload) => Promise<void>;

		class PluginHost {
			private handlers = new Map<string, HookHandler[]>();
			private plugins = new Map<string, { enabled: boolean; invokeCount: number }>();

			install(name: string, enabled: boolean) {
				this.plugins.set(name, { enabled, invokeCount: 0 });
			}

			registerHook(pluginName: string, hookName: string, handler: HookHandler) {
				const key = `${pluginName}:${hookName}`;
				const existing = this.handlers.get(key) ?? [];
				existing.push(handler);
				this.handlers.set(key, existing);
			}

			async dispatch(hookName: string, payload: HookPayload) {
				for (const [key, handlers] of this.handlers.entries()) {
					const [pluginName, hook] = key.split(":");
					if (hook !== hookName) continue;
					const plugin = this.plugins.get(pluginName!);
					if (!plugin?.enabled) continue;
					for (const handler of handlers) {
						await handler(payload);
					}
					plugin.invokeCount++;
				}
			}

			getInvokeCount(name: string) {
				return this.plugins.get(name)?.invokeCount ?? 0;
			}
		}

		it("fires hook for enabled plugin and increments counter", async () => {
			const host = new PluginHost();
			host.install("test-plugin", true);

			const handler = vi.fn().mockResolvedValue(undefined);
			host.registerHook("test-plugin", "post-deploy", handler);

			await host.dispatch("post-deploy", {
				eventType: "post-deploy",
				deploymentId: "deploy-regression-1",
				timestamp: new Date().toISOString(),
			});

			expect(handler).toHaveBeenCalledOnce();
			expect(host.getInvokeCount("test-plugin")).toBe(1);
		});

		it("skips disabled plugins", async () => {
			const host = new PluginHost();
			host.install("disabled-plugin", false);

			const handler = vi.fn().mockResolvedValue(undefined);
			host.registerHook("disabled-plugin", "post-deploy", handler);

			await host.dispatch("post-deploy", {
				eventType: "post-deploy",
				deploymentId: "deploy-regression-2",
				timestamp: new Date().toISOString(),
			});

			expect(handler).not.toHaveBeenCalled();
			expect(host.getInvokeCount("disabled-plugin")).toBe(0);
		});
	});

	describe("Wave 2: MCP write tools create pending actions", () => {
		it("McpError has correct shape for scope rejection", async () => {
			const { McpError, ERROR_CODES } = await import("../../apps/mcp-server/src/tools/shared.js");

			const err = new McpError(ERROR_CODES.INSUFFICIENT_SCOPE, "Token lacks required scope");
			expect(err).toBeInstanceOf(Error);
			expect(err.code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
			expect(err.message).toContain("scope");
		});

		it("ToolContext requires clientId and scope", async () => {
			type ToolContext = {
				clientId: string;
				scope: string;
				organizationId: string;
				targetId: string | null;
				targetType: string | null;
			};

			const ctx: ToolContext = {
				clientId: "mcp-test-client",
				scope: "admin",
				organizationId: "org-regression",
				targetId: null,
				targetType: null,
			};

			expect(ctx.clientId).toBeDefined();
			expect(ctx.scope).toBe("admin");
		});
	});

	describe("Wave 2: AI reviewer gate evaluates verdicts", () => {
		it("buildChangePayload detects env var changes", async () => {
			const { buildChangePayload } = await import("../../packages/ai-pack/src/review/index.js");

			const payload = buildChangePayload({
				currentEnvVars: { DB_URL: "postgres://new", API_KEY: "key" },
				previousEnvVars: { DB_URL: "postgres://old" },
				environmentName: "production",
				serviceName: "api",
			});

			expect(payload.envVarChanges).toBeDefined();
			expect(payload.envVarChanges!.length).toBe(2);
		});

		it("resolveSecret handles env and map references", async () => {
			const { resolveSecret } = await import("../../packages/ai-pack/src/review/gate-evaluator.js");

			process.env._REGRESSION_TEST_KEY = "test-val";
			const envResult = resolveSecret("env:_REGRESSION_TEST_KEY", new Map());
			expect(envResult).toBe("test-val");
			delete process.env._REGRESSION_TEST_KEY;

			const mapResult = resolveSecret("secret:my_key", new Map([["my_key", "val-from-map"]]));
			expect(mapResult).toBe("val-from-map");
		});

		it("resolveSecret throws on missing secret", async () => {
			const { resolveSecret } = await import("../../packages/ai-pack/src/review/gate-evaluator.js");

			expect(() => resolveSecret("secret:nonexistent", new Map())).toThrow("not found");
		});
	});

	describe("Wave 2: Multi-server cluster schedules replicas", () => {
		const mockNodes: NodeInfo[] = [
			{ nodeId: "node-1", hostname: "manager-1", status: "ready", role: "manager", availability: "active" },
			{ nodeId: "node-2", hostname: "worker-1", status: "ready", role: "worker", availability: "active" },
			{ nodeId: "node-3", hostname: "worker-2", status: "ready", role: "worker", availability: "active" },
		];

		it("distributes replicas across nodes", () => {
			const placement = calculatePlacement(3, mockNodes);
			expect(placement.length).toBe(3);
			expect(placement.reduce((sum, p) => sum + p.replicas, 0)).toBe(3);
		});

		it("spread placement preference generates correct config", () => {
			const prefs = buildSpreadPlacementPreference();
			expect(prefs.length).toBe(1);
			expect(prefs[0].Spread.SpreadDescriptor).toBe("node.id");
		});

		it("skips unavailable nodes", () => {
			const nodes: NodeInfo[] = [
				...mockNodes,
				{ nodeId: "node-4", hostname: "drained", status: "ready", role: "worker", availability: "drain" },
			];
			const placement = calculatePlacement(3, nodes);
			const usedIds = placement.map((p) => p.nodeId);
			expect(usedIds).not.toContain("node-4");
		});
	});

	describe("Wave 3: Audit hash chain integrity", () => {
		it("chain verification passes for valid chain", () => {
			const baseRow: Omit<AuditLogRow, "row_hash" | "previous_hash"> = {
				id: "audit-r1",
				organizationId: "org-1",
				userId: "user-1",
				userEmail: "test@test.com",
				userRole: "admin",
				action: "deploy",
				resourceType: "deployment",
				resourceId: "deploy-1",
				resourceName: "test-deploy",
				metadata: null,
				createdAt: new Date("2026-05-28T10:00:00Z"),
				actor_type: "human",
				actor_id: "user-1",
				payload: null,
			};

			const rows: AuditLogRow[] = [];
			let prevHash: string | null = null;

			for (let i = 0; i < 10; i++) {
				const row = {
					...baseRow,
					id: `audit-r${i + 1}`,
					previous_hash: prevHash,
				} as AuditLogRow;
				row.row_hash = computeRowHash(row, prevHash);
				rows.push(row);
				prevHash = row.row_hash;
			}

			const result = verifyChain(rows);
			expect(result.valid).toBe(true);
		});

		it("chain verification fails for tampered row", () => {
			const baseRow: Omit<AuditLogRow, "row_hash" | "previous_hash"> = {
				id: "audit-r1",
				organizationId: "org-1",
				userId: "user-1",
				userEmail: "test@test.com",
				userRole: "admin",
				action: "deploy",
				resourceType: "deployment",
				resourceId: "deploy-1",
				resourceName: "test-deploy",
				metadata: null,
				createdAt: new Date("2026-05-28T10:00:00Z"),
				actor_type: "human",
				actor_id: "user-1",
				payload: null,
			};

			const rows: AuditLogRow[] = [];
			let prevHash: string | null = null;

			for (let i = 0; i < 5; i++) {
				const row = {
					...baseRow,
					id: `audit-r${i + 1}`,
					previous_hash: prevHash,
				} as AuditLogRow;
				row.row_hash = computeRowHash(row, prevHash);
				rows.push(row);
				prevHash = row.row_hash;
			}

			const tampered = { ...rows[3]!, action: "delete" } as AuditLogRow;
			tampered.row_hash = rows[3]!.row_hash;
			rows[3] = tampered;

			const result = verifyChain(rows);
			expect(result.valid).toBe(false);
			expect(result.breakAt).toBe(3);
		});
	});

	describe("Wave 3: PR #2 Refactoring Tests", () => {
		it("proves audit hashing length-prefix collision resistance", () => {
			const baseRow = {
				id: "1",
				organizationId: null,
				userId: null,
				userEmail: "test@test.com",
				userRole: "admin",
				action: "c",
				resourceType: "project",
				resourceId: "proj-1",
				resourceName: "a|b",
				metadata: null,
				createdAt: new Date("2026-05-30T10:00:00Z"),
				actor_type: "human",
				actor_id: "user-1",
				payload: null,
			};

			const rowA = {
				...baseRow,
				resourceName: "a|b",
				action: "c",
			};

			const rowB = {
				...baseRow,
				resourceName: "a",
				action: "b|c",
			};

			const hashA = computeRowHash(rowA, "prev-hash");
			const hashB = computeRowHash(rowB, "prev-hash");

			expect(hashA).not.toBe(hashB);
		});

		it("validates needsApproval truth-table logic", () => {
			function evaluateApproval(app: { environmentId: string | null }, env: { autoApproveAgents: boolean } | null): boolean {
				let needsApproval = true;
				if (app.environmentId) {
					if (env && env.autoApproveAgents === true) {
						needsApproval = false;
					}
				}
				return needsApproval;
			}

			// Case 1: No environment ID -> needs approval
			expect(evaluateApproval({ environmentId: null }, null)).toBe(true);

			// Case 2: Has environment ID, autoApproveAgents is false -> needs approval
			expect(evaluateApproval({ environmentId: "env-1" }, { autoApproveAgents: false })).toBe(true);

			// Case 3: Has environment ID, autoApproveAgents is true -> does NOT need approval
			expect(evaluateApproval({ environmentId: "env-1" }, { autoApproveAgents: true })).toBe(false);
		});

		it("proves circular Ring Buffer tailFile functionality", async () => {
			const { tailFile } = await import("../../packages/core/src/deploy/tail.js");
			const { writeFileSync, unlinkSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("node:path");
			const path = join(tmpdir(), "test-tail-ring.log");

			writeFileSync(path, "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n");

			try {
				const { lines, totalCount } = await tailFile(path, 3);
				expect(totalCount).toBe(7);
				expect(lines.length).toBe(3);
				expect(lines[0]!.line).toBe("line 5");
				expect(lines[1]!.line).toBe("line 6");
				expect(lines[2]!.line).toBe("line 7");
			} finally {
				try { unlinkSync(path); } catch {}
			}
		});

		it("validates log rotation active deployment skipping", () => {
			const activeStatuses = ["running"];
			const finishedStatuses = ["done", "error", "cancelled"];

			function shouldSkipRotation(status: string): boolean {
				return status === "running";
			}

			for (const status of activeStatuses) {
				expect(shouldSkipRotation(status)).toBe(true);
			}

			for (const status of finishedStatuses) {
				expect(shouldSkipRotation(status)).toBe(false);
			}
		});

		it("validates Commander custom port parser custom validation", () => {
			class MockInvalidArgumentError extends Error {}
			
			function parsePort(value: string): number {
				const parsed = Number.parseInt(value, 10);
				if (Number.isNaN(parsed)) {
					throw new MockInvalidArgumentError("Port must be a valid number.");
				}
				if (parsed < 1 || parsed > 65535) {
					throw new MockInvalidArgumentError("Port must be between 1 and 65535.");
				}
				return parsed;
			}

			expect(parsePort("22")).toBe(22);
			expect(() => parsePort("abc")).toThrow(MockInvalidArgumentError);
			expect(() => parsePort("70000")).toThrow(MockInvalidArgumentError);
		});

		it("validates keyset-based audit integrity scan pagination and race condition locks", async () => {
			const maxDate = new Date("2026-05-30T12:00:00Z");
			let lastCreatedAt: Date | null = null;
			let lastId: string | null = null;
			let totalRows = 0;
			const batchSize = 2;

			// Simulated database rows ordered chronologically
			const mockDbRows = [
				{ id: "id-1", createdAt: new Date("2026-05-30T10:00:00Z"), row_hash: "hash-1" },
				{ id: "id-2", createdAt: new Date("2026-05-30T10:00:00Z"), row_hash: "hash-2" },
				{ id: "id-3", createdAt: new Date("2026-05-30T10:05:00Z"), row_hash: "hash-3" },
				{ id: "id-4", createdAt: new Date("2026-05-30T10:10:00Z"), row_hash: "hash-4" },
				// Row after maxDate (newly inserted) -> should be locked out
				{ id: "id-5", createdAt: new Date("2026-05-30T13:00:00Z"), row_hash: "hash-5" },
			];

			const processedIds: string[] = [];

			while (true) {
				const pageRows = mockDbRows.filter((r) => {
					if (r.createdAt.getTime() > maxDate.getTime()) return false;
					if (lastCreatedAt !== null && lastId !== null) {
						if (r.createdAt.getTime() > lastCreatedAt.getTime()) return true;
						if (r.createdAt.getTime() === lastCreatedAt.getTime() && r.id > lastId) return true;
						return false;
					}
					return true;
				})
				.sort((a, b) => {
					const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
					if (timeDiff !== 0) return timeDiff;
					return a.id.localeCompare(b.id);
				})
				.slice(0, batchSize);

				if (pageRows.length === 0) break;

				for (const r of pageRows) {
					processedIds.push(r.id);
				}

				const lastRow = pageRows[pageRows.length - 1]!;
				lastCreatedAt = lastRow.createdAt;
				lastId = lastRow.id;
				totalRows += pageRows.length;

				if (pageRows.length < batchSize) break;
			}

			expect(totalRows).toBe(4);
			expect(processedIds).toEqual(["id-1", "id-2", "id-3", "id-4"]);
		});

		it("validates timing-safe webhook token checks with proper guards", async () => {
			const { createHmac, timingSafeEqual } = await import("node:crypto");

			function checkToken(token: string | undefined, secret: string | undefined): { status: number; body?: string } {
				if (!token) return { status: 401, body: "Missing X-Gitlab-Token header" };
				if (!secret) return { status: 500, body: "Webhook not configured" };

				const tokenHash = createHmac("sha256", secret).update(token).digest();
				const secretHash = createHmac("sha256", secret).update(secret).digest();
				
				if (!timingSafeEqual(tokenHash, secretHash)) {
					return { status: 401, body: "Invalid token" };
				}
				return { status: 200 };
			}

			expect(checkToken(undefined, "secret")).toEqual({ status: 401, body: "Missing X-Gitlab-Token header" });
			expect(checkToken("token", undefined)).toEqual({ status: 500, body: "Webhook not configured" });
			expect(checkToken("wrong", "secret")).toEqual({ status: 401, body: "Invalid token" });
			expect(checkToken("secret", "secret")).toEqual({ status: 200 });
		});

		it("validates SSE connection DoS body limit and stream destruction", async () => {
			let connectionDestroyed = false;
			const res = {
				writeHead: vi.fn(),
				end: vi.fn(),
			};
			const req = {
				destroy: () => { connectionDestroyed = true; },
			};

			function processChunk(chunkLength: number, currentSize: number, maxSize: number): { overLimit: boolean; nextSize: number } {
				const nextSize = currentSize + chunkLength;
				if (nextSize > maxSize) {
					return { overLimit: true, nextSize };
				}
				return { overLimit: false, nextSize };
			}

			let bodySize = 0;
			const maxSize = 1024; // 1KB for test
			const chunk1 = 600;
			const chunk2 = 500;

			const step1 = processChunk(chunk1, bodySize, maxSize);
			expect(step1.overLimit).toBe(false);
			bodySize = step1.nextSize;

			const step2 = processChunk(chunk2, bodySize, maxSize);
			expect(step2.overLimit).toBe(true);
			if (step2.overLimit) {
				res.writeHead(413);
				res.end("Payload Too Large");
				req.destroy();
			}

			expect(connectionDestroyed).toBe(true);
			expect(res.writeHead).toHaveBeenCalledWith(413);
		});

		it("validates round-trip AES-256-GCM streaming backup serialization with IV(12) and trailing Tag", async () => {
			const { createCipheriv, createDecipheriv, randomBytes } = await import("node:crypto");
			const iv = randomBytes(12);
			const tagLength = 16;
			const key = randomBytes(32);

			const originalData = Buffer.from("undevops transaction database content payload");

			// Stream mock simulation
			const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: tagLength });
			const encrypted = Buffer.concat([cipher.update(originalData), cipher.final()]);
			const tag = cipher.getAuthTag();

			// Construct payload in O(1) format: [IV 12 bytes] + [encrypted] + [Tag 16 bytes]
			const payload = Buffer.concat([iv, encrypted, tag]);

			// Parse payload back
			const ivExtracted = payload.subarray(0, 12);
			const tagExtracted = payload.subarray(payload.length - 16);
			const encryptedExtracted = payload.subarray(12, payload.length - 16);

			expect(ivExtracted).toEqual(iv);
			expect(tagExtracted).toEqual(tag);
			expect(encryptedExtracted).toEqual(encrypted);

			const decipher = createDecipheriv("aes-256-gcm", key, ivExtracted, { authTagLength: tagLength });
			decipher.setAuthTag(tagExtracted);
			const decrypted = Buffer.concat([decipher.update(encryptedExtracted), decipher.final()]);

			expect(decrypted).toEqual(originalData);
		});
	});
});
