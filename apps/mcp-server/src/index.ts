import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startSseServer } from "./transport/sse.js";
import { startStdioServer } from "./transport/stdio.js";
import { extractBearerToken, validateBearerToken } from "./auth/bearer-token.js";
import { McpError, ERROR_CODES, type ToolContext, type ToolDefinition } from "./tools/shared.js";

// Import all resources
import { listServers, getServer } from "./resources/servers.js";
import { listProjects, getProject } from "./resources/projects.js";
import { listDeployments, getDeployment } from "./resources/deployments.js";
import { readDeploymentLogs } from "./resources/logs.js";
import { listAuditEntries } from "./resources/audit.js";
import { getVersionInfo } from "./resources/version.js";
import { getBackupStatus } from "./resources/backup-status.js";

// Import all tools
import {
	deployTool, registerDeploy,
	rollbackTool, registerRollback,
	scaleTool, registerScale,
	inspectTool, registerInspect,
	getLogsTool, registerGetLogs
} from "./tools/index.js";

export const MCP_SERVER_VERSION = "0.1.0";

export * as bearerAuth from "./auth/bearer-token.js";
export * as redaction from "./redaction.js";
export * as transport from "./transport/index.js";
export * as resources from "./resources/index.js";
export * as middleware from "./middleware/index.js";
export * as tools from "./tools/index.js";

async function startMcpServer() {
	const mcpServer = new McpServer({
		name: "undevops-mcp-server",
		version: MCP_SERVER_VERSION,
	});

	// Helper to register tools with Auth
	const registerToolWithAuth = (toolDef: ToolDefinition, wrappedHandler: any) => {
		mcpServer.tool(
			toolDef.name,
			toolDef.description,
			toolDef.inputSchema,
			async (args, extra) => {
				const authHeader = extra?._meta?.authorization as string | undefined;
				const token = extractBearerToken(authHeader);
				if (!token) {
					throw new McpError(ERROR_CODES.AUTH_FAILED, "Missing bearer token");
				}
				const authResult = await validateBearerToken(token);
				if (!authResult.valid) {
					throw new McpError(ERROR_CODES.AUTH_FAILED, authResult.error ?? "Invalid bearer token");
				}
				const ctx: ToolContext = {
					clientId: authResult.clientId!,
					scope: authResult.scope!,
					organizationId: authResult.organizationId!,
					targetId: authResult.targetId ?? null,
					targetType: authResult.targetType ?? null,
				};
				const customExtra = {
					...extra,
					__toolContext: ctx,
				};
				return await wrappedHandler(args, customExtra);
			}
		);
	};

	// Helper to register static resources with Auth
	const registerStaticResourceWithAuth = (name: string, uri: string, handler: (uri: URL) => Promise<any>) => {
		mcpServer.resource(name, uri, async (resolvedUri, extra) => {
			const authHeader = extra?._meta?.authorization as string | undefined;
			const token = extractBearerToken(authHeader);
			if (!token) {
				throw new McpError(ERROR_CODES.AUTH_FAILED, "Missing bearer token");
			}
			const authResult = await validateBearerToken(token);
			if (!authResult.valid) {
				throw new McpError(ERROR_CODES.AUTH_FAILED, authResult.error ?? "Invalid bearer token");
			}
			const data = await handler(resolvedUri);
			return { contents: [{ uri: resolvedUri.href, text: JSON.stringify(data) }] };
		});
	};

	// Helper to register template resources with Auth
	const registerTemplateResourceWithAuth = (name: string, templatePattern: string, handler: (uri: URL, params: Record<string, string>) => Promise<any>) => {
		mcpServer.resource(name, new ResourceTemplate(templatePattern, { list: undefined }), async (resolvedUri, params, extra) => {
			const authHeader = extra?._meta?.authorization as string | undefined;
			const token = extractBearerToken(authHeader);
			if (!token) {
				throw new McpError(ERROR_CODES.AUTH_FAILED, "Missing bearer token");
			}
			const authResult = await validateBearerToken(token);
			if (!authResult.valid) {
				throw new McpError(ERROR_CODES.AUTH_FAILED, authResult.error ?? "Invalid bearer token");
			}
			const data = await handler(resolvedUri, params as Record<string, string>);
			return { contents: [{ uri: resolvedUri.href, text: JSON.stringify(data) }] };
		});
	};

	// Register Tools
	registerToolWithAuth(deployTool, registerDeploy);
	registerToolWithAuth(rollbackTool, registerRollback);
	registerToolWithAuth(scaleTool, registerScale);
	registerToolWithAuth(inspectTool, registerInspect);
	registerToolWithAuth(getLogsTool, registerGetLogs);

	// Register Resources
	registerStaticResourceWithAuth("List all servers", "undevops://servers", async () => {
		return await listServers();
	});

	registerTemplateResourceWithAuth("Get single server details", "undevops://servers/{serverId}", async (uri, params) => {
		return await getServer(params.serverId);
	});

	registerStaticResourceWithAuth("List all projects", "undevops://projects", async () => {
		return await listProjects();
	});

	registerTemplateResourceWithAuth("Get single project details", "undevops://projects/{projectId}", async (uri, params) => {
		return await getProject(params.projectId);
	});

	registerTemplateResourceWithAuth("Get project deployment history", "undevops://projects/{projectId}/deployments", async (uri, params) => {
		const url = new URL(uri.href);
		const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
		const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined;
		return await listDeployments({ applicationId: params.projectId, pageSize: limit, page: offset ? Math.floor(offset / (limit ?? 50)) + 1 : undefined });
	});

	registerTemplateResourceWithAuth("Get single deployment details", "undevops://deployments/{deploymentId}", async (uri, params) => {
		return await getDeployment(params.deploymentId);
	});

	registerTemplateResourceWithAuth("Get deployment logs", "undevops://deployments/{deploymentId}/logs", async (uri, params) => {
		const url = new URL(uri.href);
		const lines = url.searchParams.get("lines") ? Number(url.searchParams.get("lines")) : undefined;
		const level = url.searchParams.get("level") ?? undefined;
		const search = url.searchParams.get("search") ?? undefined;
		const since = url.searchParams.get("since") ?? undefined;

		const deployment = await getDeployment(params.deploymentId);
		if (!deployment || !deployment.logPath) {
			return { lines: [], totalMatched: 0, returnedCount: 0 };
		}

		const logs = await readDeploymentLogs({
			deploymentId: params.deploymentId,
			logPath: deployment.logPath,
			tail: lines,
			level,
			search,
			since,
		});

		return {
			deploymentId: params.deploymentId,
			lines: logs.lines,
			totalMatched: logs.filtered,
			returnedCount: logs.lines.length,
		};
	});

	registerStaticResourceWithAuth("Get audit trail", "undevops://audit", async (uri) => {
		const url = new URL(uri.href);
		const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
		const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined;
		const actor_type = url.searchParams.get("actor_type") ?? undefined;
		const target_resource = url.searchParams.get("target_resource") ?? undefined;
		const action = url.searchParams.get("action") ?? undefined;
		const since = url.searchParams.get("since") ?? undefined;
		const until = url.searchParams.get("until") ?? undefined;

		return await listAuditEntries({
			actorType: actor_type,
			action,
			resourceType: target_resource,
			from: since,
			to: until,
			pageSize: limit,
			page: offset ? Math.floor(offset / (limit ?? 50)) + 1 : undefined,
		});
	});

	registerStaticResourceWithAuth("Get platform version information", "undevops://version", async () => {
		return await getVersionInfo();
	});

	registerStaticResourceWithAuth("Get database backup status", "undevops://backup-status", async () => {
		return await getBackupStatus();
	});

	// Start Transport
	const ssePort = process.env.MCP_SSE_PORT;
	if (ssePort) {
		const port = Number(ssePort);
		console.info(`Starting MCP SSE server on port ${port}...`);
		await startSseServer(mcpServer, port);
	} else {
		console.info("Starting MCP stdio server...");
		await startStdioServer(mcpServer);
	}
}

// Automatically start if executed as main file or in production
const isMain = import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV === "production" || process.env.MCP_SSE_PORT;
if (isMain) {
	startMcpServer().catch((err) => {
		console.error("Failed to start MCP server:", err);
		process.exit(1);
	});
}
