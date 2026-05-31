export {
	type PluginPermission,
	permissionEnum,
} from "../types/manifest.js";

import { permissionEnum, type PluginPermission } from "../types/manifest.js";

export const CANONICAL_PERMISSIONS = new Set<string>(permissionEnum.options);

export class PluginPermissionError extends Error {
	readonly pluginName: string;
	readonly permission: string;
	readonly action: string;

	constructor(pluginName: string, permission: string, action: string) {
		super(`Plugin ${pluginName} lacks permission ${permission} for ${action}`);
		this.name = "PluginPermissionError";
		this.pluginName = pluginName;
		this.permission = permission;
		this.action = action;
	}
}

export function checkPermission(
	grantedPermissions: string[],
	permission: PluginPermission,
	pluginName: string,
	action: string,
): void {
	if (!grantedPermissions.includes(permission)) {
		throw new PluginPermissionError(pluginName, permission, action);
	}
}

export function validatePermissions(declared: string[]): {
	valid: true;
} | {
	valid: false;
	unknown: string[];
} {
	const unknown = declared.filter((p) => !CANONICAL_PERMISSIONS.has(p));
	if (unknown.length > 0) {
		return { valid: false, unknown };
	}
	return { valid: true };
}

export function filterPayloadByPermissions(
	payload: Record<string, unknown>,
	grantedPermissions: string[],
): Record<string, unknown> {
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

const PERMISSION_TO_API_METHOD: Record<string, string> = {
	getProject: "project:read",
	getServer: "server:read",
	getDeployment: "deploy:read",
	getProjectLogs: "logs:read",
};

export function getRequiredPermission(method: keyof import("../types/payloads.js").PluginApiClient): string | undefined {
	return PERMISSION_TO_API_METHOD[method];
}
