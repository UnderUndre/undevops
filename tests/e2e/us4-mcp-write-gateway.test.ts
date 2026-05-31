import { describe, it, expect, beforeAll } from "vitest";
import { db, eq } from "@undevops/server/db";
import { pendingAgentActions } from "@undevops/server/db/schema/pending-agent-action";
import { deployments } from "@undevops/server/db/schema/deployment";
import { applications } from "@undevops/server/db/schema/application";
import { environments } from "@undevops/server/db/schema/environment";
import { projects } from "@undevops/server/db/schema/project";
import { mcpClients } from "@undevops/server/db/schema/mcp-client";
import { organization } from "@undevops/server/db/schema/account";
import { nanoid } from "nanoid";
import { resolveApplicationForProject } from "../../apps/mcp-server/src/tools/deploy.js";
import { handleDeploy } from "../../apps/mcp-server/src/tools/deploy.js";
import { handleRollback } from "../../apps/mcp-server/src/tools/rollback.js";
import { handleScale } from "../../apps/mcp-server/src/tools/scale.js";
import { getActionProgress } from "../../apps/mcp-server/src/action-progress.js";
import { approvePendingAction, rejectPendingAction } from "../../packages/server/src/services/pending-action.js";
import { executeApprovedAction } from "../../apps/mcp-server/src/approval-flow.js";
import { ToolContext } from "../../apps/mcp-server/src/tools/shared.js";
import { McpError, ERROR_CODES } from "../../apps/mcp-server/src/tools/shared.js";
import { checkNoPendingAction } from "../../apps/mcp-server/src/concurrency.js";

const TEST_ORG_ID = "test-org-us4-" + nanoid(8);
const TEST_PROJECT_ID = "test-proj-us4-" + nanoid(8);
const TEST_ENV_ID = "test-env-us4-" + nanoid(8);
const TEST_APP_ID = "test-app-us4-" + nanoid(8);
const TEST_MCP_CLIENT_ID = "test-mcp-" + nanoid(8);
const TEST_USER_ID = "test-user-" + nanoid(8);

const testCtx: ToolContext = {
	clientId: TEST_MCP_CLIENT_ID,
	scope: "admin",
	organizationId: TEST_ORG_ID,
	targetId: null,
	targetType: null,
};

async function seedTestFixtures() {
	await db.insert(organization).values({
		id: TEST_ORG_ID,
		name: "Test Org US4",
		ownerId: TEST_USER_ID,
	}).onConflictDoNothing();

	await db.insert(projects).values({
		projectId: TEST_PROJECT_ID,
		name: "Test Project US4",
		organizationId: TEST_ORG_ID,
	}).onConflictDoNothing();

	await db.insert(environments).values({
		environmentId: TEST_ENV_ID,
		name: "default",
		projectId: TEST_PROJECT_ID,
		autoApproveAgents: false,
	}).onConflictDoNothing();

	await db.insert(applications).values({
		applicationId: TEST_APP_ID,
		name: "test-app-us4",
		appName: "test-app-us4",
		projectId: TEST_PROJECT_ID,
		environmentId: TEST_ENV_ID,
		replicas: 1,
	}).onConflictDoNothing();

	await db.insert(mcpClients).values({
		mcpClientId: TEST_MCP_CLIENT_ID,
		name: "Test MCP Client",
		scope: "admin",
		tokenHash: "test-hash-us4",
		organizationId: TEST_ORG_ID,
	}).onConflictDoNothing();
}

describe("US4: MCP Write Gateway", () => {
	beforeAll(async () => {
		await seedTestFixtures();
	});

	describe("Acceptance Scenario 1: Deploy with approval", () => {
		it("creates pending action when deploying", async () => {
			const result = await handleDeploy(
				{ projectId: TEST_PROJECT_ID, description: "Test deploy via MCP" },
				testCtx,
			);

			expect(result.deploymentId).toBeDefined();
			expect(result.status).toBe("queued");
			expect(result.pendingApproval).toBe(true);

			const progress = await getActionProgress(
				await db.select({ actionId: pendingAgentActions.actionId })
					.from(pendingAgentActions)
					.where(eq(pendingAgentActions.deploymentId, result.deploymentId as string))
					.limit(1)
					.then(r => r[0]?.actionId ?? ""),
			);

			expect(progress.status).toBe("pending");
		});
	});

	describe("Acceptance Scenario 2: Approve → deployment proceeds", () => {
		it("approves action and records audit", async () => {
			const pendingRows = await db
				.select()
				.from(pendingAgentActions)
				.where(eq(pendingAgentActions.status, "pending"))
				.limit(1);

			if (pendingRows.length === 0) return;

			const action = pendingRows[0];
			const result = await approvePendingAction(action.actionId, TEST_ORG_ID, TEST_USER_ID, "Test approve");

			expect(result.status).toBe("approved");

			const execResult = await executeApprovedAction(action.actionId);
			expect(execResult.status).toBe("executing");
		});
	});

	describe("Acceptance Scenario 3: Out-of-scope rejection", () => {
		it("rejects token with wrong scope", async () => {
			const limitedCtx: ToolContext = {
				...testCtx,
				scope: "read",
				targetId: "other-project",
			};

			await expect(
				handleDeploy({ projectId: TEST_PROJECT_ID }, limitedCtx),
			).rejects.toThrow();

			try {
				await handleDeploy({ projectId: TEST_PROJECT_ID }, limitedCtx);
			} catch (err) {
				expect(err).toBeInstanceOf(McpError);
				expect((err as McpError).code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
			}
		});

		it("rejects token scoped to different target", async () => {
			const scopedCtx: ToolContext = {
				...testCtx,
				targetId: "different-project-id",
			};

			await expect(
				handleDeploy({ projectId: TEST_PROJECT_ID }, scopedCtx),
			).rejects.toThrow();
		});
	});

	describe("Concurrency: race detection", () => {
		it("returns CONFLICT error for duplicate actions", async () => {
			const existing = await db
				.select({ actionId: pendingAgentActions.actionId })
				.from(pendingAgentActions)
				.where(eq(pendingAgentActions.status, "pending"))
				.limit(1);

			if (existing.length > 0) {
				const targetId = existing[0].actionId;
				await expect(checkNoPendingAction(targetId)).rejects.toThrow();
			}
		});
	});

	describe("Rollback tool", () => {
		it("creates rollback pending action", async () => {
			await expect(
				handleRollback({ projectId: TEST_PROJECT_ID, reason: "Test rollback" }, testCtx),
			).resolves.toMatchObject({
				status: "queued",
			});
		});
	});

	describe("Scale tool", () => {
		it("creates scale pending action with exec scope", async () => {
			const result = await handleScale(
				{ projectId: TEST_PROJECT_ID, replicas: 3 },
				testCtx,
			);

			expect(result.previousReplicas).toBeDefined();
			expect(result.status).toBe("scaling");
			expect(result.pendingApproval).toBe(true);
		});

		it("rejects scale with deploy scope", async () => {
			const deployCtx: ToolContext = { ...testCtx, scope: "deploy" };

			try {
				await handleScale({ projectId: TEST_PROJECT_ID, replicas: 2 }, deployCtx);
				expect.unreachable("Should have thrown");
			} catch (err) {
				expect(err).toBeInstanceOf(McpError);
				expect((err as McpError).code).toBe(ERROR_CODES.INSUFFICIENT_SCOPE);
			}
		});
	});
});
