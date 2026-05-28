import { type PluginManifest } from "../types/manifest.js";
import type { UndevopsPlugin, HookName } from "../types/payloads.js";
export interface LoadedPlugin {
    manifest: PluginManifest;
    module: UndevopsPlugin;
    directory: string;
    hookSubscriptions: HookName[];
}
export interface PluginLoadError {
    name: string;
    directory: string;
    errors: string[];
}
export declare function scanPluginDirectory(dir: string): Promise<string[]>;
export declare function loadPlugin(dir: string): Promise<LoadedPlugin | PluginLoadError>;
export declare function loadAllPlugins(pluginsDir: string): Promise<{
    loaded: LoadedPlugin[];
    failed: PluginLoadError[];
}>;
