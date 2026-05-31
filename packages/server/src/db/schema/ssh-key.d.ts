import { z } from "zod";
export declare const sshKeys: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "ssh-key";
    schema: undefined;
    columns: {
        sshKeyId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sshKeyId";
            tableName: "ssh-key";
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
        privateKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "privateKey";
            tableName: "ssh-key";
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
        publicKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "publicKey";
            tableName: "ssh-key";
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
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "ssh-key";
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
            tableName: "ssh-key";
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
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "createdAt";
            tableName: "ssh-key";
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
        lastUsedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "lastUsedAt";
            tableName: "ssh-key";
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
        organizationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "organizationId";
            tableName: "ssh-key";
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
export declare const sshKeysRelations: import("drizzle-orm").Relations<"ssh-key", {
    applications: import("drizzle-orm").Many<"application">;
    compose: import("drizzle-orm").Many<"compose">;
    servers: import("drizzle-orm").Many<"server">;
    organization: import("drizzle-orm").One<"organization", true>;
}>;
export declare const apiCreateSshKey: z.ZodObject<{
    name: z.ZodString;
    organizationId: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    publicKey: z.ZodString;
    privateKey: z.ZodString;
}, z.core.$strip>;
export declare const apiFindOneSshKey: z.ZodObject<{
    sshKeyId: z.ZodString;
}, z.core.$strip>;
export declare const apiGenerateSSHKey: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        rsa: "rsa";
        ed25519: "ed25519";
    }>>;
}, z.core.$strip>;
export declare const apiRemoveSshKey: z.ZodObject<{
    sshKeyId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const apiUpdateSshKey: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>>;
    lastUsedAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    sshKeyId: z.ZodNonOptional<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=ssh-key.d.ts.map