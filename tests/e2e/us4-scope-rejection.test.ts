import { describe, it, expect, beforeAll } from "vitest";
import { handleDeploy } from "../../apps/mcp-server/src/tools/deploy.js";
import { ToolContext, McpError, ERROR_CODES } from "../../apps/mcp-server/src/tools/shared.js";

const READ_SCOPE_CTX: ToolContext = {
	clientId: "test-read-client",
	scope: "read",
	organizationId: "test-org",
	targetId: null,
	targetType: null,
};

describe("US4: Scope rejection (SC-010)", () => {
	it("read-scope token cannot deploy", async () => {
		try {
			await handleDeploy({ projectId: "any-project" }, READ_SCOPE_CTX);
			expect.unreachable("Should have thrown McpError");
		} catch (err) {
			expect(err).toBeInstanceOf(McpError);
			const mcpErr = err as McpError;
			expect(mcpErr.code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
			expect(mcpErr.message).toContain("read");
		}
	});

	it("read-scope token cannot rollback", async () => {
		const { handleRollback } = await import("../../apps/mcp-server/src/tools/rollback.js");
		try {
			await handleRollback({ projectId: "any-project" }, READ_SCOPE_CTX);
			expect.unreachable("Should have thrown McpError");
		} catch (err) {
			expect(err).toBeInstanceOf(McpError);
			expect((err as McpError).code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
		}
	});

	it("read-scope token cannot scale", async () => {
		const { handleScale } = await import("../../apps/mcp-server/src/tools/scale.js");
		try {
			await handleScale({ projectId: "any-project", replicas: 2 }, READ_SCOPE_CTX);
			expect.unreachable("Should have thrown McpError");
		} catch (err) {
			expect(err).toBeInstanceOf(McpError);
			expect((err as McpError).code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
		}
	});

	it("no pending state created when scope is insufficient", async () => {
		const { db, eq } = await import("@undevops/server/db");
		const { pendingAgentActions } = await import("@undevops/server/db/schema/pending-agent-action");

		const beforeCount = await db
			.select({ id: pendingAgentActions.actionId })
			.from(pendingAgentActions)
			.where(eq(pendingAgentActions.mcpClientId, READ_SCOPE_CTX.clientId));

		const beforeLen = beforeCount.length;

		try {
			await handleDeploy({ projectId: "any-project" }, READ_SCOPE_CTX);
		} catch {
			// expected
		}

		const afterCount = await db
			.select({ id: pendingAgentActions.actionId })
			.from(pendingAgentActions)
			.where(eq(pendingAgentActions.mcpClientId, READ_SCOPE_CTX.clientId));

		expect(afterCount.length).toBe(beforeLen);
	});
});
