import { z } from "zod";

const hookNameEnum = z.enum([
	"pre-deploy",
	"post-deploy",
	"deploy-failed",
	"server-added",
	"server-removed",
	"project-created",
	"project-deleted",
]);

const hookSchema = z.object({
	name: hookNameEnum,
	priority: z.number().int().min(1).max(100).default(50),
});

export const permissionEnum = z.enum([
	"deploy:read",
	"deploy:write",
	"server:read",
	"server:write",
	"project:read",
	"project:write",
	"logs:read",
	"audit:read",
	"env:read",
	"env:write",
	"network:read",
	"network:write",
]);

const settingOptionSchema = z.object({
	label: z.string(),
	value: z.unknown(),
});

const settingSchema = z.object({
	key: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
	label: z.string(),
	type: z.enum(["string", "number", "boolean", "select"]),
	required: z.boolean().default(false),
	default: z.unknown().optional(),
	options: z.array(settingOptionSchema).optional(),
	secret: z.boolean().default(false),
});

const pluginConfigSchema = z.object({
	timeoutMs: z.number().int().min(1000).max(30000).default(5000),
	retryOnError: z.boolean().default(false),
	maxRetries: z.number().int().min(0).max(3).default(0),
});

export const pluginManifestSchema = z.object({
	name: z.string().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/).min(2).max(64),
	version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/),
	description: z.string().max(256).optional(),
	author: z.string().max(128).optional(),
	license: z.string().optional(),
	homepage: z.string().url().optional(),
	sdkVersion: z.string().regex(/^\^\d+\.\d+\.\d+$/),
	hooks: z.array(hookSchema),
	permissions: z.array(permissionEnum).default([]),
	config: pluginConfigSchema.optional(),
	settings: z.array(settingSchema).default([]),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export type PluginHookDeclaration = z.infer<typeof hookSchema>;
export type PluginPermission = z.infer<typeof permissionEnum>;
export type PluginConfig = z.infer<typeof pluginConfigSchema>;
export type PluginSetting = z.infer<typeof settingSchema>;

export function validateManifest(raw: unknown): {
	success: true;
	data: PluginManifest;
} | {
	success: false;
	errors: string[];
} {
	const result = pluginManifestSchema.safeParse(raw);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const errors = result.error.issues.map(
		(issue) => `${issue.path.join(".")}: ${issue.message}`,
	);
	return { success: false, errors };
}
