import { z } from "zod";
declare const hookSchema: z.ZodObject<{
    name: z.ZodEnum<["pre-deploy", "post-deploy", "deploy-failed", "server-added", "server-removed", "project-created", "project-deleted"]>;
    priority: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
    priority: number;
}, {
    name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
    priority?: number | undefined;
}>;
export declare const permissionEnum: z.ZodEnum<["deploy:read", "deploy:write", "server:read", "server:write", "project:read", "project:write", "logs:read", "audit:read", "env:read", "env:write", "network:read", "network:write"]>;
declare const settingSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<["string", "number", "boolean", "select"]>;
    required: z.ZodDefault<z.ZodBoolean>;
    default: z.ZodOptional<z.ZodUnknown>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value?: unknown;
    }, {
        label: string;
        value?: unknown;
    }>, "many">>;
    secret: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "select";
    key: string;
    secret: boolean;
    label: string;
    required: boolean;
    default?: unknown;
    options?: {
        label: string;
        value?: unknown;
    }[] | undefined;
}, {
    type: "string" | "number" | "boolean" | "select";
    key: string;
    label: string;
    default?: unknown;
    secret?: boolean | undefined;
    options?: {
        label: string;
        value?: unknown;
    }[] | undefined;
    required?: boolean | undefined;
}>;
declare const pluginConfigSchema: z.ZodObject<{
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    retryOnError: z.ZodDefault<z.ZodBoolean>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeoutMs: number;
    retryOnError: boolean;
    maxRetries: number;
}, {
    timeoutMs?: number | undefined;
    retryOnError?: boolean | undefined;
    maxRetries?: number | undefined;
}>;
export declare const pluginManifestSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    author: z.ZodOptional<z.ZodString>;
    license: z.ZodOptional<z.ZodString>;
    homepage: z.ZodOptional<z.ZodString>;
    sdkVersion: z.ZodString;
    hooks: z.ZodArray<z.ZodObject<{
        name: z.ZodEnum<["pre-deploy", "post-deploy", "deploy-failed", "server-added", "server-removed", "project-created", "project-deleted"]>;
        priority: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
        priority: number;
    }, {
        name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
        priority?: number | undefined;
    }>, "many">;
    permissions: z.ZodDefault<z.ZodArray<z.ZodEnum<["deploy:read", "deploy:write", "server:read", "server:write", "project:read", "project:write", "logs:read", "audit:read", "env:read", "env:write", "network:read", "network:write"]>, "many">>;
    config: z.ZodOptional<z.ZodObject<{
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        retryOnError: z.ZodDefault<z.ZodBoolean>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeoutMs: number;
        retryOnError: boolean;
        maxRetries: number;
    }, {
        timeoutMs?: number | undefined;
        retryOnError?: boolean | undefined;
        maxRetries?: number | undefined;
    }>>;
    settings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        type: z.ZodEnum<["string", "number", "boolean", "select"]>;
        required: z.ZodDefault<z.ZodBoolean>;
        default: z.ZodOptional<z.ZodUnknown>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnknown;
        }, "strip", z.ZodTypeAny, {
            label: string;
            value?: unknown;
        }, {
            label: string;
            value?: unknown;
        }>, "many">>;
        secret: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "select";
        key: string;
        secret: boolean;
        label: string;
        required: boolean;
        default?: unknown;
        options?: {
            label: string;
            value?: unknown;
        }[] | undefined;
    }, {
        type: "string" | "number" | "boolean" | "select";
        key: string;
        label: string;
        default?: unknown;
        secret?: boolean | undefined;
        options?: {
            label: string;
            value?: unknown;
        }[] | undefined;
        required?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    version: string;
    name: string;
    permissions: ("deploy:read" | "deploy:write" | "server:read" | "server:write" | "project:read" | "project:write" | "logs:read" | "audit:read" | "env:read" | "env:write" | "network:read" | "network:write")[];
    settings: {
        type: "string" | "number" | "boolean" | "select";
        key: string;
        secret: boolean;
        label: string;
        required: boolean;
        default?: unknown;
        options?: {
            label: string;
            value?: unknown;
        }[] | undefined;
    }[];
    hooks: {
        name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
        priority: number;
    }[];
    sdkVersion: string;
    description?: string | undefined;
    config?: {
        timeoutMs: number;
        retryOnError: boolean;
        maxRetries: number;
    } | undefined;
    author?: string | undefined;
    license?: string | undefined;
    homepage?: string | undefined;
}, {
    version: string;
    name: string;
    hooks: {
        name: "pre-deploy" | "post-deploy" | "deploy-failed" | "server-added" | "server-removed" | "project-created" | "project-deleted";
        priority?: number | undefined;
    }[];
    sdkVersion: string;
    description?: string | undefined;
    config?: {
        timeoutMs?: number | undefined;
        retryOnError?: boolean | undefined;
        maxRetries?: number | undefined;
    } | undefined;
    permissions?: ("deploy:read" | "deploy:write" | "server:read" | "server:write" | "project:read" | "project:write" | "logs:read" | "audit:read" | "env:read" | "env:write" | "network:read" | "network:write")[] | undefined;
    author?: string | undefined;
    settings?: {
        type: "string" | "number" | "boolean" | "select";
        key: string;
        label: string;
        default?: unknown;
        secret?: boolean | undefined;
        options?: {
            label: string;
            value?: unknown;
        }[] | undefined;
        required?: boolean | undefined;
    }[] | undefined;
    license?: string | undefined;
    homepage?: string | undefined;
}>;
export type PluginManifest = z.infer<typeof pluginManifestSchema>;
export type PluginHookDeclaration = z.infer<typeof hookSchema>;
export type PluginPermission = z.infer<typeof permissionEnum>;
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
export type PluginSetting = z.infer<typeof settingSchema>;
export declare function validateManifest(raw: unknown): {
    success: true;
    data: PluginManifest;
} | {
    success: false;
    errors: string[];
};
export {};
