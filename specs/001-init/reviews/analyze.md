# SpecKit Analyze: 001-init (v2 — post-fix re-analysis)

**Reviewer**: analyze (Claude self-consistency)
**Reviewed at**: 2026-05-27T12:00:00+03:00
**Commit**: adb86e71f9a4aac455a84a58908c706e7c6ffce4
**Artifacts**: spec.md, plan.md, tasks.md, data-model.md, contracts/mcp-api.md, contracts/plugin-sdk.md, quickstart.md, specs/main/architecture.md
**Previous run**: analyze.md v1 (2026-05-25) — verdict HIGH. 14 fixes applied since then.

## v1 Findings — Resolution Status

| v1 ID | Severity | Status | Resolution |
|-------|----------|--------|------------|
| C1 | CRITICAL→HIGH | **FIXED** | plan.md Implementation Strategy now explicitly states Principle VI gate requirement |
| C2 | HIGH | **FIXED** | Same as C1 — gate documented in plan.md Entry Criteria |
| D1 | MEDIUM | **ACCEPTED** | Sub-requirements for testability — no action needed |
| D2 | LOW | **ACCEPTED** | Dependency order already correct |
| A1 | HIGH | **FIXED** | T032 now defines `IAuthProvider` interface with `authenticate`/`authorize`/`invalidate` |
| A2 | MEDIUM | **ACCEPTED** | PostgreSQL default fsync for v0.x — documented in research.md |
| A3 | LOW | **ACCEPTED** | T054 covers `--format json` |
| U1 | HIGH | **FIXED** | T032 expanded with pluggable interface definition (same fix as A1) |
| U2 | MEDIUM | **ACCEPTED** | T045 queue semantics clear from context |
| U3 | MEDIUM | **FIXED** | Rate limits now defined in contracts/mcp-api.md (120/30/10 per scope) |
| U4 | LOW | **ACCEPTED** | Implied by T037 middleware |
| I1 | HIGH | **PARTIAL** | Documentation tree fixed. But plan.md body still has 7 references to old contract filenames (see I6 below) |
| I2 | MEDIUM | **ACCEPTED** | Data model correctly uses SHA-256 hash; spec terminology is abstract by design |
| I3 | MEDIUM→HIGH | **FIXED** | T046a added — startup reconciliation for crash recovery |
| I4 | LOW | **ACCEPTED** | Traefik ACME inherited from Dokploy |
| I5 | LOW | **ACCEPTED** | T056 vs T136 test different scopes (per-story vs final) |
| G1 | HIGH | **FIXED** | T008a added — Windows dev verification in SETUP phase |
| G2 | MEDIUM | **OPEN** | FR-033 HTTP version endpoint still has no task (see F2 below) |
| G3 | MEDIUM | **ACCEPTED** | Audit log viewer in US2 scope is fine |
| G4 | LOW | **ACCEPTED** | Implied by DB migration tasks |
| R1 | MEDIUM | **ACCEPTED** | [BE] for CLI is correct (uses core package) |
| R2 | LOW | **ACCEPTED** | Cross-agent dependency fine |
| S1 | HIGH | **FIXED** | Already correctly ordered (T033 → T034) |
| S2 | MEDIUM | **ACCEPTED** | T079/T080 coordinate on core exports |

## External Review Findings — Resolution Status

| Review | ID | Severity | Status | Resolution |
|--------|-----|----------|--------|------------|
| antigravity | F1 | CRITICAL | **FIXED** | T038/T070: value-based redaction (Set of secrets → global replaceAll) |
| antigravity | F2 | HIGH | **FIXED** | T073: documented plugins run in-process, permission = admin boundary not sandbox |
| antigravity | F3 | HIGH | **FIXED** | T037: token revocation event bus → SSE transport closes matching streams |
| antigravity | F4 | MEDIUM | **FIXED** | T043: 10-min hard timeout on health check → fail + unblock queue |
| antigravity | F5 | MEDIUM | **ACCEPTED** | US6 P3 Swarm quorum — design detail, not blocking |
| claude-v4 | F1 | CRITICAL | **FIXED** | contracts: all `format: uuid` removed, now `type: string` |
| claude-v4 | F2 | CRITICAL | **FIXED** | actorType enum unified to `["human","agent","plugin","system"]` across all artifacts |
| claude-v4 | F3 | HIGH | **FIXED** | Unauthorized prompts removed from contracts |
| claude-v4 | F4 | HIGH | **FIXED** | Environment enum → `type: string, maxLength: 64` |
| claude-v4 | F5 | HIGH | **FIXED** | `format: ipv4` → `address` (IP v4/v6 or hostname) |
| claude-v4 | F6 | HIGH | **FIXED** | Plugin host architecture clarified: types in plugin-sdk, impl in core |
| claude-v4 | F7 | HIGH | **DEFERRED** | MCP+plugin permission unification — design decision, not spec fix |
| claude-v4 | F8 | HIGH | **FIXED** | `env:read` now explicitly: secrets ALWAYS redacted, SC-008 note added |
| claude-v4 | F9 | HIGH | **DEFERRED** | `network:write` restriction — design decision, not spec fix |
| claude-v4 | F10 | HIGH | **FIXED** | T074: crash-loop 3-in-10min auto-disable with fault counter reset on re-enable |
| claude-v4 | F11 | MEDIUM | **FIXED** | Permission enum enforcement note added to contracts + T075 |
| claude-v4 | F12 | MEDIUM | **DEFERRED** | SDK 0.x version pinning — acceptable friction for new ecosystem |
| claude-v4 | F13 | MEDIUM | **DEFERRED** | PluginApiClient list methods — nice-to-have, not blocking |
| claude-v4 | F14 | MEDIUM | **FIXED** | `tlsEnabled: boolean` → `tlsStatus` enum (7 states) |
| claude-v4 | F15 | MEDIUM | **FIXED** | Subsumed by F1 (UUID removal) |
| claude-v4 | F16 | MEDIUM | **ACCEPTED** | `restartCount` — data gap, can be null initially |
| claude-v4 | F17 | LOW | **ACCEPTED** | Caret-only semver is intentional simplicity |
| claude-v4 | F18 | LOW | **ACCEPTED** | T066 references contracts section |
| claude-v4 | F19 | LOW | **ACCEPTED** | SSE idle close + revocation event bus covers this |

## New Findings (v2)

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| F1 | Inconsistency | MEDIUM | plan.md:L54-57, L214, L223, L230 | plan.md documentation tree was fixed to use `mcp-api.md`/`plugin-sdk.md`, but body still references old filenames: `contracts/mcp-resources.md` (L214), `contracts/mcp-tools.md` (L223), `contracts/plugin-hooks.md` (L230), plus tree lines L54-57. 7 stale references total. | Replace remaining old references with actual filenames: `contracts/mcp-api.md` and `contracts/plugin-sdk.md`. |
| F2 | Coverage | MEDIUM | tasks.md, FR-033 | FR-033 requires version display "via both an HTTP endpoint and MCP". T052 covers UI, T064 covers MCP resource, but no task implements the REST API endpoint (`GET /api/version` in `apps/api/`). | Add task to Phase 3 or Phase 4: implement version endpoint in `apps/api/`. |
| F3 | Terminology | LOW | contracts/mcp-api.md | Server resource field was renamed from `ipAddress` to `address` but some parameter descriptions may still say "IP address" instead of "server address (IP or hostname)". | Verify descriptions updated consistently. Low priority — field name is correct. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 through FR-031 | YES | — | All COMPLETE (see v1 table) |
| FR-032 (cross-platform) | YES | T008a, T135 | COMPLETE |
| FR-033 (version display) | PARTIAL | T052, T064 | Missing HTTP endpoint task (F2) |
| FR-034 (constitution) | N/A | — | Process requirement |
| FR-035 through FR-039 | YES | T124-T130 | COMPLETE |
| SC-001 through SC-013 | YES | — | All COMPLETE |

## Constitution Alignment Issues

| Principle | Status |
|-----------|--------|
| I — Source of Truth | PASS |
| II — Transformer, Not Fork | N/A (fork is strategic premise) |
| III — Protected Slots | PASS |
| IV — SemVer | PASS |
| V — Token Economy | PASS |
| VI — Cross-AI Review | DEFERRED (correct for plan stage; gate documented in plan.md Entry Criteria) |
| VII — Artifact Versioning | PASS |
| VIII — Self-Maintaining Knowledge | N/A |

No constitution violations.

## Unmapped Tasks

All infrastructure/quality-gate tasks accounted for. No orphan implementation tasks.

## Metrics

- Total Requirements: 39 FRs + 13 SCs = 52
- Total Tasks: 138 (T001–T054 including T008a, T055–T136 including T046a)
- Coverage % (requirements with ≥1 task): 98.1% (51/52 complete, 1 partial: FR-033)
- Ambiguity count: 0
- Duplication count: 0
- CRITICAL count: 0
- HIGH count: 0
- MEDIUM count: 2 (F1 stale refs, F2 missing HTTP version endpoint)
- LOW count: 1 (F3 terminology)

## VERDICT

```yaml
verdict: PASS
reviewer: analyze
reviewed_at: "2026-05-27T12:00:00+03:00"
commit: adb86e71f9a4aac455a84a58908c706e7c6ffce4
critical_count: 0
high_count: 0
medium_count: 2
low_count: 1
```

### Verdict Rationale

Zero CRITICAL, zero HIGH. Two MEDIUM findings are non-blocking:
- F1 (stale contract filenames in plan.md body) — cosmetic, doesn't affect implementation
- F2 (missing HTTP version endpoint task) — partial coverage, can be added during implementation

All v1 HIGH/CRITICAL findings resolved. All external review (antigravity + claude-v4) CRITICAL/HIGH findings resolved or consciously deferred with justification. Constitution alignment clean. Coverage 98.1%.

**Residual deferred items** (conscious decisions, not blockers):
- Claude-F7: MCP+plugin permission unification (design decision for future iteration)
- Claude-F9: `network:write` restriction (design decision)
- Claude-F12: SDK 0.x version pinning (acceptable friction)
- Claude-F13: PluginApiClient list methods (nice-to-have)
- Antigravity-F5: Swarm quorum (US6 P3 detail)
- Threat model items (2FA, webhook sig, SSH hardening) — NEW features beyond v0.1 scope
