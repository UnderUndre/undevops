# SpecKit Review: 001-init (undevops) — Mechanical Audit + Attack Chains (v5)

**Reviewer**: claude
**Reviewed at**: 2026-05-27T08:00:00Z
**Commit**: adb86e71f (HEAD; no source changes since v4)
**Artifacts reviewed**: same set as v4 (no content change), with this pass focused on three angles not exercised before: dependency-graph mechanical correctness, schema-and-query realism at scale envelope, concrete multi-step attack chains
**Supersedes file**: `claude.md` v4 (preserved at `review/001-init/v4`). v3 still at `review/001-init/v3`. All prior findings remain valid.

## Honest framing first

**Source content has not changed since v4.** This is the fourth review pass I'm doing on essentially the same artifact set. Diminishing returns are real — most of the structural and security findings are already on the table. At this point the recommendation is to **fix the existing CRITICALs** (the three-way scope/actorType enum drift, the broken Migration 004 ref, the pattern-based redaction) before commissioning more reviews. More reviews on unchanged content risks either rehashing or manufacturing findings.

That said, three angles weren't exercised in v3 or v4 and could yield genuine new findings:

1. **Mechanical audit of `tasks.md` dependency graph** — 136 tasks, ~150 dependency edges. v3 noted file-collision risk in passing; this pass walks the graph node-by-node looking for cycles, orphans, miscalculated critical path, and concrete file ownership conflicts
2. **Schema & query realism** at the documented scale envelope — given 50 servers × 500 projects × 30-day retention, do the proposed indexes actually serve the SLO of MCP p95 < 500ms? Back-of-envelope per query
3. **Concrete multi-step attack chains** — v4's STRIDE exercise listed vectors; this pass writes them out as named, ordered kill chains. "Attacker does X then Y then Z and gets W" is harder to dismiss than "DREAD score 7"

If these surface nothing genuinely new, the verdict will reflect that. No padding.

---

## Angle 1 — `tasks.md` Dependency Graph Audit

I walked the 150-odd dependency edges from §Dependencies and §Dependency Visualization. Findings:

| ID | Severity | Finding | Recommendation |
|----|----------|---------|----------------|
| F1 | HIGH | **Critical path calculation is wrong (under-estimates by ~30%)** | The claimed critical path is *"T001 → T002 → T007 → T008 → T014 → T015 → T021 → T036 → T055 → T056 → T136"* (11 nodes). Several issues: (a) T036 depends on `T021 + T031` per the deps; the path includes T021 but not T031's chain, which runs in parallel via lane 4 — if lane 4 is slower than lane 3, T036 actually waits on T031, extending the critical path; (b) T056 fans in `T039+T040+T043+T044+T045+T046+T046a+T055` — the longest of THOSE chains is the actual blocker. T043 alone is `T001→T002→T007→T009→T027→T033→T039→T040→T043` = 9 hops, plus T056+T136 = **11 hops by T043's tributary alone**. (c) T136 fans in `T056+T070+T130`. T130 = `T125 + T126`; T125 = T124; T124 = T019; etc. T130's full chain is `T001→T002→T007→T008→T014→T015→T019→T124→T125 + T045's chain → T126 → T130` = 11+ hops. **Real critical path is at least 13 hops, possibly 15.** | Recompute critical path properly. Worth doing because (a) it sets stakeholder expectations on timeline; (b) lane-time-budgeting depends on it; (c) Phase 9 verification can't start until many parallel branches converge — that convergence date is what matters |
| F2 | HIGH | **File ownership not declared — concrete cross-lane file collisions identified** | Walking the lane×task matrix against likely file paths: (i) **`packages/server/src/db/schema.ts`** — T014, T015, T016, T017, T018, T019, T020, T021, T022, T023 all add tables/columns to this **single file**. Lane 3 [DB] runs them serially per the lane decl, so OK *if lane discipline holds*. But if a parallel agent in lane 3 fans out (per the dispatch plan §"orchestrator completes Setup phase directly... → dispatch parallel agents"), they collide. (ii) **`packages/core/src/index.ts`** — T027, T028, T029, T030, T031, T032 each extract a module that has to be re-exported. Six tasks modifying the same exports file. If parallelized within lane 4, conflict. (iii) **`apps/web/src/components/`** — Lane 7 [FE] [US1] (T047-T052) adds 6 components; Lane 11 [FE] [US2] (T067-T068) adds 2 more; Lane 14 [FE] [US3] (T082) adds plugin UI; Lane 17 [FE] [US5] (T109-T110) adds AI reviewer UI; Lane 18 [FE] [US6] (T120) adds cluster topology. **Five different lanes write to the same components directory** with no ownership rules. Even if individual files don't conflict, shared barrel files (`index.ts`, `route mapping`) almost certainly do. (iv) **`apps/mcp-server/src/resources/`** — T059-T064 share a directory; likely fine since each is a separate resource file but the resource registry will be a shared file | Add a "Files" column to every task in `tasks.md` listing the specific file paths the task is expected to touch. Then add a pre-merge rule: two tasks claiming the same file must serialize. The dependency graph guarantees order, not file isolation; declaring isolation explicitly is the only safe way to actually parallelize 22 lanes |
| F3 | MEDIUM | **Redundant edges hide intent** | Several places declare a dependency twice in the deps list. Examples: T020 depends on T014 (via the fan-out `T014 → T015...T020`) AND on `T015 + T019 → T020`. T018 depends on T014 AND on T017. T024 depends on T015 AND on the full fan-in `T015+T016+...+T023 → T024`. These are not contradictions, but the redundancy makes it hard to see which dependency is the *intended* logical constraint. Reviewers can't tell if "T014 → T020" was added by accident (because all DB tasks were listed together) or by intent (something specific in T020 needs T014 directly) | Prune redundant edges. Keep only the dependency that expresses logical intent. E.g. if T020 only needs T015+T019, drop the implicit T014→T020. Easier to maintain, easier to reason about |
| F4 | MEDIUM | **T046a was added late, not integrated cleanly** | T046a was added per analyze.md I3 finding (startup reconciliation). It appears in T056's fan-in (`T039+T040+T043+T044+T045+T046+T046a+T055 → T056`) and in lane 6's task list. But its **own dependency is not declared** in §Dependencies. Looking at the lane: lane 6 lists T046a alongside T046, both depending on T030 (secret extraction). But T046a is startup reconciliation — it needs DB schema (T014+T015+ etc) to compare against, plus the deploy module (T039+T043). So its real deps include T039, T043, T014. None declared. If an agent picks up T046a after T030 completes (per lane decl), it will fail because deploy module isn't ready | Declare T046a's full dependencies: T030 + T039 + T043 + T014. Or move T046a to a later phase where its dependencies are guaranteed |
| F5 | MEDIUM | **No cycles found — confirmed clean** | Walked the graph mentally via topological sort. Every node reachable. No backward edges. The §Self-Validation Checklist's "No circular dependencies" claim holds. **PASS on this dimension** | No action |
| F6 | LOW | **Lane 7 spans non-adjacent dependency clusters** | Lane 7 [FE] [US1] UI groups T047 through T052. Their dependencies are: T047(T003), T048(T022), T049(T019), T050(T043), T051(T042), T052(T006). The deps span DB tasks (T019, T022), setup (T003, T006), and core BE (T042, T043). So within "lane 7" tasks have wildly different ready-times. T047 can start very early; T050 can't start until lane 6 is well underway. Treating them as one lane is misleading for execution planning | Split lane 7 into early-FE (T047, T051, T052 — can start after T007) and late-FE (T048, T049, T050 — blocked on DB+BE). Helps schedulers and human readers understand actual parallelism |
| F7 | LOW | **Self-Validation Checklist incomplete** | `tasks.md` §Self-Validation Checklist asserts five things including "Every task ID in Dependencies exists in the task list above" and "No orphan task IDs referenced that don't exist". I verified both — they hold. **But** the checklist doesn't assert "every defined task is referenced somewhere" (the reverse direction). T008a is defined but I had to grep to find it referenced in T056 (it is). Worth adding for completeness | Add to checklist: "Every defined task ID appears either as a leaf (no successors) or as a predecessor of another task" |

**Angle 1 summary**: Critical path is mis-calculated, file ownership is undeclared but contains real collisions across FE lanes, T046a is poorly integrated, several redundant edges. **2 HIGH, 3 MEDIUM, 2 LOW.** Cycles check PASSED — clean DAG.

---

## Angle 2 — Schema & Query Realism at Scale Envelope

Scale envelope per spec: 50 servers, 500 projects, 30 replicas/deployment, 30-day audit/log retention. Back-of-envelope at upper bound.

### Workload estimates

Audit event volume:
- 500 projects × ~5 deploys/day median × ~5 audit events/deploy = ~12,500 deploy-related events/day
- MCP requests: assume 10 active MCP clients × 100 req/hour × 24h = 24,000 MCP requests/day → each is an audit event = 24,000 events/day
- Server health pings: 50 servers × ping every 30s = 144,000 events/day (if each ping is audited) — probably batched but still high
- **Realistic estimate: 50K-200K audit events/day**
- At 30-day retention: **1.5M to 6M rows in `audit_log`**
- Each row ~500 bytes (timestamp + actor + action + target + payload jsonb) → 750 MB to 3 GB just for audit

Deployment log volume:
- Each deployment generates ~5 MB of logs on average (build + runtime)
- 12,500 deploys/day × 5 MB = ~60 GB/day of log data
- Where is this stored? Spec says `deployment.logPath text` — pointing to filesystem
- 30 days × 60 GB = **1.8 TB of deployment logs**
- Not in Postgres (good — wouldn't fit), but on the filesystem of the controller host. **Spec doesn't address log rotation / archival from the controller filesystem**. The host runs out of disk in week 3 unless someone manually rotates

### Findings

| ID | Severity | Finding | Recommendation |
|----|----------|---------|----------------|
| F8 | HIGH | **`audit_log` lacks composite index for common query pattern** | The MCP resource `undevops://audit` takes filters `actor_type`, `actor_id`, `action`, `target_resource`, plus `since` / `until` (time range), with pagination. The schema declares: `auditLog_actorType_idx ON (actor_type)`, `auditLog_actorId_idx ON (actor_id)`, `auditLog_createdAt_idx ON (created_at)`. All **single-column**. The common query "events by actor X in last 7 days" needs to find rows matching (actor_id = X AND created_at > now() - 7d). Postgres will pick one index (probably actor_id), then filter remainder. At 6M rows with say 10K events per active actor, that's 10K rows to filter to 70-700 in the window — fast enough at <500ms but only just. **At higher actor concentration (the system actor logs heavily), this degrades non-linearly** | Add composite indexes for the actual query patterns from `contracts/mcp-api.md` §Audit: `(actor_id, created_at DESC)`, `(action, created_at DESC)`, `(target_resource, created_at DESC)`. These are pure-additive — no schema risk |
| F9 | HIGH | **No log rotation strategy for `deployment.logPath`** | `data-model.md` `deployment.logPath text` — a filesystem path to the deployment's log file. At 60 GB/day of new log data (back-of-envelope above), the controller host fills disk within 2-3 weeks. **No FR, no task implements rotation.** Spec's 30-day commitment in SC-012 ("scale envelope populated to capacity") is unbacked. When disk fills, `pg_dump` fails (backup breaks), Postgres write degrades, new deployments fail | Add to Phase 9: BullMQ scheduled job that compresses (`gzip`) and uploads deployment logs to S3 after the deployment finishes; deletes local file after upload + 24h grace; sets `deployment.logUri` to the S3 path. Update `undevops://deployments/{id}/logs` to fetch from S3 if local file missing. Add SC: at scale envelope sustained for 30 days, controller disk usage stays under 50 GB |
| F10 | MEDIUM | **`mcp_clients.requestCount` increment on hot path causes hot-row lock** | I raised this in v4-F19 generically. Specific cost at scale: assume one MCP token doing 100 req/min = 1.67 req/s. Each req does `UPDATE mcp_clients SET requestCount = requestCount + 1, lastUsedAt = NOW() WHERE id = X`. Postgres holds row-lock per UPDATE. Concurrent requests for same token serialize on this lock → effective single-threaded auth path per token. **At burst (allowed up to 30 req/s per the rate limit on read scope), 30 requests serialize through the lock** — added latency 30 × commit-time ≈ 30 × 2ms = 60ms before any business logic runs. Combined with logical request work, SC-002 (p95 < 500ms) is at risk under burst | Move counter to Redis: `INCR mcp:token:<hash>:count` (atomic, no row lock). Flush to Postgres every minute via a scheduled job. `lastUsedAt` similarly — write to Redis on every request, persist on minute boundary. The MCP auth path becomes Postgres-write-free (only reads to validate token + revocation) |
| F11 | MEDIUM | **`pg_dump` backup at scale takes long enough to violate snapshot consistency** | T124: `pg_dump → encrypt → S3`. At 6M audit rows + project/deployment/etc tables, the dump takes ~30-60 seconds on commodity hardware. During this window, concurrent writes happen. Without `--single-transaction` (raised in v3-F12 still open), the dump captures inconsistent state. Worse: if a deploy completes mid-dump and writes audit events to the now-completed audit table portion, those events are lost from the backup. Restore from such a backup produces a database where deployment X exists but its audit trail is incomplete | T124 fix: use `pg_dump --single-transaction --format=custom` (one-line change, atomic snapshot, parallel-restorable). Already raised — escalating because of the scale-sized impact |
| F12 | MEDIUM | **No connection pool sizing specified across 5 apps** | The plan declares 5 apps (web, api, mcp-server, cli, scheduler) all sharing one Postgres. Each app needs a connection pool. With Node.js default `pg` pool of 10 connections per app instance × 5 apps = 50 baseline connections. Plus the CLI ad-hoc (no pool but on-demand). Postgres default `max_connections = 100` is half-consumed before any client traffic. Burst (e.g., 50 servers each posting health = 50 concurrent inbound) can exhaust the pool, causing auth-middleware (which needs a DB roundtrip per MCP request) to queue → SC-002 violation | Specify pool sizes per app + Postgres `max_connections` baseline. Add PgBouncer or similar transaction-pooled proxy for the high-traffic paths (MCP server). Document the connection budget. **Plan doesn't address this**; at scale envelope it bites |
| F13 | LOW | **`secrets.encryptedValue text` without size constraint** | `data-model.md` defines secret value column as `text`. Postgres tolerates large text but the secret store will commonly contain things like database connection strings, JWT signing keys, certificate bodies. A misuse where someone stuffs a 50 MB blob as a "secret" would fit but isn't intended. Lack of explicit size constraint invites accidental abuse | Add `CHECK (length(encryptedValue) < 16384)` — 16KB is plenty for any real secret (a 4096-bit RSA key in PEM is ~3.5KB). Reject misuse early |
| F14 | LOW | **`AuditEvent.metadata jsonb` is unbounded** | Same concern: free-form jsonb on every audit event with no size constraint. A malicious or buggy plugin writing huge metadata blobs can balloon `audit_log` to 100+ GB rapidly | Add a `CHECK` on `octet_length(metadata::text)` — suggest 16KB max per event |

**Angle 2 summary**: Two HIGH (composite index missing, deployment log rotation strategy missing), three MEDIUM, two LOW. None of these are show-stoppers individually but together they undermine the SC-012 scale-envelope commitment.

---

## Angle 3 — Concrete Attack Chains

v4 listed STRIDE vectors. These are the same risks expressed as named, ordered kill chains an actual attacker would execute. Concrete > abstract.

### Attack A — "Plugin Supply-Chain Exfiltration"

**Goal**: Exfiltrate every secret from a target undevops installation.

**Pre-requisites**: Public availability of the undevops platform; willingness to publish a plugin.

**Steps**:
1. Attacker creates a useful-sounding plugin `deploy-notify-pro` — claims to send richer Slack notifications than the existing reference `deploy-notify` plugin
2. Manifest declares modest permissions: `["deploy:read", "project:read", "logs:read"]`. Manifest also declares `pre-deploy` hook (totally normal for a notification plugin — fires before deploy starts so admin sees deploy intent quickly)
3. Publishes plugin to npm or GitHub release. Promotes it on community channels
4. Target admin sees plugin, reads manifest, permissions look reasonable — these are the same permissions the reference plugin uses. Admin clicks "Approve" in undevops UI
5. Plugin loads. On next deploy, `pre-deploy` hook fires. Plugin code runs **inside the undevops Node.js controller process** (Antigravity F2)
6. Plugin executes: `const secret = process.env.UNDEVOPS_ENCRYPTION_KEY`. Reads it directly from process memory — no permission check applies (Antigravity F2's diagnosis: the permission system is cosmetic at the runtime level)
7. Plugin reads DB connection string from `process.env.DATABASE_URL`, opens a Postgres connection bypassing the `PluginApiClient`
8. Plugin SELECTs from `secrets` table, decrypts using the encryption key it stole in step 6
9. Plugin POSTs all decrypted secrets to attacker.com. Node.js fetch is unrestricted by undevops — no outbound network filter
10. Plugin's hook returns `{}` (success) so deployment proceeds normally
11. Audit log records: `actor: plugin "deploy-notify-pro", action: pre_deploy_hook, target: project X` — looks routine, deploy succeeded, no alert

**Detection difficulty**: HIGH — unless an admin watches outbound network traffic from the controller host, this is invisible.

**Fix paths** (in order of effectiveness):
1. Move plugins to Worker threads or child processes with explicit IPC + capability tokens (real sandboxing — addresses Antigravity F2 properly)
2. OR: outbound network allowlist for the controller process (declarative — only specific destinations permitted from undevops)
3. OR: documentation that "plugins have root access; treat them like any other code you run on the controller" + deprecation of the cosmetic permission system

### Attack B — "Webhook Spoof Deploy"

**Goal**: Deploy attacker-controlled code into a target project.

**Pre-requisites**: Knowledge of the target project's webhook URL (these are sometimes leaked in CI logs, public repos, support tickets).

**Steps**:
1. Attacker discovers `https://undevops.target.com/api/webhooks/<projectId>/github` from a publicly leaked source
2. Attacker crafts a fake GitHub webhook POST payload — JSON in the shape GitHub sends, pointing `head_commit.id` to a commit on attacker's fork of the repo
3. POSTs to the webhook URL
4. **No FR in spec or task in tasks.md mandates GitHub webhook signature verification** (my v4 threat model surfaced this gap)
5. Inheriting from Dokploy: probably does signature verification, but the spec doesn't require it. If undevops accidentally drops or breaks this during the rebrand work in Phase 1 — silent regression
6. undevops receives the webhook, treats it as legitimate, queues a deploy for `head_commit.id` (the attacker's commit, not the project owner's)
7. Build pipeline fetches the attacker's commit, builds it, deploys it
8. Production app is now running attacker code
9. Audit log records: `actor: webhook, action: deploy, target: project X` — looks routine

**Fix paths**:
1. Add an FR: "webhook endpoints MUST verify HMAC signature for GitHub/GitLab/Bitbucket using the provider's per-repo secret"
2. Add a task to Phase 3 (US1): "Implement webhook signature verification in `apps/api/src/routes/webhooks/`; reject any webhook with missing or invalid signature"
3. Add an SC: an unsigned/invalid-signature webhook POST returns 401 and produces no deployment

### Attack C — "Token Leak via Support Log"

**Goal**: Obtain a long-lived admin MCP token.

**Pre-requisites**: Patience and OSINT.

**Steps**:
1. Attacker scrapes GitHub Issues across the undevops repo and consumer repos that mention undevops in their issues
2. Looks for log excerpts containing `Bearer undevops_mcp_*` patterns
3. Inevitably finds at least one — admins do paste logs into issues when troubleshooting MCP integration
4. The token is long-lived (per spec clarification Q3: no auto-expiry) with whatever scope the admin originally created
5. Attacker uses the token immediately. No anomaly detection (NEW gap — v4 threat model)
6. If the token has `admin` scope (or `deploy` scope with a target the admin cares about), attacker can deploy code, exfiltrate secrets via MCP read of logs that contain accidentally-logged secrets (the same broken redaction Antigravity F1)
7. Admin doesn't notice until they look at audit log

**Why this is real**: bearer tokens always leak eventually. The defense-in-depth gap is the absence of anomaly detection (new IP, time-of-day shift, sudden burst) and the absence of auto-rotation policy.

**Fix paths**:
1. Add token "fingerprinting": record IP and user-agent of first use; alert admin on new-IP use
2. Add optional token expiry: admin can set a TTL on token creation (default never, but enabled is one click)
3. Redact bearer tokens from undevops's own application logs (different from deployed-app log redaction — this is about the controller's own logs)

### Attack D — "Instant Production Outage via MCP Exec"

**Goal**: Take production offline immediately.

**Pre-requisites**: Compromised MCP token with `exec` scope (via Attack C or other means).

**Steps**:
1. Attacker has the token
2. Single MCP call: `undevops_scale({projectId: <production>, replicas: 0})`
3. Per contract, this transitions immediately: `status: scaling → completed`, replicas drop to 0
4. **No confirmation required, no cooldown, no "are you sure"** — exec scope is unitary, single-action grant (NEW gap from v4 threat model)
5. Production app stops serving traffic
6. Recovery: admin must notice (alerting may or may not be configured), then issue counter-scale call
7. Mean time to detect + recover: variable, probably 5-30 minutes for a small team

**Fix paths**:
1. Destructive MCP operations (`scale` to 0, mass `rollback`, `deploy` to production environment) require a second confirmation: agent issues the call, server returns a "pending confirmation" token, agent must call `undevops_confirm(token)` within 60s to execute
2. OR: admin can configure "guard rails" per environment — production can't go to 0 replicas via MCP, ever; manual UI action only
3. OR: business-hours guard — destructive ops outside admin-defined hours require human confirmation

### Attack E — "Audit-Log Tampering for Cover"

**Goal**: After committing some other attack, erase evidence.

**Pre-requisites**: Either DB write access (achieved via Attack A's secret exfiltration → DB connection string) or admin compromise.

**Steps**:
1. Attacker has DB write access
2. Direct SQL: `DELETE FROM audit_log WHERE actor_id = '<malicious-plugin>' AND created_at > '<earlier today>'`
3. Audit history rewritten — investigation will find no trace of the malicious plugin's activity
4. Attacker also DELETEs the row from `plugins` table to make it look like the plugin was never installed
5. Even careful forensics can't recover what was deleted unless Postgres WAL is preserved separately

**Why this is the highest-leverage attack**: it doesn't compromise anything new — it covers the tracks of every other attack. The audit log is the foundation of every investigation. Without tamper-evidence, every other security control is undermined.

**Fix paths** (v3-F5 / my repeated finding):
1. **Database-level grant**: `REVOKE UPDATE, DELETE ON audit_log FROM <application_role>`. Postgres physically rejects the DELETE
2. **Hash chain**: each new audit_log row stores SHA-256 of (previous row's hash + own canonical data). Any deletion/modification breaks the chain. Periodic integrity-scan job verifies. Cheap (~16 bytes per row + one extra column index)
3. **External append-only log shipping**: pipe audit_log INSERT events to an external append-only store (S3 with Object Lock, or a write-only Postgres replica). Defense in depth

### Attack F — "Concurrent Plugin Race for Privilege Escalation"

**Goal**: Plugin A (limited permissions) uses Plugin B (broader permissions) as a confused deputy.

**Pre-requisites**: Both plugins installed on the same controller.

**Steps**:
1. Plugin A has `["deploy:read", "logs:read"]` — modest
2. Plugin B has `["env:write"]` — broad
3. Plugin B exposes a hook handler that, on receiving a specific `metadata` field in the payload, writes an env var
4. Plugin A subscribes to `post-deploy`. In its handler, Plugin A modifies the `metadata` field of the payload it received, then re-emits a synthetic event by triggering its own re-invocation via some side channel
5. Plugin B receives the synthetic event with the attacker-crafted metadata, writes the malicious env var
6. Plugin A successfully wrote an env var without having `env:write` permission

**Whether this works depends on**: whether hook dispatch is read-only on payloads, whether plugins can trigger events, whether plugin-to-plugin signaling is intentional or accidental.

**Spec/contract silence on plugin-to-plugin isolation is the gap.** `contracts/plugin-sdk.md` doesn't address whether plugins can affect each other's invocations. If they share the controller process (Antigravity F2), they share **everything**: memory, file system, network, even side channels via filesystem or environment.

**Fix paths**:
1. Hook payloads are deep-frozen before dispatch — plugins receive read-only references
2. Plugin invocation is initiated only by the controller's deployment/lifecycle code — plugins cannot enqueue events
3. Real sandboxing (back to Antigravity F2's mitigation)

---

## Constructive observations (what's actually good)

v3 and v4 are heavily critical. For balance, the things that are unusually mature for v0.x scope and don't need fixing:

1. **`spec.md` clarification process**: the 5-question clarify pass produced concrete, measurable resolutions instead of hand-waving. The strict-default multi-AI review policy decision (Q4 mirroring Principle VI semantics) is particularly well-considered
2. **`research.md` decision trail**: 10 RQs with explicit resolutions. Reviewers and future contributors can read why decisions were made. This is the kind of documentation most projects skip
3. **`plan.md` Constitution Check section**: structured per-principle assessment with status + rationale. Even where "N/A" or "DEFERRED" it explains why. This is unusual rigor
4. **`tasks.md` agent routing + dependency graph**: 136 tasks with explicit agent assignments, dependency graph, parallel lanes, and self-validation checklist. The graph is **clean (no cycles)** even if file ownership is undeclared
5. **`data-model.md` migration strategy**: ordered, numbered migrations with explicit SQL + comments. The Drizzle pgEnum usage is consistent. Migration 005's `secret_key_unique` constraint is good defensive design
6. **`contracts/plugin-sdk.md` permission enumeration**: actually closed (12 named permissions). My v3-F11 was wrong to say this was open. Now my v4-F11 is the right framing: enum exists, just isn't synced to data-model and tasks
7. **`contracts/mcp-api.md` rate-limit table + retry guidance**: concrete numbers per scope, jitter spec, exponential backoff. Many specs hand-wave rate limits; this one doesn't
8. **`quickstart.md` end-to-end**: install through plugin authoring through backup setup. Most quickstarts stop at "hello world"; this one shows real workflows

These are not findings to address — they're noted because reviewers should distinguish "everything's broken" (false) from "specific things need work" (true). The spec/plan/tasks/contracts are **substantially better than typical v0.x** — the gaps are real but concentrated, not pervasive.

---

## VERDICT

```yaml
verdict: CRITICAL
reviewer: claude
reviewed_at: 2026-05-27T08:00:00Z
commit: adb86e71f
critical_count: 0
high_count: 4
medium_count: 6
low_count: 4
notes: |
  Counts are NEW findings only (introduced in this v5 pass).
  No new CRITICALs found in v5 — this pass adds 4 HIGH (critical-path
  miscalc, file ownership, composite index missing, deployment log
  rotation missing), 6 MEDIUM, 4 LOW. Plus 6 concrete attack chains
  illustrating risks already in v3/v4.

  Verdict remains CRITICAL because v3 + v4 critical findings are
  unchanged in source content:
    v3 critical: 3 (carried)
    v4 critical: 2 (carried)
    v5 critical: 0
    Combined: 5 CRITICAL across this Claude reviewer alone.

  All v3 + v4 findings remain valid.
```

**Verdict rationale**: v5 itself doesn't add CRITICALs because the structural blockers are already on the table. v5's value is in (a) confirming the dependency graph is acyclic + clean (a real PASS dimension), (b) identifying scale-envelope realism gaps (the composite index + log rotation findings are concrete and actionable), and (c) rendering vague threats as named attack chains that are harder to defer.

**Recommended next action — stop reviewing, start fixing**:

1. The fix-priority recommendation hasn't changed since v3:
   - Reconcile the three-way enum drift (v3-F1 + v4-F1 + v4-F2 + v5-F3 mechanical-graph drift) — one editing session
   - Fix Migration 004 secret-row migration task (v3-F2)
   - Value-based redaction + remove plugin `env:read` (v4-R1 + v4-F8)
   - Audit-log tamper-evidence (v3-F5 / Attack E above)
   - Webhook signature verification (v4 threat model + Attack B)

2. Then re-run reviewers — ideally from at least one tool other than Claude. v3+v4+v5 are all from this same Claude session and share blind spots. Codex Desktop or Gemini CLI would add a genuinely new voice.

3. Run `/speckit.analyze` after fixes to verify cross-artifact consistency.

4. Then evaluate the Principle VI gate. If at least 2 external reviewers + analyze return PASS, `/speckit.implement` unblocks.

**If the goal is "find more bugs", I've squeezed substantial value across v3/v4/v5 but the marginal value of v6 on unchanged content is low.** Better signal would come from a different tool's eyes than from more Claude passes.
