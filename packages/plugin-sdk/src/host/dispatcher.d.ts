import type { PreDeployPayload, PostDeployPayload, DeployFailedPayload, ServerAddedPayload, ServerRemovedPayload, ProjectCreatedPayload, ProjectDeletedPayload, PluginContext } from "../types/payloads.js";
import type { LoadedPlugin } from "./loader.js";
export declare class PluginError extends Error {
    readonly pluginName: string;
    readonly hookName: string;
    readonly cause?: Error;
    constructor(message: string, pluginName: string, hookName: string, cause?: Error);
}
export declare class PluginTimeoutError extends PluginError {
    readonly timeoutMs: number;
    constructor(pluginName: string, hookName: string, timeoutMs: number);
}
export declare class PluginManifestError extends Error {
    readonly pluginName: string;
    readonly validationErrors: string[];
    constructor(pluginName: string, validationErrors: string[]);
}
export type HookDispatcherEvent = {
    type: "hook_start" | "hook_complete" | "hook_error" | "hook_abort" | "plugin_disabled";
    pluginName: string;
    hookName: string;
    timestamp: number;
    meta?: Record<string, unknown>;
};
export type HookDispatcherListener = (event: HookDispatcherEvent) => void;
export declare class HookDispatcher {
    private plugins;
    private faultHistory;
    private disabledPlugins;
    private listeners;
    register(plugin: LoadedPlugin): void;
    unregister(pluginName: string): void;
    onEvent(listener: HookDispatcherListener): void;
    private emit;
    private getOrderedPlugins;
    private isPluginFaulted;
    private recordFault;
    clearFaults(pluginName: string): void;
    isDisabled(pluginName: string): boolean;
    private executeWithTimeout;
    dispatchPreDeploy(payload: PreDeployPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<{
        aborted: boolean;
        reason?: string;
        envOverrides: Record<string, string>;
    }>;
    dispatchPostDeploy(payload: PostDeployPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
    dispatchDeployFailed(payload: DeployFailedPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
    dispatchServerAdded(payload: ServerAddedPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
    dispatchServerRemoved(payload: ServerRemovedPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
    dispatchProjectCreated(payload: ProjectCreatedPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
    dispatchProjectDeleted(payload: ProjectDeletedPayload, contextFactory: (pluginName: string, pluginVersion: string) => PluginContext): Promise<void>;
}
