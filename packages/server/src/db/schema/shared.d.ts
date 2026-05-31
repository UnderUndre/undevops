import { z } from "zod";
export declare const applicationStatus: import("drizzle-orm/pg-core").PgEnum<["idle", "running", "done", "error"]>;
export declare const certificateType: import("drizzle-orm/pg-core").PgEnum<["letsencrypt", "none", "custom"]>;
export declare const triggerType: import("drizzle-orm/pg-core").PgEnum<["push", "tag"]>;
export declare const sqldNode: import("drizzle-orm/pg-core").PgEnum<["primary", "replica"]>;
export declare const actorType: import("drizzle-orm/pg-core").PgEnum<["human", "agent", "plugin", "system"]>;
export declare const gateStatusType: import("drizzle-orm/pg-core").PgEnum<["skipped", "pending", "approved", "rejected", "timed_out"]>;
export declare const gatePolicyType: import("drizzle-orm/pg-core").PgEnum<["disabled", "single", "unanimous", "manual_only"]>;
export declare const agentActionType: import("drizzle-orm/pg-core").PgEnum<["deploy", "redeploy", "stop", "start", "restart", "scale", "env_update"]>;
export declare const pendingActionStatus: import("drizzle-orm/pg-core").PgEnum<["pending", "approved", "rejected", "expired", "cancelled"]>;
export declare const mcpAccessLevel: import("drizzle-orm/pg-core").PgEnum<["read", "deploy", "admin"]>;
export declare const mcpTargetType: import("drizzle-orm/pg-core").PgEnum<["organization", "project", "environment", "application", "compose"]>;
export declare const aiProviderType: import("drizzle-orm/pg-core").PgEnum<["claude", "openai", "gemini", "codex", "custom"]>;
export declare const verdictType: import("drizzle-orm/pg-core").PgEnum<["pass", "fail", "abstain", "error"]>;
export declare const secretScopeType: import("drizzle-orm/pg-core").PgEnum<["organization", "project", "environment", "application", "compose", "ai_reviewer", "plugin"]>;
export interface HealthCheckSwarm {
    Test?: string[] | undefined;
    Interval?: number | undefined;
    Timeout?: number | undefined;
    StartPeriod?: number | undefined;
    Retries?: number | undefined;
}
export interface RestartPolicySwarm {
    Condition?: string | undefined;
    Delay?: number | undefined;
    MaxAttempts?: number | undefined;
    Window?: number | undefined;
}
export interface PlacementSwarm {
    Constraints?: string[] | undefined;
    Preferences?: Array<{
        Spread: {
            SpreadDescriptor: string;
        };
    }> | undefined;
    MaxReplicas?: number | undefined;
    Platforms?: Array<{
        Architecture: string;
        OS: string;
    }> | undefined;
}
export interface UpdateConfigSwarm {
    Parallelism: number;
    Delay?: number | undefined;
    FailureAction?: string | undefined;
    Monitor?: number | undefined;
    MaxFailureRatio?: number | undefined;
    Order: string;
}
export interface ServiceModeSwarm {
    Replicated?: {
        Replicas?: number | undefined;
    } | undefined;
    Global?: {} | undefined;
    ReplicatedJob?: {
        MaxConcurrent?: number | undefined;
        TotalCompletions?: number | undefined;
    } | undefined;
    GlobalJob?: {} | undefined;
}
export interface NetworkSwarm {
    Target?: string | undefined;
    Aliases?: string[] | undefined;
    DriverOpts?: {
        [key: string]: string;
    } | undefined;
}
export interface LabelsSwarm {
    [name: string]: string;
}
export interface EndpointPortConfigSwarm {
    Protocol?: string | undefined;
    TargetPort?: number | undefined;
    PublishedPort?: number | undefined;
    PublishMode?: string | undefined;
}
export interface EndpointSpecSwarm {
    Mode?: string | undefined;
    Ports?: EndpointPortConfigSwarm[] | undefined;
}
export interface UlimitSwarm {
    Name: string;
    Soft: number;
    Hard: number;
}
export type UlimitsSwarm = UlimitSwarm[];
export declare const HealthCheckSwarmSchema: z.ZodObject<{
    Test: z.ZodOptional<z.ZodArray<z.ZodString>>;
    Interval: z.ZodOptional<z.ZodNumber>;
    Timeout: z.ZodOptional<z.ZodNumber>;
    StartPeriod: z.ZodOptional<z.ZodNumber>;
    Retries: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const RestartPolicySwarmSchema: z.ZodObject<{
    Condition: z.ZodOptional<z.ZodString>;
    Delay: z.ZodOptional<z.ZodNumber>;
    MaxAttempts: z.ZodOptional<z.ZodNumber>;
    Window: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const PreferenceSchema: z.ZodObject<{
    Spread: z.ZodObject<{
        SpreadDescriptor: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strict>;
export declare const PlatformSchema: z.ZodObject<{
    Architecture: z.ZodString;
    OS: z.ZodString;
}, z.core.$strict>;
export declare const PlacementSwarmSchema: z.ZodObject<{
    Constraints: z.ZodOptional<z.ZodArray<z.ZodString>>;
    Preferences: z.ZodOptional<z.ZodArray<z.ZodObject<{
        Spread: z.ZodObject<{
            SpreadDescriptor: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strict>>>;
    MaxReplicas: z.ZodOptional<z.ZodNumber>;
    Platforms: z.ZodOptional<z.ZodArray<z.ZodObject<{
        Architecture: z.ZodString;
        OS: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const UpdateConfigSwarmSchema: z.ZodObject<{
    Parallelism: z.ZodNumber;
    Delay: z.ZodOptional<z.ZodNumber>;
    FailureAction: z.ZodOptional<z.ZodString>;
    Monitor: z.ZodOptional<z.ZodNumber>;
    MaxFailureRatio: z.ZodOptional<z.ZodNumber>;
    Order: z.ZodString;
}, z.core.$strict>;
export declare const ReplicatedSchema: z.ZodObject<{
    Replicas: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const ReplicatedJobSchema: z.ZodObject<{
    MaxConcurrent: z.ZodOptional<z.ZodNumber>;
    TotalCompletions: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const ServiceModeSwarmSchema: z.ZodObject<{
    Replicated: z.ZodOptional<z.ZodObject<{
        Replicas: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    Global: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    ReplicatedJob: z.ZodOptional<z.ZodObject<{
        MaxConcurrent: z.ZodOptional<z.ZodNumber>;
        TotalCompletions: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    GlobalJob: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
}, z.core.$strict>;
export declare const NetworkSwarmSchema: z.ZodArray<z.ZodObject<{
    Target: z.ZodOptional<z.ZodString>;
    Aliases: z.ZodOptional<z.ZodArray<z.ZodString>>;
    DriverOpts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strict>>;
export declare const LabelsSwarmSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const EndpointPortConfigSwarmSchema: z.ZodObject<{
    Protocol: z.ZodOptional<z.ZodString>;
    TargetPort: z.ZodOptional<z.ZodNumber>;
    PublishedPort: z.ZodOptional<z.ZodNumber>;
    PublishMode: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const EndpointSpecSwarmSchema: z.ZodObject<{
    Mode: z.ZodOptional<z.ZodString>;
    Ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
        Protocol: z.ZodOptional<z.ZodString>;
        TargetPort: z.ZodOptional<z.ZodNumber>;
        PublishedPort: z.ZodOptional<z.ZodNumber>;
        PublishMode: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export declare const UlimitSwarmSchema: z.ZodObject<{
    Name: z.ZodString;
    Soft: z.ZodNumber;
    Hard: z.ZodNumber;
}, z.core.$strict>;
export declare const UlimitsSwarmSchema: z.ZodArray<z.ZodObject<{
    Name: z.ZodString;
    Soft: z.ZodNumber;
    Hard: z.ZodNumber;
}, z.core.$strict>>;
//# sourceMappingURL=shared.d.ts.map