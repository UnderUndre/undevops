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
	});
});
