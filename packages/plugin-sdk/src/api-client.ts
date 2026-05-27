import type { PluginApiClient, Project, Server, Deployment, LogLine } from "./types/payloads.js";
import { checkPermission, getRequiredPermission } from "./permissions/index.js";

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const API_TIMEOUT_MS = 5_000;

interface ApiClientDependencies {
	pluginName: string;
	grantedPermissions: string[];
	fetchProject: (id: string) => Promise<Project>;
	fetchServer: (id: string) => Promise<Server>;
	fetchDeployment: (id: string) => Promise<Deployment>;
	fetchProjectLogs: (id: string, opts?: { lines?: number; level?: string }) => Promise<LogLine[]>;
	auditLog: (action: string, meta?: Record<string, unknown>) => void;
}

export function createPluginApiClient(deps: ApiClientDependencies): PluginApiClient {
	const rateLimitCounters = new Map<string, RateLimitEntry>();

	function checkRateLimit(method: string): void {
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

	function withTimeout<T>(promise: Promise<T>): Promise<T> {
		return Promise.race([
			promise,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error(`API call timed out after ${API_TIMEOUT_MS}ms`)), API_TIMEOUT_MS),
			),
		]);
	}

	function enforcePermission(method: string, action: string): void {
		const permission = getRequiredPermission(method as keyof PluginApiClient);
		if (permission) {
			checkPermission(deps.grantedPermissions, permission as import("./permissions/index.js").PluginPermission, deps.pluginName, action);
		}
	}

	return {
		async getProject(projectId: string): Promise<Project> {
			enforcePermission("getProject", "getProject");
			checkRateLimit("getProject");
			deps.auditLog("plugin.api.getProject", { projectId });
			return withTimeout(deps.fetchProject(projectId));
		},

		async getServer(serverId: string): Promise<Server> {
			enforcePermission("getServer", "getServer");
			checkRateLimit("getServer");
			deps.auditLog("plugin.api.getServer", { serverId });
			return withTimeout(deps.fetchServer(serverId));
		},

		async getDeployment(deploymentId: string): Promise<Deployment> {
			enforcePermission("getDeployment", "getDeployment");
			checkRateLimit("getDeployment");
			deps.auditLog("plugin.api.getDeployment", { deploymentId });
			return withTimeout(deps.fetchDeployment(deploymentId));
		},

		async getProjectLogs(projectId: string, opts?: { lines?: number; level?: string }): Promise<LogLine[]> {
			enforcePermission("getProjectLogs", "getProjectLogs");
			checkRateLimit("getProjectLogs");
			deps.auditLog("plugin.api.getProjectLogs", { projectId, ...opts });
			return withTimeout(deps.fetchProjectLogs(projectId, opts));
		},
	};
}
