import { Command } from "commander";
import { db } from "@undevops/server/db";
import { environments } from "@undevops/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";

export const envCommand = new Command("env")
	.description("Manage environment variables");

envCommand.command("set")
	.description("Set environment variable(s)")
	.requiredOption("--id <envId>", "Environment ID")
	.action(async (opts) => {
		const pairs: string[] = [];
		const remaining = process.argv.slice(process.argv.indexOf("set") + 1);
		for (const arg of remaining) {
			if (arg.startsWith("--")) continue;
			if (arg.includes("=")) pairs.push(arg);
		}

		if (pairs.length === 0) {
			console.error("Provide KEY=VALUE pairs");
			return;
		}

		const [row] = await db.select({ env: environments.env })
			.from(environments)
			.where(eq(environments.environmentId, opts.id))
			.limit(1);

		if (!row) {
			console.error("Environment not found:", opts.id);
			return;
		}

		const current = row.env || "";
		const lines = current ? current.split("\n") : [];

		for (const pair of pairs) {
			const eqIdx = pair.indexOf("=");
			const key = pair.slice(0, eqIdx);
			const value = pair.slice(eqIdx + 1);
			const existingIdx = lines.findIndex((l) => l.startsWith(`${key}=`));
			if (existingIdx >= 0) {
				lines[existingIdx] = `${key}=${value}`;
			} else {
				lines.push(`${key}=${value}`);
			}
		}

		await db.update(environments)
			.set({ env: lines.join("\n") })
			.where(eq(environments.environmentId, opts.id));

		console.log(`Set ${pairs.length} variable(s)`);
	});

envCommand.command("list")
	.description("List environment variables")
	.requiredOption("--id <envId>", "Environment ID")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const [row] = await db.select({ env: environments.env, name: environments.name })
			.from(environments)
			.where(eq(environments.environmentId, opts.id))
			.limit(1);

		if (!row) {
			console.error("Environment not found:", opts.id);
			return;
		}

		const vars = (row.env || "").split("\n").filter(Boolean).map((line) => {
			const eqIdx = line.indexOf("=");
			return { key: line.slice(0, eqIdx), value: line.slice(eqIdx + 1) };
		});

		fmt.output(vars, ["key", "value"]);
	});

envCommand.command("unset")
	.description("Unset environment variable(s)")
	.requiredOption("--id <envId>", "Environment ID")
	.action(async (opts) => {
		const keys: string[] = [];
		const remaining = process.argv.slice(process.argv.indexOf("unset") + 1);
		for (const arg of remaining) {
			if (arg.startsWith("--")) continue;
			keys.push(arg);
		}

		if (keys.length === 0) {
			console.error("Provide keys to unset");
			return;
		}

		const [row] = await db.select({ env: environments.env })
			.from(environments)
			.where(eq(environments.environmentId, opts.id))
			.limit(1);

		if (!row) {
			console.error("Environment not found:", opts.id);
			return;
		}

		const lines = (row.env || "").split("\n").filter((l) => {
			const eqIdx = l.indexOf("=");
			const key = l.slice(0, eqIdx);
			return !keys.includes(key);
		});

		await db.update(environments)
			.set({ env: lines.join("\n") })
			.where(eq(environments.environmentId, opts.id));

		console.log(`Unset ${keys.length} variable(s)`);
	});
