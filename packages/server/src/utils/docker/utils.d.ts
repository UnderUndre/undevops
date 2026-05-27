import type { Compose } from "@undevops/server/services/compose";
import type { ContainerInfo, ResourceRequirements } from "dockerode";
import type { ApplicationNested } from "../builders";
import type { LibsqlNested } from "../databases/libsql";
import type { MariadbNested } from "../databases/mariadb";
import type { MongoNested } from "../databases/mongo";
import type { MysqlNested } from "../databases/mysql";
import type { PostgresNested } from "../databases/postgres";
import type { RedisNested } from "../databases/redis";
interface RegistryAuth {
    username: string;
    password: string;
    registryUrl: string;
}
export declare const pullImage: (dockerImage: string, onData?: (data: any) => void, authConfig?: Partial<RegistryAuth>) => Promise<void>;
export declare const pullRemoteImage: (dockerImage: string, serverId: string, onData?: (data: any) => void, authConfig?: Partial<RegistryAuth>) => Promise<void>;
export declare const containerExists: (containerName: string) => Promise<boolean>;
export declare const stopService: (appName: string) => Promise<unknown>;
export declare const stopServiceRemote: (serverId: string, appName: string) => Promise<unknown>;
export declare const getContainerByName: (name: string) => Promise<ContainerInfo>;
/**
 * Docker commands sent using this method are held in a hold when Docker is busy.
 *
 * https://github.com/Dokploy/dokploy/pull/3064
 */
export declare const dockerSafeExec: (exec: string) => string;
export declare const cleanupContainers: (serverId?: string) => Promise<void>;
export declare const cleanupImages: (serverId?: string) => Promise<void>;
export declare const cleanupVolumes: (serverId?: string) => Promise<void>;
export declare const cleanupBuilders: (serverId?: string) => Promise<void>;
export declare const cleanupSystem: (serverId?: string) => Promise<void>;
export interface DockerDiskUsageItem {
    type: string;
    totalCount: number;
    active: number;
    size: string;
    reclaimable: string;
    sizeBytes: number;
}
export declare const getDockerDiskUsage: () => Promise<DockerDiskUsageItem[]>;
export declare const cleanupAll: (serverId?: string) => Promise<void>;
export declare const cleanupAllBackground: (serverId?: string) => Promise<{
    status: string;
    message: string;
}>;
export declare const startService: (appName: string) => Promise<void>;
export declare const startServiceRemote: (serverId: string, appName: string) => Promise<void>;
export declare const removeService: (appName: string, serverId?: string | null, _deleteVolumes?: boolean) => Promise<unknown>;
export declare const prepareEnvironmentVariables: (serviceEnv: string | null, projectEnv?: string | null, environmentEnv?: string | null) => string[];
export declare const prepareEnvironmentVariablesForShell: (serviceEnv: string | null, projectEnv?: string | null, environmentEnv?: string | null) => string[];
export declare const parseEnvironmentKeyValuePair: (pair: string) => [string, string];
export declare const getEnvironmentVariablesObject: (input: string | null, projectEnv?: string | null, environmentEnv?: string | null) => Record<string, string>;
export declare const generateVolumeMounts: (mounts: ApplicationNested["mounts"]) => {
    Type: "volume";
    Source: string;
    Target: string;
}[];
type Resources = {
    memoryLimit: string | null;
    memoryReservation: string | null;
    cpuLimit: string | null;
    cpuReservation: string | null;
};
export declare const calculateResources: ({ memoryLimit, memoryReservation, cpuLimit, cpuReservation, }: Resources) => ResourceRequirements;
export declare const generateConfigContainer: (application: Partial<ApplicationNested>) => {
    Ulimits?: import("../../db").UlimitsSwarm | undefined;
    EndpointSpec?: {
        Ports: {
            Protocol: "tcp" | "udp" | "sctp";
            TargetPort: number;
            PublishedPort: number;
            PublishMode: "ingress" | "host";
        }[];
        Mode?: string | undefined;
    } | undefined;
    Networks: import("../../db").NetworkSwarm[];
    StopGracePeriod?: number | undefined;
    UpdateConfig: import("../../db").UpdateConfigSwarm;
    RollbackConfig: import("../../db").UpdateConfigSwarm;
    Mode: import("../../db").ServiceModeSwarm;
    Labels?: import("../../db").LabelsSwarm | undefined;
    Placement: import("../../db").PlacementSwarm;
    RestartPolicy?: import("../../db").RestartPolicySwarm | undefined;
    HealthCheck?: import("../../db").HealthCheckSwarm | undefined;
};
export declare const generateBindMounts: (mounts: ApplicationNested["mounts"]) => {
    Type: "bind";
    Source: string;
    Target: string;
}[];
export declare const generateFileMounts: (appName: string, service: ApplicationNested | LibsqlNested | MongoNested | MariadbNested | MysqlNested | PostgresNested | RedisNested) => {
    Type: "bind";
    Source: string;
    Target: string;
}[];
export declare const createFile: (outputPath: string, filePath: string, content: string) => Promise<void>;
export declare const encodeBase64: (content: string) => string;
export declare const getCreateFileCommand: (outputPath: string, filePath: string, content: string) => string;
export declare const getServiceContainer: (appName: string, serverId?: string | null) => Promise<ContainerInfo | null>;
export declare const getComposeContainer: (compose: Compose, serviceName: string) => Promise<ContainerInfo | null>;
type ServiceHealthStatus = {
    status: "healthy" | "unhealthy";
    message?: string;
};
export declare const checkPostgresHealth: () => Promise<ServiceHealthStatus>;
export declare const checkRedisHealth: () => Promise<ServiceHealthStatus>;
export declare const checkTraefikHealth: () => Promise<ServiceHealthStatus>;
export {};
//# sourceMappingURL=utils.d.ts.map