import { z } from "zod";
import { type EndpointSpecSwarm, type HealthCheckSwarm, type LabelsSwarm, type NetworkSwarm, type PlacementSwarm, type RestartPolicySwarm, type ServiceModeSwarm, type UlimitsSwarm, type UpdateConfigSwarm } from "./shared";
export declare const mariadb: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "mariadb";
    schema: undefined;
    columns: {
        mariadbId: import("drizzle-orm/pg-core").PgColumn<{
            name: "mariadbId";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        appName: import("drizzle-orm/pg-core").PgColumn<{
            name: "appName";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        databaseName: import("drizzle-orm/pg-core").PgColumn<{
            name: "databaseName";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        databaseUser: import("drizzle-orm/pg-core").PgColumn<{
            name: "databaseUser";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        databasePassword: import("drizzle-orm/pg-core").PgColumn<{
            name: "databasePassword";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        databaseRootPassword: import("drizzle-orm/pg-core").PgColumn<{
            name: "rootPassword";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        dockerImage: import("drizzle-orm/pg-core").PgColumn<{
            name: "dockerImage";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        command: import("drizzle-orm/pg-core").PgColumn<{
            name: "command";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        args: import("drizzle-orm/pg-core").PgColumn<{
            name: "args";
            tableName: "mariadb";
            dataType: "array";
            columnType: "PgArray";
            data: string[];
            driverParam: string | string[];
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: import("drizzle-orm").Column<{
                name: "args";
                tableName: "mariadb";
                dataType: "string";
                columnType: "PgText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            identity: undefined;
            generated: undefined;
        }, {}, {
            baseBuilder: import("drizzle-orm/pg-core").PgColumnBuilder<{
                name: "args";
                dataType: "string";
                columnType: "PgText";
                data: string;
                enumValues: [string, ...string[]];
                driverParam: string;
            }, {}, {}, import("drizzle-orm").ColumnBuilderExtraConfig>;
            size: undefined;
        }>;
        env: import("drizzle-orm/pg-core").PgColumn<{
            name: "env";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        memoryReservation: import("drizzle-orm/pg-core").PgColumn<{
            name: "memoryReservation";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        memoryLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "memoryLimit";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        cpuReservation: import("drizzle-orm/pg-core").PgColumn<{
            name: "cpuReservation";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        cpuLimit: import("drizzle-orm/pg-core").PgColumn<{
            name: "cpuLimit";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        externalPort: import("drizzle-orm/pg-core").PgColumn<{
            name: "externalPort";
            tableName: "mariadb";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        applicationStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "applicationStatus";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "idle" | "running" | "done" | "error";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["idle", "running", "done", "error"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        healthCheckSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "healthCheckSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: HealthCheckSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: HealthCheckSwarm;
        }>;
        restartPolicySwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "restartPolicySwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: RestartPolicySwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: RestartPolicySwarm;
        }>;
        placementSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "placementSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: PlacementSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: PlacementSwarm;
        }>;
        updateConfigSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "updateConfigSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: UpdateConfigSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: UpdateConfigSwarm;
        }>;
        rollbackConfigSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "rollbackConfigSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: UpdateConfigSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: UpdateConfigSwarm;
        }>;
        modeSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "modeSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: ServiceModeSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: ServiceModeSwarm;
        }>;
        labelsSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "labelsSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: LabelsSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: LabelsSwarm;
        }>;
        networkSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "networkSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: NetworkSwarm[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: NetworkSwarm[];
        }>;
        stopGracePeriodSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "stopGracePeriodSwarm";
            tableName: "mariadb";
            dataType: "number";
            columnType: "PgBigInt53";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        endpointSpecSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "endpointSpecSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: EndpointSpecSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: EndpointSpecSwarm;
        }>;
        ulimitsSwarm: import("drizzle-orm/pg-core").PgColumn<{
            name: "ulimitsSwarm";
            tableName: "mariadb";
            dataType: "json";
            columnType: "PgJson";
            data: UlimitsSwarm;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: UlimitsSwarm;
        }>;
        replicas: import("drizzle-orm/pg-core").PgColumn<{
            name: "replicas";
            tableName: "mariadb";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "createdAt";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        environmentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "environmentId";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        serverId: import("drizzle-orm/pg-core").PgColumn<{
            name: "serverId";
            tableName: "mariadb";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const mariadbRelations: import("drizzle-orm").Relations<"mariadb", {
    environment: import("drizzle-orm").One<"environment", true>;
    backups: import("drizzle-orm").Many<"backup">;
    mounts: import("drizzle-orm").Many<"mount">;
    server: import("drizzle-orm").One<"server", false>;
}>;
export declare const apiCreateMariaDB: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    appName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    environmentId: z.ZodString;
    serverId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    dockerImage: z.ZodDefault<z.ZodString>;
    databaseName: z.ZodString;
    databaseUser: z.ZodString;
    databasePassword: z.ZodString;
    databaseRootPassword: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiFindOneMariaDB: z.ZodObject<{
    mariadbId: z.ZodString;
}, z.core.$strip>;
export declare const apiChangeMariaDBStatus: z.ZodObject<{
    applicationStatus: z.ZodNonOptional<z.ZodOptional<z.ZodEnum<{
        idle: "idle";
        running: "running";
        done: "done";
        error: "error";
    }>>>;
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiSaveEnvironmentVariablesMariaDB: z.ZodObject<{
    env: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiSaveExternalPortMariaDB: z.ZodObject<{
    externalPort: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiDeployMariaDB: z.ZodObject<{
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiResetMariadb: z.ZodObject<{
    appName: z.ZodNonOptional<z.ZodOptional<z.ZodOptional<z.ZodString>>>;
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiUpdateMariaDB: z.ZodObject<{
    applicationStatus: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        idle: "idle";
        running: "running";
        done: "done";
        error: "error";
    }>>>;
    name: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    appName: z.ZodOptional<z.ZodOptional<z.ZodOptional<z.ZodString>>>;
    env: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    command: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    environmentId: z.ZodOptional<z.ZodString>;
    memoryReservation: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    memoryLimit: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    cpuReservation: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    cpuLimit: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    args: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString>>>>>;
    dockerImage: z.ZodOptional<z.ZodString>;
    healthCheckSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Test: z.ZodOptional<z.ZodArray<z.ZodString>>;
        Interval: z.ZodOptional<z.ZodNumber>;
        Timeout: z.ZodOptional<z.ZodNumber>;
        StartPeriod: z.ZodOptional<z.ZodNumber>;
        Retries: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>>>>;
    restartPolicySwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Condition: z.ZodOptional<z.ZodString>;
        Delay: z.ZodOptional<z.ZodNumber>;
        MaxAttempts: z.ZodOptional<z.ZodNumber>;
        Window: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>>>>;
    placementSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
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
    }, z.core.$strict>>>>>;
    updateConfigSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Parallelism: z.ZodNumber;
        Delay: z.ZodOptional<z.ZodNumber>;
        FailureAction: z.ZodOptional<z.ZodString>;
        Monitor: z.ZodOptional<z.ZodNumber>;
        MaxFailureRatio: z.ZodOptional<z.ZodNumber>;
        Order: z.ZodString;
    }, z.core.$strict>>>>>;
    rollbackConfigSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Parallelism: z.ZodNumber;
        Delay: z.ZodOptional<z.ZodNumber>;
        FailureAction: z.ZodOptional<z.ZodString>;
        Monitor: z.ZodOptional<z.ZodNumber>;
        MaxFailureRatio: z.ZodOptional<z.ZodNumber>;
        Order: z.ZodString;
    }, z.core.$strict>>>>>;
    modeSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Replicated: z.ZodOptional<z.ZodObject<{
            Replicas: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        Global: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
        ReplicatedJob: z.ZodOptional<z.ZodObject<{
            MaxConcurrent: z.ZodOptional<z.ZodNumber>;
            TotalCompletions: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        GlobalJob: z.ZodOptional<z.ZodObject<{}, z.core.$strip>>;
    }, z.core.$strict>>>>>;
    labelsSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodString>>>>>;
    networkSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodArray<z.ZodObject<{
        Target: z.ZodOptional<z.ZodString>;
        Aliases: z.ZodOptional<z.ZodArray<z.ZodString>>;
        DriverOpts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strict>>>>>>;
    stopGracePeriodSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodNumber>>>>;
    endpointSpecSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodObject<{
        Mode: z.ZodOptional<z.ZodString>;
        Ports: z.ZodOptional<z.ZodArray<z.ZodObject<{
            Protocol: z.ZodOptional<z.ZodString>;
            TargetPort: z.ZodOptional<z.ZodNumber>;
            PublishedPort: z.ZodOptional<z.ZodNumber>;
            PublishMode: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>>>>;
    ulimitsSwarm: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNullable<z.ZodArray<z.ZodObject<{
        Name: z.ZodString;
        Soft: z.ZodNumber;
        Hard: z.ZodNumber;
    }, z.core.$strict>>>>>>;
    replicas: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    databaseName: z.ZodOptional<z.ZodString>;
    databaseUser: z.ZodOptional<z.ZodString>;
    databasePassword: z.ZodOptional<z.ZodString>;
    databaseRootPassword: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    externalPort: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    mariadbId: z.ZodString;
}, z.core.$strip>;
export declare const apiRebuildMariadb: z.ZodObject<{
    mariadbId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=mariadb.d.ts.map