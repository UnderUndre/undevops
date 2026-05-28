export { type PluginPermission, permissionEnum, } from "../types/manifest.js";
import { type PluginPermission } from "../types/manifest.js";
export declare const CANONICAL_PERMISSIONS: Set<string>;
export declare class PluginPermissionError extends Error {
    readonly pluginName: string;
    readonly permission: string;
    readonly action: string;
    constructor(pluginName: string, permission: string, action: string);
}
export declare function checkPermission(grantedPermissions: string[], permission: PluginPermission, pluginName: string, action: string): void;
export declare function validatePermissions(declared: string[]): {
    valid: true;
} | {
    valid: false;
    unknown: string[];
};
export declare function filterPayloadByPermissions(payload: Record<string, unknown>, grantedPermissions: string[]): Record<string, unknown>;
export declare function getRequiredPermission(method: keyof import("../types/payloads.js").PluginApiClient): string | undefined;
