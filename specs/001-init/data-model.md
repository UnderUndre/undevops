# Data Model: undevops — AI-Native Self-Hosted Deployment Platform

**Branch**: `specs/001-init` | **Date**: 2026-05-25

## Overview

Data model for undevops, extending the existing Dokploy Drizzle ORM schema with new entities for MCP gateway, plugin system, AI review, and enhanced audit.

The existing Dokploy codebase (forked at v0.29.5) uses **Drizzle ORM** with **PostgreSQL**, `nanoid()` for primary keys, `text` columns for timestamps (legacy pattern), and `pgEnum` for status types. New tables follow the same conventions where practical but use native `timestamp` for new temporal columns (per RQ-006 pattern established in `audit_log`).

**Conventions**:
- PKs: `text` with `nanoid()` default
- FKs: `text` with `.references()` + `onDelete: "cascade"` or `"set null"`
- Timestamps (existing tables): `text` with `new Date().toISOString()` default
- Timestamps (new tables): `timestamp` with `defaultNow()`
- Enums: `pgEnum` for finite state sets
- JSON: `jsonb` for typed structured data

## Entity Relationship Summary

```
organization ──┬── project ──────── environment ────┬── application ────── deployment
               │                                      ├── compose
               │                                      ├── postgres
               │                                      ├── mariadb
               │                                      ├── mysql
               │                                      ├── mongo
               │                                      └── redis
               ├── server ──────────────────────────────── ssh-key
               ├── member ──── user
               ├── mcp_client ────────── pending_agent_action
               ├── ai_reviewer ───────── deployment_review_verdict
               ├── plugin
               ├── secret
               └── audit_log

deployment ──────── deployment_review_verdict ──── ai_reviewer
                └── pending_agent_action ──────── mcp_client

environment ─────── deployment_gate_config (jsonb on environment)
```

## Existing Entities (Retained from Dokploy)

### organization

Multi-tenant root. All top-level entities reference it.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | text (PK) | NO | nanoid() | |
| name | text | NO | | |
| slug | text (UNIQUE) | YES | | URL-safe identifier |
| logo | text | YES | | |
| created_at | timestamp | NO | | |
| metadata | text | YES | | |
| owner_id | text (FK → user.id) | NO | | CASCADE |

**No changes**. New entities reference `organization.id` for multi-tenancy.

### user / account / session

Auth layer. `user` holds profile, `account` holds OAuth credentials, `session` holds active sessions.

**No structural changes**. `audit_log` references `user.id` for actor attribution.

### project

Groups environments. Belongs to `organization`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| projectId | text (PK) | NO | nanoid() | |
| name | text | NO | | |
| description | text | YES | | |
| createdAt | text | NO | ISO string | |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| env | text | NO | "" | Default env vars |

**No changes**.

### environment

Isolation boundary within a project. **Enhanced** with gate configuration.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| environmentId | text (PK) | NO | nanoid() | |
| name | text | NO | | |
| description | text | YES | | |
| createdAt | text | NO | ISO string | |
| env | text | NO | "" | |
| projectId | text (FK → project.projectId) | NO | | CASCADE |
| isDefault | boolean | NO | false | |

**New columns** (Migration 006):

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| gatePolicy | gatePolicyType (pgEnum) | NO | "disabled" | Deployment gate mode |
| reviewerIds | text[] | NO | `{}` | AI reviewer IDs assigned to this env |
| autoApproveAgents | boolean | NO | false | Skip gate for trusted MCP clients |

**New enum**:

```typescript
export const gatePolicyType = pgEnum("gatePolicyType", [
  "disabled",      // No gate — deploy immediately
  "single",        // Any 1 reviewer must approve
  "unanimous",     // All assigned reviewers must approve
  "manual_only",   // Only human approval (no AI auto)
]);
```

### application

Deployable service. Belongs to `environment`. Complex table with git provider refs, Docker config, Swarm settings.

**No structural changes** to existing columns. The `deployments` relation carries new gate-related data.

### compose

Docker Compose stack. Same ownership pattern as `application`.

**No changes**.

### deployment

Records each deploy attempt. **Enhanced** with actor attribution and gate status.

Existing columns (unchanged):

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| deploymentId | text (PK) | NO | nanoid() | |
| title | text | NO | | |
| description | text | YES | | |
| status | deploymentStatus (pgEnum) | YES | "running" | running/done/error/cancelled |
| logPath | text | NO | | |
| pid | text | YES | | |
| applicationId | text (FK) | YES | | CASCADE |
| composeId | text (FK) | YES | | CASCADE |
| serverId | text (FK) | YES | | CASCADE |
| isPreviewDeployment | boolean | YES | false | |
| previewDeploymentId | text (FK) | YES | | CASCADE |
| createdAt | text | NO | ISO string | |
| startedAt | text | YES | | |
| finishedAt | text | YES | | |
| errorMessage | text | YES | | |
| scheduleId | text (FK) | YES | | CASCADE |
| backupId | text (FK) | YES | | CASCADE |
| rollbackId | text (FK) | YES | | CASCADE |
| volumeBackupId | text (FK) | YES | | CASCADE |
| buildServerId | text (FK) | YES | | CASCADE |

**New columns** (Migration 006):

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| initiatingActorType | actorType (pgEnum) | NO | "human" | Who triggered this deploy |
| initiatingActorId | text | YES | | userId, mcpClientId, or pluginId |
| gateStatus | gateStatusType (pgEnum) | NO | "skipped" | Gate evaluation result |

**New enums**:

```typescript
export const actorType = pgEnum("actorType", [
  "human",     // User via UI/API
  "agent",     // MCP client
  "plugin",    // Plugin hook
  "system",    // Scheduled/cron
]); // Must stay aligned with contracts/mcp-api.md and contracts/plugin-sdk.md

export const gateStatusType = pgEnum("gateStatusType", [
  "skipped",       // Gate disabled for this env
  "pending",       // Awaiting reviewer verdicts
  "approved",      // Gate passed — deploy proceeds
  "rejected",      // At least one reviewer rejected
  "timed_out",     // Reviewers didn't respond in time
]);
```

### server

Remote Docker host. Belongs to `organization`.

**No changes**. Existing `serverStatus`, `serverType`, `metricsConfig` retained as-is.

### domain / certificate

Routing and TLS. Reference `application`, `compose`, or `previewDeployment`.

**No changes**.

### backup

Database/compose backup with S3 destination support.

**No changes**. Existing `destination` table handles S3-compatible targets.

### audit_log

Existing audit trail. **Enhanced** with structured actor info.

Existing columns:

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | text (PK) | NO | nanoid() | |
| organization_id | text (FK → organization.id) | YES | | SET NULL |
| user_id | text (FK → user.id) | YES | | SET NULL |
| user_email | text | NO | | |
| user_role | text | NO | | |
| action | text | NO | | create/update/delete/deploy/... |
| resource_type | text | NO | | project/service/deployment/... |
| resource_id | text | YES | | |
| resource_name | text | YES | | |
| metadata | text | YES | | |
| created_at | timestamp | NO | defaultNow() | |

**New columns** (Migration 006):

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| actor_type | actorType (pgEnum) | NO | "human" | human/agent/plugin/system |
| actor_id | text | YES | | Resolved userId, mcpClientId, or pluginId |
| payload | jsonb | YES | | Structured event data (replaces free-text metadata for new events) |

**Extended `AuditAction` type**:

```typescript
| "mcp_token_created" | "mcp_token_revoked" | "mcp_request"
| "plugin_installed" | "plugin_enabled" | "plugin_disabled" | "plugin_faulted"
| "gate_approved" | "gate_rejected" | "gate_timed_out" | "gate_bypassed"
| "secret_created" | "secret_rotated" | "secret_deleted"
```

**Extended `AuditResourceType`**:

```typescript
| "mcp_client" | "plugin" | "ai_reviewer" | "secret" | "gate_verdict"
```

**Indexes** (existing):

```sql
auditLog_organizationId_idx ON (organization_id)
auditLog_userId_idx ON (user_id)
auditLog_createdAt_idx ON (created_at)
```

**New indexes**:

```sql
auditLog_actorType_idx ON (actor_type)
auditLog_actorId_idx ON (actor_id)
```

**New composite indexes** (MCP audit resource query patterns from contracts/mcp-api.md):

```sql
auditLog_actor_created_idx ON audit_log (actor_id, created_at DESC)
auditLog_action_created_idx ON audit_log (action, created_at DESC)
auditLog_target_created_idx ON audit_log (target_resource, created_at DESC)
```

### ai (existing)

Existing AI configuration table — stores API URL, key, model per organization.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| aiId | text (PK) | NO | nanoid() | |
| name | text | NO | | |
| apiUrl | text | NO | | |
| apiKey | text | NO | | Plaintext — migration target for `ai_reviewers` |
| model | text | NO | | |
| isEnabled | boolean | NO | true | |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| createdAt | text | NO | ISO string | |

**Kept for backward compatibility** during migration. New AI review functionality uses `ai_reviewers` table. Migration path: data migrates from `ai` → `ai_reviewers`, then `ai` table deprecated.

## New Entities

### mcp_clients

Authenticated MCP integration tokens. SHA-256 hashed bearer tokens with instant revocation (RQ-006).

```typescript
export const mcpClients = pgTable("mcp_client", {
  mcpClientId: text("mcpClientId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  tokenPrefix: text("tokenPrefix").notNull(),
  scope: mcpAccessLevel("scope").notNull().default("read"),
  targetId: text("targetId"),
  targetType: mcpTargetType("targetType"),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  requestCount: integer("request_count").notNull().default(0),
  revokedAt: timestamp("revoked_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| mcpClientId | text (PK) | NO | nanoid() | Unique client identifier |
| name | text | NO | | Human-readable label (e.g. "CI/CD Pipeline") |
| tokenHash | text (UNIQUE) | NO | | SHA-256 of bearer token. O(1) revocation check |
| tokenPrefix | text | NO | | First 8 chars of plaintext token for UI display (e.g. "undev_a1b2") |
| scope | mcpAccessLevel (pgEnum) | NO | "read" | Permission level |
| targetId | text | YES | | Optional scoping to specific project/environment/service |
| targetType | mcpTargetType (pgEnum) | YES | | What targetId refers to |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| createdBy | text (FK → user.id) | YES | | SET NULL (preserve audit if user deleted) |
| createdAt | timestamp | NO | defaultNow() | |
| lastUsedAt | timestamp | YES | | Updated on each authenticated request |
| requestCount | integer | NO | 0 | Monotonically increasing request counter |
| revokedAt | timestamp | YES | | NULL = active. SET = revoked. Indexed for O(1) check |
| metadata | jsonb | YES | | Arbitrary metadata (description, tags, source IP restrictions) |

**Enums**:

```typescript
export const mcpAccessLevel = pgEnum("mcpAccessLevel", [
  "read",          // View status, logs, read-only
  "deploy",        // Trigger deployments
  "admin",         // Full management including secrets
]);

export const mcpTargetType = pgEnum("mcpTargetType", [
  "organization",  // All resources in org
  "project",       // Single project
  "environment",   // Single environment
  "application",   // Single application
  "compose",       // Single compose stack
]);
```

**Indexes**:

```sql
mcpClient_tokenHash_idx ON (tokenHash)              -- Auth lookup, SC-002 <500ms
mcpClient_organizationId_idx ON (organizationId)     -- List clients by org
mcpClient_revokedAt_idx ON (revokedAt) WHERE revokedAt IS NOT NULL  -- Partial, active-only scans
```

**Relations**:

```typescript
export const mcpClientsRelations = relations(mcpClients, ({ one, many }) => ({
  organization: one(organization, {
    fields: [mcpClients.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [mcpClients.createdBy],
    references: [user.id],
  }),
  pendingActions: many(pendingAgentActions),
}));
```

### plugins

Installed extensions with hook subscriptions (RQ-004). Isolated fault containment.

```typescript
export const plugins = pgTable("plugin", {
  pluginId: text("pluginId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull().unique(),
  version: text("version").notNull(),
  manifestJson: jsonb("manifestJson").notNull().$type<PluginManifest>(),
  grantedPermissions: text("grantedPermissions")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  enabled: boolean("enabled").notNull().default(true),
  faulted: boolean("faulted").notNull().default(false),
  faultMessage: text("faultMessage"),
  hookSubscriptions: text("hookSubscriptions")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  installedBy: text("installedBy")
    .references(() => user.id, { onDelete: "set null" }),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  lastInvokedAt: timestamp("last_invoked_at"),
  invokeCount: integer("invoke_count").notNull().default(0),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| pluginId | text (PK) | NO | nanoid() | |
| name | text (UNIQUE) | NO | | Dotted identifier (e.g. "com.example.slack-notify") |
| version | text | NO | | Semver string (e.g. "1.2.3") |
| manifestJson | jsonb | NO | | Full `undevops-plugin.json` manifest |
| grantedPermissions | text[] | NO | `{}` | Permissions granted at install time. Validated against canonical permission enum in contracts/plugin-sdk.md §Permission Definitions at application level (T075). No DB-level CHECK constraint — application validates at install time. |
| enabled | boolean | NO | true | Admin toggle |
| faulted | boolean | NO | false | True when plugin throws unhandled error (FR-018) |
| faultMessage | text | YES | | Last error message when faulted |
| hookSubscriptions | text[] | NO | `{}` | Hook names this plugin subscribes to |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| installedBy | text (FK → user.id) | YES | | SET NULL |
| installedAt | timestamp | NO | defaultNow() | |
| updatedAt | timestamp | YES | on update | |
| lastInvokedAt | timestamp | YES | | Updated on each hook invocation |
| invokeCount | integer | NO | 0 | Total hook invocations |

**Manifest type** (stored in `manifestJson`):

```typescript
interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  entryPoint: string;
  permissions: string[];
  hooks: {
    name: string;
    priority?: number;
  }[];
  config?: Record<string, {
    type: "string" | "number" | "boolean" | "select";
    required?: boolean;
    default?: unknown;
    options?: string[];
    description?: string;
  }>;
}
```

**Indexes**:

```sql
plugin_name_idx ON (name)                           -- UNIQUE lookup
plugin_organizationId_idx ON (organizationId)       -- List by org
plugin_enabled_idx ON (enabled) WHERE enabled = true -- Active plugins only
```

**Relations**:

```typescript
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
```

### ai_reviewers

Configured external AI services for pre-deploy review (RQ-007). Replaces the existing `ai` table with richer configuration.

```typescript
export const aiReviewers = pgTable("ai_reviewer", {
  aiReviewerId: text("aiReviewerId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  provider: aiProviderType("provider").notNull(),
  credentialRef: text("credentialRef").notNull(),
  model: text("model").notNull(),
  apiUrl: text("apiUrl"),
  configJson: jsonb("configJson").$type<AIReviewerConfig>(),
  timeoutSeconds: integer("timeout_seconds").notNull().default(30),
  isEnabled: boolean("isEnabled").notNull().default(true),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  lastInvokedAt: timestamp("last_invoked_at"),
  invokeCount: integer("invoke_count").notNull().default(0),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| aiReviewerId | text (PK) | NO | nanoid() | |
| name | text | NO | | Display name (e.g. "Security Review - Claude") |
| provider | aiProviderType (pgEnum) | NO | | Which AI backend |
| credentialRef | text | NO | | Reference to secret storing API key (e.g. "secret:ai_claude_key") |
| model | text | NO | | Model identifier (e.g. "claude-sonnet-4-20250514") |
| apiUrl | text | YES | | Custom endpoint (for self-hosted/OpenAI-compatible) |
| configJson | jsonb | YES | | Provider-specific config (temperature, system prompt overrides) |
| timeoutSeconds | integer | NO | 30 | Per-reviewer timeout (FR-021) |
| isEnabled | boolean | NO | true | |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| createdBy | text (FK → user.id) | YES | | SET NULL |
| createdAt | timestamp | NO | defaultNow() | |
| updatedAt | timestamp | YES | on update | |
| lastInvokedAt | timestamp | YES | | |
| invokeCount | integer | NO | 0 | |

**Enums**:

```typescript
export const aiProviderType = pgEnum("aiProviderType", [
  "claude",
  "openai",
  "gemini",
  "codex",
  "custom",
]);
```

**Config type** (stored in `configJson`):

```typescript
interface AIReviewerConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  reviewFocus?: ("security" | "performance" | "best_practices" | "cost")[];
  customHeaders?: Record<string, string>;
}
```

**Indexes**:

```sql
aiReviewer_organizationId_idx ON (organizationId)
aiReviewer_provider_idx ON (provider)
```

**Relations**:

```typescript
export const aiReviewersRelations = relations(aiReviewers, ({ one, many }) => ({
  organization: one(organization, {
    fields: [aiReviewers.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [aiReviewers.createdBy],
    references: [user.id],
  }),
  verdicts: many(deploymentReviewVerdicts),
}));
```

### secrets

Encrypted key-value pairs. AES-256-GCM encryption at rest (RQ-005). Decryption key comes from `UNDEVOPS_ENCRYPTION_KEY` env var — never stored in DB.

```typescript
export const secrets = pgTable("secret", {
  secretId: text("secretId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  key: text("key").notNull(),
  encryptedValue: text("encryptedValue").notNull(),
  encryptionIv: text("encryptionIv").notNull(),
  encryptionTag: text("encryptionTag").notNull(),
  scope: secretScopeType("scope").notNull(),
  scopeId: text("scopeId").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdBy: text("createdBy")
    .references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRotatedAt: timestamp("last_rotated_at"),
  expiresAt: timestamp("expires_at"),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| secretId | text (PK) | NO | nanoid() | |
| key | text | NO | | Variable name (e.g. "DATABASE_URL") |
| encryptedValue | text | NO | | Base64-encoded AES-256-GCM ciphertext |
| encryptionIv | text | NO | | Base64-encoded initialization vector |
| encryptionTag | text | NO | | Base64-encoded auth tag |
| scope | secretScopeType (pgEnum) | NO | | Ownership level |
| scopeId | text | NO | | ID of the owning entity |
| description | text | YES | | Human-readable note |
| version | integer | NO | 1 | Incremented on each rotation |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| createdBy | text (FK → user.id) | YES | | SET NULL |
| createdAt | timestamp | NO | defaultNow() | |
| lastRotatedAt | timestamp | YES | | Set on each rotation |
| expiresAt | timestamp | YES | | Optional auto-expiry |

**Enums**:

```typescript
export const secretScopeType = pgEnum("secretScopeType", [
  "organization",
  "project",
  "environment",
  "application",
  "compose",
  "ai_reviewer",    // API keys for AI providers
  "plugin",         // Plugin-specific secrets
]);
```

**Indexes**:

```sql
secret_scope_idx ON (scope, scopeId)                 -- Lookup secrets by owner
secret_organizationId_idx ON (organizationId)
secret_key_unique UNIQUE ON (scope, scopeId, key)    -- Prevent duplicate keys per scope
```

**Relations**:

```typescript
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
```

### deployment_review_verdicts

Individual reviewer verdicts per deployment. Each deployment can have N verdicts (one per assigned reviewer). Gate evaluator reads all verdicts to determine `gateStatus`.

```typescript
export const deploymentReviewVerdicts = pgTable("deployment_review_verdict", {
  verdictId: text("verdictId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  deploymentId: text("deploymentId")
    .notNull()
    .references(() => deployments.deploymentId, { onDelete: "cascade" }),
  aiReviewerId: text("aiReviewerId")
    .notNull()
    .references(() => aiReviewers.aiReviewerId, { onDelete: "cascade" }),
  verdict: verdictType("verdict").notNull(),
  reasoning: text("reasoning"),
  confidence: integer("confidence"),
  payload: jsonb("payload").$type<ReviewPayload>(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  durationMs: integer("duration_ms"),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| verdictId | text (PK) | NO | nanoid() | |
| deploymentId | text (FK → deployment.deploymentId) | NO | | CASCADE |
| aiReviewerId | text (FK → ai_reviewer.aiReviewerId) | NO | | CASCADE |
| verdict | verdictType (pgEnum) | NO | | pass/fail/abstain/error |
| reasoning | text | YES | | Free-text explanation from reviewer |
| confidence | integer | YES | | 0–100 confidence score |
| payload | jsonb | YES | | Full review request/response for audit |
| reviewedAt | timestamp | NO | defaultNow() | |
| durationMs | integer | YES | | Wall-clock time for the review call |

**Enums**:

```typescript
export const verdictType = pgEnum("verdictType", [
  "pass",     // Deploy is safe
  "fail",     // Block deployment
  "abstain",  // Reviewer has no opinion (treated as pass for "single" policy, fail for "unanimous")
  "error",    // Reviewer failed to respond (timeout, API error) — treated as fail per default policy
]);
```

**Payload type**:

```typescript
interface ReviewPayload {
  request: {
    changeDescription: string;
    diff?: string;
    environmentName: string;
    serviceName: string;
    previousDeployment?: {
      id: string;
      title: string;
      finishedAt: string;
    };
  };
  response: {
    raw: string;
    parsed: boolean;
    model: string;
    tokenUsage?: {
      prompt: number;
      completion: number;
    };
  };
}
```

**Indexes**:

```sql
verdict_deploymentId_idx ON (deploymentId)            -- All verdicts for a deployment
verdict_aiReviewerId_idx ON (aiReviewerId)            -- Reviewer activity
verdict_deployment_reviewer_unique UNIQUE ON (deploymentId, aiReviewerId)  -- One verdict per reviewer per deploy
```

**Relations**:

```typescript
export const deploymentReviewVerdictsRelations = relations(
  deploymentReviewVerdicts,
  ({ one }) => ({
    deployment: one(deployments, {
      fields: [deploymentReviewVerdicts.deploymentId],
      references: [deployments.deploymentId],
    }),
    reviewer: one(aiReviewers, {
      fields: [deploymentReviewVerdicts.aiReviewerId],
      references: [aiReviewers.aiReviewerId],
    }),
  }),
);
```

### pending_agent_actions

MCP-initiated actions awaiting human approval. Created when an MCP client with `deploy` scope triggers a deployment in an environment with gate policy `"manual_only"` or when the gate evaluator requires human override.

```typescript
export const pendingAgentActions = pgTable("pending_agent_action", {
  actionId: text("actionId")
    .notNull()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  mcpClientId: text("mcpClientId")
    .notNull()
    .references(() => mcpClients.mcpClientId, { onDelete: "cascade" }),
  actionType: agentActionType("actionType").notNull(),
  targetId: text("targetId").notNull(),
  targetType: mcpTargetType("targetType").notNull(),
  payload: jsonb("payload").notNull().$type<AgentActionPayload>(),
  status: pendingActionStatus("status").notNull().default("pending"),
  deploymentId: text("deploymentId")
    .references(() => deployments.deploymentId, { onDelete: "set null" }),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  resolvedBy: text("resolvedBy")
    .references(() => user.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolutionNote"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});
```

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| actionId | text (PK) | NO | nanoid() | |
| mcpClientId | text (FK → mcp_client.mcpClientId) | NO | | CASCADE |
| actionType | agentActionType (pgEnum) | NO | | What the agent wants to do |
| targetId | text | NO | | Entity being acted upon |
| targetType | mcpTargetType (pgEnum) | NO | | Entity type |
| payload | jsonb | NO | | Full action details (image tag, env changes, etc.) |
| status | pendingActionStatus (pgEnum) | NO | "pending" | |
| deploymentId | text (FK → deployment.deploymentId) | YES | | SET NULL — linked after deploy creation |
| organizationId | text (FK → organization.id) | NO | | CASCADE |
| resolvedBy | text (FK → user.id) | YES | | SET NULL |
| resolvedAt | timestamp | YES | | |
| resolutionNote | text | YES | | Why approved/rejected |
| createdAt | timestamp | NO | defaultNow() | |
| expiresAt | timestamp | YES | | Auto-expire if not resolved |

**Enums**:

```typescript
export const agentActionType = pgEnum("agentActionType", [
  "deploy",
  "redeploy",
  "stop",
  "start",
  "restart",
  "scale",
  "env_update",
]);

export const pendingActionStatus = pgEnum("pendingActionStatus", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled",
]);
```

**Payload type**:

```typescript
interface AgentActionPayload {
  requestedAt: string;
  reason: string;
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  metadata?: Record<string, unknown>;
}
```

**Indexes**:

```sql
pendingAction_status_idx ON (status) WHERE status = 'pending'   -- Active queue, partial index
pendingAction_mcpClientId_idx ON (mcpClientId)
pendingAction_organizationId_idx ON (organizationId)
pendingAction_expiresAt_idx ON (expiresAt) WHERE status = 'pending'  -- TTL cleanup
```

**Relations**:

```typescript
export const pendingAgentActionsRelations = relations(
  pendingAgentActions,
  ({ one }) => ({
    mcpClient: one(mcpClients, {
      fields: [pendingAgentActions.mcpClientId],
      references: [mcpClients.mcpClientId],
    }),
    deployment: one(deployments, {
      fields: [pendingAgentActions.deploymentId],
      references: [deployments.deploymentId],
    }),
    organization: one(organization, {
      fields: [pendingAgentActions.organizationId],
      references: [organization.id],
    }),
    resolver: one(user, {
      fields: [pendingAgentActions.resolvedBy],
      references: [user.id],
    }),
  }),
);
```

## Schema Migrations

### Migration 001: Rename dokploy → undevops

Mechanical rename, no schema changes:
- Update all `package.json` `name` fields: `@dokploy/*` → `@undevops/*`
- Update all internal imports: `@dokploy/server/...` → `@undevops/server/...`
- Update `drizzle.config.ts` schema path references
- **No database schema changes** — table names remain unchanged for data continuity

### Migration 002: Add MCP client tables

```sql
CREATE TYPE "mcpAccessLevel" AS ENUM ('read', 'deploy', 'admin');
CREATE TYPE "mcpTargetType" AS ENUM ('organization', 'project', 'environment', 'application', 'compose');

CREATE TABLE "mcp_client" (
  "mcpClientId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "name" text NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "tokenPrefix" text NOT NULL,
  "scope" "mcpAccessLevel" NOT NULL DEFAULT 'read',
  "targetId" text,
  "targetType" "mcpTargetType",
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "last_used_at" timestamp,
  "request_count" integer NOT NULL DEFAULT 0,
  "revoked_at" timestamp,
  "metadata" jsonb
);

CREATE INDEX "mcpClient_tokenHash_idx" ON "mcp_client"("tokenHash");
CREATE INDEX "mcpClient_organizationId_idx" ON "mcp_client"("organizationId");
CREATE INDEX "mcpClient_revokedAt_idx" ON "mcp_client"("revoked_at") WHERE "revoked_at" IS NOT NULL;
```

### Migration 003: Add plugin system tables

```sql
CREATE TABLE "plugin" (
  "pluginId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "name" text NOT NULL UNIQUE,
  "version" text NOT NULL,
  "manifestJson" jsonb NOT NULL,
  "grantedPermissions" text[] NOT NULL DEFAULT '{}',
  "enabled" boolean NOT NULL DEFAULT true,
  "faulted" boolean NOT NULL DEFAULT false,
  "faultMessage" text,
  "hookSubscriptions" text[] NOT NULL DEFAULT '{}',
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "installedBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "installed_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp,
  "last_invoked_at" timestamp,
  "invoke_count" integer NOT NULL DEFAULT 0
);

CREATE INDEX "plugin_organizationId_idx" ON "plugin"("organizationId");
CREATE INDEX "plugin_enabled_idx" ON "plugin"("enabled") WHERE "enabled" = true;
```

### Migration 004: Add AI review tables

```sql
CREATE TYPE "aiProviderType" AS ENUM ('claude', 'openai', 'gemini', 'codex', 'custom');
CREATE TYPE "verdictType" AS ENUM ('pass', 'fail', 'abstain', 'error');

CREATE TABLE "ai_reviewer" (
  "aiReviewerId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "name" text NOT NULL,
  "provider" "aiProviderType" NOT NULL,
  "credentialRef" text NOT NULL,
  "model" text NOT NULL,
  "apiUrl" text,
  "configJson" jsonb,
  "timeout_seconds" integer NOT NULL DEFAULT 30,
  "isEnabled" boolean NOT NULL DEFAULT true,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp,
  "last_invoked_at" timestamp,
  "invoke_count" integer NOT NULL DEFAULT 0
);

CREATE TABLE "deployment_review_verdict" (
  "verdictId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "deploymentId" text NOT NULL REFERENCES "deployment"("deploymentId") ON DELETE CASCADE,
  "aiReviewerId" text NOT NULL REFERENCES "ai_reviewer"("aiReviewerId") ON DELETE CASCADE,
  "verdict" "verdictType" NOT NULL,
  "reasoning" text,
  "confidence" integer,
  "payload" jsonb,
  "reviewed_at" timestamp NOT NULL DEFAULT NOW(),
  "duration_ms" integer
);

CREATE INDEX "aiReviewer_organizationId_idx" ON "ai_reviewer"("organizationId");
CREATE INDEX "aiReviewer_provider_idx" ON "ai_reviewer"("provider");
CREATE INDEX "verdict_deploymentId_idx" ON "deployment_review_verdict"("deploymentId");
CREATE INDEX "verdict_aiReviewerId_idx" ON "deployment_review_verdict"("aiReviewerId");
CREATE UNIQUE INDEX "verdict_deployment_reviewer_unique" ON "deployment_review_verdict"("deploymentId", "aiReviewerId");
```

**Data migration** (run after DDL): Move existing `ai` table rows into `ai_reviewer`:

```sql
INSERT INTO "ai_reviewer" ("aiReviewerId", "name", "provider", "credentialRef", "model", "apiUrl", "isEnabled", "organizationId", "createdBy", "created_at")
SELECT
  "aiId",
  "name",
  CASE
    WHEN "apiUrl" LIKE '%anthropic%' OR "apiUrl" LIKE '%claude%' THEN 'claude'
    WHEN "apiUrl" LIKE '%openai%' THEN 'openai'
    WHEN "apiUrl" LIKE '%gemini%' OR "apiUrl" LIKE '%generativelanguage%' THEN 'gemini'
    ELSE 'custom'
  END,
  'migrated:ai:' || "aiId",
  "model",
  "apiUrl",
  "isEnabled",
  "organizationId",
  (SELECT "owner_id" FROM "organization" o WHERE o."id" = a."organizationId"),
  COALESCE("createdAt"::timestamp, NOW())
FROM "ai" a;
```

After verification, create a `secret` row for each migrated AI API key and update `credentialRef` accordingly.

### Migration 005: Add secrets table

```sql
CREATE TYPE "secretScopeType" AS ENUM (
  'organization', 'project', 'environment', 'application', 'compose',
  'ai_reviewer', 'plugin'
);

CREATE TABLE "secret" (
  "secretId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "key" text NOT NULL,
  "encryptedValue" text NOT NULL,
  "encryptionIv" text NOT NULL,
  "encryptionTag" text NOT NULL,
  "scope" "secretScopeType" NOT NULL,
  "scopeId" text NOT NULL,
  "description" text,
  "version" integer NOT NULL DEFAULT 1,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "last_rotated_at" timestamp,
  "expires_at" timestamp
);

CREATE INDEX "secret_scope_idx" ON "secret"("scope", "scopeId");
CREATE INDEX "secret_organizationId_idx" ON "secret"("organizationId");
CREATE UNIQUE INDEX "secret_key_unique" ON "secret"("scope", "scopeId", "key");
```

### Migration 006: Enhance deployment, environment, and audit tables

```sql
-- New enums
CREATE TYPE "actorType" AS ENUM ('human', 'agent', 'plugin', 'system');
CREATE TYPE "gateStatusType" AS ENUM ('skipped', 'pending', 'approved', 'rejected', 'timed_out');
CREATE TYPE "gatePolicyType" AS ENUM ('disabled', 'single', 'unanimous', 'manual_only');
CREATE TYPE "agentActionType" AS ENUM ('deploy', 'redeploy', 'stop', 'start', 'restart', 'scale', 'env_update');
CREATE TYPE "pendingActionStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired', 'cancelled');

-- Deployment enhancements
ALTER TABLE "deployment"
  ADD COLUMN "initiatingActorType" "actorType" NOT NULL DEFAULT 'human',
  ADD COLUMN "initiatingActorId" text,
  ADD COLUMN "gateStatus" "gateStatusType" NOT NULL DEFAULT 'skipped';

-- Environment enhancements
ALTER TABLE "environment"
  ADD COLUMN "gatePolicy" "gatePolicyType" NOT NULL DEFAULT 'disabled',
  ADD COLUMN "reviewerIds" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN "autoApproveAgents" boolean NOT NULL DEFAULT false;

-- Audit log enhancements
ALTER TABLE "audit_log"
  ADD COLUMN "actor_type" "actorType" NOT NULL DEFAULT 'human',
  ADD COLUMN "actor_id" text,
  ADD COLUMN "payload" jsonb;

CREATE INDEX "auditLog_actorType_idx" ON "audit_log"("actor_type");
CREATE INDEX "auditLog_actorId_idx" ON "audit_log"("actor_id");

-- Pending agent actions
CREATE TABLE "pending_agent_action" (
  "actionId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "mcpClientId" text NOT NULL REFERENCES "mcp_client"("mcpClientId") ON DELETE CASCADE,
  "actionType" "agentActionType" NOT NULL,
  "targetId" text NOT NULL,
  "targetType" "mcpTargetType" NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "pendingActionStatus" NOT NULL DEFAULT 'pending',
  "deploymentId" text REFERENCES "deployment"("deploymentId") ON DELETE SET NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "resolvedBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "resolutionNote" text,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "expires_at" timestamp
);

CREATE INDEX "pendingAction_status_idx" ON "pending_agent_action"("status") WHERE "status" = 'pending';
CREATE INDEX "pendingAction_mcpClientId_idx" ON "pending_agent_action"("mcpClientId");
CREATE INDEX "pendingAction_organizationId_idx" ON "pending_agent_action"("organizationId");
CREATE INDEX "pendingAction_expiresAt_idx" ON "pending_agent_action"("expires_at") WHERE "status" = 'pending';
```

## Indexes for Performance

### SC-002: MCP reads < 500ms

| Index | Table | Columns | Type | Rationale |
|-------|-------|---------|------|-----------|
| `mcpClient_tokenHash_idx` | mcp_client | tokenHash | B-tree | Auth lookup on every MCP request |
| `mcpClient_revokedAt_idx` | mcp_client | revoked_at | Partial B-tree (WHERE revoked_at IS NOT NULL) | Revocation check |
| `pendingAction_status_idx` | pending_agent_action | status | Partial B-tree (WHERE status = 'pending') | Active queue scan |

### Scale envelope indexes

| Index | Table | Columns | Type | Rationale |
|-------|-------|---------|------|-----------|
| `auditLog_createdAt_idx` | audit_log | created_at | B-tree (existing) | Time-range queries |
| `auditLog_actorType_idx` | audit_log | actor_type | B-tree | Filter by actor type |
| `auditLog_actorId_idx` | audit_log | actor_id | B-tree | Trace specific agent/plugin |
| `auditLog_actor_created_idx` | audit_log | actor_id, created_at DESC | Composite B-tree | MCP audit: filter by actor + time |
| `auditLog_action_created_idx` | audit_log | action, created_at DESC | Composite B-tree | MCP audit: filter by action + time |
| `auditLog_target_created_idx` | audit_log | target_resource, created_at DESC | Composite B-tree | MCP audit: filter by target + time |
| `verdict_deploymentId_idx` | deployment_review_verdict | deploymentId | B-tree | Gate evaluator reads |
| `verdict_deployment_reviewer_unique` | deployment_review_verdict | deploymentId, aiReviewerId | UNIQUE B-tree | One verdict per reviewer per deploy |
| `secret_scope_idx` | secret | scope, scopeId | B-tree | Lookup secrets by owner entity |
| `secret_key_unique` | secret | scope, scopeId, key | UNIQUE B-tree | Prevent duplicate keys |
| `plugin_enabled_idx` | plugin | enabled | Partial B-tree (WHERE enabled = true) | Active plugin loading |
| `pendingAction_expiresAt_idx` | pending_agent_action | expires_at | Partial B-tree (WHERE status = 'pending') | TTL cleanup job |

## Data Constraints

### Business rules enforced at DB level

| Constraint | Table | Mechanism |
|------------|-------|-----------|
| Token hash uniqueness | mcp_client | UNIQUE on tokenHash |
| Plugin name uniqueness | plugin | UNIQUE on name |
| One verdict per reviewer per deploy | deployment_review_verdict | UNIQUE on (deploymentId, aiReviewerId) |
| Secret key uniqueness per scope | secret | UNIQUE on (scope, scopeId, key) |
| Cascade on org delete | All tables with organizationId | FK ON DELETE CASCADE |
| Preserve audit on user delete | audit_log, mcp_client, secrets | FK ON DELETE SET NULL |
| Revocation via timestamp | mcp_client | NULL = active, non-NULL = revoked |
| Plugin fault isolation | plugin | `faulted` boolean + `faultMessage` |
| Gate status progression | deployment | Application enforces: skipped → pending → approved/rejected/timed_out |
| Pending action expiry | pending_agent_action | `expires_at` + cleanup job |

### Application-level constraints (not enforced at DB)

| Rule | Location | Notes |
|------|----------|-------|
| Token value shown once | MCP client creation endpoint | Only `tokenHash` stored in DB |
| AES-256-GCM key from env var | Secret encrypt/decrypt service | `UNDEVOPS_ENCRYPTION_KEY` never in DB |
| Gate policy evaluation order | Gate evaluator service | disabled → skip; single → any pass; unanimous → all pass; manual → human only |
| Default strict review policy | Gate evaluator | Any fail/absent → blocked unless policy overrides |
| Secret rotation increments version | Secret rotation service | `version++`, new encryptedValue/IV/tag |
| AI reviewer timeout enforcement | Review orchestrator | `timeoutSeconds` per reviewer, abort on exceed |
| Secret encrypted value size | Secret encrypt/decrypt service | Application-level CHECK: length(encryptedValue) < 16384 (16KB) |
| Audit log payload size | Audit recording service | Application-level CHECK: octet_length(payload::text) < 16384 (16KB) |
