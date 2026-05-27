export interface Formatter {
	output<T>(data: T[], columns: string[]): void;
}

export function getFormatter(format: string): Formatter {
	switch (format) {
		case "json":
			return new (require("./json.js")).JsonFormatter();
		case "table":
			return new (require("./table.js")).TableFormatter();
		default:
			return new (require("./table.js")).TableFormatter();
	}
}

export { JsonFormatter } from "./json.js";
export { TableFormatter } from "./table.js";
