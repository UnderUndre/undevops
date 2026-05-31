/**
 * @undevops/mcp-server — MCP gateway service
 *
 * Provides Model Context Protocol (MCP) access to undevops infrastructure.
 * Transport: stdio (JSON-RPC) + SSE (HTTP)
 *
 * Resources (P1):
 *   undevops://servers — list all registered servers with health status
 *   undevops://projects — list all projects with deployment status
 *   undevops://deployments — recent deployments (paginated)
 *   undevops://deployments/{id}/logs — deployment log lines
 *   undevops://audit — audit log (filterable)
 *   undevops://version — version info
 *
 * Tools (P2):
 *   undevops_deploy, undevops_rollback, undevops_scale
 *   undevops_inspect_deployment, undevops_get_logs
 */

import "dotenv/config";

const MCP_SERVER_VERSION = "0.1.0";

console.log(`[undevops/mcp-server] v${MCP_SERVER_VERSION} starting...`);
console.log("[undevops/mcp-server] Transport and resource handlers to be implemented in Phase 4");
