import { z } from "zod";
export declare const patchType: import("drizzle-orm/pg-core").PgEnum<["create", "update", "delete"]>;
export declare const patch: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "patch";
    schema: undefined;
    columns: {
        patchId: import("drizzle-orm/pg-core").PgColumn<{
            name: "patchId";
            tableName: "patch";
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
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "patch";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "create" | "update" | "delete";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["create", "update", "delete"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        filePath: import("drizzle-orm/pg-core").PgColumn<{
            name: "filePath";
            tableName: "patch";
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
            tableName: "patch";
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
        content: import("drizzle-orm/pg-core").PgColumn<{
            name: "content";
            tableName: "patch";
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
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "createdAt";
            tableName: "patch";
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
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updatedAt";
            tableName: "patch";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        applicationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "applicationId";
            tableName: "patch";
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
        composeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "composeId";
            tableName: "patch";
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
export declare const patchRelations: import("drizzle-orm").Relations<"patch", {
    application: import("drizzle-orm").One<"application", false>;
    compose: import("drizzle-orm").One<"compose", false>;
}>;
export declare const apiCreatePatch: z.ZodObject<{
    type: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        create: "create";
        update: "update";
        delete: "delete";
    }>>>;
    applicationId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    composeId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    enabled: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    filePath: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>;
export declare const apiFindPatch: z.ZodObject<{
    patchId: z.ZodString;
}, z.core.$strip>;
export declare const apiFindPatchesByApplicationId: z.ZodObject<{
    applicationId: z.ZodString;
}, z.core.$strip>;
export declare const apiFindPatchesByComposeId: z.ZodObject<{
    composeId: z.ZodString;
}, z.core.$strip>;
export declare const apiUpdatePatch: z.ZodObject<{
    type: z.ZodOptional<z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        create: "create";
        update: "update";
        delete: "delete";
    }>>>>;
    createdAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    enabled: z.ZodOptional<z.ZodOptional<z.ZodOptional<z.ZodBoolean>>>;
    filePath: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    patchId: z.ZodString;
}, z.core.$strip>;
export declare const apiDeletePatch: z.ZodObject<{
    patchId: z.ZodString;
}, z.core.$strip>;
export declare const apiTogglePatchEnabled: z.ZodObject<{
    patchId: z.ZodString;
    enabled: z.ZodBoolean;
}, z.core.$strip>;
//# sourceMappingURL=patch.d.ts.map