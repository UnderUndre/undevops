import type { PluginApiClient, Project, Server, Deployment, LogLine } from "./types/payloads.js";
interface ApiClientDependencies {
    pluginName: string;
    grantedPermissions: string[];
    fetchProject: (id: string) => Promise<Project>;
    fetchServer: (id: string) => Promise<Server>;
    fetchDeployment: (id: string) => Promise<Deployment>;
    fetchProjectLogs: (id: string, opts?: {
        lines?: number;
        level?: string;
    }) => Promise<LogLine[]>;
    auditLog: (action: string, meta?: Record<string, unknown>) => void;
}
export declare function createPluginApiClient(deps: ApiClientDependencies): PluginApiClient;
export {};
