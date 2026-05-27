# Implementation Plan: undevops — AI-Native Self-Hosted Deployment Platform

**Branch**: `specs/001-init` | **Date**: 2026-05-25 | **Spec**: [spec.md](../../underundre/underhelpers/undevops/specs/001-init/spec.md)
**Input**: Feature specification from `underundre/underhelpers/undevops/specs/001-init/spec.md`

## Summary

undevops is a self-hosted deployment platform forked from Dokploy v0.29.5 (Apache 2.0) that layers AI-native operational capabilities on top of a proven container orchestration foundation. The core differentiator is making AI agents first-class operators through Model Context Protocol (MCP) integration — not just read-only spectators calling REST endpoints, but active participants that can read infrastructure state, propose changes, and (with approval) execute deployments. No competing PaaS (Coolify, Dokploy, Dokku, Portainer) offers this in 2026.

The technical approach is a three-phase build. **Wave 1** (P1) establishes the foundation: rebrand from `@dokploy/*` to `@undevops/*`, restructure the monorepo into modular packages (`core`, `plugin-sdk`, `ai-pack`) for future open-core readiness, stabilize core deployment, and ship a read-only MCP gateway. **Wave 2** (P2) adds the plugin system (Dokku-inspired hook-based TypeScript SDK), MCP write actions with human approval gates, and backup/restore to S3-compatible storage. **Wave 3** (P3) delivers multi-AI pre-deploy review (parallel verdict collection with strict-by-default policy) and multi-server cluster scaling (inherited from Dokploy's Docker Swarm integration).

The monorepo uses pnpm workspaces with five apps (`web`, `api`, `mcp-server`, `cli`, `scheduler`) and four shared packages (`server`, `core`, `plugin-sdk`, `ai-pack`). A CI gate ensures `packages/core` builds without `packages/ai-pack` present — this is the open-core readiness ratchet (FR-030, SC-005). All state-changing actions from humans, agents, or plugins are audit-logged (SC-006). Secret values never cross the AI boundary (SC-008).

## Technical Context

**Language/Version**: TypeScript 5.8+, Node.js 24+
**Primary Dependencies**: Next.js 16, Hono, tRPC 11, Drizzle ORM, PostgreSQL, Redis (ioredis), Docker (dockerode), SSH2, Traefik (reverse proxy), BullMQ (job queue), better-auth, pino (logging), Zod, Vercel AI SDK, commander (CLI), @aws-sdk/client-s3 (backup)
**Storage**: PostgreSQL via Drizzle ORM (primary state), Redis via ioredis (BullMQ job queue + ephemeral cache)
**Connection Pool Budget**: web(10), api(10), mcp-server(15), scheduler(5), cli(on-demand). Postgres max_connections=120. PgBouncer recommended for production.
**Deployment Log Rotation**: Log files compressed and uploaded to S3 after deployment completes; local copy deleted after 24h grace period. MCP logs endpoint transparently fetches from S3 if local file missing. Controller disk stays under 50GB at scale envelope sustained for 30 days.
**Testing**: Vitest (unit + integration), Biome (linting)
**Target Platform**: Linux servers (Ubuntu 22.04+, Debian 12+) for production; Windows/macOS/Linux for development
**Project Type**: Monorepo web service (pnpm workspaces), forked from Dokploy v0.29.5
**Performance Goals**: MCP read p95 < 500ms, 15-min fresh install to deployed app, AI review verdicts < 60s
**Constraints**: Single-instance controller (no HA), 50 servers / 500 projects / 30 replicas per deployment, 30-day audit/log retention
**Scale/Scope**: Solo developers and small teams (v0.x), designed for eventual open-core split

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Source of Truth | PASS | `.claude/` is authoritative AI config. N/A — not editing AI config files. |
| II — Transformer, Not Fork | N/A | This is a fork of Dokploy, not a new transformer. Constitution does not apply. |
| III — Protected Slots | PASS | No managed file edits in this feature. |
| IV — SemVer | PASS | Pre-1.0 (v0.29.5 from upstream). MINOR bumps for breaking/feature changes. |
| V — Token Economy | PASS | New packages earn their place (core extraction, plugin-sdk, ai-pack, mcp-server, cli). No decorative clones. |
| VI — Cross-AI Review | DEFERRED | Required at `/speckit.implement` stage. Plan stage does not require review gate. |
| VII — Artifact Versioning | PASS | Snapshot tags via `snapshot-stage.ps1` at each speckit stage transition. |
| VIII — Self-Maintaining Knowledge | N/A | No knowledge artifacts to maintain at plan stage. |

**Violations requiring justification**: None.

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── plan.md              # This file
├── research.md          # Phase 0 research output (resolved)
├── data-model.md        # Phase 1 data model design
├── quickstart.md        # Phase 1 quickstart guide
├── contracts/           # Phase 1 API contracts
│   ├── mcp-api.md       # MCP resource schemas + tool definitions
│   └── plugin-sdk.md    # Plugin hook contracts
└── tasks.md             # Phase 2 task breakdown (from /speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                  # Next.js 16 web UI (renamed from dokploy)
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── trpc/         # tRPC client setup
│   │   └── lib/          # Frontend utilities
│   ├── Dockerfile
│   └── package.json      # @undevops/web
├── api/                  # Hono REST API
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/    # Auth, rate-limit, audit
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json      # @undevops/api
├── mcp-server/           # MCP gateway service (NEW)
│   ├── src/
│   │   ├── resources/    # MCP resource handlers (servers, projects, deployments, logs)
│   │   ├── tools/        # MCP tool handlers (deploy, rollback, scale)
│   │   ├── transport/    # stdio + SSE transport adapters
│   │   ├── auth/         # Bearer token validation, scope checking
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json      # @undevops/mcp-server
├── cli/                  # Headless CLI (NEW)
│   ├── src/
│   │   ├── commands/     # commander command definitions
│   │   ├── output/       # Formatters (JSON, table, plain)
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json      # @undevops/cli
└── scheduler/            # BullMQ scheduler (renamed from schedules)
    ├── src/
    │   ├── jobs/         # Job handlers (backup, cert-renew, cleanup)
    │   └── index.ts
    ├── Dockerfile
    └── package.json      # @undevops/scheduler

packages/
├── server/               # Shared DB schema + services (existing, refactored)
│   ├── src/
│   │   ├── db/           # Drizzle schema, migrations, connection
│   │   ├── services/     # Business logic services
│   │   ├── utils/        # Shared utilities
│   │   └── index.ts
│   └── package.json      # @undevops/server
├── core/                 # Core deployment engine (NEW, extracted from server)
│   ├── src/
│   │   ├── deploy/       # Deployment orchestration, build, health-check
│   │   ├── server-mgmt/  # Server registration, SSH, health monitoring
│   │   ├── proxy/        # Traefik integration, TLS, routing
│   │   ├── secrets/      # AES-256-GCM encryption, secret CRUD
│   │   ├── audit/        # Audit event recording
│   │   ├── auth/         # better-auth integration, session management
│   │   └── index.ts
│   └── package.json      # @undevops/core
├── plugin-sdk/           # Plugin authoring SDK (NEW)
│   ├── src/
│   │   ├── types/        # Hook payload types, manifest schema
│   │   ├── host/         # Plugin loader, lifecycle hook dispatcher
│   │   ├── permissions/  # Permission declaration + grant/deny
│   │   └── index.ts
│   └── package.json      # @undevops/plugin-sdk
└── ai-pack/              # AI-native features (NEW)
    ├── src/
    │   ├── mcp/          # MCP resource/tool logic (shared with mcp-server)
    │   ├── review/       # AI reviewer providers, gate evaluator
    │   ├── providers/    # ClaudeReviewer, GeminiReviewer, OpenAIReviewer, CodexReviewer
    │   └── index.ts
    └── package.json      # @undevops/ai-pack

docker/
├── docker-compose.yml    # Development compose
├── docker-compose.prod.yml
└── traefik/              # Traefik config templates

tests/
├── contract/             # API contract tests
├── integration/          # Integration tests (DB, Docker, MCP)
└── e2e/                  # End-to-end scenario tests
```

**Structure Decision**: Monorepo with pnpm workspaces. Five apps (web, api, mcp-server, cli, scheduler) and four packages (server, core, plugin-sdk, ai-pack). The `packages/core` extraction from `packages/server` is the critical restructuring — it ensures the deployment engine is independently buildable without AI features (FR-030, SC-005). The `packages/ai-pack` package contains all AI-specific logic (MCP gateway internals, AI review) so it can be excluded from a future enterprise build path. Apps are thin orchestration layers over the shared packages.

## Phase 0: Research Resolution

All research questions resolved (2026-05-25). See [research.md](research.md) for full details.

| ID | Question | Resolution |
|----|----------|------------|
| RQ-001 | Package renaming strategy | Incremental rename: `@dokploy/*` → `@undevops/*` in package.json fields + workspace refs + internal imports |
| RQ-002 | Open-core module boundaries | Three-package split: `core` (mandatory), `plugin-sdk` (OSS), `ai-pack` (OSS v0.x, enterprise candidate) |
| RQ-003 | MCP server architecture | Standalone `apps/mcp-server` service (stdio + SSE transport), shares PostgreSQL/Redis |
| RQ-004 | Plugin system design | Hook-based (Dokku plugn-inspired), TypeScript SDK with manifest + permissions |
| RQ-005 | Secret encryption | AES-256-GCM with admin-provided key via `UNDEVOPS_ENCRYPTION_KEY` env var |
| RQ-006 | MCP token storage | SHA-256 hashed tokens in `mcp_clients` table, `revoked_at` for instant revocation |
| RQ-007 | AI reviewer integration | Vercel AI SDK provider-agnostic interface, parallel verdict collection, per-reviewer timeout |
| RQ-008 | Backup encryption | pg_dump → AES-256-GCM encrypt → S3 upload via @aws-sdk/client-s3, separate key from secrets |
| RQ-009 | CLI framework | commander + ora, direct DB/Redis access (no HTTP dependency) |
| RQ-010 | Dokploy code reuse | Keep Docker/Traefik/SSH/build (~85% reusable), extract core, new plugin-sdk/ai-pack/mcp-server/cli |

**Open questions deferred**: None.

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](data-model.md) for full schema with Drizzle ORM definitions, indexes, and migration strategy.

**Key entity groups**:

| Group | Entities | Key Relationships |
|-------|----------|-------------------|
| Infrastructure | `Server`, `ServerLabel` | Server has-many Labels; Server.role = manager \| worker |
| Projects | `Project`, `Environment`, `Secret` | Project has-many Environments; Environment has-many Secrets |
| Deployments | `Deployment`, `DeploymentLog` | Deployment belongs-to Project + Environment; has-many Logs |
| AI Operations | `MCPClient`, `MCPClientScope`, `AIReviewer`, `ReviewVerdict` | MCPClient has-many Scopes; AIReviewer belongs-to Environment; ReviewVerdict belongs-to Deployment + AIReviewer |
| Plugins | `Plugin`, `PluginHook`, `PluginPermission` | Plugin has-many Hooks + Permissions |
| Audit | `AuditEvent` | Immutable append-only; references actor (user/agent/plugin/system) + target resource |
| Backup | `BackupRecord` | Tracks backup attempts, S3 location, encryption metadata |

**New tables** (not in upstream Dokploy):
- `mcp_clients` — token hash, name, scopes, revoked_at, last_seen_at, request_count
- `mcp_client_scopes` — access_level (read/write/exec), target_type, target_id
- `plugins` — name, version, manifest JSON, faulted flag, enabled flag
- `plugin_hooks` — plugin_id, hook_name, priority
- `plugin_permissions` — plugin_id, permission_name, granted
- `ai_reviewers` — provider, credential_ref, model, temperature, environment_id
- `review_verdicts` — deployment_id, reviewer_id, verdict (PASS/FAIL/ABSENT), concerns, responded_at
- `environments` — project_id, name, target_servers, gate_config JSON
- `audit_events` — timestamp, actor_type, actor_id, action, target_type, target_id, snapshot_ref, annotation
- `backup_records` — timestamp, status, s3_key, size_bytes, error_message
- `secrets` — scope_type, scope_id, key, encrypted_value, created_by, last_rotated

### API Contracts

See [contracts/](contracts/) directory for full definitions.

**API surfaces by priority**:

| Surface | Transport | Priority | Key Operations |
|---------|-----------|----------|----------------|
| Web UI ↔ Backend | tRPC (HTTP) | P1 | All CRUD, deploy trigger, log streaming |
| REST API | Hono (HTTP) | P1 | Server management, project CRUD, health checks |
| MCP Resources | stdio + SSE | P1 | `servers://`, `projects://`, `deployments://`, `logs://{id}` |
| MCP Tools | stdio + SSE | P2 | `deploy`, `rollback`, `scale`, `approve-action` |
| CLI ↔ Core | Direct (no transport) | P1 | All operations via `@undevops/core` package |
| AI Reviewer Webhooks | HTTP (outbound) | P3 | Submit change payload, receive verdict |

**MCP Resource Schema** (P1, see [contracts/mcp-api.md](contracts/mcp-api.md)):
- `servers://` — list all registered servers with health status
- `servers://{id}` — single server detail
- `projects://` — list all projects with deployment status
- `projects://{id}` — single project detail with environments
- `deployments://` — recent deployments (paginated)
- `deployments://{id}` — single deployment with status and logs
- `logs://{deploymentId}` — last N log lines for a deployment

**MCP Tool Definitions** (P2, see [contracts/mcp-api.md](contracts/mcp-api.md)):
- `deploy(projectId, environment, ref)` → creates deployment, returns deployment ID
- `rollback(projectId, deploymentId)` → rolls back to specified deployment
- `scale(projectId, replicas)` → adjusts replica count
- `approve-action(actionId)` — approve pending agent action (admin only)
- `reject-action(actionId, reason)` — reject pending agent action

**Plugin Hook Contracts** (P2, see [contracts/plugin-sdk.md](contracts/plugin-sdk.md)):
- `pre-deploy(deployment: DeploymentPayload)` → can veto by throwing
- `post-deploy(deployment: DeploymentPayload)` → notification side-effects
- `deploy-failed(deployment: DeploymentPayload, error: ErrorPayload)` → alerting
- `server-added(server: ServerPayload)` → inventory sync
- `server-removed(server: ServerPayload)` → cleanup
- `project-created(project: ProjectPayload)` → initialization
- `project-deleted(project: ProjectPayload)` → teardown

### Quickstart

See [quickstart.md](quickstart.md) for the end-to-end guide covering:
1. Prerequisites (Linux VPS with Docker, domain DNS)
2. Install undevops (single command)
3. Initial setup (admin password, domain, TLS)
4. Connect a server (SSH key setup)
5. Create a project (git repo, build config)
6. Deploy (trigger, watch logs, verify HTTPS)
7. Connect MCP client (token creation, Claude Code config)
8. Verify AI agent reads infrastructure state

## Implementation Phases

### Wave 1 — Foundation (P1: Core Deployment + MCP Read)

**Goal**: undevops matches Dokploy's baseline deployment capability + ships read-only MCP gateway. A solo developer can deploy a project from git and an AI agent can read infrastructure state.

**Estimated scope**: ~40-60 tasks across rebrand, restructuring, core stabilization, MCP read, web UI, CLI.

#### 1.1 Rebrand & Restructure

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.1.1 | Rename all package.json `name` fields from `@dokploy/*` to `@undevops/*` | None |
| 1.1.2 | Update all `workspace:*` references in package.json files | 1.1.1 |
| 1.1.3 | Update internal imports (`from "@dokploy/..."` → `from "@undevops/..."`) across all files | 1.1.1 |
| 1.1.4 | Rename `apps/dokploy/` → `apps/web/` | 1.1.1 |
| 1.1.5 | Rename `apps/schedules/` → `apps/scheduler/` | 1.1.1 |
| 1.1.6 | Update Docker Compose files to reference new app names | 1.1.4, 1.1.5 |
| 1.1.7 | Update CI/CD pipelines (GitHub Actions) for new paths | 1.1.4, 1.1.5 |
| 1.1.8 | Update root README, LICENSE notices (preserve Dokploy attribution per Apache 2.0) | None |
| 1.1.9 | Verify build succeeds after rename (`pnpm install && pnpm build`) | 1.1.1–1.1.8 |
| 1.1.10 | Verify all existing tests pass after rename | 1.1.9 |

#### 1.2 Package Extraction — `packages/core`

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.2.1 | Create `packages/core` skeleton (package.json, tsconfig.json, src/index.ts) | 1.1.9 |
| 1.2.2 | Extract deployment orchestration from `packages/server` → `packages/core/src/deploy/` | 1.2.1 |
| 1.2.3 | Extract server management (SSH, health) → `packages/core/src/server-mgmt/` | 1.2.1 |
| 1.2.4 | Extract Traefik/proxy integration → `packages/core/src/proxy/` | 1.2.1 |
| 1.2.5 | Extract secret encryption (AES-256-GCM) → `packages/core/src/secrets/` | 1.2.1 |
| 1.2.6 | Extract audit event recording → `packages/core/src/audit/` | 1.2.1 |
| 1.2.7 | Extract auth (better-auth) core → `packages/core/src/auth/` | 1.2.1 |
| 1.2.8 | Update `packages/server` to re-export from `@undevops/core` for backward compat | 1.2.2–1.2.7 |
| 1.2.9 | Update all apps to import from `@undevops/core` directly where appropriate | 1.2.8 |
| 1.2.10 | Add CI gate: `packages/core` builds without `packages/ai-pack` present (SC-005) | 1.2.8 |
| 1.2.11 | Verify all tests pass after extraction | 1.2.10 |

#### 1.3 Database Schema Extension

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.3.1 | Add `environments` table to Drizzle schema | 1.2.1 |
| 1.3.2 | Add `secrets` table (encrypted key-value, scoped to project or server) | 1.2.1 |
| 1.3.3 | Add `audit_events` table (immutable, append-only) | 1.2.1 |
| 1.3.4 | Add `mcp_clients` table (token hash, name, scopes, revoked_at) | 1.2.1 |
| 1.3.5 | Add `mcp_client_scopes` table (access_level, target_type, target_id) | 1.3.4 |
| 1.3.6 | Add indexes: audit_events(actor, timestamp), mcp_clients(token_hash), deployments(project_id, status) | 1.3.1–1.3.5 |
| 1.3.7 | Generate and verify Drizzle migration files | 1.3.6 |
| 1.3.8 | Write seed data script for development | 1.3.7 |
| 1.3.9 | Update existing tables: rename Dokploy-specific columns, add environment FK to deployments | 1.3.7 |

#### 1.4 Core Deployment Stabilization

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.4.1 | Verify Docker orchestration (dockerode + compose) works with renamed packages | 1.2.11 |
| 1.4.2 | Verify Traefik integration (reverse proxy + TLS) works end-to-end | 1.4.1 |
| 1.4.3 | Verify build system (Dockerfile, nixpacks, railpack) works | 1.4.1 |
| 1.4.4 | Verify server SSH connectivity (SSH2) | 1.4.1 |
| 1.4.5 | Implement zero-downtime deploy: keep previous version healthy until new passes health check (FR-006) | 1.4.2 |
| 1.4.6 | Implement real-time log streaming to web UI (FR-004) | 1.4.1 |
| 1.4.7 | Implement audit logging for all state-changing operations (FR-034 partial) | 1.3.3 |
| 1.4.8 | Implement secret encryption at rest with AES-256-GCM (FR-008) | 1.3.2, 1.2.5 |
| 1.4.9 | Verify concurrent deployment queue: only one per project, queue collapses to latest commit | 1.4.1 |
| 1.4.10 | Integration test: fresh server → connect → deploy project → verify HTTPS (US1) | 1.4.2–1.4.9 |

#### 1.5 MCP Read Gateway

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.5.1 | Create `apps/mcp-server` skeleton (package.json, tsconfig.json, Dockerfile) | 1.2.11 |
| 1.5.2 | Implement stdio transport adapter (stdin/stdout JSON-RPC) | 1.5.1 |
| 1.5.3 | Implement SSE transport adapter (HTTP + Server-Sent Events) | 1.5.1 |
| 1.5.4 | Implement bearer token auth middleware (SHA-256 hash lookup, revocation check) | 1.3.4, 1.3.5 |
| 1.5.5 | Implement scope checking middleware (read/write/exec × project scope) | 1.5.4 |
| 1.5.6 | Implement `servers://` resource handler (list + detail) | 1.5.4 |
| 1.5.7 | Implement `projects://` resource handler (list + detail with environments) | 1.5.4 |
| 1.5.8 | Implement `deployments://` resource handler (list + detail, paginated) | 1.5.4 |
| 1.5.9 | Implement `logs://{deploymentId}` resource handler (last N lines, p95 < 500ms) | 1.5.4 |
| 1.5.10 | Implement secret redaction layer: maintain a Set of all known secret values in memory; before any response serialization (MCP, API, AI reviewer payload), do global string replacement of known secret values with `***REDACTED***`. This value-based approach catches secrets in any field position — more robust than pattern matching. | 1.5.6–1.5.9, 1.4.8 |
| 1.5.11 | Implement MCP request audit logging (client ID, resource, timestamp) | 1.5.4, 1.3.3 |
| 1.5.12 | Add version resource: `undevops://version` (version, upstream version, loaded plugins) | 1.5.4 |
| 1.5.13 | Integration test: MCP client → list servers → read logs → verify redaction (US2) | 1.5.10 |
| 1.5.14 | Performance test: verify MCP read p95 < 500ms under load (SC-002) | 1.5.13 |

#### 1.6 Web UI Adaptation

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.6.1 | Rebrand UI: update logo, name, colors, Dokploy references → undevops | 1.1.4 |
| 1.6.2 | Add MCP token management page: create, list, revoke, view scopes/last-used | 1.3.4, 1.3.5 |
| 1.6.3 | Add audit log viewer page: filterable by actor, action, target, time range | 1.3.3 |
| 1.6.4 | Add environment management within projects: create, configure, view deployments | 1.3.1 |
| 1.6.5 | Add secrets management UI: create, rotate, delete (values never shown after creation) | 1.3.2 |
| 1.6.6 | Add server health dashboard: status, resource usage, connected since | 1.4.4 |
| 1.6.7 | Update deployment flow: select environment, view health check progress, rollback button | 1.4.5 |
| 1.6.8 | Add version display in UI footer/settings (undevops version, upstream version) | None |

#### 1.7 CLI Skeleton

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.7.1 | Create `apps/cli` skeleton (package.json, tsconfig.json, commander setup) | 1.2.11 |
| 1.7.2 | Implement `undevops server list` / `server add` / `server remove` commands | 1.7.1, 1.2.3 |
| 1.7.3 | Implement `undevops project list` / `project create` / `project deploy` commands | 1.7.1, 1.2.2 |
| 1.7.4 | Implement `undevops deployment list` / `deployment logs` commands | 1.7.1 |
| 1.7.5 | Implement `undevops secret set` / `secret list` commands (list shows keys only) | 1.7.1, 1.2.5 |
| 1.7.6 | Implement `undevops mcp token create` / `token revoke` commands | 1.7.1, 1.3.4 |
| 1.7.7 | Add JSON output format (`--format json`) for all commands | 1.7.2–1.7.6 |
| 1.7.8 | Integration test: CLI → add server → create project → deploy → verify (FR-010) | 1.7.7 |

#### 1.8 Wave 1 Verification

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.8.1 | E2E test: fresh VPS install → deploy app → verify HTTPS < 15 min (SC-001) | 1.4–1.7 |
| 1.8.2 | E2E test: MCP client → list deployments → read logs → verify < 500ms (SC-002) | 1.5.14 |
| 1.8.3 | Verify 100% audit coverage for state-changing operations (SC-006) | 1.4.7, 1.5.11 |
| 1.8.4 | Verify secret redaction in MCP responses (SC-008) | 1.5.10 |
| 1.8.5 | Verify open-core gate: `packages/core` builds without `ai-pack` (SC-005) | 1.2.10 |
| 1.8.6 | Verify cross-platform dev: build + test on Windows, macOS, Linux (SC-009) | 1.1.9 |
| 1.8.7 | Verify Apache 2.0 attribution in all artifacts (SC-007) | 1.1.8 |
| 1.8.8 | Load test at scale envelope: 50 servers, 500 projects, 30-day retention (SC-012) | 1.4–1.7 |

---

### Wave 2 — Extensibility (P2: Plugin System + MCP Write + Backup)

**Goal**: undevops becomes extensible via plugins, AI agents can write/deploy via MCP with human approval, and backup/restore protects control-plane state.

**Estimated scope**: ~30-40 tasks.

#### 2.1 Plugin SDK & Host

**Note**: v0.x plugins run in-process with full Node.js runtime access. Permission system is administrative/UX boundary, not security sandbox. This is documented honestly in plugin-sdk. Future versions may introduce Worker thread or subprocess isolation for untrusted plugins.

| Task | Description | Dependencies |
|------|-------------|--------------|
| 2.1.1 | Create `packages/plugin-sdk` skeleton | Wave 1 complete |
| 2.1.2 | Define `undevops-plugin.json` manifest schema (Zod): name, version, hooks, permissions | 2.1.1 |
| 2.1.3 | Define typed hook payloads: `DeploymentPayload`, `ServerPayload`, `ProjectPayload`, `ErrorPayload` | 2.1.1 |
| 2.1.4 | Implement plugin loader: scan directory, validate manifests, load modules | 2.1.2 |
| 2.1.5 | Implement hook dispatcher: ordered invocation, error isolation, faulted-state tracking | 2.1.3 |
| 2.1.6 | Implement permission system: declare in manifest, prompt on install, grant/deny persist | 2.1.2 |
| 2.1.7 | Implement plugin install command: `undevops plugin install <path>` | 2.1.4 |
| 2.1.8 | Implement plugin list/enable/disable/remove commands | 2.1.4 |
| 2.1.9 | Add plugin status page to web UI: list, health, logs, permissions | 2.1.5 |
| 2.1.10 | Write reference plugin: "log every deployment event to stdout" | 2.1.3 |
| 2.1.11 | Integration test: install reference plugin → trigger deploy → verify hook fires (US3) | 2.1.10 |
| 2.1.12 | Integration test: plugin throws in hook → verify deployment continues, plugin marked faulted (FR-018) | 2.1.5 |

#### 2.2 MCP Write Gateway

| Task | Description | Dependencies |
|------|-------------|--------------|
| 2.2.1 | Implement `deploy` MCP tool: validate scope, create pending action | Wave 1 complete |
| 2.2.2 | Implement `rollback` MCP tool: validate scope, create pending action | 2.2.1 |
| 2.2.3 | Implement `scale` MCP tool: validate scope, create pending action | 2.2.1 |
| 2.2.4 | Implement pending action queue: store in DB, surface in web UI | 2.2.1 |
| 2.2.5 | Implement approval flow: human approves/rejects in UI, action executes | 2.2.4 |
| 2.2.6 | Implement auto-approval policy: configurable per project/agent, off by default | 2.2.5 |
| 2.2.7 | Implement action progress subscription: agent polls or receives SSE events | 2.2.5 |
| 2.2.8 | Implement optimistic concurrency: second action on same resource queues, conflict on race | 2.2.4 |
| 2.2.9 | Add audit logging for agent-initiated actions (actor = agent client ID) | 2.2.4 |
| 2.2.10 | Integration test: MCP write client → deploy → approve → verify completion (US4) | 2.2.5, 2.2.7 |
| 2.2.11 | Integration test: write client out of scope → immediate rejection, logged (FR-020) | 2.2.1 |

#### 2.3 Backup & Restore

| Task | Description | Dependencies |
|------|-------------|--------------|
| 2.3.1 | Add `backup_config` table: endpoint, bucket, credentials_ref, path_prefix, encryption_key_ref, schedule | Wave 1 complete |
| 2.3.2 | Implement backup job: pg_dump → AES-256-GCM encrypt → S3 upload | 2.3.1 |
| 2.3.3 | Implement restore command: download from S3 → decrypt → pg_restore | 2.3.2 |
| 2.3.4 | Schedule backup via BullMQ (default every 6 hours, configurable) | 2.3.2 |
| 2.3.5 | Add backup status endpoint: last success, last attempt, last error | 2.3.2 |
| 2.3.6 | Add backup configuration UI: S3 settings, schedule, manual trigger, status | 2.3.5 |
| 2.3.7 | Add backup status MCP resource: `undevops://backup-status` | 2.3.5 |
| 2.3.8 | Integration test: configure backup → trigger → verify S3 upload → restore to fresh instance (SC-011) | 2.3.3 |
| 2.3.9 | Verify backup freshness: most recent backup ≤ 6 hours old (SC-013) | 2.3.4 |

#### 2.4 Wave 2 Verification

| Task | Description | Dependencies |
|------|-------------|--------------|
| 2.4.1 | E2E test: plugin install → hook fires in < 5 min from SDK template (SC-003) | 2.1.11 |
| 2.4.2 | E2E test: agent deploy → approval → execution → structured progress (SC-010) | 2.2.10 |
| 2.4.3 | Verify backup RTO: restore on fresh host < 30 min (SC-011) | 2.3.8 |
| 2.4.4 | Regression: all Wave 1 tests still pass | 2.1–2.3 |

---

### Wave 3 — AI Operations (P3: Multi-AI Review + Multi-Server)

**Goal**: undevops gates production deployments through multi-AI review and supports multi-server clusters with horizontal scaling.

**Estimated scope**: ~25-35 tasks.

#### 3.1 Multi-AI Pre-Deploy Review

| Task | Description | Dependencies |
|------|-------------|--------------|
| 3.1.1 | Create `packages/ai-pack` skeleton with `AIReviewerProvider` interface | Wave 2 complete |
| 3.1.2 | Implement `ClaudeReviewer` provider (Vercel AI SDK → Claude API) | 3.1.1 |
| 3.1.3 | Implement `GeminiReviewer` provider (Vercel AI SDK → Gemini API) | 3.1.1 |
| 3.1.4 | Implement `OpenAIReviewer` provider (Vercel AI SDK → OpenAI API) | 3.1.1 |
| 3.1.5 | Implement `CodexReviewer` provider (Vercel AI SDK → Codex API) | 3.1.1 |
| 3.1.6 | Implement change payload builder: diff, env var changes, compose changes | 3.1.1 |
| 3.1.7 | Implement gate evaluator: send to all reviewers in parallel, collect verdicts with per-reviewer timeout | 3.1.2–3.1.5 |
| 3.1.8 | Implement strict-by-default policy: any FAIL/ABSENT → deploy blocked | 3.1.7 |
| 3.1.9 | Implement admin override: written reason required, logged to audit | 3.1.8 |
| 3.1.10 | Integrate gate into deployment flow: gated environments enter "pending review" state | 3.1.8 |
| 3.1.11 | Add AI reviewer configuration UI: add/remove reviewers, set timeouts, configure per environment | 3.1.7 |
| 3.1.12 | Add review verdict display in deployment detail: verdicts, concerns, timestamps | 3.1.10 |
| 3.1.13 | Persist reviewer responses in `review_verdicts` table for retrospective | 3.1.7 |
| 3.1.14 | Integration test: 2 reviewers → both PASS → deploy proceeds (US5) | 3.1.10 |
| 3.1.15 | Integration test: 2 reviewers → 1 FAIL → deploy blocked → override with reason → proceeds (US5) | 3.1.9 |
| 3.1.16 | Integration test: reviewer timeout → ABSENT → strict policy blocks deploy | 3.1.7 |
| 3.1.17 | Performance test: 2 reviewers, ≤200 changed lines → verdicts < 60s (SC-004) | 3.1.14 |

#### 3.2 Multi-Server Cluster

| Task | Description | Dependencies |
|------|-------------|--------------|
| 3.2.1 | Preserve and test Dokploy's Docker Swarm integration under new package names | Wave 2 complete |
| 3.2.2 | Implement multi-node replica scheduling: distribute across distinct nodes | 3.2.1 |
| 3.2.3 | Implement node health monitoring: periodic check, mark degraded/unreachable | 3.2.1 |
| 3.2.4 | Implement replica rescheduling: drain from degraded nodes within configurable timeout | 3.2.3 |
| 3.2.5 | Update Traefik config for multi-node load balancing | 3.2.2 |
| 3.2.6 | Add cluster topology view in web UI: nodes, replicas, health | 3.2.3 |
| 3.2.7 | Integration test: 3 servers → deploy 3 replicas → verify distribution (US6) | 3.2.2 |
| 3.2.8 | Integration test: kill 1 node → replicas reschedule → service continues | 3.2.4 |
| 3.2.9 | Integration test: node rejoins → eligible for next placement | 3.2.4 |

#### 3.3 Wave 3 Verification

| Task | Description | Dependencies |
|------|-------------|--------------|
| 3.3.1 | E2E test: 2 reviewers, typical change → verdicts < 60s (SC-004) | 3.1.17 |
| 3.3.2 | E2E test: 3 servers, 3 replicas, node failure → no interruption (US6) | 3.2.8 |
| 3.3.3 | Regression: all Wave 1 + Wave 2 tests still pass | 3.1, 3.2 |
| 3.3.4 | Full scale envelope test: 50 servers, 500 projects, 30 replicas, 30-day retention (SC-012) | 3.2, 1.8.8 |
| 3.3.5 | Final secret scan: no secret values in MCP/AI/audit/log output (SC-008) | 3.1, 3.2 |
| 3.3.6 | Final attribution check: Apache 2.0 notices in all artifacts (SC-007) | 3.1, 3.2 |

## Complexity Tracking

No constitution violations. All principles PASS or are N/A at this stage.

## Dependencies & Risk

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Dokploy code tightly coupled** — extracting `packages/core` from `packages/server` may reveal hidden dependencies | High | Medium | Incremental extraction with test-after-each-step. Keep `packages/server` as re-export facade during transition. |
| **MCP SDK compatibility** — MCP protocol is evolving; stdio/SSE transport may have breaking changes | Medium | High | Pin `@modelcontextprotocol/sdk` version. Abstract transport layer behind interface. |
| **Docker Swarm limitations at scale** — 50 servers / 30 replicas pushes Swarm's practical limits | Medium | Medium | Load test early (task 1.8.8). Document tested scale envelope. Swarm is inherited from Dokploy — not a new choice. |
| **AI provider latency/reliability** — reviewer verdicts depend on external AI APIs | High | Medium | Per-reviewer timeout (configurable). ABSENT handling. Default-strict policy ensures degraded mode fails safe. |
| **Cross-platform build tooling** — Windows dev host running Linux-targeted Docker orchestration | Medium | Low | CI runs on Linux. Dev scripts use Node.js (cross-platform). Bash-only scripts are banned (FR-032). |
| **Secret encryption key management** — lost key = unrecoverable secrets | Low | Critical | Document prominently in quickstart. Key rotation procedure in FR-008. Backup encryption uses separate key. |
| **Drizzle migration conflicts** — renaming Dokploy tables while adding new ones may conflict | Medium | Medium | Generate migrations incrementally. Test migration path from Dokploy v0.29.5 schema. |

### External Dependencies

| Dependency | Version | Risk | Lock Strategy |
|-----------|---------|------|---------------|
| Dokploy upstream | v0.29.5 | Fork point; no further upstream merges planned for v0.x | Git tag |
| Docker / dockerode | Latest stable | API stability | Pin major version |
| Drizzle ORM | Latest stable | Migration compatibility | Pin minor version |
| MCP SDK | Latest stable | Protocol stability | Pin exact version |
| Vercel AI SDK | Latest stable | Provider compatibility | Pin minor version |
| better-auth | Latest stable | Auth integration | Pin minor version |
| Traefik | v3.x | Reverse proxy config compatibility | Pin major version |

### Critical Path

```
1.1 (Rebrand) → 1.2 (Core extraction) → 1.4 (Deploy stabilization) → 1.5 (MCP Read)
                                                                  → 1.6 (Web UI)
                                                                  → 1.7 (CLI)
                                                                  → 1.8 (Verification)
                                                                          ↓
2.1 (Plugin SDK) + 2.2 (MCP Write) + 2.3 (Backup) → 2.4 (Verification)
                                                          ↓
3.1 (AI Review) + 3.2 (Multi-Server) → 3.3 (Final Verification)
```

The critical path runs through: rebrand → core extraction → deployment stabilization → MCP read gateway → verification. Wave 2 and Wave 3 can parallelize their internal tracks but are sequential waves overall.

### Entry Criteria (per Wave)

- **Wave 1**: Spec approved, research resolved, plan approved, `/speckit.analyze` PASS, ≥2 external `/speckit.review` PASS (constitution Principle VI).
- **Wave 2**: Wave 1 verification passes (tasks 1.8.1–1.8.8).
- **Wave 3**: Wave 2 verification passes (tasks 2.4.1–2.4.4).

**Constitution Principle VI gate**: `/speckit.implement` MUST NOT proceed without `analyze.md` PASS + ≥2 distinct external AI reviewer PASS verdicts in `specs/001-init/reviews/`. This gate is enforced at the command level by `/speckit.implement` — not by individual tasks.

### Exit Criteria (overall)

All 13 success criteria (SC-001 through SC-013) pass. All 6 user stories verified by independent test. Zero open constitution violations.
