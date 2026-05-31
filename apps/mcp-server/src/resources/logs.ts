import { stat } from "node:fs/promises";
import { redactString } from "../redaction.js";
import { createLogger } from "../lib/logger.js";
import { tailFile } from "@undevops/core";

const logger = createLogger("undevops:mcp:resources:logs");

const DEFAULT_TAIL_LINES = 200;
const MAX_TAIL_LINES = 10_000;

interface ReadLogsOptions {
	deploymentId: string;
	logPath: string;
	tail?: number;
	level?: string;
	search?: string;
	since?: string;
}

interface LogEntry {
	lineNumber: number;
	timestamp: string | null;
	level: string | null;
	message: string;
	raw: string;
}

function parseLogLine(line: string, num: number): LogEntry {
	const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
	const levelMatch = line.match(/\b(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\b/i);

	return {
		lineNumber: num,
		timestamp: isoMatch?.[1] ?? null,
		level: levelMatch?.[1]?.toUpperCase() ?? null,
		message: line,
		raw: line,
	};
}

function matchesFilters(entry: LogEntry, level?: string, search?: string, since?: string): boolean {
	if (level && entry.level !== level.toUpperCase()) return false;
	if (search && !entry.raw.toLowerCase().includes(search.toLowerCase())) return false;
	if (since) {
		if (!entry.timestamp) return false;
		if (entry.timestamp < since) return false;
	}
	return true;
}

export async function readDeploymentLogs(options: ReadLogsOptions) {
	const start = performance.now();
	const { deploymentId, logPath, tail = DEFAULT_TAIL_LINES, level, search, since } = options;

	const maxLines = Math.min(tail, MAX_TAIL_LINES);

	try {
		await stat(logPath);
	} catch {
		logger.warn({ logPath, deploymentId }, "log file not found");
		return { lines: [], total: 0, filtered: 0, truncated: false };
	}

	const { lines, totalCount } = await tailFile(logPath, maxLines);

	const parsedLines = lines.map((l) => parseLogLine(l.line, l.lineNum));

	const filtered = level || search || since
		? parsedLines.filter((e) => matchesFilters(e, level, search, since))
		: parsedLines;

	const redactedLines = filtered.map((entry) => ({
		...entry,
		message: redactString(entry.message),
		raw: redactString(entry.raw),
	}));

	const elapsed = performance.now() - start;
	logger.info({
		elapsed: Math.round(elapsed),
		deploymentId,
		total: totalCount,
		tail: lines.length,
		filtered: redactedLines.length,
	}, "readDeploymentLogs");

	return {
		lines: redactedLines,
		total: totalCount,
		filtered: redactedLines.length,
		truncated: totalCount > maxLines,
	};
}
