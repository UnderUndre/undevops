import { createWriteStream } from "node:fs";
import { join } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
	[key: string]: unknown;
}

function formatLog(level: LogLevel, name: string, payload: LogPayload | null, msg: string): string {
	const ts = new Date().toISOString();
	const base = { level, time: ts, name, msg, ...payload };
	return JSON.stringify(base);
}

const stderr = process.stderr;

function createLogger(name: string) {
	const log = (level: LogLevel, payload: LogPayload | null, msg: string) => {
		stderr.write(formatLog(level, name, payload, msg) + "\n");
	};

	return {
		debug: (payload: LogPayload | string, msg?: string) => {
			if (typeof payload === "string") log("debug", null, payload);
			else log("debug", payload, msg ?? "");
		},
		info: (payload: LogPayload | string, msg?: string) => {
			if (typeof payload === "string") log("info", null, payload);
			else log("info", payload, msg ?? "");
		},
		warn: (payload: LogPayload | string, msg?: string) => {
			if (typeof payload === "string") log("warn", null, payload);
			else log("warn", payload, msg ?? "");
		},
		error: (payload: LogPayload | string, msg?: string) => {
			if (typeof payload === "string") log("error", null, payload);
			else log("error", payload, msg ?? "");
		},
	};
}

export { createLogger };
