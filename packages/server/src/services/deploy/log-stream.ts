import { createReadStream, existsSync, statSync, watchFile } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createInterface } from "node:readline";
import { logger } from "../../lib/logger.js";

interface LogStreamOptions {
	logPath: string;
	follow?: boolean;
	tail?: number;
}

export function handleLogStream(req: IncomingMessage, res: ServerResponse, options: LogStreamOptions) {
	const { logPath, follow = true, tail = 100 } = options;

	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
	});

	const sendEvent = (data: string, event = "log") => {
		res.write(`event: ${event}\ndata: ${JSON.stringify({ line: data })}\n\n`);
	};

	if (!existsSync(logPath)) {
		sendEvent("Log file not found", "error");
		res.end();
		return;
	}

	let lastSize = 0;
	try {
		lastSize = statSync(logPath).size;
	} catch {
		lastSize = 0;
	}

	const readTail = () => {
		const lines: string[] = [];
		const stream = createReadStream(logPath, { encoding: "utf8" });
		const rl = createInterface({ input: stream, crlfDelay: Infinity });

		rl.on("line", (line) => {
			lines.push(line);
		});

		rl.on("close", () => {
			const tailLines = lines.slice(-tail);
			for (const line of tailLines) {
				sendEvent(line);
			}

			if (follow) {
				watchForNewLines();
			} else {
				sendEvent("", "done");
				res.end();
			}
		});
	};

	const watchForNewLines = () => {
		watchFile(logPath, { interval: 500 }, (curr) => {
			if (curr.size < lastSize) {
				lastSize = 0;
			}

			if (curr.size > lastSize) {
				const stream = createReadStream(logPath, {
					start: lastSize,
					encoding: "utf8",
				});
				const rl = createInterface({ input: stream, crlfDelay: Infinity });

				rl.on("line", (line) => {
					sendEvent(line);
				});

				rl.on("close", () => {
					lastSize = curr.size;
				});
			}
		});

		req.on("close", () => {
			try {
				const { unwatchFile } = require("node:fs");
				unwatchFile(logPath);
			} catch {}
		});
	};

	readTail();
}

export function createLogStreamHandler(getLogPath: (deploymentId: string) => string | null) {
	return async (c: { req: { header(name: string): string | undefined; on: (event: string, cb: () => void) => void }; param: (name: string) => string; write: (data: string) => void; end: () => void; setHeader: (name: string, value: string) => void }) => {
		const deploymentId = c.param("deploymentId");
		if (!deploymentId) {
			return { status: 400, body: { error: "deploymentId required" } };
		}

		const logPath = getLogPath(deploymentId);
		if (!logPath) {
			return { status: 404, body: { error: "Deployment not found" } };
		}

		const tail = Number.parseInt(c.req.header("X-Tail-Lines") || "100", 10);

		return {
			status: 200,
			stream: true,
			handler: (req: IncomingMessage, res: ServerResponse) => {
				handleLogStream(req, res, { logPath, follow: true, tail });
			},
		};
	};
}
