import { type apiCreateServer, server } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Server = typeof server.$inferSelect;
export declare const createServer: (input: z.infer<typeof apiCreateServer>, organizationId: string) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    port: number;
    appName: string;
    sshKeyId: string | null;
    command: string;
    serverId: string;
    ipAddress: string;
    username: string;
    enableDockerCleanup: boolean;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
}>;
export declare const findServerById: (serverId: string) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    port: number;
    appName: string;
    sshKeyId: string | null;
    command: string;
    serverId: string;
    ipAddress: string;
    username: string;
    enableDockerCleanup: boolean;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
    deployments: {
        createdAt: string;
        description: string | null;
        applicationId: string | null;
        composeId: string | null;
        serverId: string | null;
        title: string;
        buildServerId: string | null;
        previewDeploymentId: string | null;
        status: "running" | "done" | "error" | "cancelled" | null;
        deploymentId: string;
        logPath: string;
        pid: string | null;
        isPreviewDeployment: boolean | null;
        startedAt: string | null;
        finishedAt: string | null;
        errorMessage: string | null;
        scheduleId: string | null;
        backupId: string | null;
        rollbackId: string | null;
        volumeBackupId: string | null;
        initiatingActorType: "human" | "agent" | "plugin" | "system";
        initiatingActorId: string | null;
        gateStatus: "skipped" | "pending" | "approved" | "rejected" | "timed_out";
    }[];
    sshKey: {
        name: string;
        createdAt: string;
        organizationId: string;
        description: string | null;
        sshKeyId: string;
        privateKey: string;
        publicKey: string;
        lastUsedAt: string | null;
    } | null;
}>;
export declare const findServersByUserId: (userId: string) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    port: number;
    appName: string;
    sshKeyId: string | null;
    command: string;
    serverId: string;
    ipAddress: string;
    username: string;
    enableDockerCleanup: boolean;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
}[]>;
export declare const deleteServer: (serverId: string) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    port: number;
    appName: string;
    sshKeyId: string | null;
    command: string;
    serverId: string;
    ipAddress: string;
    username: string;
    enableDockerCleanup: boolean;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
}>;
export declare const haveActiveServices: (serverId: string) => Promise<boolean>;
export declare const updateServerById: (serverId: string, serverData: Partial<Server>) => Promise<{
    serverId: string;
    name: string;
    description: string | null;
    ipAddress: string;
    port: number;
    username: string;
    appName: string;
    enableDockerCleanup: boolean;
    createdAt: string;
    organizationId: string;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    command: string;
    sshKeyId: string | null;
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
}>;
export declare const getAllServers: () => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    port: number;
    appName: string;
    sshKeyId: string | null;
    command: string;
    serverId: string;
    ipAddress: string;
    username: string;
    enableDockerCleanup: boolean;
    serverStatus: "active" | "inactive";
    serverType: "deploy" | "build";
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
}[]>;
export declare const getAccessibleServerIds: (session: {
    userId: string;
    activeOrganizationId: string;
}) => Promise<Set<string>>;
//# sourceMappingURL=server.d.ts.map