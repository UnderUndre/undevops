import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { extractBearerToken, validateBearerToken } from "../auth/bearer-token.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:sse");

const HEARTBEAT_INTERVAL_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 300_000;

interface ActiveSession {
	transport: SSEServerTransport;
	heartbeat: ReturnType<typeof setInterval>;
	timeout: ReturnType<typeof setTimeout>;
}

const sessions = new Map<string, ActiveSession>();

function cleanupSession(sessionId: string): void {
	const session = sessions.get(sessionId);
	if (!session) return;

	clearInterval(session.heartbeat);
	clearTimeout(session.timeout);
	sessions.delete(sessionId);
	logger.info({ sessionId }, "session cleaned up");
}

function resetTimeout(sessionId: string): void {
	const session = sessions.get(sessionId);
	if (!session) return;

	clearTimeout(session.timeout);
	session.timeout = setTimeout(() => {
		logger.info({ sessionId }, "connection timeout, closing");
		session.transport.close().catch((err: Error) => {
			logger.error({ err: err.message, sessionId }, "error closing transport on timeout");
		});
		cleanupSession(sessionId);
	}, CONNECTION_TIMEOUT_MS);
}

async function handleAuth(req: IncomingMessage): Promise<string | null> {
	let token = extractBearerToken(req.headers.authorization);

	if (!token) {
		const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
		token = url.searchParams.get("token") ?? null;
	}

	if (!token) return null;

	const result = await validateBearerToken(token);
	if (!result.valid) {
		logger.warn({ error: result.error }, "SSE auth failed");
		return null;
	}

	return result.clientId ?? null;
}

export async function startSseServer(mcpServer: McpServer, port: number, host = "0.0.0.0"): Promise<void> {
	const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

		if (req.method === "GET" && url.pathname === "/sse") {
			const clientId = await handleAuth(req);
			if (!clientId) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}

			const transport = new SSEServerTransport("/messages", res);

			const sessionId = transport.sessionId;
			const heartbeat = setInterval(() => {
				try {
					res.write(": heartbeat\n\n");
				} catch {
					cleanupSession(sessionId);
				}
			}, HEARTBEAT_INTERVAL_MS);

			const timeout = setTimeout(() => {
				transport.close().catch((err: Error) => {
					logger.error({ err: err.message, sessionId }, "timeout close error");
				});
				cleanupSession(sessionId);
			}, CONNECTION_TIMEOUT_MS);

			sessions.set(sessionId, { transport, heartbeat, timeout });

			transport.onclose = () => {
				cleanupSession(sessionId);
			};

			transport.onerror = (err: Error) => {
				logger.error({ err: err.message, sessionId }, "SSE transport error");
				cleanupSession(sessionId);
			};

			await mcpServer.connect(transport);
			logger.info({ sessionId, clientId }, "SSE session established");
			return;
		}

		if (req.method === "POST" && url.pathname === "/messages") {
			const clientId = await handleAuth(req);
			if (!clientId) {
				res.writeHead(401, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Unauthorized" }));
				return;
			}

			let body = "";
			let bodySize = 0;
			const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit
			for await (const chunk of req) {
				bodySize += chunk.length;
				if (bodySize > MAX_BODY_SIZE) {
					res.writeHead(413, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Payload Too Large" }));
					req.destroy();
					return;
				}
				body += chunk;
			}

			const sessionId = url.searchParams.get("sessionId") ?? "";
			const session = sessions.get(sessionId);

			if (!session) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Session not found" }));
				return;
			}

			resetTimeout(sessionId);

			let parsed: unknown;
			try {
				parsed = JSON.parse(body);
			} catch {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Invalid JSON" }));
				return;
			}

			await session.transport.handlePostMessage(
				Object.assign(req, { auth: undefined }) as IncomingMessage & { auth?: undefined },
				res,
				parsed,
			);
			return;
		}

		res.writeHead(404);
		res.end("Not found");
	});

	httpServer.listen(port, host, () => {
		logger.info({ port, host }, "undevops MCP SSE server listening");
	});
}
