import { z } from "zod";
/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export declare const registryType: import("drizzle-orm/pg-core").PgEnum<["selfHosted", "cloud"]>;
export declare const registry: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "registry";
    schema: undefined;
    columns: {
        registryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "registryId";
            tableName: "registry";
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
        registryName: import("drizzle-orm/pg-core").PgColumn<{
            name: "registryName";
            tableName: "registry";
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
        imagePrefix: import("drizzle-orm/pg-core").PgColumn<{
            name: "imagePrefix";
            tableName: "registry";
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
        username: import("drizzle-orm/pg-core").PgColumn<{
            name: "username";
            tableName: "registry";
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
        password: import("drizzle-orm/pg-core").PgColumn<{
            name: "password";
            tableName: "registry";
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
        registryUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "registryUrl";
            tableName: "registry";
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
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "createdAt";
            tableName: "registry";
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
        registryType: import("drizzle-orm/pg-core").PgColumn<{
            name: "selfHosted";
            tableName: "registry";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "selfHosted" | "cloud";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["selfHosted", "cloud"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        organizationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "organizationId";
            tableName: "registry";
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
    };
    dialect: "pg";
}>;
export declare const registryRelations: import("drizzle-orm").Relations<"registry", {
    applications: import("drizzle-orm").Many<"application">;
    buildApplications: import("drizzle-orm").Many<"application">;
    rollbackApplications: import("drizzle-orm").Many<"application">;
}>;
export declare const apiCreateRegistry: z.ZodObject<{
    registryName: z.ZodNonOptional<z.ZodString>;
    username: z.ZodNonOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    password: z.ZodNonOptional<z.ZodString>;
    registryUrl: z.ZodNonOptional<z.ZodString>;
    registryType: z.ZodNonOptional<z.ZodEnum<{
        cloud: "cloud";
    }>>;
    imagePrefix: z.ZodNonOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    serverId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiTestRegistry: z.ZodObject<{
    registryName: z.ZodOptional<z.ZodString>;
    username: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    password: z.ZodString;
    registryUrl: z.ZodString;
    registryType: z.ZodEnum<{
        cloud: "cloud";
    }>;
    imagePrefix: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    serverId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiTestRegistryById: z.ZodObject<{
    registryId: z.ZodOptional<z.ZodString>;
    serverId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiRemoveRegistry: z.ZodObject<{
    registryId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiFindOneRegistry: z.ZodObject<{
    registryId: z.ZodString;
}, z.core.$strip>;
export declare const apiUpdateRegistry: z.ZodObject<{
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    organizationId: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    password: z.ZodOptional<z.ZodString>;
    registryUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    registryName: z.ZodOptional<z.ZodString>;
    imagePrefix: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNullable<z.ZodString>>>>>;
    registryType: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        cloud: "cloud";
    }>>>;
    registryId: z.ZodString;
    serverId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiEnableSelfHostedRegistry: z.ZodObject<{
    username: z.ZodNonOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    password: z.ZodNonOptional<z.ZodString>;
    registryUrl: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=registry.d.ts.map