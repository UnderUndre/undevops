# Architecture: undevops

**Version**: 0.1.0 | **Last Updated**: 2026-05-25 | **Status**: Active

## Overview

undevops is a self-hosted platform for managing servers and deploying projects. Forked from Dokploy v0.29.5 (Apache 2.0), it adds AI-native operational capabilities: MCP gateway, multi-AI pre-deploy review, and a TypeScript plugin system.

The core differentiator is making AI agents first-class operators through Model Context Protocol (MCP) integration — not just read-only spectators calling REST endpoints, but active participants that can read infrastructure state, propose changes, and (with approval) execute deployments. No competing PaaS (Coolify, Dokploy, Dokku, Portainer) offers this in 2026.

**Upstream attribution**: Dokploy v0.29.5, Apache 2.0. All original code retains upstream license headers. ~85% of Docker/Traefik/SSH/build infrastructure is reused directly.

## Source of Truth Tree

```text
undevops/
├── apps/
│   ├── web/              # Next.js 16 web UI (renamed from dokploy)
│   ├── api/              # Hono REST API
│   ├── mcp-server/       # MCP gateway service [NEW]
│   ├── cli/              # Headless CLI [NEW]
│   └── scheduler/        # BullMQ job scheduler (renamed from schedules)
├── packages/
│   ├── server/           # Shared: Drizzle schema, services, utils (existing)
│   ├── core/             # Core deployment engine [NEW, extracted from server]
│   ├── plugin-sdk/       # Plugin authoring SDK [NEW]
│   └── ai-pack/          # AI-native features: MCP, AI review [NEW]
├── specs/
│   ├── main/             # Architecture, requirements, plan docs
│   └── 001-init/         # Feature spec for initial release
├── .claude/              # AI config (source of truth for clai-helpers)
├── .github/              # CI workflows, generated prompts/instructions
├── .gemini/              # Generated Gemini commands/agents
├── package.json          # Root: pnpm monorepo
├── pnpm-workspace.yaml   # Workspace definitions
└── biome.json            # Linting/formatting config
```

### Package Dependency Graph

```text
apps/web ──────────┐
apps/api ──────────┤
apps/mcp-server ───┼──► packages/core ──► packages/server (Drizzle schema)
apps/cli ──────────┤         ▲
apps/scheduler ────┘         │
                    packages/ai-pack
                    packages/plugin-sdk
```

`packages/core` builds independently of `packages/ai-pack` — this is the open-core readiness gate (FR-030, SC-005). CI enforces this on every push.

## Data Flow

### Deployment Flow

```text
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ User / Agent │────►│  API / Web   │────►│  Deployment Service  │
│ (trigger)    │     │  (tRPC/HTTP) │     │  (@undevops/core)    │
└──────────────┘     └──────────────┘     └──────────┬──────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Docker API     │
                                              │  (dockerode)    │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Container      │
                                              │  (build + run)  │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Traefik        │
                                              │  (routing+TLS)  │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Internet       │
                                              │  (HTTPS)        │
                                              └─────────────────┘
```

1. Human triggers via Web UI or CLI; agent triggers via MCP tool
2. API validates auth, records `deployment` row with `initiatingActorType`
3. Deployment service pulls git repo, builds image (Dockerfile/nixpacks/railpack)
4. Docker API creates container on target server (local or remote via SSH)
5. Traefik detects container labels, configures routing + TLS (Let's Encrypt)
6. Health check passes → deployment marked `done`; fails → `error`, previous version preserved

### MCP Read Flow

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Agent    │────►│  MCP Server  │────►│  Core        │
│  (Claude,    │     │  (stdio/SSE) │     │  Package     │
│   Codex,…)   │     │              │     │              │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
      │                     │                     │
      │              ┌──────▼───────┐     ┌───────▼───────┐
      │              │  Auth Layer  │     │  PostgreSQL   │
      │              │  (SHA-256    │     │  (Drizzle)    │
      │              │   lookup)    │     └───────┬───────┘
      │              └──────────────┘             │
      │                                           │
      │              ┌────────────────────────────▼┐
      │              │  Redaction Layer            │
      └──────────────│  (strip secret values)      │
                     └─────────────────────────────┘
```

1. Agent connects via stdio or SSE transport
2. Bearer token validated: SHA-256 hash lookup → check `revoked_at` is NULL (O(1))
3. Scope check: token's `scope` must include `read`; `targetId` restricts to project/env/service
4. Core package queries PostgreSQL via Drizzle ORM
5. Response passes through redaction layer — all `secret` values replaced with `***`
6. Audit log entry: `mcp_request` with client ID, resource, timestamp

### MCP Write Flow (with approval)

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  AI Agent    │────►│  MCP Server  │────►│  Pending Action  │
│  (deploy     │     │  (scope:     │     │  Queue (DB)      │
│   trigger)   │     │   write)     │     │                  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Admin Approval     │
                                          │  (Web UI / CLI)     │
                                          └──────────┬──────────┘
                                                     │ approve
                                          ┌──────────▼──────────┐
                                          │  Deployment Service │
                                          │  (execute action)   │
                                          └──────────┬──────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │  Audit Log          │
                                          │  (actor: agent)     │
                                          └─────────────────────┘
```

1. Agent calls `deploy` MCP tool with project ID, environment, ref
2. MCP server validates token scope includes `write`/`exec`
3. Action stored in `pending_agent_action` table with status `pending`
4. Web UI shows pending action; admin approves or rejects with reason
5. On approval: deployment service executes the action, links `deploymentId`
6. Agent receives progress via SSE subscription or polling
7. Audit log records full chain: agent client ID → approval → deployment result

### AI Review Gate Flow

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Deploy      │────►│  Gate        │────►│  Change Payload  │
│  Trigger     │     │  Evaluator   │     │  Builder         │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                       │
                   ┌────────▼────────┐     ┌────────▼─────────┐
                   │  Gate Policy    │     │  Diff + env vars │
                   │  Check          │     │  + compose delta │
                   │  (disabled? →   │     └────────┬─────────┘
                   │   skip)         │              │
                   └────────┬────────┘     ┌────────▼─────────┐
                            │              │  Parallel Fan-out │
                            │              │  ┌──────────────┐ │
                            │              │  │ Claude       │ │
                            │              │  │ Reviewer     │ │
                            │              │  ├──────────────┤ │
                            │              │  │ Gemini       │ │
                            │              │  │ Reviewer     │ │
                            │              │  ├──────────────┤ │
                            │              │  │ OpenAI       │ │
                            │              │  │ Reviewer     │ │
                            │              │  └──────────────┘ │
                            │              └────────┬─────────┘
                            │                       │ verdicts
                   ┌────────▼───────────────────────▼─────────┐
                   │  Verdict Collection                       │
                   │  (per-reviewer timeout: 30s default)      │
                   │                                           │
                   │  strict-by-default: any FAIL/ABSENT       │
                   │  → deploy blocked                         │
                   └──────────────┬────────────────────────────┘
                                  │
                     ┌────────────▼────────────┐
                     │  APPROVED ─► Deploy     │
                     │  REJECTED ─► Blocked    │
                     │  TIMED_OUT ─► Blocked   │
                     └─────────────────────────┘
```

1. Deploy triggered on an environment with `gatePolicy` ≠ `disabled`
2. Gate evaluator checks policy: `single` (any pass), `unanimous` (all pass), `manual_only`
3. Change payload built: diff (≤200 lines), env var changes, compose delta
4. Sent to all assigned AI reviewers in parallel via Vercel AI SDK providers
5. Each reviewer has independent timeout (default 30s); timeout = `error` verdict
6. Verdicts collected in `deployment_review_verdict` table
7. Strict-by-default: any `fail`/`error` → `gateStatus = rejected`, deploy blocked
8. Admin override possible with written reason (audit-logged)

### Plugin Hook Flow

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Lifecycle   │────►│  Plugin Host │────►│  Hook Dispatcher │
│  Event       │     │  (core)      │     │  (ordered)       │
│  (pre-deploy)│     │              │     │                  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │  Plugin A (priority 10)     │
                                    │  → onPreDeploy(payload)     │
                                    │  → return / throw           │
                                    ├─────────────────────────────┤
                                    │  Plugin B (priority 50)     │
                                    │  → onPreDeploy(payload)     │
                                    │  → return / throw           │
                                    ├─────────────────────────────┤
                                    │  Plugin C (priority 90)     │
                                    │  → FAULTED (skip)           │
                                    └──────────────┬──────────────┘
                                                   │
                                    ┌──────────────▼──────────────┐
                                    │  Fault Capture              │
                                    │  • Plugin marked faulted    │
                                    │  • Error logged             │
                                    │  • Deployment CONTINUES     │
                                    │    (fault isolation)        │
                                    └─────────────────────────────┘
```

1. Core emits lifecycle event (`pre-deploy`, `post-deploy`, `deploy-failed`, etc.)
2. Plugin host looks up enabled plugins subscribing to this hook
3. Dispatcher invokes in priority order (lower = first)
4. If plugin throws: caught → plugin marked `faulted = true`, `faultMessage` set
5. **Deployment continues** — fault isolation ensures one bad plugin doesn't block deploys (FR-018)
6. Admin notified of faulted plugin; can disable/fix/re-enable

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 24+ |
| Language | TypeScript | 5.8+ |
| Package Manager | pnpm | 10.22+ |
| Web Framework | Next.js | 16.x |
| API Framework | tRPC + Hono | 11.x / 4.x |
| ORM | Drizzle ORM | 0.45.x |
| Database | PostgreSQL | 15+ |
| Cache/Queue | Redis | 7+ (ioredis + BullMQ) |
| Container Mgmt | dockerode | 4.x |
| SSH | ssh2 | 1.16.x |
| Reverse Proxy | Traefik | 3.x |
| Auth | better-auth | 1.5.x |
| AI SDK | Vercel AI SDK | 6.x |
| Validation | Zod | 4.x |
| Logging | pino | 9.x |
| Linting | Biome | 2.x |
| Testing | Vitest | 4.x |
| CLI | commander + ora | latest |

### Technology Decisions

All major dependencies are inherited from Dokploy v0.29.5. No new fundamental infrastructure choices — the innovation layer is in `packages/ai-pack`, `packages/plugin-sdk`, and `apps/mcp-server`, all built on the existing stack.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Drizzle (existing) | Deep integration with PostgreSQL schema, type-safe queries, migration system |
| Job queue | BullMQ (existing) | Already in use for schedules; reuse for backup jobs and cleanup tasks |
| MCP transport | stdio + SSE | Standard MCP protocol; stdio for local CLI, SSE for remote agents |
| CLI framework | commander + ora | Lightweight, widely used, direct DB access (no HTTP dependency) |
| AI integration | Vercel AI SDK (existing) | Already in Dokploy deps; provider-agnostic abstraction |
| Encryption | Node.js crypto (AES-256-GCM) | No external deps; admin-provided key via env var |
| S3 client | @aws-sdk/client-s3 | Standard; works with AWS, MinIO, Cloudflare R2, Wasabi |

## Key Architectural Decisions

### AD-001: Monorepo with pnpm Workspaces

**Status**: Accepted | **Context**: Inherited from Dokploy

Retained from upstream. Five apps and four shared packages in a single repo. Package isolation enables future open-core split where `packages/ai-pack` could become closed-source without affecting `packages/core`.

Apps are thin orchestration layers over shared packages. All business logic lives in packages; apps handle transport (HTTP, stdio, CLI) and presentation.

### AD-002: Three-Package Module Boundary

**Status**: Accepted | **Context**: FR-030, SC-005

Three packages with clear dependency rules:

```text
core (mandatory)       ← deployment, server mgmt, proxy, secrets, audit, auth
  ↑
plugin-sdk (OSS)       ← plugin host, hook types, permissions, manifest schema
  ↑
ai-pack (OSS v0.x)     ← MCP resource/tool logic, AI reviewers, gate evaluator
```

**CI gate**: `packages/core` MUST build without `packages/ai-pack` present. This is the open-core readiness ratchet — ensures core deployment functionality never depends on AI features.

`packages/server` retains existing Drizzle schema and acts as a re-export facade during migration, then gradually becomes a thin shell over `packages/core`.

### AD-003: Standalone MCP Server

**Status**: Accepted | **Context**: RQ-003

Separate process from the Next.js web UI. Reasons:

1. MCP transport (stdio/SSE) has different lifecycle than HTTP
2. Independent scaling — MCP can be scaled separately from the web UI
3. Clean separation of concerns — MCP server has no UI concerns
4. Shares PostgreSQL and Redis (same data plane, different control plane)
5. Can be deployed independently or omitted entirely (core still works)

Runs as a separate Docker container in production. Supports both stdio (local CLI pipe) and SSE (remote agent) transports.

### AD-004: Hook-Based Plugin System

**Status**: Accepted | **Context**: RQ-004, FR-018

Inspired by Dokku's plugn system, adapted for TypeScript:

- Plugins declare a manifest (`undevops-plugin.json`) with hooks, permissions, config schema
- Plugin host validates manifests at load time, grants permissions on install
- Hooks invoked in priority order; lower priority = runs first
- **Fault isolation**: unhandled exception in plugin → plugin marked `faulted`, deployment continues
- TypeScript-first SDK with typed payloads matching versioned contracts

### AD-005: Provider-Agnostic AI Integration

**Status**: Accepted | **Context**: RQ-007

Via Vercel AI SDK's provider abstraction. Adding a new AI provider = implementing one adapter class:

```typescript
interface AIReviewerProvider {
  review(payload: ChangePayload): Promise<Verdict>;
}
```

Implementations: `ClaudeReviewer`, `GeminiReviewer`, `OpenAIReviewer`, `CodexReviewer`, `CustomReviewer` (arbitrary OpenAI-compatible endpoint). No core changes needed for new providers — just a new adapter file.

### AD-006: Direct DB Access for CLI

**Status**: Accepted | **Context**: RQ-009

CLI talks to PostgreSQL and Redis directly (no HTTP dependency). Simplicity for v0.x — the CLI works even if the API server is down. Trade-off: CLI needs network access to PostgreSQL and Redis, which may complicate remote usage. Can add an HTTP transport mode in a future version.

### AD-007: AES-256-GCM Secret Encryption

**Status**: Accepted | **Context**: RQ-005, FR-008

Admin provides encryption key via `UNDEVOPS_ENCRYPTION_KEY` environment variable. Key is NOT stored in the database. If the key is lost, encrypted secrets are unrecoverable — this is by design and documented prominently in the quickstart guide.

Separate encryption key for backups (blast-radius isolation): losing the secret key doesn't compromise backups, and vice versa.

Secret storage in DB: `encryptedValue` (ciphertext), `encryptionIv` (IV), `encryptionTag` (auth tag) — all base64-encoded.

## Scale Envelope (v0.x)

Single-instance controller. No high-availability. Designed for solo developers and small teams.

| Dimension | Limit |
|-----------|-------|
| Servers per cluster | 50 |
| Projects per admin | 500 |
| Replicas per deployment | 30 |
| Audit/log retention | 30 days |
| MCP read p95 latency | < 500ms |
| Install-to-deploy time | < 15 minutes |
| AI review verdict collection | < 60 seconds (2 reviewers, ≤200 changed lines) |
| Backup RTO | ~30 minutes |
| Concurrent deployments per project | 1 (queue collapses to latest) |

### Performance Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| SC-001 | Fresh install to deployed app | < 15 minutes |
| SC-002 | MCP read p95 latency | < 500ms |
| SC-003 | Plugin hook from SDK template | < 5 minutes |
| SC-004 | AI review verdict collection (2 reviewers) | < 60 seconds |
| SC-005 | Core builds without ai-pack | Always |
| SC-006 | Audit coverage for state-changing ops | 100% |
| SC-007 | Apache 2.0 attribution | All artifacts |
| SC-008 | No secret values in MCP/AI/audit/log | Always |
| SC-009 | Cross-platform dev build | Win/Mac/Linux |
| SC-010 | Agent deploy → approval → progress | Structured |
| SC-011 | Backup restore on fresh host | < 30 minutes |
| SC-012 | Scale envelope (50 servers, 500 projects) | Pass |
| SC-013 | Backup freshness | ≤ 6 hours |

## Security Boundaries

### 1. Secret Redaction

All MCP responses, AI payloads, and audit logs strip secret values at the serialization boundary. The redaction layer sits between the data source (PostgreSQL) and the transport (MCP/HTTP/SSE). Secret keys are visible; secret values are replaced with `***`.

### 2. MCP Token Scope

Three access levels: `read` (view status, logs), `write` (trigger deployments), `admin` (full management including secrets). Each token can be scoped to a specific project, environment, or service — or organization-wide.

Token validation: SHA-256 hash lookup + `revoked_at` NULL check. O(1) per request via indexed column. Token value shown once at creation, never stored in plaintext.

### 3. Plugin Permissions

Declared in plugin manifest, granted by admin at install time, enforced at runtime. Plugins cannot access resources beyond their declared permissions. Permission model follows least-privilege.

### 4. Agent Action Approval

Write/exec MCP actions require human approval (configurable). Default: all agent-initiated deployments go through the approval queue. Per-project/per-agent auto-approve available but off by default. Every approval/rejection is audit-logged with the admin's identity and optional reason.

### 5. Encryption at Rest

- Secrets: AES-256-GCM with `UNDEVOPS_ENCRYPTION_KEY` env var
- Backups: AES-256-GCM with separate backup encryption key
- Database credentials: standard PostgreSQL authentication
- Redis: optional TLS + AUTH (inherited from Dokploy)

## Entity Model

```text
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

environment ─────── gate config (columns on environment)
```

### New Tables (not in upstream Dokploy)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `mcp_client` | Authenticated MCP tokens | tokenHash, scope, targetId, revokedAt |
| `plugin` | Installed extensions | name, manifestJson, hookSubscriptions, faulted |
| `ai_reviewer` | External AI review services | provider, credentialRef, model, timeoutSeconds |
| `deployment_review_verdict` | Per-reviewer deploy verdicts | deploymentId, aiReviewerId, verdict, reasoning |
| `secret` | Encrypted key-value pairs | key, encryptedValue, scope, scopeId |
| `pending_agent_action` | Agent actions awaiting approval | mcpClientId, actionType, status, expiresAt |

### Enhanced Tables

| Table | Changes |
|-------|---------|
| `deployment` | +initiatingActorType, +initiatingActorId, +gateStatus |
| `environment` | +gatePolicy, +reviewerIds, +autoApproveAgents |
| `audit_log` | +actor_type, +actor_id, +payload (jsonb) |

Full schema with Drizzle definitions, indexes, and migration strategy: [data-model.md](data-model.md).

## Implementation Waves

### Wave 1 — Foundation (P1)

Core deployment + MCP read gateway. A solo developer can deploy a project from git and an AI agent can read infrastructure state.

| Track | Tasks | Key Deliverables |
|-------|-------|------------------|
| 1.1 Rebrand & Restructure | 10 | `@dokploy/*` → `@undevops/*`, monorepo restructured |
| 1.2 Package Extraction | 11 | `packages/core` extracted from `packages/server` |
| 1.3 DB Schema Extension | 9 | New tables + indexes, Drizzle migrations |
| 1.4 Deploy Stabilization | 10 | Zero-downtime deploy, log streaming, secret encryption |
| 1.5 MCP Read Gateway | 14 | stdio+SSE transport, resource handlers, redaction |
| 1.6 Web UI Adaptation | 8 | Rebrand + MCP/audit/secrets management pages |
| 1.7 CLI Skeleton | 8 | commander commands, JSON output, direct DB access |
| 1.8 Verification | 8 | E2E tests, scale envelope, attribution check |

### Wave 2 — Extensibility (P2)

Plugin system + MCP write with approval + backup/restore.

| Track | Tasks | Key Deliverables |
|-------|-------|------------------|
| 2.1 Plugin SDK & Host | 12 | Manifest schema, hook dispatcher, fault isolation |
| 2.2 MCP Write Gateway | 11 | deploy/rollback/scale tools, approval queue, auto-approve |
| 2.3 Backup & Restore | 9 | pg_dump → encrypt → S3, scheduled via BullMQ |
| 2.4 Verification | 4 | Plugin hook test, agent deploy test, backup RTO |

### Wave 3 — AI Operations (P3)

Multi-AI pre-deploy review + multi-server cluster scaling.

| Track | Tasks | Key Deliverables |
|-------|-------|------------------|
| 3.1 Multi-AI Review | 17 | Provider adapters, gate evaluator, strict-by-default |
| 3.2 Multi-Server Cluster | 9 | Docker Swarm, replica scheduling, node health |
| 3.3 Verification | 6 | Verdict latency, node failure recovery, full regression |

### Critical Path

```text
1.1 (Rebrand) → 1.2 (Core extraction) → 1.4 (Deploy stabilization) → 1.5 (MCP Read)
                                                                  → 1.6 (Web UI)
                                                                  → 1.7 (CLI)
                                                                  → 1.8 (Verification)
                                                                          ↓
2.1 (Plugin SDK) + 2.2 (MCP Write) + 2.3 (Backup) → 2.4 (Verification)
                                                          ↓
3.1 (AI Review) + 3.2 (Multi-Server) → 3.3 (Final Verification)
```

## Features

| Feature | Spec | Priority | Status |
|---------|------|----------|--------|
| Core Deployment | [001-init](../001-init/spec.md) US1 | P1 | Planned |
| MCP Read Gateway | [001-init](../001-init/spec.md) US2 | P1 | Planned |
| Plugin System | [001-init](../001-init/spec.md) US3 | P2 | Planned |
| MCP Write Gateway | [001-init](../001-init/spec.md) US4 | P2 | Planned |
| Multi-AI Review | [001-init](../001-init/spec.md) US5 | P3 | Planned |
| Multi-Server Cluster | [001-init](../001-init/spec.md) US6 | P3 | Planned |
| Backup & Restore | [001-init](../001-init/spec.md) FR-035–039 | P2 | Planned |

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dokploy code tightly coupled — extracting `core` reveals hidden deps | High | Medium | Incremental extraction with test-after-each-step; `server` as re-export facade |
| MCP SDK breaking changes — protocol evolving | Medium | High | Pin SDK version; abstract transport behind interface |
| Docker Swarm limits at 50 servers | Medium | Medium | Load test early (task 1.8.8); document tested envelope |
| AI provider latency/reliability — external API dependency | High | Medium | Per-reviewer timeout; ABSENT = fail; strict-by-default |
| Secret encryption key loss — unrecoverable secrets | Low | Critical | Document prominently; separate backup key; key rotation procedure |
| Drizzle migration conflicts during rename | Medium | Medium | Incremental migrations; test from v0.29.5 schema |

## Cross-References

| Document | Purpose |
|----------|---------|
| [data-model.md](data-model.md) | Full Drizzle schema, indexes, migrations |
| [plan.md](plan.md) | Implementation plan with task breakdown |
| [research.md](research.md) | Resolved research questions (RQ-001–RQ-010) |
| [quickstart.md](quickstart.md) | End-to-end setup and deployment guide |
| [contracts/](contracts/) | API contracts: MCP resources, tools, plugin hooks |
