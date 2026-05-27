import { relations } from "drizzle-orm";
import { integer, text, timestamp, pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { secretScopeType } from "./shared";
import { organization } from "./account";
import { user } from "./user";

export const secrets = pgTable("secret", {
  secretId: text("secretId").notNull().primaryKey().$defaultFn(() => nanoid()),
  key: text("key").notNull(),
  encryptedValue: text("encryptedValue").notNull(),
  encryptionIv: text("encryptionIv").notNull(),
  encryptionTag: text("encryptionTag").notNull(),
  scope: secretScopeType("scope").notNull(),
  scopeId: text("scopeId").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRotatedAt: timestamp("last_rotated_at"),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("secret_scope_idx").on(table.scope, table.scopeId),
  index("secret_organizationId_idx").on(table.organizationId),
  uniqueIndex("secret_key_unique").on(table.scope, table.scopeId, table.key),
]);

export const secretsRelations = relations(secrets, ({ one }) => ({
  organization: one(organization, {
    fields: [secrets.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [secrets.createdBy],
    references: [user.id],
  }),
}));
