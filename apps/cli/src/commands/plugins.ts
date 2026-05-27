import { Command } from "commander";
import { db } from "@undevops/server/db";
import { plugins } from "@undevops/server/db/schema";
import { eq } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";
import { validateManifest, validatePermissions } from "@undevops/plugin-sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export const pluginsCommand = new Command("plugins")
	.description("Manage plugins");

pluginsCommand.command("install")
	.description("Install a plugin from a directory path")
	.requiredOption("--path <path>", "Path to plugin directory")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const pluginDir = opts.path;

		if (!existsSync(pluginDir)) {
			console.error(`Directory not found: ${pluginDir}`);
			process.exit(1);
		}

		const manifestPath = join(pluginDir, "undevops-plugin.json");
		if (!existsSync(manifestPath)) {
			console.error(`No undevops-plugin.json found in ${pluginDir}`);
			process.exit(1);
		}

		const raw = await readFile(manifestPath, "utf-8");
		const parsed = JSON.parse(raw);
		const result = validateManifest(parsed);

		if (!result.success) {
			console.error("Invalid manifest:");
			for (const error of result.errors) {
				console.error(`  - ${error}`);
			}
			process.exit(1);
		}

		const manifest = result.data;

		const permResult = validatePermissions(manifest.permissions);
		if (!permResult.valid) {
			console.error(`Unknown permissions: ${permResult.unknown.join(", ")}`);
			process.exit(1);
		}

		const [existing] = await db.select({ pluginId: plugins.pluginId })
			.from(plugins)
			.where(eq(plugins.name, manifest.name))
			.limit(1);

		if (existing) {
			await db.update(plugins)
				.set({
					version: manifest.version,
					manifestJson: manifest as unknown as Record<string, unknown>,
					grantedPermissions: manifest.permissions,
					hookSubscriptions: manifest.hooks.map((h: { name: string }) => h.name),
					enabled: true,
					faulted: false,
					faultMessage: null,
				})
				.where(eq(plugins.name, manifest.name));

			fmt.output([{ name: manifest.name, version: manifest.version, status: "updated" }], ["name", "version", "status"]);
			return;
		}

		const [row] = await db.insert(plugins).values({
			name: manifest.name,
			version: manifest.version,
			manifestJson: manifest as unknown as Record<string, unknown>,
			grantedPermissions: manifest.permissions,
			hookSubscriptions: manifest.hooks.map((h: { name: string }) => h.name),
			enabled: true,
			faulted: false,
			organizationId: "system",
		}).returning();

		fmt.output([row], ["pluginId", "name", "version", "enabled"]);
	});

pluginsCommand.command("list")
	.description("List installed plugins")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const rows = await db.select({
			name: plugins.name,
			version: plugins.version,
			enabled: plugins.enabled,
			faulted: plugins.faulted,
			faultMessage: plugins.faultMessage,
			hookSubscriptions: plugins.hookSubscriptions,
			invokeCount: plugins.invokeCount,
		}).from(plugins);

		fmt.output(rows, ["name", "version", "enabled", "faulted", "invokeCount"]);
	});

pluginsCommand.command("enable")
	.description("Enable a plugin")
	.requiredOption("--name <name>", "Plugin name")
	.action(async (opts) => {
		const result = await db.update(plugins)
			.set({ enabled: true, faulted: false, faultMessage: null })
			.where(eq(plugins.name, opts.name))
			.returning({ name: plugins.name });

		if (result.length === 0) {
			console.error(`Plugin "${opts.name}" not found`);
			process.exit(1);
		}
		console.log(`Plugin "${opts.name}" enabled`);
	});

pluginsCommand.command("disable")
	.description("Disable a plugin")
	.requiredOption("--name <name>", "Plugin name")
	.action(async (opts) => {
		const result = await db.update(plugins)
			.set({ enabled: false })
			.where(eq(plugins.name, opts.name))
			.returning({ name: plugins.name });

		if (result.length === 0) {
			console.error(`Plugin "${opts.name}" not found`);
			process.exit(1);
		}
		console.log(`Plugin "${opts.name}" disabled`);
	});

pluginsCommand.command("remove")
	.description("Remove a plugin")
	.requiredOption("--name <name>", "Plugin name")
	.action(async (opts) => {
		const result = await db.delete(plugins)
			.where(eq(plugins.name, opts.name))
			.returning({ name: plugins.name });

		if (result.length === 0) {
			console.error(`Plugin "${opts.name}" not found`);
			process.exit(1);
		}
		console.log(`Plugin "${opts.name}" removed`);
	});
