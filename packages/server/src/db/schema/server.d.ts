import { z } from "zod";
export declare const serverStatus: import("drizzle-orm/pg-core").PgEnum<["active", "inactive"]>;
export declare const serverType: import("drizzle-orm/pg-core").PgEnum<["deploy", "build"]>;
export declare const server: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "server";
    schema: undefined;
    columns: {
        serverId: import("drizzle-orm/pg-core").PgColumn<{
            name: "serverId";
            tableName: "server";
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
            tableName: "server";
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
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "server";
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
        ipAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "ipAddress";
            tableName: "server";
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
        port: import("drizzle-orm/pg-core").PgColumn<{
            name: "port";
            tableName: "server";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        username: import("drizzle-orm/pg-core").PgColumn<{
            name: "username";
            tableName: "server";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
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
            tableName: "server";
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
        enableDockerCleanup: import("drizzle-orm/pg-core").PgColumn<{
            name: "enableDockerCleanup";
            tableName: "server";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
            tableName: "server";
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
        organizationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "organizationId";
            tableName: "server";
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
        serverStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "serverStatus";
            tableName: "server";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "active" | "inactive";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["active", "inactive"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        serverType: import("drizzle-orm/pg-core").PgColumn<{
            name: "serverType";
            tableName: "server";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "deploy" | "build";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["deploy", "build"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        command: import("drizzle-orm/pg-core").PgColumn<{
            name: "command";
            tableName: "server";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sshKeyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sshKeyId";
            tableName: "server";
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
        metricsConfig: import("drizzle-orm/pg-core").PgColumn<{
            name: "metricsConfig";
            tableName: "server";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
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
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
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
    };
    dialect: "pg";
}>;
export declare const serverRelations: import("drizzle-orm").Relations<"server", {
    deployments: import("drizzle-orm").Many<"deployment">;
    buildDeployments: import("drizzle-orm").Many<"deployment">;
    sshKey: import("drizzle-orm").One<"ssh-key", false>;
    applications: import("drizzle-orm").Many<"application">;
    buildApplications: import("drizzle-orm").Many<"application">;
    compose: import("drizzle-orm").Many<"compose">;
    libsql: import("drizzle-orm").Many<"libsql">;
    redis: import("drizzle-orm").Many<"redis">;
    mariadb: import("drizzle-orm").Many<"mariadb">;
    mongo: import("drizzle-orm").Many<"mongo">;
    mysql: import("drizzle-orm").Many<"mysql">;
    postgres: import("drizzle-orm").Many<"postgres">;
    certificates: import("drizzle-orm").Many<"certificate">;
    organization: import("drizzle-orm").One<"organization", true>;
    schedules: import("drizzle-orm").Many<"schedule">;
}>;
export declare const apiCreateServer: z.ZodObject<{
    name: z.ZodNonOptional<z.ZodString>;
    description: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    port: z.ZodNonOptional<z.ZodNumber>;
    sshKeyId: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    ipAddress: z.ZodNonOptional<z.ZodString>;
    username: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    serverType: z.ZodNonOptional<z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        deploy: "deploy";
        build: "build";
    }>>>>;
}, z.core.$strip>;
export declare const apiFindOneServer: z.ZodObject<{
    serverId: z.ZodString;
}, z.core.$strip>;
export declare const apiRemoveServer: z.ZodObject<{
    serverId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiUpdateServer: z.ZodObject<{
    name: z.ZodNonOptional<z.ZodString>;
    description: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    port: z.ZodNonOptional<z.ZodNumber>;
    sshKeyId: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    serverId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    ipAddress: z.ZodNonOptional<z.ZodString>;
    username: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    serverType: z.ZodNonOptional<z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        deploy: "deploy";
        build: "build";
    }>>>>;
    command: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiUpdateServerMonitoring: z.ZodObject<{
    serverId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    metricsConfig: z.ZodObject<{
        server: z.ZodNonOptional<z.ZodObject<{
            refreshRate: z.ZodNumber;
            port: z.ZodNumber;
            token: z.ZodString;
            urlCallback: z.ZodString;
            retentionDays: z.ZodNumber;
            cronJob: z.ZodString;
            thresholds: z.ZodObject<{
                cpu: z.ZodNumber;
                memory: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        containers: z.ZodNonOptional<z.ZodObject<{
            refreshRate: z.ZodNumber;
            services: z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString>>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=server.d.ts.map