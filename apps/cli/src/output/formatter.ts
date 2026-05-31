import { JsonFormatter } from "./json.js";
import { TableFormatter } from "./table.js";

export interface Formatter {
	output<T>(data: T[], columns: string[]): void;
}

export function getFormatter(format: string): Formatter {
	switch (format) {
		case "json":
			return new JsonFormatter();
		case "table":
			return new TableFormatter();
		default:
			return new TableFormatter();
	}
}

export { JsonFormatter } from "./json.js";
export { TableFormatter } from "./table.js";
