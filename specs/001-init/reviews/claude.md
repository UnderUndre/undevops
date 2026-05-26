# SpecKit Review: 001-init (undevops) — Contracts + Threat Model Pass (v4)

**Reviewer**: claude
**Reviewed at**: 2026-05-26T07:30:00Z
**Commit**: d1f178d18 (HEAD)
**Artifacts reviewed**: spec.md, plan.md, tasks.md, data-model.md, research.md, quickstart.md, **contracts/mcp-api.md, contracts/plugin-sdk.md** (newly read in this pass), reviews/analyze.md, reviews/antigravity.md, prior reviews/claude.md (committed at `review/001-init/v3`), .specify/memory/constitution.md

## Summary

This is the **fourth review pass** (`claude.md` v4) — it **extends** rather than replaces the prior comprehensive review preserved at tag `review/001-init/v3`. Source content has not changed since v3 (HEAD same; plan/tasks/data-model still untracked but tagged via `plan/001-init/v1` and `tasks/001-init/v1`). The new value here:

1. **Contract files** (`contracts/mcp-api.md`, `contracts/plugin-sdk.md` — ~50KB combined) were not read in v3. Reading them surfaced **2 new CRITICAL findings** and **~12 contract-specific gaps** that affect MCP protocol correctness, plugin trust model, and cross-artifact consistency
2. **Self-correction** on v3 finding F11 (plugin permission taxonomy) — partly wrong: the closed enum DOES exist in `contracts/plugin-sdk.md`, but the issue (not synced to data-model and tasks) stands
3. **STRIDE threat model exercise** across 7 platform assets — v3 only stubbed the absence of a threat model (v3-F21); v4 actually does one and surfaces 8 attack vectors with concrete mitigations
4. **Carry-over** of all v3 findings — they remain valid; this section is in §"v3 Findings — Status After Contracts Pass"

**Gate status (constitution Principle VI) remains FAILING**: `analyze.md` = HIGH, `antigravity.md` = CRITICAL, `claude.md` v4 = CRITICAL. Two CRITICALs from independent providers + my CRITICAL = no PASS verdicts.

## NEW Findings from Contracts Read

| ID | Severity | Area | Finding | Recommendation |
|----|----------|------|---------|----------------|
| F1 | **CRITICAL** | Contract / data model mismatch | `contracts/mcp-api.md` declares **every** ID field with `"format": "uuid"` across all schemas (servers, projects, deployments, audit events, etc.). `data-model.md` actually uses `nanoid()` to generate IDs — 21-character base62-ish strings that are **not UUID-formatted**. A strict MCP client validating responses against the contract schema will reject every single response. JSON Schema validators that enforce the `format: uuid` keyword (Ajv with `strict: true`, jsonschema with `format_checker`) will refuse to deserialize. This breaks MCP integration day one for any client that does schema validation | Two options. Pick one and apply consistently: **(A)** Update `data-model.md` to use `gen_random_uuid()` for all PKs going forward; existing nanoid PKs in Dokploy can stay but new tables (`mcp_clients`, `plugins`, `ai_reviewers`, `secrets`, `deployment_review_verdicts`, `pending_agent_actions`) use UUIDs; this is more work but matches the contract. **(B)** Update `contracts/mcp-api.md` to use `"type": "string"` (drop the `format: uuid` constraint) and document the ID format as "implementation-defined opaque string"; this is cheaper but loses self-describing schema value |
| F2 | **CRITICAL** | Three-way enum drift at audit boundary | `actorType` is defined **three incompatible ways** across artifacts: `spec.md` says `human / agent / plugin / system`; `data-model.md` `actorType` pgEnum says `human / agent / plugin / system` (matches spec — good); `contracts/mcp-api.md` `AuditEvent.actorType` says `user / api_token / mcp_token / system / plugin` (5 values, different concepts — mixes human roles with auth methods); `contracts/plugin-sdk.md` `pre-deploy` payload `actorType` says `user / api_token / mcp_token / system / plugin` (matches mcp-api). So spec+data-model agree, contracts+contracts agree — and the two camps disagree. Whichever artifact ships first sets de-facto truth and silently invalidates the other. This is on the audit-log integrity path — getting it wrong means audit events will be miscategorized and the gate's actor attribution is broken | Reconcile to spec's 4-value enum `human / agent / plugin / system`. The contract's 5-value enum confuses *who* (human/agent/system/plugin) with *how* (user-session vs api-token vs mcp-token). Track auth method as a separate `authMethod` field if needed for forensics (e.g., human via session vs human via API token), but keep `actorType` aligned with spec. Update both contract files |
| F3 | HIGH | Contract advertises capabilities the spec doesn't authorize | `contracts/mcp-api.md` defines two prompts not present in `spec.md` FRs: `undevops_capacity_report` ("Generate a capacity report across all servers with recommendations") and `undevops_security_audit` ("Review audit logs, token usage, and access patterns for security anomalies"). Both are **AI-recommendation features** not in spec. The contract is functionally a scope-creep document — it promises behaviors that no FR authorizes and no task implements. Plus they're security-sensitive (security audit is a high-trust feature; capacity recommendations imply spend/usage data exposure) | Either: add FRs covering these prompts (then they need their own clarifications + tasks); or remove them from `contracts/mcp-api.md` until the spec authorizes them. Don't ship contract surface that the spec doesn't bless |
| F4 | HIGH | Environment enum hardcoded but data model says it's dynamic | `contracts/mcp-api.md` Project.environment is a hardcoded enum: `["production", "staging", "development"]`. `data-model.md` has an `environment` table with a free-form `name text` column — environments are user-defined records, not a closed enum. Quickstart shows creating projects with custom environment names. The contract's hardcoded enum will reject any environment that isn't one of the three names | Drop the enum from `contracts/mcp-api.md`. Use `"type": "string", "maxLength": 64`. Optionally add a `"description"` documenting common values. The contract should reflect data-model reality, not impose a sub-vocabulary |
| F5 | HIGH | IPv4-only IP fields will lock out IPv6 servers | `contracts/mcp-api.md` Server.ipAddress is `"format": "ipv4"`. Multiple plugin payloads (server-added, server-removed) also constrain to IPv4. In 2026, many cloud providers ship IPv6-first / IPv6-only addresses (e.g., AWS dual-stack, Hetzner /64 prefixes, every modern home/datacenter network). An admin trying to add an IPv6 server gets a schema validation rejection | Use `"format": "ip"` (Draft 2020-12 supports both v4 and v6 via this format), or use `"oneOf": [{"format": "ipv4"}, {"format": "ipv6"}]`. Also consider hostnames: many admins prefer to register servers by FQDN, not IP. Spec doesn't restrict this; contract over-constrains |
| F6 | HIGH | Plugin host location contradicts plan + tasks | `contracts/plugin-sdk.md` Architecture section says **"Plugin host: `packages/core` — loads, validates, and executes plugins at startup"**. `plan.md` §Project Structure puts plugin host under `packages/plugin-sdk/src/host/` (Lane 13 also). `tasks.md` T073-T074 implement loader + dispatcher in `packages/plugin-sdk/src/host/`. So the contract says it lives in core, plan/tasks say it lives in plugin-sdk. If host lives in core, then core depends on plugin-sdk (and FR-030's modularity-for-open-core is preserved since plugin-sdk is OSS). If host lives in plugin-sdk, then plugin-sdk needs to import internal core APIs (deployment lifecycle, server events) — circular. **Whichever you intended, both can't be true** | Reconcile. Recommended: host **interface and types** live in `packages/plugin-sdk` (so plugin authors can depend on it without pulling core); host **implementation** lives in `packages/core` and consumes the plugin-sdk types. Update `contracts/plugin-sdk.md` architecture diagram and plan/tasks to align |
| F7 | HIGH | Plugin permissions vs MCP scopes are two parallel grant systems | The platform has **two unrelated permission models**: plugin permissions (`deploy:read / deploy:write / server:read / server:write / project:read / project:write / logs:read / audit:read / env:read / env:write / network:read / network:write` — 12 values from `contracts/plugin-sdk.md`) and MCP token scopes (3-way disagreement: `read/write/exec` in spec, `read/deploy/admin` in data-model, `read,write` list in quickstart — see v3-F1). They target the same actions. An admin granting a plugin `deploy:write` and an MCP client `write` scope is granting overlapping rights via different vocabularies. This is confusing and error-prone — admins will get the boundaries wrong, security holes will result | Unify on one permission vocabulary. Suggested: use the plugin-permission vocabulary (verb:resource) for both plugins and MCP scopes. An MCP token has a SET of permissions (`["deploy:read", "deploy:write", "logs:read"]`), same as a plugin. Drops the read/write/exec abstraction in favor of explicit grants. Aligns plugin and MCP grant UX. Reduces admin cognitive load |
| F8 | HIGH | Plugin `env:read` permission gives plugins unredacted secrets | `contracts/plugin-sdk.md` `pre-deploy` payload schema says: *"envVars: Environment variables (secret values REDACTED unless plugin has env:read permission)"*. The permission system explicitly grants plugins access to **unredacted secret values**. Combined with Antigravity F2 (in-process plugins have root access anyway), this is the documented exfiltration vector: any plugin granted `env:read` can read all project env vars including secrets and POST them to an external service via its outbound network access. There is no rate-limit, no outbound network filter, no DLP on plugin egress. The permission UX makes this look like a normal grant — an admin clicking "Approve" doesn't see "this plugin can exfiltrate every secret to anywhere" | Either: (a) **Remove `env:read` from the permission enum** — plugins MUST work with redacted env vars (matches spec/SC-008 intent); add a separate, more controlled "secrets vending machine" if a plugin genuinely needs to send a particular secret to a specific service; OR (b) keep `env:read` but make it a 2-step admin grant (initial approval + per-project audited unlock) AND add outbound network allowlist for the plugin. (a) is safer, (b) is more flexible |
| F9 | HIGH | Plugin `network:write` permission can hijack TLS | `contracts/plugin-sdk.md` permissions: `network:write` = "Modify routes, domains, TLS settings". A plugin with this permission can modify Traefik configuration directly — redirect customer traffic to attacker-controlled hosts, install attacker certs, MITM all TLS. There is no FR scoping this permission to specific projects/domains; no SC asserts cross-domain isolation; no enforcement mechanism specified | Either: (a) Remove `network:write` from the v0.x permission set — TLS/routing is platform infrastructure, not extension territory; OR (b) constrain `network:write` to only affect routes/domains owned by projects the plugin can already access via `project:write`. Add SC test: plugin with `network:write` cannot redirect traffic for a project it lacks `project:write` on |
| F10 | HIGH | Crash-loop prevention spec'd in contract, not implemented in tasks | `contracts/plugin-sdk.md` Error Handling §6 specifies: *"If a plugin transitions to faulted more than 3 times within 10 minutes, it transitions to disabled automatically."* Specific, measurable, good design. **But `tasks.md` T074** ("hook dispatcher") only mentions "error isolation per hook, timeout enforcement, faulted-state tracking" — no implementation of the 3-in-10 window counter or auto-disable. Without this, a misbehaving plugin can fault-loop indefinitely, wasting CPU on hot path | Expand T074 description (or add subtask): "Track plugin fault count + timestamps in `plugins.fault_count` + `plugins.last_fault_at`; when count ≥ 3 within rolling 10-min window, set `status = 'disabled'`, audit-log the auto-disable, notify admin via UI" |
| F11 | MEDIUM | Self-correction on v3-F11: plugin permission enum IS in contracts but NOT synced | I claimed in v3-F11 that plugin permission taxonomy was open. Wrong — `contracts/plugin-sdk.md` has the closed enum. **However**, the contract enum is not referenced by `data-model.md` (which stores `grantedPermissions text[]` with no constraint), nor by `tasks.md` T075 (which says "implement permission system" without specifying the source of truth). So plugins could declare a permission like `"steal-everything"` and `data-model.md` would happily store it; the contract's enum is advisory unless task implementation enforces it | Add to T075 description: "Source of truth for permission enum is `contracts/plugin-sdk.md` §Permission Definitions. T073 plugin loader MUST reject manifests declaring permissions outside this set." Also: enforce in Drizzle via a CHECK constraint on `plugins.grantedPermissions` (each element must be in the enum) — or move to a `text[]` with an enum element type if Postgres permits |
| F12 | MEDIUM | SDK 0.x strict version pinning creates plugin ecosystem friction | `contracts/plugin-sdk.md` §Versioning: *"Plugin with `sdkVersion: ^0.1.0` will NOT load against SDK 0.2.0 — explicit opt-in required"*. Means every SDK minor bump during 0.x breaks every plugin until authors update manifests. For a new ecosystem trying to grow plugin contributors, this is a friction tax that compounds (every undevops 0.2 → 0.3 release breaks the entire plugin marketplace). Once at 1.x it's standard, but 0.x is the formative phase | Add a compatibility shim: when SDK loads a plugin with `sdkVersion: ^0.1.0` against SDK 0.2.0, log a deprecation warning + load anyway IF the schema hasn't actually broken. Drop this lenience at 1.0. Concretely: introduce a `compatibilityLevel` field separate from `sdkVersion` so authors can mark their plugin as "compatible with current major" without locking to exact minor |
| F13 | MEDIUM | Plugin host doesn't support paginated/list calls from plugins | `contracts/plugin-sdk.md` PluginApiClient: `getProject(id)`, `getServer(id)`, `getDeployment(id)`, `getProjectLogs(id, opts)`. **No list methods** (`listProjects`, `listServers`, `listDeployments`). For plugins like "stale-project-reaper" ("remove projects with no deploys in 90 days"), or "compliance-scanner" ("flag projects without health checks"), or "cost-analyzer" — there's no way to iterate. Plugins are reduced to reactive-only patterns (hook-driven) and can't do proactive scans | Add list methods to PluginApiClient with cursor-based pagination: `listProjects({cursor, limit, filter}): Promise<{items, nextCursor}>` etc. Permission-gated (require `project:read` for `listProjects`). Rate-limit-aware. Without this, the plugin model is more constrained than necessary |
| F14 | MEDIUM | `tlsEnabled: boolean` flattens TLS state | `contracts/mcp-api.md` Project.tlsEnabled is a boolean. But TLS has a state machine: not-yet-configured / cert-issuing / cert-issued / cert-expiring / cert-expired / cert-failed / renewal-pending. The spec edge case mentions cert renewal under Let's Encrypt rate-limit. An MCP client reading `tlsEnabled: false` can't distinguish "user disabled TLS" from "cert renewal failed". Diagnosing the TLS state via MCP becomes impossible | Replace `tlsEnabled: boolean` with `tlsStatus: enum["disabled", "issuing", "active", "expiring", "expired", "failed", "renewal-pending"]` and optional `tlsLastError: string`. Diagnostics-friendly, no loss of semantics |
| F15 | MEDIUM | Server.id contract format vs nanoid — see F1, but specifically | Server resource has `id: {type: "string", format: "uuid"}`. Spec mentions server registration via SSH. UUID format constraint will block server-add operations unless they coincidentally generate UUIDs. Subset of F1 but specifically affects server provisioning, which is in P1 critical path | Covered by F1 fix |
| F16 | MEDIUM | `restartCount` in inspect_deployment isn't sourced anywhere | `contracts/mcp-api.md` `undevops_inspect_deployment` returns `health.restartCount: integer`, `health.lastRestartAt: ISO timestamp`. No FR or task models container restart tracking. Where does this data come from? Docker stats? Polling? Event-driven? Without modeling, the field is a lie — it'll always return 0 or null | Either: add a task to poll `docker stats` / events for restart count and store in deployment table; OR remove `restartCount` from the contract until backed by actual data. Bonus: this is a useful signal for crash-loop detection, worth implementing |
| F17 | LOW | SDK manifest pattern excludes valid semver ranges | `contracts/plugin-sdk.md` manifest schema: `"sdkVersion": {"pattern": "^\\^\\d+\\.\\d+\\.\\d+$"}`. Only caret syntax allowed. Excludes `~0.1.0` (tilde — patch-only compat), `>=0.1.0 <0.3.0` (explicit ranges), exact `=0.1.0`. May be intentional simplicity but limits flexibility for tighter compat constraints | Either keep the constraint (simplification is OK) and document why; or relax to full semver range syntax (`pattern` matching the npm semver grammar). Low priority — caret is the most common case |
| F18 | LOW | Rate-limit headers documented but enforcement task is vague | `contracts/mcp-api.md` §Rate Limiting specifies clear limits per scope (`read 120/min burst 30`, `write 30/min burst 10`, `exec 10/min burst 5`) and response headers (`x-ratelimit-limit/remaining/reset`). `tasks.md` T066: *"Implement rate limiting per MCP token via Redis sliding window per contracts/mcp-api.md §Rate Limiting"*. Pointer is correct but task doesn't enumerate the values. Risk: implementer hardcodes different values | Add the table to T066 description directly (or reference the section line number). Small risk, easy fix |
| F19 | LOW | SSE 5-min idle close + revocation interaction | `contracts/mcp-api.md` SSE: "Connection timeout: 5 minutes of inactivity → server closes." Combined with Antigravity F3 (revoke doesn't kill streams) and my v3-F14 — the only safety net for a revoked-but-active SSE stream is the 5-min idle close. If the agent keeps the stream busy (any data flowing), it survives revocation indefinitely | Hard upper bound: max session duration regardless of activity (suggest 24h). Plus revocation-bus per my v3-R3. Belt and suspenders |

## STRIDE Threat Model (per asset)

v3 noted absence of threat model (v3-F21) without doing one. Here's the exercise.

### Asset 1 — Secrets (env vars, MCP tokens, backup keys, encryption key)

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S**poofing | MCP token theft → impersonate admin → read any secret if admin-scope token | Token shown once; SHA-256 stored | No detection on anomalous token usage (e.g. token used from new IP, sudden burst) |
| **T**ampering | DB write access → secret values modified or replaced | AES-256-GCM at rest | No application-level integrity check on secret read (could detect DB-level tampering) |
| **R**epudiation | Admin reads then denies | Audit log captures reads | Audit log not tamper-evident (v3-F5) |
| **I**nfo disclosure | Pattern redaction broken (Antigravity F1); plugin with `env:read` exfiltrates (F8 above); AI reviewer payload not redacted (v3-R1); logs contain secrets (v3 carryover) | Some redaction at MCP boundary | At least 4 active leak vectors |
| **D**oS | Forced secret rotation cascades restart deployments | None specified | Rotation is unbounded — admin can break production with rapid rotation |
| **E**oP | Plugin `env:read` → full secret access in pre-deploy payload | Permission grant model | Single grant = unlimited access; no per-secret approval |

### Asset 2 — Audit Log

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Plugin forges audit event with `actorType: plugin, actorId: <admin-impersonation>` | Plugin recorded as actor for its own actions | Plugin could write arbitrary events via `audit:read` + sql-injection path or via direct API misuse |
| **T** | Direct DB UPDATE/DELETE on audit_log | None — normal Postgres table | v3-F5: no tamper-evidence, no append-only grant |
| **R** | Mutable rows enable repudiation | None | Critical for the compliance pitch |
| **I** | `audit:read` permission gives plugins full trail access | Permission gate | A malicious plugin sees who deployed what when — useful for targeted attacks |
| **D** | Unbounded growth at scale envelope (v3-F10) | None | 30-day retention spec commitment unbacked |
| **E** | Forged events → cover tracks of higher-privilege actor | None | Tamper-evidence required |

### Asset 3 — Deployment Pipeline

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Forged git webhook → deploy attacker-controlled code | None specified in FRs | **NEW gap**: webhook signature verification not in any FR or task. Inheriting Dokploy's behavior but spec doesn't require it |
| **T** | Plugin in `pre-deploy` mutates `envOverrides` (per `contracts/plugin-sdk.md`) — env-injection | Permission gate | A plugin with `pre-deploy` hook + `env:write` can inject malicious values into production deploys |
| **R** | Deploy initiated by agent + auto-approval policy → attribution unclear | `initiatingActorId` field | Auto-approval policy itself is unspecified (v3-F5 / spec FR-021) |
| **I** | Deploy logs contain env values (after redaction) | Pattern redaction (Antigravity broke this) | Same redaction gaps |
| **D** | Agent floods deploy requests; queue collapse "to latest commit" hides intent (v3-F22) | Per-MCP-client rate limit | Rate limit applies per-token; one attacker can use multiple tokens |
| **E** | MCP `exec` scope → `undevops_scale(replicas=0)` stops all production | Permission gate | No double-confirm or business-hours guard for destructive ops |

### Asset 4 — Control Plane (the undevops instance itself)

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Admin password compromise → full control | better-auth password hashing | **No 2FA mentioned anywhere**. Single password = single factor for the most-privileged account |
| **T** | Session token tampering | better-auth signs sessions | OK |
| **R** | Admin denies action they took | Audit log | Not tamper-evident |
| **I** | Web UI session cookies — missing security flags | None specified | **No FR/task for Secure/HttpOnly/SameSite cookie flags, CSRF protection, CSP headers** |
| **D** | Auth brute-force | None specified | **No rate limit on /login**. Antigravity didn't catch this |
| **E** | MCP admin-scope token = control-plane root | Permission gate | One compromised token = total takeover. No segregation of duties |

### Asset 5 — Connected Servers (the boxes where deployed apps run)

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Server identity spoofed (DNS hijack between undevops and server) | SSH host-key verification | Spec doesn't require strict host-key checking (TOFU vs known-hosts) |
| **T** | SSH command injection from compromised undevops → root on every server | None specified | **undevops runs SSH-as-root on managed servers; one compromised undevops = root on all of them.** No mention of jump-host, restricted SSH user, sudo-with-allowlist |
| **R** | undevops actions on remote server recorded only locally | local audit log | No remote audit forwarding |
| **I** | Container output (Docker logs) flows via MCP back to clients — secret leak surface (v3-F4) | Pattern redaction | Broken |
| **D** | Deploy storm to one server causes resource exhaustion | None specified | No per-server deploy throttle |
| **E** | undevops compromise → root-via-SSH on every connected server | SSH key material at rest in undevops | **Spec doesn't require SSH keys be wrapped with the encryption key; they're presumably in DB plaintext** |

### Asset 6 — MCP Gateway

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Bearer token replay | SHA-256 stored, comparison | OK if TLS is enforced; v3-F6 says it isn't explicit |
| **T** | Request body modification (MITM) | Implicit TLS | Not mandated (v3-F6) |
| **R** | MCP requests audited; revoked tokens still flow data via active SSE (Antigravity F3 / v3-R3 / F19 above) | Middleware audit | Revocation gap |
| **I** | Resources leak through schema validation gaps; UUID/nanoid mismatch (F1) means some clients reject → fall back to less safe deserialization | Schema validation in clients (variable) | F1, F2 produce protocol violations |
| **D** | Per-token rate limit + 100 concurrent SSE streams = how does limit apply? Per-stream or per-token across all streams? `contracts/mcp-api.md` doesn't specify | Sliding window | Concurrent connection limit not stated |
| **E** | Exec scope can scale to 0 → destructive | Permission gate | No confirmation/cooldown for destructive ops |

### Asset 7 — Plugin Code (the modules loaded into the controller)

| STRIDE | Vector | Existing mitigation | Gap |
|--------|--------|---------------------|-----|
| **S** | Plugin published as `slack-notify` by attacker; admin installs by name | None | **No code signing, no checksum verification, no provenance check** |
| **T** | Plugin binary tampered on disk between install and load | None | No integrity check at load |
| **R** | Plugin actions audited as `actorType: plugin, actorId: <name>` | Audit middleware | OK if audit log is tamper-evident (it isn't, v3-F5) |
| **I** | Plugin reads `process.env.UNDEVOPS_ENCRYPTION_KEY`, DB connection string, file system (Antigravity F2) | "Permission system" (cosmetic) | Full Node.js runtime access |
| **D** | Plugin OOMs, infinite-loops the controller | Per-hook timeout 5s | No memory limit, no CPU quota |
| **E** | Plugin = full Node.js runtime = full controller access (Antigravity F2) | Permission system labels | Permissions are advisory inside the process; sandboxing absent |

### Top threat-model recommendations (in priority order)

1. **Fix Antigravity F1 (value-based redaction)** and **F8 (plugin `env:read`)** together — same root cause, two visible vectors
2. **Audit log tamper-evidence** (v3-F5) — table-level grants + optional hash chain
3. **Webhook signature verification** for git providers (NEW gap, not in any review yet)
4. **2FA for admin accounts** (NEW gap, not in any review yet)
5. **HTTP security headers + cookie flags + CSRF + rate-limit /login** for the web UI (NEW gap)
6. **SSH key handling**: wrap SSH private keys with the encryption key in DB; restrict SSH user on managed servers to a non-root account with sudo-allowlist for required ops (NEW gap)
7. **Plugin signing / checksum verification at install** — protects against supply-chain attacks (NEW gap)
8. **MCP `exec` confirmation** for destructive operations (scale-to-0, mass-rollback) (NEW gap)

## v3 Findings — Status After Contracts Pass

All v3 findings remain valid except where superseded:

| v3 ID | Status | Note |
|-------|--------|------|
| v3-F1 (MCP scope enum 3-way) | **Still CRITICAL** | Contracts read confirms it — `contracts/mcp-api.md` uses verb:resource permission vocabulary (12 values) while spec/data-model/quickstart use simpler 3-way enum. **Fourth model** (plugin-permission vocab in contracts) — even more divergent than I thought |
| v3-F2 (Migration 004 broken refs) | **Still CRITICAL** | No change in tasks |
| v3-R1 (pattern redaction) | **Still CRITICAL** | `contracts/mcp-api.md` §Secret Redaction explicitly documents the pattern-based approach. Now backed by contract, even harder to fix without contract revision |
| v3-F3 (frozen Dokploy fork) | Still HIGH | |
| v3-F4 (FR-020 vs agentActionType) | Still HIGH | `contracts/mcp-api.md` tools advertise `deploy/rollback/scale` only — matches FR-020, not data-model. So contract agrees with spec; data-model is the outlier. Recommend trimming `agentActionType` enum |
| v3-F5 (audit-log tamper-evidence) | Still HIGH | |
| v3-F6 (MCP TLS) | Still HIGH | |
| v3-F7 (core/ai-pack continuous enforcement) | Still HIGH | |
| v3-F8 (restore stops apps) | Still HIGH | |
| v3-F9 (pending-action cleanup worker) | Still HIGH | |
| v3-F10 (audit retention) | Still HIGH | |
| v3-F11 (plugin permission taxonomy) | **Downgraded MEDIUM** — F11 in this v4 supersedes; enum exists in contracts but isn't synced to data-model/tasks | |
| v3-F12 to F22 | All Still valid | No content changed |

## VERDICT

```yaml
verdict: CRITICAL
reviewer: claude
reviewed_at: 2026-05-26T07:30:00Z
commit: d1f178d18
critical_count: 2
high_count: 8
medium_count: 6
low_count: 3
notes: |
  Counts are NEW findings only (introduced in this v4 pass).
  v3 findings remain valid and add to the overall debt:
  v3 critical: 3 (carried).
  v3 high: 8 (carried).
  v3 medium: 8 (carried, minus F11 downgraded by v4).
  v3 low: 4 (carried).
  Combined picture: 5 CRITICAL, 16 HIGH, 14 MEDIUM, 7 LOW across v3 + v4.
```

**Verdict rationale**: Two new CRITICALs. F1 (UUID-vs-nanoid contract violation) breaks the entire MCP protocol surface on day 1 for any strict-validating client — this is not "we'll get to it", it's "the MCP gateway returns invalid responses". F2 (three-way actorType enum drift on the audit boundary) silently miscategorizes audit events and breaks the gate's actor attribution. Plus the threat model surfaced ~8 NEW attack vectors not in any prior review (webhook signature verification, 2FA, web UI security headers/CSRF, SSH key handling, plugin code signing, MCP exec confirmation).

**Gate status**: STILL FAILING. Three independent reviewer files, zero PASS verdicts:
- `analyze.md` = HIGH
- `antigravity.md` = CRITICAL
- `claude.md` v4 = CRITICAL

For `/speckit.implement` to proceed: either fix the criticals + re-review for ≥2 PASS, or `--override-gate "<reason>"` with logged justification.

**Suggested resolution sequence** (priority order):
1. **F1 + F2 + v3-F1** — three contradicting enums across artifacts. Single editing session can fix all three (decide canonical model, update spec/data-model/contracts/quickstart/tasks together)
2. **v3-F2** — Migration 004 follow-up secret-row population task
3. **v3-R1 (pattern → value redaction)** + **F8 (plugin env:read)** — same root cause, fix together
4. **Threat model recommendations 1-3** — audit tamper-evidence, webhook verification, 2FA
5. Loop back through HIGH findings
6. Re-run reviewers from at least one other AI tool

The artifacts are high-quality work. The findings concentrate at the boundaries (contract/data-model, plugin/host, spec/contracts) — natural places for drift in any multi-author multi-document spec. Reconciling those boundaries unblocks a lot of HIGH severity at once.
