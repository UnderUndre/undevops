import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp, pgTable, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { mcpAccessLevel, mcpTargetType } from "./shared";
import { organization } from "./account";
import { user } from "./user";

export const mcpClients = pgTable("mcp_client", {
  mcpClientId: text("mcpClientId").notNull().primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  tokenPrefix: text("tokenPrefix").notNull(),
  scope: mcpAccessLevel("scope").notNull().default("read"),
  targetId: text("targetId"),
  targetType: mcpTargetType("targetType"),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  requestCount: integer("request_count").notNull().default(0),
  revokedAt: timestamp("revoked_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
}, (table) => [
  index("mcpClient_tokenHash_idx").on(table.tokenHash),
  index("mcpClient_organizationId_idx").on(table.organizationId),
  index("mcpClient_revokedAt_idx").on(table.revokedAt),
]);

export const mcpClientsRelations = relations(mcpClients, ({ one, many }) => ({
  organization: one(organization, {
    fields: [mcpClients.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [mcpClients.createdBy],
    references: [user.id],
  }),
}));
