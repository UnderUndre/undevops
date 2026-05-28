import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { validateManifest } from "../types/manifest.js";
import { validatePermissions } from "../permissions/index.js";
import { HOOK_TO_METHOD } from "../types/payloads.js";
import { PLUGIN_SDK_VERSION } from "../index.js";
function isCompatibleSdkVersion(sdkVersion) {
    const match = sdkVersion.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
    if (!match)
        return false;
    const [, reqMajor, reqMinor] = match.map(Number);
    const sdkParts = PLUGIN_SDK_VERSION.split(".").map(Number);
    const [sdkMajor, sdkMinor] = sdkParts;
    if (sdkMajor === 0) {
        return sdkMajor === reqMajor && sdkMinor === reqMinor;
    }
    return sdkMajor === reqMajor;
}
export async function scanPluginDirectory(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const pluginDirs = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const manifestPath = join(dir, entry.name, "undevops-plugin.json");
        try {
            await stat(manifestPath);
            pluginDirs.push(join(dir, entry.name));
        }
        catch {
            continue;
        }
    }
    return pluginDirs;
}
export async function loadPlugin(dir) {
    const dirName = dir.split(/[/\\]/).pop() ?? "unknown";
    const manifestPath = join(dir, "undevops-plugin.json");
    let rawManifest;
    try {
        const raw = await readFile(manifestPath, "utf-8");
        rawManifest = JSON.parse(raw);
    }
    catch (error) {
        return {
            name: dirName,
            directory: dir,
            errors: [`Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
    const manifestResult = validateManifest(rawManifest);
    if (!manifestResult.success) {
        return {
            name: dirName,
            directory: dir,
            errors: manifestResult.errors,
        };
    }
    const manifest = manifestResult.data;
    if (!isCompatibleSdkVersion(manifest.sdkVersion)) {
        return {
            name: manifest.name,
            directory: dir,
            errors: [`SDK version incompatible: plugin requires ${manifest.sdkVersion}, host is ${PLUGIN_SDK_VERSION}`],
        };
    }
    const permResult = validatePermissions(manifest.permissions);
    if (!permResult.valid) {
        return {
            name: manifest.name,
            directory: dir,
            errors: [`Unknown permissions: ${permResult.unknown.join(", ")}`],
        };
    }
    let pluginModule;
    try {
        const imported = await import(join(dir, "index.ts"));
        const mod = imported.default ?? imported;
        if (typeof mod !== "object" || mod === null) {
            return {
                name: manifest.name,
                directory: dir,
                errors: ["Plugin module does not export a valid plugin object"],
            };
        }
        pluginModule = mod;
    }
    catch (error) {
        return {
            name: manifest.name,
            directory: dir,
            errors: [`Failed to load plugin module: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
    const hookSubscriptions = [];
    for (const hook of manifest.hooks) {
        const method = HOOK_TO_METHOD[hook.name];
        if (typeof pluginModule[method] !== "function") {
            return {
                name: manifest.name,
                directory: dir,
                errors: [`Plugin declares hook "${hook.name}" but does not implement method "${method}"`],
            };
        }
        if (!hookSubscriptions.includes(hook.name)) {
            hookSubscriptions.push(hook.name);
        }
    }
    return {
        manifest,
        module: pluginModule,
        directory: dir,
        hookSubscriptions,
    };
}
export async function loadAllPlugins(pluginsDir) {
    const dirs = await scanPluginDirectory(pluginsDir);
    const loaded = [];
    const failed = [];
    for (const dir of dirs) {
        const result = await loadPlugin(dir);
        if ("errors" in result) {
            failed.push(result);
        }
        else {
            loaded.push(result);
        }
    }
    return { loaded, failed };
}
