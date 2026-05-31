import { z } from "zod";
export declare const databaseType: import("drizzle-orm/pg-core").PgEnum<["postgres", "mariadb", "mysql", "mongo", "web-server", "libsql"]>;
export declare const backupType: import("drizzle-orm/pg-core").PgEnum<["database", "compose"]>;
export declare const backups: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "backup";
    schema: undefined;
    columns: {
        backupId: import("drizzle-orm/pg-core").PgColumn<{
            name: "backupId";
            tableName: "backup";
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
        appName: import("drizzle-orm/pg-core").PgColumn<{
            name: "appName";
            tableName: "backup";
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
        schedule: import("drizzle-orm/pg-core").PgColumn<{
            name: "schedule";
            tableName: "backup";
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
        enabled: import("drizzle-orm/pg-core").PgColumn<{
            name: "enabled";
            tableName: "backup";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
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
        database: import("drizzle-orm/pg-core").PgColumn<{
            name: "database";
            tableName: "backup";
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
        prefix: import("drizzle-orm/pg-core").PgColumn<{
            name: "prefix";
            tableName: "backup";
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
        serviceName: import("drizzle-orm/pg-core").PgColumn<{
            name: "serviceName";
            tableName: "backup";
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
        destinationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "destinationId";
            tableName: "backup";
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
        keepLatestCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "keepLatestCount";
            tableName: "backup";
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
        backupType: import("drizzle-orm/pg-core").PgColumn<{
            name: "backupType";
            tableName: "backup";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "compose" | "database";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["database", "compose"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        databaseType: import("drizzle-orm/pg-core").PgColumn<{
            name: "databaseType";
            tableName: "backup";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "mysql" | "libsql" | "mariadb" | "mongo" | "postgres" | "web-server";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["postgres", "mariadb", "mysql", "mongo", "web-server", "libsql"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        composeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "composeId";
            tableName: "backup";
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
        postgresId: import("drizzle-orm/pg-core").PgColumn<{
            name: "postgresId";
            tableName: "backup";
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
        mariadbId: import("drizzle-orm/pg-core").PgColumn<{
            name: "mariadbId";
            tableName: "backup";
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
        mysqlId: import("drizzle-orm/pg-core").PgColumn<{
            name: "mysqlId";
            tableName: "backup";
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
        mongoId: import("drizzle-orm/pg-core").PgColumn<{
            name: "mongoId";
            tableName: "backup";
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
        libsqlId: import("drizzle-orm/pg-core").PgColumn<{
            name: "libsqlId";
            tableName: "backup";
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
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "userId";
            tableName: "backup";
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
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "backup";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                postgres?: {
                    databaseUser: string;
                };
                mariadb?: {
                    databaseUser: string;
                    databasePassword: string;
                };
                mongo?: {
                    databaseUser: string;
                    databasePassword: string;
                };
                mysql?: {
                    databaseRootPassword: string;
                };
            } | undefined;
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
            $type: {
                postgres?: {
                    databaseUser: string;
                };
                mariadb?: {
                    databaseUser: string;
                    databasePassword: string;
                };
                mongo?: {
                    databaseUser: string;
                    databasePassword: string;
                };
                mysql?: {
                    databaseRootPassword: string;
                };
            } | undefined;
        }>;
    };
    dialect: "pg";
}>;
export declare const backupsRelations: import("drizzle-orm").Relations<"backup", {
    destination: import("drizzle-orm").One<"destination", true>;
    postgres: import("drizzle-orm").One<"postgres", false>;
    mariadb: import("drizzle-orm").One<"mariadb", false>;
    mysql: import("drizzle-orm").One<"mysql", false>;
    mongo: import("drizzle-orm").One<"mongo", false>;
    libsql: import("drizzle-orm").One<"libsql", false>;
    user: import("drizzle-orm").One<"user", false>;
    compose: import("drizzle-orm").One<"compose", false>;
    deployments: import("drizzle-orm").Many<"deployment">;
}>;
export declare const apiCreateBackup: z.ZodObject<{
    metadata: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    serviceName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    composeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    enabled: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodBoolean>>>;
    databaseType: z.ZodEnum<{
        mysql: "mysql";
        libsql: "libsql";
        mariadb: "mariadb";
        mongo: "mongo";
        postgres: "postgres";
        "web-server": "web-server";
    }>;
    backupType: z.ZodOptional<z.ZodEnum<["database", "compose"]>>;
    mysqlId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    prefix: z.ZodString;
    libsqlId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    mariadbId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    mongoId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    postgresId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    database: z.ZodString;
    schedule: z.ZodString;
    destinationId: z.ZodString;
    keepLatestCount: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
}, z.core.$strip>;
export declare const apiFindOneBackup: z.ZodObject<{
    backupId: z.ZodString;
}, z.core.$strip>;
export declare const apiRemoveBackup: z.ZodObject<{
    backupId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiUpdateBackup: z.ZodObject<{
    metadata: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>>;
    serviceName: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    enabled: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodBoolean>>>>;
    databaseType: z.ZodNonOptional<z.ZodEnum<{
        mysql: "mysql";
        libsql: "libsql";
        mariadb: "mariadb";
        mongo: "mongo";
        postgres: "postgres";
        "web-server": "web-server";
    }>>;
    prefix: z.ZodNonOptional<z.ZodString>;
    backupId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
    database: z.ZodNonOptional<z.ZodString>;
    schedule: z.ZodNonOptional<z.ZodString>;
    destinationId: z.ZodNonOptional<z.ZodString>;
    keepLatestCount: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>>;
}, z.core.$strip>;
export declare const apiRestoreBackup: z.ZodObject<{
    databaseId: z.ZodString;
    databaseType: z.ZodEnum<{
        mysql: "mysql";
        libsql: "libsql";
        mariadb: "mariadb";
        mongo: "mongo";
        postgres: "postgres";
        "web-server": "web-server";
    }>;
    backupType: z.ZodEnum<{
        compose: "compose";
        database: "database";
    }>;
    databaseName: z.ZodString;
    backupFile: z.ZodString;
    destinationId: z.ZodString;
    metadata: z.ZodOptional<z.ZodObject<{
        serviceName: z.ZodOptional<z.ZodString>;
        postgres: z.ZodOptional<z.ZodObject<{
            databaseUser: z.ZodString;
        }, z.core.$strip>>;
        mariadb: z.ZodOptional<z.ZodObject<{
            databaseUser: z.ZodString;
            databasePassword: z.ZodString;
        }, z.core.$strip>>;
        mongo: z.ZodOptional<z.ZodObject<{
            databaseUser: z.ZodString;
            databasePassword: z.ZodString;
        }, z.core.$strip>>;
        mysql: z.ZodOptional<z.ZodObject<{
            databaseRootPassword: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=backups.d.ts.map