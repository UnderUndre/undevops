import type { Formatter } from "./formatter.js";

export class TableFormatter implements Formatter {
	output<T>(data: T[], columns: string[]): void {
		if (data.length === 0) {
			console.log("(no results)");
			return;
		}

		const widths = columns.map((col) => {
			const headerLen = col.length;
			const maxDataLen = Math.max(
				...data.map((row) => String((row as Record<string, unknown>)[col] ?? "").length),
			);
			return Math.max(headerLen, maxDataLen) + 2;
		});

		const header = columns.map((col, i) => col.padEnd(widths[i]!)).join("");
		console.log(header);
		console.log(widths.map((w) => "─".repeat(w)).join(""));

		for (const row of data) {
			const line = columns
				.map((col, i) => String((row as Record<string, unknown>)[col] ?? "").padEnd(widths[i]!))
				.join("");
			console.log(line);
		}
	}
}
