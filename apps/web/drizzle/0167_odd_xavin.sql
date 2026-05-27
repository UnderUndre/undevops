CREATE TYPE "public"."actorType" AS ENUM('human', 'agent', 'plugin', 'system');--> statement-breakpoint
CREATE TYPE "public"."agentActionType" AS ENUM('deploy', 'redeploy', 'stop', 'start', 'restart', 'scale', 'env_update');--> statement-breakpoint
CREATE TYPE "public"."aiProviderType" AS ENUM('claude', 'openai', 'gemini', 'codex', 'custom');--> statement-breakpoint
CREATE TYPE "public"."gatePolicyType" AS ENUM('disabled', 'single', 'unanimous', 'manual_only');--> statement-breakpoint
CREATE TYPE "public"."gateStatusType" AS ENUM('skipped', 'pending', 'approved', 'rejected', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."mcpAccessLevel" AS ENUM('read', 'deploy', 'admin');--> statement-breakpoint
CREATE TYPE "public"."mcpTargetType" AS ENUM('organization', 'project', 'environment', 'application', 'compose');--> statement-breakpoint
CREATE TYPE "public"."pendingActionStatus" AS ENUM('pending', 'approved', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."secretScopeType" AS ENUM('organization', 'project', 'environment', 'application', 'compose', 'ai_reviewer', 'plugin');--> statement-breakpoint
CREATE TYPE "public"."verdictType" AS ENUM('pass', 'fail', 'abstain', 'error');--> statement-breakpoint
CREATE TABLE "deployment_review_verdict" (
	"verdictId" text PRIMARY KEY NOT NULL,
	"deploymentId" text NOT NULL,
	"aiReviewerId" text NOT NULL,
	"verdict" "verdictType" NOT NULL,
	"reasoning" text,
	"confidence" integer,
	"payload" jsonb,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "mcp_client" (
	"mcpClientId" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tokenHash" text NOT NULL,
	"tokenPrefix" text NOT NULL,
	"scope" "mcpAccessLevel" DEFAULT 'read' NOT NULL,
	"targetId" text,
	"targetType" "mcpTargetType",
	"organizationId" text NOT NULL,
	"createdBy" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "mcp_client_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "pending_agent_action" (
	"actionId" text PRIMARY KEY NOT NULL,
	"mcpClientId" text NOT NULL,
	"actionType" "agentActionType" NOT NULL,
	"targetId" text NOT NULL,
	"targetType" "mcpTargetType" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "pendingActionStatus" DEFAULT 'pending' NOT NULL,
	"deploymentId" text,
	"organizationId" text NOT NULL,
	"resolvedBy" text,
	"resolved_at" timestamp,
	"resolutionNote" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "plugin" (
	"pluginId" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"manifestJson" jsonb NOT NULL,
	"grantedPermissions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"faulted" boolean DEFAULT false NOT NULL,
	"faultMessage" text,
	"hookSubscriptions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"organizationId" text NOT NULL,
	"installedBy" text,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"last_invoked_at" timestamp,
	"invoke_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plugin_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "secret" (
	"secretId" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"encryptedValue" text NOT NULL,
	"encryptionIv" text NOT NULL,
	"encryptionTag" text NOT NULL,
	"scope" "secretScopeType" NOT NULL,
	"scopeId" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"organizationId" text NOT NULL,
	"createdBy" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_rotated_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "actor_type" "actorType" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "actor_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "initiatingActorType" "actorType" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "initiatingActorId" text;--> statement-breakpoint
ALTER TABLE "deployment" ADD COLUMN "gateStatus" "gateStatusType" DEFAULT 'skipped' NOT NULL;--> statement-breakpoint
ALTER TABLE "environment" ADD COLUMN "gatePolicy" "gatePolicyType" DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "environment" ADD COLUMN "reviewerIds" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "environment" ADD COLUMN "autoApproveAgents" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deployment_review_verdict" ADD CONSTRAINT "deployment_review_verdict_deploymentId_deployment_deploymentId_fk" FOREIGN KEY ("deploymentId") REFERENCES "public"."deployment"("deploymentId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_review_verdict" ADD CONSTRAINT "deployment_review_verdict_aiReviewerId_ai_reviewer_aiReviewerId_fk" FOREIGN KEY ("aiReviewerId") REFERENCES "public"."ai_reviewer"("aiReviewerId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_client" ADD CONSTRAINT "mcp_client_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_client" ADD CONSTRAINT "mcp_client_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_agent_action" ADD CONSTRAINT "pending_agent_action_mcpClientId_mcp_client_mcpClientId_fk" FOREIGN KEY ("mcpClientId") REFERENCES "public"."mcp_client"("mcpClientId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_agent_action" ADD CONSTRAINT "pending_agent_action_deploymentId_deployment_deploymentId_fk" FOREIGN KEY ("deploymentId") REFERENCES "public"."deployment"("deploymentId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_agent_action" ADD CONSTRAINT "pending_agent_action_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_agent_action" ADD CONSTRAINT "pending_agent_action_resolvedBy_user_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin" ADD CONSTRAINT "plugin_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin" ADD CONSTRAINT "plugin_installedBy_user_id_fk" FOREIGN KEY ("installedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret" ADD CONSTRAINT "secret_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verdict_deploymentId_idx" ON "deployment_review_verdict" USING btree ("deploymentId");--> statement-breakpoint
CREATE INDEX "verdict_aiReviewerId_idx" ON "deployment_review_verdict" USING btree ("aiReviewerId");--> statement-breakpoint
CREATE UNIQUE INDEX "verdict_deployment_reviewer_unique" ON "deployment_review_verdict" USING btree ("deploymentId","aiReviewerId");--> statement-breakpoint
CREATE INDEX "mcpClient_tokenHash_idx" ON "mcp_client" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "mcpClient_organizationId_idx" ON "mcp_client" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "mcpClient_revokedAt_idx" ON "mcp_client" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "pendingAction_status_idx" ON "pending_agent_action" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pendingAction_mcpClientId_idx" ON "pending_agent_action" USING btree ("mcpClientId");--> statement-breakpoint
CREATE INDEX "pendingAction_organizationId_idx" ON "pending_agent_action" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "pendingAction_expiresAt_idx" ON "pending_agent_action" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "plugin_organizationId_idx" ON "plugin" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "plugin_enabled_idx" ON "plugin" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "secret_scope_idx" ON "secret" USING btree ("scope","scopeId");--> statement-breakpoint
CREATE INDEX "secret_organizationId_idx" ON "secret" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "secret_key_unique" ON "secret" USING btree ("scope","scopeId","key");--> statement-breakpoint
CREATE INDEX "auditLog_actorType_idx" ON "audit_log" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "auditLog_actorId_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "auditLog_actor_created_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "auditLog_action_created_idx" ON "audit_log" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "auditLog_target_created_idx" ON "audit_log" USING btree ("resource_id","created_at");