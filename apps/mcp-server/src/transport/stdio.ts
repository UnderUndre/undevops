import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:stdio");

export async function startStdioServer(mcpServer: McpServer): Promise<void> {
	const transport = new StdioServerTransport();

	transport.onclose = () => {
		logger.info("stdio transport closed");
	};

	transport.onerror = (err: Error) => {
		logger.error({ err: err.message }, "stdio transport error");
	};

	await mcpServer.connect(transport);
	logger.info("undevops MCP server running on stdio");
}
