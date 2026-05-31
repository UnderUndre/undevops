export { permissionEnum, } from "../types/manifest.js";
import { permissionEnum } from "../types/manifest.js";
export const CANONICAL_PERMISSIONS = new Set(permissionEnum.options);
export class PluginPermissionError extends Error {
    pluginName;
    permission;
    action;
    constructor(pluginName, permission, action) {
        super(`Plugin ${pluginName} lacks permission ${permission} for ${action}`);
        this.name = "PluginPermissionError";
        this.pluginName = pluginName;
        this.permission = permission;
        this.action = action;
    }
}
export function checkPermission(grantedPermissions, permission, pluginName, action) {
    if (!grantedPermissions.includes(permission)) {
        throw new PluginPermissionError(pluginName, permission, action);
    }
}
export function validatePermissions(declared) {
    const unknown = declared.filter((p) => !CANONICAL_PERMISSIONS.has(p));
    if (unknown.length > 0) {
        return { valid: false, unknown };
    }
    return { valid: true };
}
export function filterPayloadByPermissions(payload, grantedPermissions) {
    const filtered = { ...payload };
    if (!grantedPermissions.includes("env:read")) {
        delete filtered.envVars;
    }
    if (!grantedPermissions.includes("logs:read")) {
        delete filtered.buildLogs;
    }
    if (!grantedPermissions.includes("project:read")) {
        delete filtered.repository;
    }
    return filtered;
}
const PERMISSION_TO_API_METHOD = {
    getProject: "project:read",
    getServer: "server:read",
    getDeployment: "deploy:read",
    getProjectLogs: "logs:read",
};
export function getRequiredPermission(method) {
    return PERMISSION_TO_API_METHOD[method];
}
