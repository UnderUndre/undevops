import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export interface TailedLines {
	lines: { line: string; lineNum: number }[];
	totalCount: number;
}

export async function tailFile(logPath: string, maxLines: number): Promise<TailedLines> {
	if (maxLines <= 0) return { lines: [], totalCount: 0 };

	const stream = createReadStream(logPath, { encoding: "utf8" });
	const rl = createInterface({ input: stream, crlfDelay: Infinity });

	const buffer = new Array<{ line: string; lineNum: number }>(maxLines);
	let count = 0;
	let lineNum = 0;

	for await (const line of rl) {
		lineNum++;
		if (line.trim().length === 0) continue;
		buffer[count % maxLines] = { line, lineNum };
		count++;
	}

	if (count <= maxLines) {
		return {
			lines: buffer.slice(0, count),
			totalCount: lineNum,
		};
	} else {
		const startIdx = count % maxLines;
		const result = new Array<{ line: string; lineNum: number }>(maxLines);
		for (let i = 0; i < maxLines; i++) {
			result[i] = buffer[(startIdx + i) % maxLines]!;
		}
		return {
			lines: result,
			totalCount: lineNum,
		};
	}
}
