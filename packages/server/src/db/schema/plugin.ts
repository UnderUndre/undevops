import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp, pgTable, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { organization } from "./account";
import { user } from "./user";

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  entryPoint: string;
  permissions: string[];
  hooks: { name: string; priority?: number }[];
  config?: Record<string, {
    type: "string" | "number" | "boolean" | "select";
    required?: boolean;
    default?: unknown;
    options?: string[];
    description?: string;
  }>;
}

export const plugins = pgTable("plugin", {
  pluginId: text("pluginId").notNull().primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull().unique(),
  version: text("version").notNull(),
  manifestJson: jsonb("manifestJson").notNull().$type<PluginManifest>(),
  grantedPermissions: text("grantedPermissions").array().notNull().default(sql`ARRAY[]::text[]`),
  enabled: boolean("enabled").notNull().default(true),
  faulted: boolean("faulted").notNull().default(false),
  faultMessage: text("faultMessage"),
  hookSubscriptions: text("hookSubscriptions").array().notNull().default(sql`ARRAY[]::text[]`),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  installedBy: text("installedBy").references(() => user.id, { onDelete: "set null" }),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  lastInvokedAt: timestamp("last_invoked_at"),
  invokeCount: integer("invoke_count").notNull().default(0),
}, (table) => [
  index("plugin_organizationId_idx").on(table.organizationId),
  index("plugin_enabled_idx").on(table.enabled),
]);

export const pluginsRelations = relations(plugins, ({ one }) => ({
  organization: one(organization, {
    fields: [plugins.organizationId],
    references: [organization.id],
  }),
  installer: one(user, {
    fields: [plugins.installedBy],
    references: [user.id],
  }),
}));
