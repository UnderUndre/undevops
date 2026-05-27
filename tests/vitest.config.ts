import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		pool: "forks",
		testTimeout: 300_000,
		hookTimeout: 120_000,
	},
	plugins: [
		tsconfigPaths({
			projects: [path.resolve(__dirname, "tsconfig.json")],
		}),
	],
	resolve: {
		alias: {
			"@undevops/server": path.resolve(
				__dirname,
				"packages/server/src",
			),
			"@undevops/core": path.resolve(
				__dirname,
				"packages/core/src",
			),
		},
	},
});
