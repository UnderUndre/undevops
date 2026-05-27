import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const REPO_ROOT = join(__dirname, "../..");

const REDACTION_MODULE = join(
	REPO_ROOT,
	"apps/mcp-server/src/redaction.ts",
).replace(/\\/g, "/");

describe("T133: Redaction Coverage — Integration", () => {
	let redaction: typeof import("../../apps/mcp-server/src/redaction.ts");

	beforeEach(async () => {
		redaction = await import(REDACTION_MODULE);
		redaction.clearSecretValues();
	});

	afterEach(() => {
		redaction.clearSecretValues();
	});

	describe("redactString", () => {
		it("replaces a single registered secret value", () => {
			redaction.registerSecretValues(["super-secret-api-key-123"]);
			const result = redaction.redactString(
				"key=super-secret-api-key-123",
			);
			expect(result).toBe("key=***REDACTED***");
		});

		it("replaces multiple different secret values", () => {
			redaction.registerSecretValues([
				"secret-one-aaaa",
				"secret-two-bbbb",
			]);
			const result = redaction.redactString(
				"a=secret-one-aaaa b=secret-two-bbbb",
			);
			expect(result).toBe("a=***REDACTED*** b=***REDACTED***");
		});

		it("replaces repeated occurrences of the same secret", () => {
			redaction.registerSecretValues(["repeat-secret-xyz"]);
			const result = redaction.redactString(
				"repeat-secret-xyz and repeat-secret-xyz",
			);
			expect(result).toBe("***REDACTED*** and ***REDACTED***");
		});

		it("handles secrets embedded in JSON strings", () => {
			redaction.registerSecretValues(["embedded-secret-value"]);
			const result = redaction.redactString(
				'{"password":"embedded-secret-value","name":"app"}',
			);
			expect(result).not.toContain("embedded-secret-value");
			expect(result).toContain("***REDACTED***");
		});

		it("handles secrets with special regex characters", () => {
			redaction.registerSecretValues(["secret.$*+?{}()[]"]);
			const result = redaction.redactString(
				"token=secret.$*+?{}()[]",
			);
			expect(result).not.toContain("secret.$*+?{}()[]");
			expect(result).toContain("***REDACTED***");
		});

		it("preserves surrounding content when replacing", () => {
			redaction.registerSecretValues(["my-secret-value"]);
			const result = redaction.redactString(
				"prefix-my-secret-value-suffix",
			);
			expect(result).toBe("prefix-***REDACTED***-suffix");
		});

		it("does not replace empty or short values (≤3 chars)", () => {
			redaction.registerSecretValues(["", "ab", "abc"]);
			const result = redaction.redactString("values: ab abc");
			expect(result).toBe("values: ab abc");
		});
	});

	describe("redactJson", () => {
		it("redacts secret in top-level string field", () => {
			redaction.registerSecretValues(["top-level-secret"]);
			const input = { token: "top-level-secret", name: "app" };
			const result = redaction.redactJson(input);

			expect(result.token).toBe("***REDACTED***");
			expect(result.name).toBe("app");
		});

		it("redacts secrets in nested objects", () => {
			redaction.registerSecretValues(["nested-secret-val"]);
			const input = {
				config: { database: { password: "nested-secret-val" } },
			};
			const result = redaction.redactJson(input);

			expect(result.config.database.password).toBe(
				"***REDACTED***",
			);
		});

		it("redacts secrets in array elements", () => {
			redaction.registerSecretValues(["array-secret-val"]);
			const input = {
				envVars: [
					{ key: "API_KEY", value: "array-secret-val" },
					{ key: "HOST", value: "localhost" },
				],
			};
			const result = redaction.redactJson(input);

			expect(result.envVars[0].value).toBe("***REDACTED***");
			expect(result.envVars[1].value).toBe("localhost");
		});

		it("redacts secrets embedded in stringified JSON within a field", () => {
			redaction.registerSecretValues(["json-embedded-secret"]);
			const input = {
				config: '{"token":"json-embedded-secret"}',
			};
			const result = redaction.redactJson(input);

			expect(result.config).not.toContain("json-embedded-secret");
			expect(result.config).toContain("***REDACTED***");
		});

		it("handles multiple secrets across different fields", () => {
			redaction.registerSecretValues([
				"secret-alpha-111",
				"secret-beta-222",
			]);
			const input = {
				db: { url: "postgres://user:secret-alpha-111@host/db" },
				api: { key: "secret-beta-222" },
			};
			const result = redaction.redactJson(input);

			expect(result.db.url).not.toContain("secret-alpha-111");
			expect(result.api.key).not.toContain("secret-beta-222");
			expect(JSON.stringify(result)).toContain("***REDACTED***");
		});

		it("returns structurally equivalent object (same keys)", () => {
			redaction.registerSecretValues(["struct-secret-xxx"]);
			const input = {
				a: 1,
				b: "struct-secret-xxx",
				c: { d: [1, 2] },
				e: true,
				f: null,
			};
			const result = redaction.redactJson(input);

			expect(Object.keys(result)).toEqual(["a", "b", "c", "e", "f"]);
			expect(Object.keys(result.c)).toEqual(["d"]);
			expect(result.a).toBe(1);
			expect(result.e).toBe(true);
			expect(result.f).toBeNull();
		});

		it("redacts secrets in deployment-like response shape", () => {
			redaction.registerSecretValues(["deploy-secret-token"]);
			const input = {
				items: [
					{
						deploymentId: "dep-1",
						status: "running",
						envVars: JSON.stringify({
							SECRET_TOKEN: "deploy-secret-token",
						}),
						logs: "Deploying... deploy-secret-token ...done",
					},
				],
				total: 1,
				page: 1,
			};
			const result = redaction.redactJson(input);
			const serialized = JSON.stringify(result);

			expect(serialized).not.toContain("deploy-secret-token");
			expect(serialized).toContain("***REDACTED***");
		});

		it("redacts secrets in server-like response with connection strings", () => {
			redaction.registerSecretValues(["server-pass-9999"]);
			const input = {
				serverId: "srv-1",
				name: "production",
				connectionString:
					"postgresql://admin:server-pass-9999@db.example.com:5432/mydb",
				metadata: { notes: "password is server-pass-9999" },
			};
			const result = redaction.redactJson(input);
			const serialized = JSON.stringify(result);

			expect(serialized).not.toContain("server-pass-9999");
		});

		it("redacts secrets in audit log entries", () => {
			redaction.registerSecretValues(["audit-secret-777"]);
			const input = {
				items: [
					{
						action: "update",
						resourceType: "security",
						metadata: {
							payload: {
								previousValue: "audit-secret-777",
							},
						},
					},
				],
				total: 1,
			};
			const result = redaction.redactJson(input);
			const serialized = JSON.stringify(result);

			expect(serialized).not.toContain("audit-secret-777");
			expect(serialized).toContain("***REDACTED***");
		});

		it("handles log-like data with secrets in message content", () => {
			redaction.registerSecretValues(["log-cred-5555"]);
			const input = {
				lines: [
					{
						lineNumber: 1,
						message: "Connected with token=log-cred-5555",
						raw: "2025-01-01 Connected with token=log-cred-5555",
					},
				],
				total: 1,
			};
			const result = redaction.redactJson(input);
			const serialized = JSON.stringify(result);

			expect(serialized).not.toContain("log-cred-5555");
		});
	});

	describe("registerSecretValues / clearSecretValues", () => {
		it("registerSecretValues ignores empty strings and nullish values", () => {
			redaction.registerSecretValues([
				"",
				undefined as unknown as string,
				null as unknown as string,
				"valid-secret-value",
			]);

			const result = redaction.redactString(
				"empty= valid-secret-value",
			);
			expect(result).toContain("***REDACTED***");
		});

		it("clearSecretValues removes all registered secrets", () => {
			redaction.registerSecretValues(["to-be-cleared-secret"]);
			redaction.clearSecretValues();

			const result = redaction.redactString(
				"value=to-be-cleared-secret",
			);
			expect(result).toContain("to-be-cleared-secret");
			expect(result).not.toContain("***REDACTED***");
		});

		it("re-registering after clear works correctly", () => {
			redaction.registerSecretValues(["old-secret-value"]);
			redaction.clearSecretValues();
			redaction.registerSecretValues(["new-secret-value"]);

			const result = redaction.redactString(
				"old=old-secret-value new=new-secret-value",
			);
			expect(result).toContain("old-secret-value");
			expect(result).not.toContain("old-***REDACTED***");
			expect(result).toContain("***REDACTED***");
		});
	});
});
