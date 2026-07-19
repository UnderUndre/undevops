# Feature Specification: Telegram Control Surface

**Feature Branch**: `002-telegram-control`
**Created**: 2026-07-11
**Status**: Draft
**Input**: User description: "Add Telegram as a fourth control surface alongside the Web UI, MCP gateway, and CLI — enabling two-way deploy actions (approve, rollback, view logs, scale) from within Telegram via a Bot + Mini App, reusing the existing MCP token-scope and approval model."

## Context

undevops already exposes three control surfaces: a Next.js web UI (interactive), an MCP gateway (AI agents), and a CLI (headless). Each routes through the same authorization layer — MCP tokens with `read` / `write` / `exec` scopes × project targeting — and the same human-approval queue for write/exec actions.

Telegram is a high-value **fourth transport**, not a new product:

- undevops already *sends* deploy notifications to Telegram (one-way, inherited from Dokploy). Making it **two-way** collapses the "notification → context-switch to laptop → approve" loop into a single inline-button tap.
- A Mini App gives mobile-first operators a first-class UI without standing up a separate mobile app — reusing the same MCP-scoped token model the platform already enforces.
- Telegram-native presence is a distribution wedge: operators who live in Telegram (a large undevops target segment: solo devs, small teams, ex-USSR/Asia/Eastern Europe self-hosters) get platform awareness inside their daily chat client.

This spec is deliberately **scope-bounded to the transport and its mapping onto existing authorization primitives**. It does not introduce new deploy mechanics, new AI-review semantics, or new data models beyond what 001-init defines. Where this spec touches 001-init capabilities, it references them as `001-init/FR-NNN` rather than redefining them.

## Clarifications

### Session 2026-07-11

- Q: Does the Telegram bot act as an MCP client (speaking MCP to `apps/mcp-server`) or as a direct consumer of the tRPC API? → **Decision: MCP client.** The bot is positioned as "another MCP consumer alongside AI agents." This guarantees the existing token-scope, approval-queue, and secret-redaction boundaries apply unchanged. A direct tRPC consumer would require re-implementing authorization that MCP already enforces (FR-011–FR-022 in 001-init).
- Q: Is the Telegram control surface P1 or lower? → **Decision: P2 overall, with one P1 story (two-way deploy alerts).** Deploy notifications already ship to Telegram (P1 inherited). The *two-way* action is a net-new P2 capability; the Mini App and read-only team access are P3. This keeps the initial-release wave focused on the highest-ROI slice.
- Q: How are Telegram users linked to undevops admin identities? → **Decision: opt-in binding via the web UI.** An admin generates a one-time binding code in the web UI and sends it to the bot (`/bind <code>`). The mapping (Telegram user id ↔ undevops admin id) is stored encrypted. No OAuth, no Telegram Login Widget required for v0.x — simpler, fewer moving parts, and Telegram Login Widget is optional hardening for a later wave.
- Q: Mini App — full Next.js port or a focused subset? → **Decision: focused subset for v0.x.** Deploy list, pending-approvals queue, project health, recent logs. Full project configuration (env vars, volumes, domains) stays in the web UI. Rationale: mobile context rewards glanceable status + approve/rollback; detailed editing rewards a desktop surface.
- Q: TON/Stars payments — in scope? → **Decision: out of scope for this spec.** Monetization is a commercial-layer concern (see undevops README open-core boundary). A future `003-billing` spec would cover it. This spec must build *without* assuming any payment integration.
- Q: Does enabling two-way alerts replace or supplement the inherited one-way Dokploy notification? → **Decision: replace, for bound admins.** When two-way alerts are enabled for a project, a bound admin with scope receives a single actionable alert — the two-way message supersedes the legacy one-way Dokploy ping for that admin. Notification targets that are not bound admins (legacy Dokploy targets) keep receiving the one-way notification unchanged. No bound admin is double-notified for the same deploy event. (See FR-005.)
- Q: Share the Telegram transport with unet/007-telegram-vessel (near-identical bot/Mini App/relay plumbing)? → **Decision: DEFERRED — treated as a separate strategic question.** For v0.x this spec proceeds independently (no shared package). A potential separate "TG-first" project may later absorb the common transport; revisit before extracting shared code across repos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Approve or Roll Back a Deploy From a Telegram Alert (Priority: P1)

As an operator away from my laptop, I receive a deploy-failed or pending-approval notification in Telegram and I can act on it inline — approve, reject, or roll back — without opening the web UI or CLI.

**Why this priority**: Deploy notifications already ship to Telegram (inherited one-way). The "I'm on my phone, prod just broke" moment is the highest-friction point in the existing loop. Making the *reply* path two-way is the single biggest UX win the Telegram surface delivers, and it reuses the already-built MCP write-approval queue (`001-init/FR-020`–`FR-022`).

**Independent Test**: Trigger a deploy that enters the human-approval queue. Confirm the Telegram bot posts an alert with inline buttons. Tap "Approve" → confirm the deploy proceeds. Tap "Roll back" on a completed deploy → confirm rollback executes. Verify the action is audit-logged with admin identity + Telegram provenance.

**Acceptance Scenarios**:

1. **Given** a project with multi-AI pre-deploy review configured (`001-init/FR-023`) and an admin who has bound their Telegram account, **When** a review produces a blocking FAIL verdict and the deploy enters the approval queue, **Then** the bot posts a message to the admin containing: project name, branch, AI verdicts (verdict + reviewer id, secret values redacted), and inline buttons `[Approve] [Reject with reason]`.
2. **Given** a pending-approval message in Telegram, **When** the admin taps **Approve**, **Then** the deploy proceeds within the same window the MCP write gateway would (`001-init/SC-008`), the message is edited to "✅ Approved — deploying…", and an audit-log entry records `{actor: admin, channel: telegram, action: approve, deployId}`.
3. **Given** a completed deploy that failed health checks, **When** the failure notification arrives and the admin taps **Roll back**, **Then** the previous successful deployment is restored and the bot replies with the rollback outcome + a link to the deploy timeline in the web UI.
4. **Given** an approval message older than the per-project approval TTL, **When** the admin taps any inline button, **Then** the bot replies "This action has expired — see <web-url>", and no state change occurs.

---

### User Story 2 — Glanceable Project Health and Recent Logs From Telegram (Priority: P2)

As a team member, I can query project status and tail recent logs from Telegram without being granted write access — useful for on-call triage from a phone.

**Why this priority**: Read access widens the audience beyond the single admin who approves deploys. It turns the Telegram surface from a personal command channel into a shared ops dashboard. P2 because it depends on US1's identity-binding plumbing but adds value once that exists.

**Independent Test**: Bind a team-member Telegram account with a `read`-scoped MCP token. From Telegram, run `/status <project>` and `/logs <project> --tail 20`. Verify output matches what an equivalent MCP `read` call returns, with secrets redacted per `001-init/FR-013`.

**Acceptance Scenarios**:

1. **Given** a bound Telegram user with a `read`-scoped token for project "api", **When** they send `/status api`, **Then** the bot replies with: deploy state, replica count, last deploy time + actor, p95 latency bucket, and any open alerts — all sourced from the same MCP read resources an AI agent would use.
2. **Given** the same user, **When** they send `/logs api --tail 20`, **Then** the bot replies with the last 20 log lines as a monospace block, with every secret value replaced by `***` at the serialization boundary (same redactor as `001-init/FR-013a`).
3. **Given** a bound user whose token has **no** scope on project "billing", **When** they send `/status billing`, **Then** the bot replies "No access to project 'billing'" and no data is returned.
4. **Given** a project with no deploys yet, **When** the user sends `/status <project>`, **Then** the bot replies "No deployments found — see <web-url> to create one."

---

### User Story 3 — Mobile Mini App for the Pending-Approvals Queue (Priority: P2)

As an admin on call, I open the undevops Mini App from the Telegram attachment menu and land directly on my pending-approvals queue with the same approve/reject actions as the web UI.

**Why this priority**: The Mini App is the mobile-native UI for US1's actions when inline buttons aren't enough (e.g. comparing diffs, reading multi-AI verdicts in detail). P2 because inline buttons (US1) cover 80% of the cases; the Mini App is the richer surface for the remaining 20%.

**Independent Test**: Open the Mini App from Telegram on a mobile device. Verify it loads authenticated (via the bound identity), shows the pending-approvals queue, and that approving an item from the Mini App produces the same audit-log entry as approving from inline buttons.

**Acceptance Scenarios**:

1. **Given** a bound admin with pending approvals, **When** they open the Mini App from the Telegram attachment menu, **Then** it loads without a separate login (identity propagated from the Telegram binding) and lands on the pending-approvals queue.
2. **Given** the pending-approvals queue in the Mini App, **When** the admin opens an item, **Then** they see: deploy metadata, diff summary, AI-verdict breakdown (verdict + rationale excerpt, secrets redacted), and `[Approve] [Reject…]` controls equivalent to the web UI.
3. **Given** the admin approves an item in the Mini App, **When** the approval is committed, **Then** the original Telegram alert message (if any) is updated to "✅ Approved via Mini App" and the audit log records `channel: telegram-miniapp`.
4. **Given** the Mini App with no pending approvals, **When** it loads, **Then** it shows an empty state with links to recent deploy history (read-only) rather than a blank screen.

---

### User Story 4 — Bind a Telegram Account to an Admin Identity (Priority: P3)

As an admin, I link my Telegram account to my undevops identity once, so that all subsequent Telegram interactions are authenticated without per-action logins.

**Why this priority**: This is the gating plumbing for US1–US3, but it is listed P3 here because it is a *setup* task, not a value-delivering journey on its own — its acceptance is measured indirectly through US1–US3. It must be implementable, but it does not ship as a headline feature.

**Independent Test**: In the web UI, generate a binding code. Send `/bind <code>` to the bot from Telegram. Verify the web UI reflects the bound account and that subsequent `/status` commands authenticate without re-binding.

**Acceptance Scenarios**:

1. **Given** an authenticated admin in the web UI, **When** they open "Telegram binding" and click "Generate code", **Then** a short-lived (10-minute) one-time code is displayed.
2. **Given** a valid binding code, **When** the admin sends `/bind <code>` to the bot from their Telegram account, **Then** the bot replies "✅ Bound to <admin email>" and the mapping is stored encrypted at rest.
3. **Given** an already-bound Telegram account, **When** the same account sends `/bind` with a different code, **Then** the bot warns "This Telegram account is already bound to <admin email>. Reply `/unbind` to detach first."
4. **Given** an expired or already-consumed code, **When** `/bind <code>` is sent, **Then** the bot replies "Code invalid or expired" and no binding is created.

---

### Edge Cases

- **Telegram user sends a command for a project that doesn't exist**: Bot replies with "Project '<name>' not found" and suggests `/list` to see accessible projects. No stack trace leaked.
- **Multiple admins bind the same Telegram account** (e.g. shared phone): Second bind is rejected with a clear message; the first binding stands. Admins are expected to have distinct Telegram accounts.
- **Admin's MCP token is revoked while a Telegram session is active**: Subsequent commands fail with "Token revoked" and the bot disables inline buttons on any prior alerts it posted for that admin.
- **Bot receives a callback from an inline button on a message it didn't originate** (spoofing / replay): Callbacks are HMAC-signed over `(message_id, action, deploy_id, expires_at)`; unsigned or mismatched callbacks are dropped with a generic error.
- **Telegram outage during a pending approval**: The approval queue is the source of truth, not Telegram. On bot reconnect, it re-syncs pending items and re-posts alerts that have not yet been actioned, deduplicating by `deploy_id`.
- **Secrets in log output requested via `/logs`**: Redaction applies identically to Telegram output as to MCP responses — the same serialization-boundary redactor runs over every payload before it leaves the platform (`001-init/FR-013a`). This is a non-negotiable invariant.
- **Mini App opened on Telegram Desktop vs mobile**: Layout must be responsive; Desktop must not render a broken mobile-only layout. Tested on at least Telegram iOS, Android, and Desktop.
- **Large diff in a pending-approval alert**: Telegram message size limits apply. Diffs over N lines are summarized ("+312 / −89 across 14 files — tap to open") with a link to the full diff in the web UI.
- **Rate-limiting from Telegram's Bot API** under a burst of deploys: Bot coalesces notifications for the same project within a short window and degrades gracefully (silent coalescing, never lost audit events).
- **Project with both bound admins and legacy Dokploy notification targets**: On a deploy event, bound admins receive only the two-way actionable alert (the one-way ping is suppressed for them); legacy targets still receive the one-way Dokploy notification. No bound admin sees two messages for the same event (FR-005).
- **Admin taps an action button, then taps a contradicting one before the first completes** (Approve → Rollback): Second tap is rejected while the first is in-flight; the bot surfaces "Action in progress, please wait" and updates once the first completes.
- **Unbound user sends `/approve <deployId>` out of band**: Rejected — actions only flow through inline buttons the bot itself rendered, never via free-text commands referencing an id the user observed elsewhere.

## Requirements *(mandatory)*

### Functional Requirements

**Telegram Transport & Authorization Mapping (P1–P2)**

- **FR-001**: The platform MUST expose a Telegram bot that acts as an MCP client to `apps/mcp-server`, authenticating with a platform-managed service token. The bot MUST NOT bypass the MCP authorization layer — every Telegram-originated read or write MUST traverse the same scope-and-approval enforcement as AI-agent and CLI requests (`001-init/FR-011`–`FR-022`).
- **FR-002**: The platform MUST map each bound Telegram user to a scoped MCP token derived from that user's undevops admin identity. The token's scopes (`read` / `write` / `exec`) and project targeting MUST mirror the admin's existing MCP token permissions. Telegram MUST NEVER be a privilege-escalation path.
- **FR-003**: Every state-changing action taken via Telegram (approve, reject, rollback, scale) MUST be audit-logged with `channel` ∈ `{telegram-inline, telegram-miniapp}`, the acting admin id, the target project, the action, and a short reason where applicable. The audit record MUST be indistinguishable in schema from web/MCP/CLI-originated events (`001-init/FR-034`).

**Two-Way Deploy Alerts (P1 — US1)**

- **FR-004**: When a deploy enters the human-approval queue (multi-AI FAIL/ABSENT, or any policy requiring approval), the bot MUST post an alert to every bound admin with scope on the project, containing: project name, branch/commit, AI verdicts (verdict + reviewer id, secrets redacted), and inline keyboard buttons for the applicable actions (e.g. `[Approve] [Reject…]`).
- **FR-005**: When a deploy completes (success or failure) and the project is configured for deploy notifications, the bot MUST post a status message with a link to the deploy timeline in the web UI. For a bound admin with scope, this two-way message REPLACES the inherited one-way Dokploy notification — the admin receives one alert, not a duplicate. Notification targets that are not bound admins continue to receive the legacy one-way Dokploy notification unchanged. No bound admin is double-notified for the same deploy event.
- **FR-006**: Inline-button callbacks MUST be HMAC-signed over `(message_id, action, deploy_id, expires_at)` with a server-held key. Callbacks whose signature does not validate, whose `expires_at` has passed, or whose `message_id` was not originated by the bot MUST be rejected. Replay across distinct messages MUST be impossible.
- **FR-007**: The bot MUST handle the "action already taken by another channel" case gracefully: if a deploy was approved via the web UI while a Telegram alert is still visible, tapping that alert's buttons MUST reply "Already actioned via <channel>" with no side effects.

**Read-Only Status & Logs (P2 — US2)**

- **FR-008**: The bot MUST support `/status <project>` and `/logs <project> [--tail N]` commands, returning exactly what an equivalent scoped MCP read would return. Secret redaction at the serialization boundary (`001-init/FR-013a`) MUST apply to all Telegram output without exception.
- **FR-009**: The bot MUST support `/list` returning the projects the bound user can read. Projects outside the user's scope MUST NOT appear in the list (no metadata leak — not even project existence).
- **FR-010**: Log output exceeding Telegram's message size limit MUST be truncated with a marker and a link to the full log view in the web UI. The truncation MUST NOT split a line in the middle of a redacted secret (secrets are already masked, but the truncator must not reveal partial structure).

**Mini App (P2 — US3)**

- **FR-011**: The platform MUST serve a Telegram Mini App accessible from the attachment menu, rendering: pending-approvals queue, recent deploys (read-only), project health summary, recent logs (redacted). Full project configuration (env vars, volumes, domains, AI-review policy) MUST remain in the web UI for v0.x.
- **FR-012**: The Mini App MUST authenticate via the bound Telegram identity — no separate login flow. The Telegram `initData` MUST be validated per Telegram's documented HMAC scheme before any session is established.
- **FR-013**: The Mini App MUST be responsive across Telegram iOS, Android, and Desktop clients. A broken layout on any of the three MUST be treated as a release-blocking defect.

**Identity Binding (P3 — US4)**

- **FR-014**: The web UI MUST allow an authenticated admin to generate a one-time, short-lived (10-minute) Telegram binding code. The code MUST be random, unguessable, and single-use.
- **FR-015**: The bot MUST support `/bind <code>` which, given a valid unconsumed code, persists an encrypted mapping `(telegram_user_id → admin_id)`. The mapping MUST be stored encrypted at rest under the platform's `UNDEVOPS_ENCRYPTION_KEY`, never in plaintext.
- **FR-016**: The bot MUST support `/unbind` which detaches the current Telegram account from any admin mapping. Admins can also revoke a binding from the web UI.

**Reliability & Boundaries (cross-cutting)**

- **FR-017**: The bot MUST coalesce duplicate alerts for the same `(project, deploy_id)` within a short window to avoid flooding during retries. Audit events MUST NEVER be dropped as part of coalescing — only the Telegram notification surface is deduplicated.
- **FR-018**: All Telegram-originated actions MUST fail closed if the MCP gateway is unreachable — Telegram MUST NOT be a path that can bypass the gateway when it is up and degrade to an unauthenticated path when it is down.
- **FR-019**: The Telegram surface MUST introduce zero new dependencies on closed-source services beyond the Telegram Bot API itself. No third-party "Telegram-as-a-service" wrappers that add external trust anchors.

### Key Entities *(include if feature involves data)*

- **TelegramBinding**: Persistent mapping between a Telegram user and an undevops admin. Attributes: `telegramUserId`, `telegramUsername` (at bind time, informational), `adminId`, `boundAt`, `revokedAt` (nullable), `encryptedMappingBlob`. Stored encrypted at rest.
- **BindingCode**: One-time short-lived code used to establish a `TelegramBinding`. Attributes: `code` (opaque), `adminId`, `issuedAt`, `expiresAt` (default +10 min), `consumedAt` (nullable), `consumedByTelegramUserId`.
- **CallbackSignature**: Ephemeral signed payload attached to inline-button callbacks. Attributes: `messageId`, `action`, `deployId`, `expiresAt`, `hmac`. Not persisted — validated and discarded.
- **NotificationPolicy** (extends 001-init notification config): Per-project setting of which Telegram channels/users receive deploy alerts, distinct from the inherited Dokploy generic-notification target. Attributes: `projectId`, `boundTelegramUserIds[]`, `alertOn` (queue | success | failure | all).

## Assumptions

- **MCP gateway is the authorization chokepoint**: This spec assumes `001-init/FR-011`–`FR-022` (MCP read/write/exec scopes, approval queue, secret redaction) are implemented and are the single enforcement point. This spec adds a consumer, not a parallel enforcement layer.
- **Telegram Bot API availability is best-effort**: undevops does not guarantee Telegram's uptime. If the bot can't reach Telegram, deploy/approval flows continue to work via web UI, MCP, and CLI. The approval queue is the source of truth.
- **One admin ↔ one Telegram account (recommended)**: The binding model supports it; multi-account-per-admin is a future concern. Shared-phone scenarios are explicitly rejected (see Edge Cases).
- **Mini App is a focused subset, not a web-UI replacement**: Heavy editing (env vars, volumes, domain routing, AI-review policy) stays on the web UI for v0.x. The Mini App is mobile-glanceable by design.
- **Payment / billing (TON, Stars) is explicitly out of scope**: This spec builds without any payment integration. A future `003-billing`-class spec would layer commercial concerns on top.
- **Telegram `initData` validation follows Telegram's documented HMAC scheme**: No proprietary or reverse-engineered auth.

## Out of Scope (for v0.x)

- **Payments via TON, Telegram Stars, or any cryptocurrency** — commercial-layer concern, separate future spec.
- **Telegram as an AI agent transport** — agents already speak MCP natively; routing agent traffic through Telegram adds no value and doubles the surface.
- **Two-way group-chat ops** (team channels running commands together) — v0.x is 1:1 admin-to-bot. Group authorization semantics are a later concern.
- **Full project configuration from the Mini App** — web UI remains the authoring surface for env vars, volumes, domains, AI-review policy.
- **Telegram Login Widget** — optional hardening for a later wave; v0.x uses the simpler `/bind <code>` flow.
- **Localization of bot/Mini-App UI** — English only for v0.x, matching the 001-init scope.
- **Voice / media-based commands** — text and inline buttons only.
- **Bot marketplace publication** — the bot is private to each undevops instance; not a public Telegram-directory listing.
- **Shared Telegram-transport library with unet/007-telegram-vessel** — the two products' Telegram layers are built independently for v0.x; factoring a common package is a deferred strategic decision (see Clarifications).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A bound admin can act on a pending-approval deploy (tap → approve confirmed in audit log) in under 10 seconds from receiving the Telegram notification, on a consumer mobile device over a typical 4G connection.
- **SC-002**: Telegram-originated approve/reject/rollback actions produce audit-log entries schema-identical to web/MCP/CLI-originated actions — verified by an automated test asserting identical columns and `channel` correctly distinguishing the origin.
- **SC-003**: Zero privilege escalation — a bound Telegram user can perform via Telegram exactly the actions their MCP token scopes permit, and no more. Verified by an automated matrix test crossing every scope × every Telegram surface (inline buttons, `/status`, `/logs`, Mini App).
- **SC-004**: Secret redaction is total — no secret value appears in any Telegram output (messages, inline-button alerts, `/logs` tails, Mini App screens) under any input. Verified by a fuzz test that seeds known secrets across deploy metadata, env vars, and log lines, then exercises every Telegram surface and asserts none of the secret substrings appear.
- **SC-005**: Inline-button callbacks are unforgeable — an automated adversarial test submitting forged, expired, replayed, or tampered callbacks is rejected in 100% of cases with no state change.
- **SC-006**: Telegram outage does not affect deploy correctness — with the bot unreachable, a deploy still completes via the web UI/MCP/CLI, the approval queue still drains, and on bot reconnect pending alerts are re-synced without duplication (verified by an integration test that severs bot connectivity mid-deploy).
- **SC-007**: Mini App renders correctly on Telegram iOS, Android, and Desktop — zero release-blocking layout defects on any of the three at ship time, verified by manual + screenshot-diff testing on all three clients.
- **SC-008**: Binding flow completes end-to-end (web UI code → `/bind` → confirmation reflected in web UI) in under 30 seconds for a single admin, with no more than 4 user actions total.
