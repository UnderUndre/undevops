import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: [
			"__test__/security/**/*.test.ts",
			"../../tests/security/**/*.test.ts",
		],
		exclude: ["**/node_modules/**", "**/dist/**", "**/.docker/**"],
		testTimeout: 60_000,
	},
	resolve: {
		alias: {
			"@undevops/server": path.resolve(
				__dirname,
				"../../../packages/server/src",
			),
		},
	},
});
