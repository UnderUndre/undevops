import { relations } from "drizzle-orm";
import { jsonb, text, timestamp, pgTable, index } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { agentActionType, mcpTargetType, pendingActionStatus } from "./shared";
import { mcpClients } from "./mcp-client";
import { deployments } from "./deployment";
import { organization } from "./account";
import { user } from "./user";

export interface AgentActionPayload {
  requestedAt: string;
  reason: string;
  changes?: { field: string; oldValue?: string; newValue?: string }[];
  metadata?: Record<string, unknown>;
}

export const pendingAgentActions = pgTable("pending_agent_action", {
  actionId: text("actionId").notNull().primaryKey().$defaultFn(() => nanoid()),
  mcpClientId: text("mcpClientId").notNull().references(() => mcpClients.mcpClientId, { onDelete: "cascade" }),
  actionType: agentActionType("actionType").notNull(),
  targetId: text("targetId").notNull(),
  targetType: mcpTargetType("targetType").notNull(),
  payload: jsonb("payload").notNull().$type<AgentActionPayload>(),
  status: pendingActionStatus("status").notNull().default("pending"),
  deploymentId: text("deploymentId").references(() => deployments.deploymentId, { onDelete: "set null" }),
  organizationId: text("organizationId").notNull().references(() => organization.id, { onDelete: "cascade" }),
  resolvedBy: text("resolvedBy").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolutionNote"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("pendingAction_status_idx").on(table.status),
  index("pendingAction_mcpClientId_idx").on(table.mcpClientId),
  index("pendingAction_organizationId_idx").on(table.organizationId),
  index("pendingAction_expiresAt_idx").on(table.expiresAt),
]);

export const pendingAgentActionsRelations = relations(pendingAgentActions, ({ one }) => ({
  mcpClient: one(mcpClients, {
    fields: [pendingAgentActions.mcpClientId],
    references: [mcpClients.mcpClientId],
  }),
  deployment: one(deployments, {
    fields: [pendingAgentActions.deploymentId],
    references: [deployments.deploymentId],
  }),
  org: one(organization, {
    fields: [pendingAgentActions.organizationId],
    references: [organization.id],
  }),
  resolver: one(user, {
    fields: [pendingAgentActions.resolvedBy],
    references: [user.id],
  }),
}));
