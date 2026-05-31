import { open } from "node:fs/promises";

export interface TailedLines {
	lines: { line: string; lineNum: number }[];
	totalCount: number;
}

/**
 * Memory-efficient tail implementation that reads from the end of the file.
 * Avoids loading the entire file into memory by seeking to the end and reading backwards.
 */
export async function tailFile(logPath: string, maxLines: number): Promise<TailedLines> {
	if (maxLines <= 0) return { lines: [], totalCount: 0 };

	let fileHandle;
	try {
		fileHandle = await open(logPath, "r");
		const { size } = await fileHandle.stat();

		if (size === 0) return { lines: [], totalCount: 0 };

		const CHUNK_SIZE = 64 * 1024; // 64KB
		const buffer = Buffer.alloc(CHUNK_SIZE);
		let pos = size;
		let lineCount = 0;
		let lastLineEnd = size;
		const lineOffsets: { start: number; end: number }[] = [];

		// Read backwards in chunks to find line boundaries
		while (pos > 0 && lineCount < maxLines) {
			const bytesToRead = Math.min(pos, CHUNK_SIZE);
			pos -= bytesToRead;
			const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, pos);

			for (let i = bytesRead - 1; i >= 0; i--) {
				if (buffer[i] === 0x0a) { // '\n'
					// Found a newline. If there's content between this and the last found newline/end, it's a line.
					if (lastLineEnd > pos + i + 1) {
						lineOffsets.unshift({ start: pos + i + 1, end: lastLineEnd });
						lineCount++;
						if (lineCount >= maxLines) break;
					}
					lastLineEnd = pos + i;
				}
			}
		}

		// Handle the first line if we didn't reach maxLines
		if (lineCount < maxLines && lastLineEnd > 0) {
			lineOffsets.unshift({ start: 0, end: lastLineEnd });
		}

		// Read the identified lines
		const lines: { line: string; lineNum: number }[] = [];
		for (let i = 0; i < lineOffsets.length; i++) {
			const offset = lineOffsets[i];
			const length = offset.end - offset.start;
			if (length <= 0) continue;

			const lineBuffer = Buffer.alloc(length);
			await fileHandle.read(lineBuffer, 0, length, offset.start);
			lines.push({
				line: lineBuffer.toString("utf8").replace(/\r$/, ""), // Remove trailing \r if present
				lineNum: i + 1, // Relative line number
			});
		}

		return {
			lines,
			// If pos > 0, it means we stopped before reaching the start of the file, so it's truncated.
			totalCount: pos > 0 ? maxLines + 1 : lines.length,
		};
	} catch (error) {
		return { lines: [], totalCount: 0 };
	} finally {
		await fileHandle?.close();
	}
}
