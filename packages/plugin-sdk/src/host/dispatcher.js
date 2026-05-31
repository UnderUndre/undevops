export class PluginError extends Error {
    pluginName;
    hookName;
    cause;
    constructor(message, pluginName, hookName, cause) {
        super(message);
        this.name = "PluginError";
        this.pluginName = pluginName;
        this.hookName = hookName;
        this.cause = cause;
    }
}
export class PluginTimeoutError extends PluginError {
    timeoutMs;
    constructor(pluginName, hookName, timeoutMs) {
        super(`Plugin ${pluginName} timed out on ${hookName} after ${timeoutMs}ms`, pluginName, hookName);
        this.name = "PluginTimeoutError";
        this.timeoutMs = timeoutMs;
    }
}
export class PluginManifestError extends Error {
    pluginName;
    validationErrors;
    constructor(pluginName, validationErrors) {
        super(`Invalid manifest for plugin ${pluginName}: ${validationErrors.join(", ")}`);
        this.name = "PluginManifestError";
        this.pluginName = pluginName;
        this.validationErrors = validationErrors;
    }
}
const CRASH_LOOP_WINDOW_MS = 10 * 60 * 1000;
const CRASH_LOOP_THRESHOLD = 3;
const DEFAULT_TIMEOUT_MS = 5_000;
export class HookDispatcher {
    plugins = new Map();
    faultHistory = new Map();
    disabledPlugins = new Set();
    listeners = [];
    register(plugin) {
        this.plugins.set(plugin.manifest.name, { plugin, priority: 50 });
    }
    unregister(pluginName) {
        this.plugins.delete(pluginName);
        this.faultHistory.delete(pluginName);
        this.disabledPlugins.delete(pluginName);
    }
    onEvent(listener) {
        this.listeners.push(listener);
    }
    emit(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    getOrderedPlugins(hookName) {
        const matching = [];
        for (const [, reg] of this.plugins) {
            if (this.disabledPlugins.has(reg.plugin.manifest.name))
                continue;
            if (!reg.plugin.hookSubscriptions.includes(hookName))
                continue;
            const hookDecl = reg.plugin.manifest.hooks.find((h) => h.name === hookName);
            const priority = hookDecl?.priority ?? 50;
            matching.push({ ...reg.plugin, priority });
        }
        matching.sort((a, b) => {
            if (a.priority !== b.priority)
                return a.priority - b.priority;
            return a.manifest.name.localeCompare(b.manifest.name);
        });
        return matching;
    }
    isPluginFaulted(pluginName) {
        const faults = this.faultHistory.get(pluginName);
        if (!faults || faults.length === 0)
            return false;
        return faults.length >= CRASH_LOOP_THRESHOLD;
    }
    recordFault(pluginName, hookName, error) {
        if (!this.faultHistory.has(pluginName)) {
            this.faultHistory.set(pluginName, []);
        }
        const records = this.faultHistory.get(pluginName);
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
    clearFaults(pluginName) {
        this.faultHistory.delete(pluginName);
        this.disabledPlugins.delete(pluginName);
    }
    isDisabled(pluginName) {
        return this.disabledPlugins.has(pluginName);
    }
    async executeWithTimeout(promise, timeoutMs, pluginName, hookName) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new PluginTimeoutError(pluginName, hookName, timeoutMs)), timeoutMs);
        });
        try {
            return await Promise.race([promise, timeout]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    async dispatchPreDeploy(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("pre-deploy");
        let envOverrides = {};
        for (const plugin of plugins) {
            const method = plugin.module.onPreDeploy;
            if (!method)
                continue;
            this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "pre-deploy", timestamp: Date.now() });
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                const result = await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "pre-deploy");
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
            }
            catch (error) {
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
    async dispatchPostDeploy(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("post-deploy");
        for (const plugin of plugins) {
            const method = plugin.module.onPostDeploy;
            if (!method)
                continue;
            this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "post-deploy", timestamp: Date.now() });
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "post-deploy");
                this.emit({ type: "hook_complete", pluginName: plugin.manifest.name, hookName: "post-deploy", timestamp: Date.now() });
            }
            catch (error) {
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
    async dispatchDeployFailed(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("deploy-failed");
        for (const plugin of plugins) {
            const method = plugin.module.onDeployFailed;
            if (!method)
                continue;
            this.emit({ type: "hook_start", pluginName: plugin.manifest.name, hookName: "deploy-failed", timestamp: Date.now() });
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "deploy-failed");
                this.emit({ type: "hook_complete", pluginName: plugin.manifest.name, hookName: "deploy-failed", timestamp: Date.now() });
            }
            catch (error) {
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
    async dispatchServerAdded(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("server-added");
        for (const plugin of plugins) {
            const method = plugin.module.onServerAdded;
            if (!method)
                continue;
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "server-added");
            }
            catch (error) {
                this.recordFault(plugin.manifest.name, "server-added", error instanceof Error ? error.message : String(error));
            }
        }
    }
    async dispatchServerRemoved(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("server-removed");
        for (const plugin of plugins) {
            const method = plugin.module.onServerRemoved;
            if (!method)
                continue;
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "server-removed");
            }
            catch (error) {
                this.recordFault(plugin.manifest.name, "server-removed", error instanceof Error ? error.message : String(error));
            }
        }
    }
    async dispatchProjectCreated(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("project-created");
        for (const plugin of plugins) {
            const method = plugin.module.onProjectCreated;
            if (!method)
                continue;
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "project-created");
            }
            catch (error) {
                this.recordFault(plugin.manifest.name, "project-created", error instanceof Error ? error.message : String(error));
            }
        }
    }
    async dispatchProjectDeleted(payload, contextFactory) {
        const plugins = this.getOrderedPlugins("project-deleted");
        for (const plugin of plugins) {
            const method = plugin.module.onProjectDeleted;
            if (!method)
                continue;
            const timeoutMs = plugin.manifest.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
            const ctx = contextFactory(plugin.manifest.name, plugin.manifest.version);
            try {
                await this.executeWithTimeout(method.call(plugin.module, payload, ctx), timeoutMs, plugin.manifest.name, "project-deleted");
            }
            catch (error) {
                this.recordFault(plugin.manifest.name, "project-deleted", error instanceof Error ? error.message : String(error));
            }
        }
    }
}
