/**
 * @undevops/mcp-server — MCP gateway server
 *
 * Provides:
 * - stdio and SSE transports for MCP protocol
 * - Resource handlers (servers, projects, deployments, logs, audit, version)
 * - Tool handlers (deploy, rollback, scale, inspect)
 * - Bearer token auth with SHA-256 hash lookup
 * - Secret redaction middleware
 */

export const MCP_SERVER_VERSION = "0.1.0";

export * as bearerAuth from "./auth/bearer-token.js";
export * as redaction from "./redaction.js";
