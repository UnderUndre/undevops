import { HookDispatcher, loadAllPlugins, type LoadedPlugin } from "@undevops/plugin-sdk";
import type { PluginContext, PluginApiClient, PreDeployPayload, PostDeployPayload, DeployFailedPayload } from "@undevops/plugin-sdk";
import { createPluginApiClient } from "@undevops/plugin-sdk";
import pino from "pino";
import { db } from "@undevops/server/db";
import { plugins } from "@undevops/server/db/schema";
import { eq } from "drizzle-orm";

const logger = pino({ name: "plugin-host" });

let dispatcher: HookDispatcher;
let initialized = false;

export async function initializePluginHost(pluginsDir: string): Promise<void> {
	if (initialized) return;

	dispatcher = new HookDispatcher();

	dispatcher.onEvent((event) => {
		switch (event.type) {
			case "hook_error":
				logger.warn({ pluginName: event.pluginName, hookName: event.hookName, meta: event.meta }, "Plugin hook error");
				updateFaultState(event.pluginName, event.meta?.error as string);
				break;
			case "hook_abort":
				logger.info({ pluginName: event.pluginName, hookName: event.hookName, meta: event.meta }, "Deployment aborted by plugin");
				break;
			case "plugin_disabled":
				logger.error({ pluginName: event.pluginName, meta: event.meta }, "Plugin auto-disabled (crash loop)");
				setPluginDisabled(event.pluginName);
				break;
		}
	});

	const { loaded, failed } = await loadAllPlugins(pluginsDir);

	for (const plugin of loaded) {
		dispatcher.register(plugin);
		await upsertPluginRecord(plugin, "active");
		logger.info({ name: plugin.manifest.name, hooks: plugin.hookSubscriptions }, "Plugin loaded");
	}

	for (const error of failed) {
		logger.error({ name: error.name, errors: error.errors }, "Plugin failed to load");
		await insertFailedPluginRecord(error.name, error.errors);
	}

	initialized = true;
	logger.info({ loaded: loaded.length, failed: failed.length }, "Plugin host initialized");
}

export function getDispatcher(): HookDispatcher {
	if (!initialized) {
		throw new Error("Plugin host not initialized. Call initializePluginHost() first.");
	}
	return dispatcher;
}

function makeContextFactory(
	grantedPermissions: string[],
	pluginSettings: Record<string, unknown>,
) {
	return (pluginName: string, pluginVersion: string): PluginContext => {
		const pluginLogger: PluginContext["logger"] = {
			info: (msg, meta) => logger.info({ plugin: pluginName, ...meta }, msg),
			warn: (msg, meta) => logger.warn({ plugin: pluginName, ...meta }, msg),
			error: (msg, meta) => logger.error({ plugin: pluginName, ...meta }, msg),
			debug: (msg, meta) => logger.debug({ plugin: pluginName, ...meta }, msg),
		};

		const api: PluginApiClient = createPluginApiClient({
			pluginName,
			grantedPermissions,
			fetchProject: async (id) => {
				const rows = await db.select().from(plugins).where(eq(plugins.pluginId, id)).limit(1);
				return rows[0] as unknown as import("@undevops/plugin-sdk").Project;
			},
			fetchServer: async (id) => {
				const rows = await db.select().from(plugins).where(eq(plugins.pluginId, id)).limit(1);
				return rows[0] as unknown as import("@undevops/plugin-sdk").Server;
			},
			fetchDeployment: async (id) => {
				const rows = await db.select().from(plugins).where(eq(plugins.pluginId, id)).limit(1);
				return rows[0] as unknown as import("@undevops/plugin-sdk").Deployment;
			},
			fetchProjectLogs: async () => [],
			auditLog: (action, meta) => {
				logger.info({ actorType: "plugin", actorId: pluginName, action, ...meta }, "plugin.audit");
			},
		});

		return {
			pluginName,
			pluginVersion,
			settings: pluginSettings,
			logger: pluginLogger,
			api,
		};
	};
}

export async function firePreDeploy(
	payload: PreDeployPayload,
): Promise<{ aborted: boolean; reason?: string; envOverrides: Record<string, string> }> {
	if (!initialized) return { aborted: false, envOverrides: {} };

	const result = await dispatcher.dispatchPreDeploy(
		payload,
		makeContextFactory([], {}),
	);
	return result;
}

export async function firePostDeploy(payload: PostDeployPayload): Promise<void> {
	if (!initialized) return;
	await dispatcher.dispatchPostDeploy(payload, makeContextFactory([], {}));
}

export async function fireDeployFailed(payload: DeployFailedPayload): Promise<void> {
	if (!initialized) return;
	await dispatcher.dispatchDeployFailed(payload, makeContextFactory([], {}));
}

async function upsertPluginRecord(plugin: LoadedPlugin, _state: string): Promise<void> {
	try {
		await db.insert(plugins).values({
			name: plugin.manifest.name,
			version: plugin.manifest.version,
			manifestJson: plugin.manifest as unknown as import("@undevops/server/db/schema/plugin").PluginManifest,
			grantedPermissions: plugin.manifest.permissions,
			enabled: true,
			faulted: false,
			hookSubscriptions: plugin.hookSubscriptions,
			organizationId: "system",
		}).onConflictDoUpdate({
			target: plugins.name,
			set: {
				version: plugin.manifest.version,
			manifestJson: plugin.manifest as unknown as import("@undevops/server/db/schema/plugin").PluginManifest,
				hookSubscriptions: plugin.hookSubscriptions,
				enabled: true,
				faulted: false,
				faultMessage: null,
			},
		});
	} catch (error) {
		logger.error({ error, pluginName: plugin.manifest.name }, "Failed to upsert plugin record");
	}
}

async function insertFailedPluginRecord(name: string, errors: string[]): Promise<void> {
	try {
		await db.insert(plugins).values({
			name,
			version: "0.0.0",
			manifestJson: {} as import("@undevops/server/db/schema/plugin").PluginManifest,
			grantedPermissions: [],
			enabled: false,
			faulted: true,
			faultMessage: errors.join("; "),
			hookSubscriptions: [],
			organizationId: "system",
		}).onConflictDoUpdate({
			target: plugins.name,
			set: {
				faulted: true,
				faultMessage: errors.join("; "),
				enabled: false,
			},
		});
	} catch (error) {
		logger.error({ error, name }, "Failed to insert failed plugin record");
	}
}

async function updateFaultState(pluginName: string, errorMessage?: string): Promise<void> {
	try {
		await db.update(plugins)
			.set({ faulted: true, faultMessage: errorMessage ?? "Unknown error" })
			.where(eq(plugins.name, pluginName));
	} catch (error) {
		logger.error({ error, pluginName }, "Failed to update fault state");
	}
}

async function setPluginDisabled(pluginName: string): Promise<void> {
	try {
		await db.update(plugins)
			.set({ enabled: false, faulted: true, faultMessage: "Auto-disabled: crash loop detected" })
			.where(eq(plugins.name, pluginName));
	} catch (error) {
		logger.error({ error, pluginName }, "Failed to disable plugin");
	}
}
