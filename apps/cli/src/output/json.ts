import type { Formatter } from "./formatter.js";

export class JsonFormatter implements Formatter {
	output<T>(data: T[], _columns: string[]): void {
		console.log(JSON.stringify(data, null, 2));
	}
}
