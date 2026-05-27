import { z } from "zod";
export declare const security: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "security";
    schema: undefined;
    columns: {
        securityId: import("drizzle-orm/pg-core").PgColumn<{
            name: "securityId";
            tableName: "security";
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
        username: import("drizzle-orm/pg-core").PgColumn<{
            name: "username";
            tableName: "security";
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
            tableName: "security";
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
            tableName: "security";
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
        applicationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "applicationId";
            tableName: "security";
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
export declare const securityRelations: import("drizzle-orm").Relations<"security", {
    application: import("drizzle-orm").One<"application", true>;
}>;
export declare const apiFindOneSecurity: z.ZodObject<{
    securityId: z.ZodString;
}, z.core.$strip>;
export declare const apiCreateSecurity: z.ZodObject<{
    applicationId: z.ZodNonOptional<z.ZodString>;
    username: z.ZodNonOptional<z.ZodString>;
    password: z.ZodNonOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiUpdateSecurity: z.ZodObject<{
    username: z.ZodNonOptional<z.ZodString>;
    password: z.ZodNonOptional<z.ZodString>;
    securityId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=security.d.ts.map