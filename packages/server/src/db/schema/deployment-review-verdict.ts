import { relations } from "drizzle-orm";
import { integer, jsonb, text, timestamp, pgTable, index, uniqueIndex } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { verdictType } from "./shared";
import { deployments } from "./deployment";
import { aiReviewers } from "./ai-reviewer";

interface ReviewPayload {
  request: {
    changeDescription: string;
    diff?: string;
    environmentName: string;
    serviceName: string;
    previousDeployment?: { id: string; title: string; finishedAt: string };
  };
  response: {
    raw: string;
    parsed: boolean;
    model: string;
    tokenUsage?: { prompt: number; completion: number };
  };
}

export const deploymentReviewVerdicts = pgTable("deployment_review_verdict", {
  verdictId: text("verdictId").notNull().primaryKey().$defaultFn(() => nanoid()),
  deploymentId: text("deploymentId").notNull().references(() => deployments.deploymentId, { onDelete: "cascade" }),
  aiReviewerId: text("aiReviewerId").notNull().references(() => aiReviewers.aiReviewerId, { onDelete: "cascade" }),
  verdict: verdictType("verdict").notNull(),
  reasoning: text("reasoning"),
  confidence: integer("confidence"),
  payload: jsonb("payload").$type<ReviewPayload>(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  durationMs: integer("duration_ms"),
}, (table) => [
  index("verdict_deploymentId_idx").on(table.deploymentId),
  index("verdict_aiReviewerId_idx").on(table.aiReviewerId),
  uniqueIndex("verdict_deployment_reviewer_unique").on(table.deploymentId, table.aiReviewerId),
]);

export const deploymentReviewVerdictsRelations = relations(deploymentReviewVerdicts, ({ one }) => ({
  deployment: one(deployments, {
    fields: [deploymentReviewVerdicts.deploymentId],
    references: [deployments.deploymentId],
  }),
  reviewer: one(aiReviewers, {
    fields: [deploymentReviewVerdicts.aiReviewerId],
    references: [aiReviewers.aiReviewerId],
  }),
}));
