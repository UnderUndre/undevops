import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, text, timestamp, pgTable, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { aiProviderType } from "./shared";
import { organization } from "./account";
import { user } from "./user";

interface AIReviewerConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  reviewFocus?: ("security" | "performance" | "best_practices" | "cost")[];
  customHeaders?: Record<string, string>;
}

export const aiReviewers = pgTable("ai_reviewer", {
  aiReviewerId: text("aiReviewerId").notNull().primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  provider: aiProviderType("provider").notNull(),
  credentialRef: text("credentialRef").notNull(),
  model: text("model").notNull(),
  apiUrl: text("apiUrl"),
  configJson: jsonb("configJson").$type<AIReviewerConfig>(),
  timeoutSeconds: integer("timeout_seconds").notNull().default(30),
  isEnabled: boolean("isEnabled").notNull().default(true),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  lastInvokedAt: timestamp("last_invoked_at"),
  invokeCount: integer("invoke_count").notNull().default(0),
}, (table) => [
  index("aiReviewer_organizationId_idx").on(table.organizationId),
  index("aiReviewer_provider_idx").on(table.provider),
]);

export const aiReviewersRelations = relations(aiReviewers, ({ one, many }) => ({
  organization: one(organization, {
    fields: [aiReviewers.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [aiReviewers.createdBy],
    references: [user.id],
  }),
}));
