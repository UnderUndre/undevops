import type { PluginManifest } from "../types/manifest.js";
import type {
	PreDeployPayload,
	PreDeployResult,
	PostDeployPayload,
	PostDeployResult,
	DeployFailedPayload,
	DeployFailedResult,
	ServerAddedPayload,
	ServerRemovedPayload,
	ProjectCreatedPayload,
	ProjectDeletedPayload,
	PluginContext,
	UndevopsPlugin,
	HookName,
} from "../types/payloads.js";
import type { LoadedPlugin } from "./loader.js";

export class PluginError extends Error {
	readonly pluginName: string;
	readonly hookName: string;
	readonly cause?: Error;

	constructor(message: string, pluginName: string, hookName: string, cause?: Error) {
		super(message);
		this.name = "PluginError";
		this.pluginName = pluginName;
		this.hookName = hookName;
		this.cause = cause;
	}
}

export class PluginTimeoutError extends PluginError {
	readonly timeoutMs: number;

	constructor(pluginName: string, hookName: string, timeoutMs: number) {
		super(
			`Plugin ${pluginName} timed out on ${hookName} after ${timeoutMs}ms`,
			pluginName,
			hookName,
		);
		this.name = "PluginTimeoutError";
		this.timeoutMs = timeoutMs;
	}
}

export class PluginManifestError extends Error {
	readonly pluginName: string;
	readonly validationErrors: string[];

	constructor(pluginName: string, validationErrors: string[]) {
		super(`Invalid manifest for plugin ${pluginName}: ${validationErrors.join(", ")}`);
		this.name = "PluginManifestError";
		this.pluginName = pluginName;
		this.validationErrors = validationErrors;
	}
}

interface PluginRegistration {
	plugin: LoadedPlugin;
	priority: number;
}

interface FaultRecord {
	timestamp: number;
	hookName: string;
	error: string;
}

const CRASH_LOOP_WINDOW_MS = 10 * 60 * 1000;
const CRASH_LOOP_THRESHOLD = 3;
const DEFAULT_TIMEOUT_MS = 5_000;

export type HookDispatcherEvent = {
	type: "hook_start" | "hook_complete" | "hook_error" | "hook_abort" | "plugin_disabled";
	pluginName: string;
	hookName: string;
	timestamp: number;
	meta?: Record<string, unknown>;
};

export type HookDispatcherListener = (event: HookDispatcherEvent) => void;

export class HookDispatcher {
	private plugins = new Map<string, PluginRegistration>();
	private faultHistory = new Map<string, FaultRecord[]>();
	private disabledPlugins = new Set<string>();
	private listeners: HookDispatcherListener[] = [];

	register(plugin: LoadedPlugin): void {
		this.plugins.set(plugin.manifest.name, { plugin, priority: 50 });
	}

	unregister(pluginName: string): void {
		this.plugins.delete(pluginName);
		this.faultHistory.delete(pluginName);
		this.disabledPlugins.delete(pluginName);
	}

	onEvent(listener: HookDispatcherListener): void {
		this.listeners.push(listener);
	}

	private emit(event: HookDispatcherEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}

	private getOrderedPlugins(hookName: HookName): Array<LoadedPlugin & { priority: number }> {
		const matching: Array<LoadedPlugin & { priority: number }> = [];

		for (const [, reg] of this.plugins) {
			if (this.disabledPlugins.has(reg.plugin.manifest.name)) continue;
			if (!reg.plugin.hookSubscriptions.includes(hookName)) continue;

			const hookDecl = reg.plugin.manifest.hooks.find((h) => h.name === hookName);
			const priority = hookDecl?.priority ?? 50;
			matching.push({ ...reg.plugin, priority });
		}

		matching.sort((a, b) => {
			if (a.priority !== b.priority) return a.priority - b.priority;
			return a.manifest.name.localeCompare(b.manifest.name);
		});

		return matching;
	}

	private isPluginFaulted(pluginName: string): boolean {
		const faults = this.faultHistory.get(pluginName);
		if (!faults || faults.length === 0) return false;
		return faults.length >= CRASH_LOOP_THRESHOLD;
	}

	private recordFault(pluginName: string, hookName: string, error: string): void {
		if (!this.faultHistory.has(pluginName)) {
			this.faultHistory.set(pluginName, []);
		}

		const records = this.faultHistory.get(pluginName)!;
		records.push({ timestamp: Date.now(), hookName, error });

		const now = Date.now();
		const recent = records.filter((r) => now - r.timestamp < CRASH_LOOP_WINDOW_MS);

		this.faultHistory.set(pluginName, recent);

		if (recent.length >= CRASH_LOOP_THRESHOLD) {
			this.disabledPlugins.add(pluginName);
			this.emit({
				type: "plugin_disabled",
				pluginName,
				hookName,
				timestamp: Date.now(),
				meta: { reason: "crash_loop_prevention", faultCount: recent.length },
			});
		}
	}

	clearFaults(pluginName: string): void {
		this.faultHistory.delete(pluginName);
		this.disabledPlugins.delete(pluginName);
	}

	isDisabled(pluginName: string): boolean {
		return this.disabledPlugins.has(pluginName);
	}

	private async executeWithTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
		pluginName: string,
		hookName: string,
	): Promise<T> {
		let timer: ReturnType<typeof setTimeout>;
		const timeout = new Promise<never>((_, reject) => {
			timer = setTimeout(
				() => reject(new PluginTimeoutError(pluginName, hookName, timeoutMs)),
				timeoutMs,
			);
		});

		try {
			return await Promise.race([promise, timeout]);
		} finally {
			clearTimeout(timer!);
		}
	}

	async dispatchPreDeploy(
		payload: PreDeployPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<{ aborted: boolean; reason?: string; envOverrides: Record<string, string> }> {
		const plugins = this.getOrderedPlugins("pre-deploy");
		let envOverrides: Record<string, string> = {};

		for (const plugin of plugins) {
			const method = plugin.module.onPreDeploy;
			if (!method) continue;

			this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "pre-deploy", timestamp: Date.now() });

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				const result: PreDeployResult = await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"pre-deploy",
				);

				this.emit({ type: "hook_complete", pluginName: plugin.manifest.name, hookName: "pre-deploy", timestamp: Date.now() });

				if (result.abort) {
					this.emit({
						type: "hook_abort",
						pluginName: plugin.manifest.name,
						hookName: "pre-deploy",
						timestamp: Date.now(),
						meta: { reason: result.reason },
					});
					return { aborted: true, reason: result.reason, envOverrides };
				}

				if (result.envOverrides) {
					envOverrides = { ...envOverrides, ...result.envOverrides };
				}
			} catch (error) {
				this.emit({
					type: "hook_error",
					pluginName: plugin.manifest.name,
					hookName: "pre-deploy",
					timestamp: Date.now(),
					meta: { error: error instanceof Error ? error.message : String(error) },
				});
				this.recordFault(plugin.manifest.name, "pre-deploy", error instanceof Error ? error.message : String(error));
			}
		}

		return { aborted: false, envOverrides };
	}

	async dispatchPostDeploy(
		payload: PostDeployPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("post-deploy");

		for (const plugin of plugins) {
			const method = plugin.module.onPostDeploy;
			if (!method) continue;

			this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "post-deploy", timestamp: Date.now() });

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"post-deploy",
				);
				this.emit({ type: "hook_complete", pluginName: plugin.manifest.name, hookName: "post-deploy", timestamp: Date.now() });
			} catch (error) {
				this.emit({
					type: "hook_error",
					pluginName: plugin.manifest.name,
					hookName: "post-deploy",
					timestamp: Date.now(),
					meta: { error: error instanceof Error ? error.message : String(error) },
				});
				this.recordFault(plugin.manifest.name, "post-deploy", error instanceof Error ? error.message : String(error));
			}
		}
	}

	async dispatchDeployFailed(
		payload: DeployFailedPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("deploy-failed");

		for (const plugin of plugins) {
			const method = plugin.module.onDeployFailed;
			if (!method) continue;

			this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "deploy-failed", timestamp: Date.now() });

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"deploy-failed",
				);
				this.emit({ type: "hook_complete", pluginName: plugin.manifest.name, hookName: "deploy-failed", timestamp: Date.now() });
			} catch (error) {
				this.emit({
					type: "hook_error",
					pluginName: plugin.manifest.name,
					hookName: "deploy-failed",
					timestamp: Date.now(),
					meta: { error: error instanceof Error ? error.message : String(error) },
				});
				this.recordFault(plugin.manifest.name, "deploy-failed", error instanceof Error ? error.message : String(error));
			}
		}
	}

	async dispatchServerAdded(
		payload: ServerAddedPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("server-added");

		for (const plugin of plugins) {
			const method = plugin.module.onServerAdded;
			if (!method) continue;

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"server-added",
				);
			} catch (error) {
				this.recordFault(plugin.manifest.name, "server-added", error instanceof Error ? error.message : String(error));
			}
		}
	}

	async dispatchServerRemoved(
		payload: ServerRemovedPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("server-removed");

		for (const plugin of plugins) {
			const method = plugin.module.onServerRemoved;
			if (!method) continue;

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"server-removed",
				);
			} catch (error) {
				this.recordFault(plugin.manifest.name, "server-removed", error instanceof Error ? error.message : String(error));
			}
		}
	}

	async dispatchProjectCreated(
		payload: ProjectCreatedPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("project-created");

		for (const plugin of plugins) {
			const method = plugin.module.onProjectCreated;
			if (!method) continue;

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"project-created",
				);
			} catch (error) {
				this.recordFault(plugin.manifest.name, "project-created", error instanceof Error ? error.message : String(error));
			}
		}
	}

	async dispatchProjectDeleted(
		payload: ProjectDeletedPayload,
		contextFactory: (pluginName: string, pluginVersion: string) => PluginContext,
	): Promise<void> {
		const plugins = this.getOrderedPlugins("project-deleted");

		for (const plugin of plugins) {
			const method = plugin.module.onProjectDeleted;
			if (!method) continue;

			const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
			const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);

			try {
				await this.executeWithTimeout(
					method.call(plugin.module, payload, ctx),
					timeoutMs,
					plugin.manifest.name,
					"project-deleted",
				);
			} catch (error) {
				this.recordFault(plugin.manifest.name, "project-deleted", error instanceof Error ? error.message : String(error));
			}
		}
	}
}
