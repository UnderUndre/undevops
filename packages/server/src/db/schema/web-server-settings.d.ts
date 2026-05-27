import { z } from "zod";
export declare const webServerSettings: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "webServerSettings";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "webServerSettings";
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
        serverIp: import("drizzle-orm/pg-core").PgColumn<{
            name: "serverIp";
            tableName: "webServerSettings";
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
        certificateType: import("drizzle-orm/pg-core").PgColumn<{
            name: "certificateType";
            tableName: "webServerSettings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "letsencrypt" | "none" | "custom";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["letsencrypt", "none", "custom"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        https: import("drizzle-orm/pg-core").PgColumn<{
            name: "https";
            tableName: "webServerSettings";
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
        host: import("drizzle-orm/pg-core").PgColumn<{
            name: "host";
            tableName: "webServerSettings";
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
        letsEncryptEmail: import("drizzle-orm/pg-core").PgColumn<{
            name: "letsEncryptEmail";
            tableName: "webServerSettings";
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
        sshPrivateKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "sshPrivateKey";
            tableName: "webServerSettings";
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
        enableDockerCleanup: import("drizzle-orm/pg-core").PgColumn<{
            name: "enableDockerCleanup";
            tableName: "webServerSettings";
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
        logCleanupCron: import("drizzle-orm/pg-core").PgColumn<{
            name: "logCleanupCron";
            tableName: "webServerSettings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
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
            tableName: "webServerSettings";
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
        whitelabelingConfig: import("drizzle-orm/pg-core").PgColumn<{
            name: "whitelabelingConfig";
            tableName: "webServerSettings";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                appName: string | null;
                appDescription: string | null;
                logoUrl: string | null;
                faviconUrl: string | null;
                customCss: string | null;
                loginLogoUrl: string | null;
                supportUrl: string | null;
                docsUrl: string | null;
                errorPageTitle: string | null;
                errorPageDescription: string | null;
                metaTitle: string | null;
                footerText: string | null;
            };
            driverParam: unknown;
            notNull: false;
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
                appName: string | null;
                appDescription: string | null;
                logoUrl: string | null;
                faviconUrl: string | null;
                customCss: string | null;
                loginLogoUrl: string | null;
                supportUrl: string | null;
                docsUrl: string | null;
                errorPageTitle: string | null;
                errorPageDescription: string | null;
                metaTitle: string | null;
                footerText: string | null;
            };
        }>;
        cleanupCacheApplications: import("drizzle-orm/pg-core").PgColumn<{
            name: "cleanupCacheApplications";
            tableName: "webServerSettings";
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
        cleanupCacheOnPreviews: import("drizzle-orm/pg-core").PgColumn<{
            name: "cleanupCacheOnPreviews";
            tableName: "webServerSettings";
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
        cleanupCacheOnCompose: import("drizzle-orm/pg-core").PgColumn<{
            name: "cleanupCacheOnCompose";
            tableName: "webServerSettings";
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
            name: "created_at";
            tableName: "webServerSettings";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "webServerSettings";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
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
    };
    dialect: "pg";
}>;
export declare const webServerSettingsRelations: import("drizzle-orm").Relations<"webServerSettings", {}>;
export declare const apiUpdateWebServerSettings: z.ZodObject<{
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    whitelabelingConfig: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodType<string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
    } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null, unknown, z.core.$ZodTypeInternals<string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | (string | number | boolean | /*elided*/ any | /*elided*/ any | null)[] | null;
    } | (string | number | boolean | {
        [key: string]: string | number | boolean | /*elided*/ any | /*elided*/ any | null;
    } | /*elided*/ any | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null)[] | null, unknown>>>>>;
    serverIp: z.ZodOptional<z.ZodString>;
    certificateType: z.ZodOptional<z.ZodEnum<{
        letsencrypt: "letsencrypt";
        none: "none";
        custom: "custom";
    }>>;
    https: z.ZodOptional<z.ZodBoolean>;
    host: z.ZodOptional<z.ZodString>;
    letsEncryptEmail: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sshPrivateKey: z.ZodOptional<z.ZodString>;
    enableDockerCleanup: z.ZodOptional<z.ZodBoolean>;
    logCleanupCron: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metricsConfig: z.ZodOptional<z.ZodObject<{
        server: z.ZodObject<{
            type: z.ZodEnum<{
                Dokploy: "Dokploy";
                Remote: "Remote";
            }>;
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
        }, z.core.$strip>;
        containers: z.ZodObject<{
            refreshRate: z.ZodNumber;
            services: z.ZodObject<{
                include: z.ZodArray<z.ZodString>;
                exclude: z.ZodArray<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    cleanupCacheApplications: z.ZodOptional<z.ZodBoolean>;
    cleanupCacheOnPreviews: z.ZodOptional<z.ZodBoolean>;
    cleanupCacheOnCompose: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const apiAssignDomain: z.ZodObject<{
    host: z.ZodNonOptional<z.ZodString>;
    certificateType: z.ZodNonOptional<z.ZodEnum<{
        letsencrypt: "letsencrypt";
        none: "none";
        custom: "custom";
    }>>;
    letsEncryptEmail: z.ZodOptional<z.ZodNonOptional<z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"">]>>>>>;
    https: z.ZodOptional<z.ZodNonOptional<z.ZodOptional<z.ZodBoolean>>>;
}, z.core.$strip>;
export declare const apiSaveSSHKey: z.ZodObject<{
    sshPrivateKey: z.ZodNonOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiUpdateDockerCleanup: z.ZodObject<{
    enableDockerCleanup: z.ZodBoolean;
    serverId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const whitelabelingConfigSchema: z.ZodObject<{
    appName: z.ZodNullable<z.ZodString>;
    appDescription: z.ZodNullable<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodString>;
    faviconUrl: z.ZodNullable<z.ZodString>;
    customCss: z.ZodNullable<z.ZodString>;
    loginLogoUrl: z.ZodNullable<z.ZodString>;
    supportUrl: z.ZodNullable<z.ZodString>;
    docsUrl: z.ZodNullable<z.ZodString>;
    errorPageTitle: z.ZodNullable<z.ZodString>;
    errorPageDescription: z.ZodNullable<z.ZodString>;
    metaTitle: z.ZodNullable<z.ZodString>;
    footerText: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const apiUpdateWhitelabeling: z.ZodObject<{
    whitelabelingConfig: z.ZodObject<{
        appName: z.ZodNullable<z.ZodString>;
        appDescription: z.ZodNullable<z.ZodString>;
        logoUrl: z.ZodNullable<z.ZodString>;
        faviconUrl: z.ZodNullable<z.ZodString>;
        customCss: z.ZodNullable<z.ZodString>;
        loginLogoUrl: z.ZodNullable<z.ZodString>;
        supportUrl: z.ZodNullable<z.ZodString>;
        docsUrl: z.ZodNullable<z.ZodString>;
        errorPageTitle: z.ZodNullable<z.ZodString>;
        errorPageDescription: z.ZodNullable<z.ZodString>;
        metaTitle: z.ZodNullable<z.ZodString>;
        footerText: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const apiUpdateWebServerMonitoring: z.ZodObject<{
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
//# sourceMappingURL=web-server-settings.d.ts.map