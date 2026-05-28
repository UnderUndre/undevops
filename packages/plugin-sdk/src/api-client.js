import { checkPermission, getRequiredPermission } from "./permissions/index.js";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const API_TIMEOUT_MS = 5_000;
export function createPluginApiClient(deps) {
    const rateLimitCounters = new Map();
    function checkRateLimit(method) {
        const now = Date.now();
        let entry = rateLimitCounters.get(method);
        if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
            entry = { count: 0, windowStart: now };
            rateLimitCounters.set(method, entry);
        }
        entry.count++;
        if (entry.count > RATE_LIMIT_MAX) {
            throw new Error(`Rate limit exceeded for ${deps.pluginName} on ${method}`);
        }
    }
    function withTimeout(promise) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`API call timed out after ${API_TIMEOUT_MS}ms`)), API_TIMEOUT_MS)),
        ]);
    }
    function enforcePermission(method, action) {
        const permission = getRequiredPermission(method);
        if (permission) {
            checkPermission(deps.grantedPermissions, permission, deps.pluginName, action);
        }
    }
    return {
        async getProject(projectId) {
            enforcePermission("getProject", "getProject");
            checkRateLimit("getProject");
            deps.auditLog("plugin.api.getProject", { projectId });
            return withTimeout(deps.fetchProject(projectId));
        },
        async getServer(serverId) {
            enforcePermission("getServer", "getServer");
            checkRateLimit("getServer");
            deps.auditLog("plugin.api.getServer", { serverId });
            return withTimeout(deps.fetchServer(serverId));
        },
        async getDeployment(deploymentId) {
            enforcePermission("getDeployment", "getDeployment");
            checkRateLimit("getDeployment");
            deps.auditLog("plugin.api.getDeployment", { deploymentId });
            return withTimeout(deps.fetchDeployment(deploymentId));
        },
        async getProjectLogs(projectId, opts) {
            enforcePermission("getProjectLogs", "getProjectLogs");
            checkRateLimit("getProjectLogs");
            deps.auditLog("plugin.api.getProjectLogs", { projectId, ...opts });
            return withTimeout(deps.fetchProjectLogs(projectId, opts));
        },
    };
}
