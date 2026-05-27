# Research: undevops — AI-Native Self-Hosted Deployment Platform

**Branch**: `specs/001-init` | **Date**: 2026-05-25 | **Status**: Resolved

## Overview

Research for the initial implementation of undevops, a self-hosted deployment platform forked from Dokploy (Apache 2.0, TypeScript/Next.js + Drizzle ORM + PostgreSQL + Redis + Traefik + Docker Swarm).

## Resolved Questions

### RQ-001: Package Renaming Strategy
**Question**: How to rename from `@dokploy/*` to `@undevops/*` without breaking the existing monorepo?
**Resolution**: Incremental rename — rename package.json `name` fields, update all `workspace:*` references, update internal imports. The fork point is clean (v0.29.5). No npm publishing under old names needed.
**Impact**: Low risk, mechanical change across ~5 package.json files + internal imports.

### RQ-002: Open-Core Module Boundaries
**Question**: Where to draw the line between core (OSS) and future enterprise (closed-source)?
**Resolution**: Three-package split per FR-030:
- `packages/core` — deployment engine, server management, reverse proxy, auth (mandatory)
- `packages/plugin-sdk` — plugin host + authoring SDK (OSS, enables future enterprise plugins)
- `packages/ai-pack` — MCP gateway, AI review, AI-assisted features (OSS for v0.x, candidate for future enterprise)
CI gate: `packages/core` MUST build without `packages/ai-pack` present (SC-005).
**Impact**: Medium — requires extracting code from existing `packages/server` into `packages/core`. Some services are tightly coupled.

### RQ-003: MCP Server Architecture
**Question**: Standalone service vs. embedded in the Next.js server?
**Resolution**: Standalone `apps/mcp-server` service. Reasons:
1. MCP transport (stdio/SSE) has different lifecycle than HTTP
2. Independent scaling (future)
3. Clean separation of concerns
4. Reuses `@undevops/core` package for business logic
The MCP server runs as a separate process, shares the same PostgreSQL and Redis.
**Impact**: New app package, moderate effort.

### RQ-004: Plugin System Design
**Question**: Dokku plugn-style hooks vs. event-sourced vs. middleware chain?
**Resolution**: Hook-based system inspired by Dokku's plugn, adapted for TypeScript:
- Plugins declare a manifest (`undevops-plugin.json`) with hooks they subscribe to
- Hooks: `pre-deploy`, `post-deploy`, `deploy-failed`, `server-added`, `server-removed`, `project-created`, `project-deleted`
- Plugin host loads plugins at startup, validates manifests, grants permissions
- Failed plugins are isolated (caught exceptions → faulted state) per FR-018
- SDK provides typed payloads matching versioned contracts
**Impact**: New `packages/plugin-sdk` package + plugin host in `packages/core`.

### RQ-005: Secret Encryption Approach
**Question**: How to encrypt secrets at rest (FR-008)?
**Resolution**: AES-256-GCM with a deployment-scoped key derived from an admin-provided secret (env var `UNDEVOPS_ENCRYPTION_KEY`). The key is NOT stored in the database. If the key is lost, encrypted secrets are unrecoverable (by design — documented in quickstart). Existing Dokploy may have its own approach — evaluate and replace/augment as needed.
**Impact**: Medium — requires migration of any existing secret storage.

### RQ-006: MCP Token Storage & Revocation
**Question**: How to implement long-lived bearer tokens with instant revocation (FR-013a)?
**Resolution**: Tokens stored as SHA-256 hashes in `mcp_clients` table. Revocation = set `revoked_at` timestamp. Middleware checks revocation on every request (O(1) index lookup). Token value shown once at creation, never again.
**Impact**: Low — standard pattern.

### RQ-007: AI Reviewer Integration Pattern
**Question**: How to send change payloads to multiple AI providers and collect verdicts?
**Resolution**: Provider-agnostic interface using Vercel AI SDK (already in Dokploy dependencies):
- `AIReviewerProvider` interface with `review(changePayload): Promise<Verdict>`
- Implementations: `ClaudeReviewer`, `GeminiReviewer`, `OpenAIReviewer`, `CodexReviewer`
- Gate evaluator orchestrates: send payload to all reviewers in parallel, collect verdicts with per-reviewer timeout
- Default strict policy: any FAIL/ABSENT → deploy blocked
**Impact**: Medium — new infrastructure but reuses existing AI SDK integration.

### RQ-008: Backup Encryption & S3 Target
**Question**: How to implement encrypted backups to S3-compatible storage (FR-035–FR-039)?
**Resolution**:
- Use admin-provided encryption key (separate from `UNDEVOPS_ENCRYPTION_KEY` for blast-radius isolation)
- pg_dump → encrypt with AES-256-GCM → upload to S3 via standard `@aws-sdk/client-s3`
- Restore: download → decrypt → pg_restore against fresh instance
- Schedule via existing BullMQ infrastructure
- Config: endpoint, bucket, credentials, path prefix, encryption key
**Impact**: Low-medium — standard patterns, BullMQ already available.

### RQ-009: CLI Framework Choice
**Question**: What CLI framework for the headless CLI (FR-010)?
**Resolution**: `commander` for command parsing + `ora` for progress + shared `@undevops/core` package for business logic. The CLI talks to the same PostgreSQL/Redis directly (no HTTP API dependency) for simplicity in v0.x. Alternative considered: HTTP client to the API — rejected because it requires the API to be running for CLI operations.
**Impact**: Low — new `apps/cli` package, thin wrapper over core.

### RQ-010: Existing Dokploy Code Reuse Strategy
**Question**: How much of the existing Dokploy codebase to keep vs. rewrite?
**Resolution**: Keep and adapt the following from Dokploy:
- Docker orchestration (dockerode + compose): ~80% reusable
- Traefik integration (reverse proxy + TLS): ~90% reusable
- Drizzle schema (PostgreSQL): ~70% reusable (add new tables, rename)
- Auth (better-auth): ~60% reusable (keep core, strip SSO/enterprise bits to `packages/core`)
- Server management (SSH2): ~90% reusable
- Build system (nixpacks, railpack, paketo, Dockerfile): ~95% reusable
- Web UI (Next.js): ~60% reusable (rebrand, add MCP/plugin/audit views)
- Schedules (BullMQ): ~90% reusable

New code required:
- `packages/core` extraction from `packages/server`
- `packages/plugin-sdk` (entirely new)
- `packages/ai-pack` (entirely new: MCP gateway, AI review)
- `apps/mcp-server` (entirely new)
- `apps/cli` (entirely new)
- Web UI additions: MCP token management, plugin management, AI review views, audit log viewer, backup config
**Impact**: High — significant refactoring of existing code + substantial new code.

## Open Questions (Deferred)

None — all questions resolved through spec clarification session (2026-05-25).

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | pnpm workspaces (existing) | No migration needed |
| ORM | Drizzle (existing) | Deep integration, migrations work |
| API framework | tRPC (existing) + Hono (existing) | Both already in use |
| Job queue | BullMQ (existing) | Already in use for schedules |
| MCP transport | stdio + SSE | Standard MCP protocol |
| CLI framework | commander + ora | Lightweight, widely used |
| AI SDK | Vercel AI SDK (existing) | Already in Dokploy deps |
| Encryption | Node.js crypto (AES-256-GCM) | No external deps needed |
| S3 client | @aws-sdk/client-s3 | Standard, S3-compatible |
| Testing | Vitest (existing) | Already configured |
| Linting | Biome (existing) | Already configured |
| Auth | better-auth (existing) | Already integrated |

## References

- Dokploy source: forked from v0.29.5 (Apache 2.0)
- MCP specification: https://modelcontextprotocol.io/
- Dokku plugin system: https://github.com/dokku/dokku/tree/master/plugins
- Komodo GitOps: https://komo.do/
- Traefik documentation: https://doc.traefik.io/traefik/
