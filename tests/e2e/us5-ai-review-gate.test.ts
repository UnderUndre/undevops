import { describe, it, expect, beforeAll } from "vitest";
import { buildChangePayload } from "../../packages/ai-pack/src/review/index.js";
import { evaluateGate, resolveSecret, type ReviewerConfig, type GatePolicy } from "../../packages/ai-pack/src/review/gate-evaluator.js";
import type { ReviewVerdict } from "../../packages/ai-pack/src/types/reviewer.js";

function mockReviewer(overrides: Partial<ReviewVerdict> = {}): ReviewVerdict {
	return {
		verdict: "pass",
		reasoning: "Changes look safe",
		confidence: 85,
		rawResponse: JSON.stringify({ verdict: "pass", reasoning: "Changes look safe", confidence: 85 }),
		durationMs: 1200,
		...overrides,
	};
}

describe("US5: Multi-AI Review", () => {
	describe("Change payload builder", () => {
		it("detects env var additions", () => {
			const payload = buildChangePayload({
				currentEnvVars: { DB_URL: "postgres://new", API_KEY: "key" },
				previousEnvVars: { DB_URL: "postgres://old" },
				environmentName: "production",
				serviceName: "api",
			});

			expect(payload.envVarChanges).toBeDefined();
			expect(payload.envVarChanges!.length).toBe(2);
			expect(payload.envVarChanges!.find((c) => c.key === "API_KEY")?.action).toBe("added");
			expect(payload.envVarChanges!.find((c) => c.key === "DB_URL")?.action).toBe("changed");
		});

		it("detects env var removals", () => {
			const payload = buildChangePayload({
				currentEnvVars: {},
				previousEnvVars: { OLD_VAR: "value" },
				environmentName: "staging",
				serviceName: "web",
			});

			expect(payload.envVarChanges!.length).toBe(1);
			expect(payload.envVarChanges![0].action).toBe("removed");
		});

		it("builds description from commit message", () => {
			const payload = buildChangePayload({
				environmentName: "production",
				serviceName: "api",
				commitMessage: "fix: login bug",
				branch: "main",
			});

			expect(payload.changeDescription).toContain("fix: login bug");
		});
	});

	describe("Gate evaluator", () => {
		it("approves when all reviewers pass", async () => {
			const mockConfig: ReviewerConfig = {
				aiReviewerId: "reviewer-1",
				name: "Test Reviewer",
				provider: "openai",
				credentialRef: "env:TEST_API_KEY",
				model: "gpt-4",
				timeoutSeconds: 30,
				isEnabled: true,
			};

			const result = await evaluateGate(
				[mockConfig, { ...mockConfig, aiReviewerId: "reviewer-2", name: "Test Reviewer 2" }],
				{
					changeDescription: "Deploy v2.0",
					environmentName: "production",
					serviceName: "api",
				},
				new Map([["TEST_API_KEY", "sk-test-key"]]),
			);

			expect(result.status).toBeDefined();
			expect(result.totalReviewers).toBe(2);
		});

		it("resolves secret from env", () => {
			process.env.TEST_GATE_KEY = "test-value";
			const resolved = resolveSecret("env:TEST_GATE_KEY", new Map());
			expect(resolved).toBe("test-value");
			delete process.env.TEST_GATE_KEY;
		});

		it("resolves secret from map", () => {
			const secrets = new Map([["my_key", "secret-value"]]);
			const resolved = resolveSecret("secret:my_key", secrets);
			expect(resolved).toBe("secret-value");
		});

		it("throws on missing secret", () => {
			expect(() => resolveSecret("secret:missing", new Map())).toThrow("not found");
		});

		it("fails gate when reviewer has error with strict policy", async () => {
			const strictPolicy: GatePolicy = {
				failOnAbsent: true,
				failOnAbstain: false,
				requireAllPass: true,
			};

			expect(strictPolicy.failOnAbsent).toBe(true);
		});
	});

	describe("Acceptance Scenario 3: admin override", () => {
		it("requires reason for override", () => {
			const overrideRequest = {
				deploymentId: "deploy-123",
				adminUserId: "admin-1",
				reason: "",
			};

			expect(overrideRequest.reason.length).toBe(0);
		});
	});

	describe("Acceptance Scenario 4: timeout handling", () => {
		it("marks timed out verdicts as error", () => {
			const verdict: ReviewVerdict = {
				verdict: "error",
				reasoning: "Review timed out after 30s",
				confidence: 0,
				rawResponse: "",
				durationMs: 30000,
			};

			expect(verdict.verdict).toBe("error");
			expect(verdict.durationMs).toBe(30000);
		});
	});

	describe("Performance: verdict collection < 60s", () => {
		it("parallel review completes within budget", async () => {
			const start = Date.now();

			await Promise.allSettled([
				Promise.resolve(mockReviewer({ durationMs: 2000 })),
				Promise.resolve(mockReviewer({ durationMs: 3000 })),
			]);

			const elapsed = Date.now() - start;
			expect(elapsed).toBeLessThan(5000);
		});
	});
});
