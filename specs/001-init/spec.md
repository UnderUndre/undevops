# Feature Specification: undevops — AI-Native Self-Hosted Deployment Platform

**Feature Branch**: `specs/001-init`
**Created**: 2026-05-25
**Status**: Draft
**Input**: User description: "underundre\underhelpers\undevops\specs\001-init - сделал форк и спек ветку"

## Context

`undevops` is the DevOps app inside the `underundre/underhelpers` ecosystem — a self-hosted platform for managing servers and deploying projects. The project is being rebuilt **from scratch** by **forking Dokploy** (Apache 2.0, TypeScript/Next.js + Drizzle ORM + PostgreSQL + Redis + Traefik + Docker Swarm) as the foundation, then layering **AI-native operational capabilities** that no incumbent (Coolify, Dokploy, Dokku, Portainer) currently offers.

**Strategic intent**:
- Stay **pure Apache 2.0 OSS** through at least v0.5. Avoid dual-licensing trap until product-market fit is proven.
- **Architect for an eventual open-core split** from day one — modular package boundaries so any feature can later be migrated to a closed-source enterprise tier without rewrites.
- **Differentiate on AI-native operations** — Model Context Protocol (MCP) as a first-class interface, multi-AI pre-deploy review, AI-assisted incident response, and natural-language infrastructure changes. This is the only defensible moat against the existing PaaS field, which is converging on feature parity.
- **Steal architectural patterns** from Dokku (plugn-style hook-based plugin system) and Komodo (GitOps via declarative resource files), translated into the TypeScript runtime.

This spec describes the **initial release scope (v0.1 through v0.5)** — what must ship for undevops to be both (a) a credible Dokploy alternative for solo developers and small teams, and (b) the only deployment platform where AI agents are first-class operators rather than read-only spectators.

## Clarifications

### Session 2026-05-25

- Q: Controller availability target for v0.x → A: Single-instance, RTO ~30 minutes via documented backup-restore procedure. High-availability (active-passive / active-active) is explicitly out of scope for v0.x and reserved for a potential future enterprise tier.
- Q: Scale envelope (v0.x design bounds) → A: 50 servers per cluster, 500 projects per administrator, 30 replicas per deployment, 30-day audit/log retention. These are design targets — undevops MUST function correctly within them. Above these, behavior is undefined for v0.x and explicitly out of scope.
- Q: MCP token lifecycle → A: Long-lived bearer tokens. Manual rotation by admin (no auto-rotation). Admin can revoke any token at any time, taking immediate effect on the next request. Scope = (access-level: read / write / exec) × (target: per-project or all-projects). No OAuth2 consent flow; no short-lived/refresh-token flow in v0.x.
- Q: Multi-AI review tie-break policy → A: Strict by default — any single FAIL verdict blocks the deploy. A reviewer that does not respond within the configured timeout is treated as ABSENT, and ABSENT counts as FAIL for gate evaluation. Override requires an administrator to record a written reason; the override is logged. This default mirrors constitution Principle VI's cross-AI review gate semantics.
- Q: Backup / restore strategy for control plane → A: Built-in scheduled backup to administrator-configured S3-compatible object storage (any compliant provider — AWS S3, Backblaze B2, Cloudflare R2, MinIO, etc.). Restore procedure = fresh undevops install + documented restore command. Continuous replication and managed cloud backup are out of scope for v0.x.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Solo Developer Deploys Their First Project (Priority: P1)

A solo developer with a Hetzner VPS and a Next.js side project wants to deploy by pushing to git. They install undevops on the VPS, connect their GitHub repo through the web UI, push a commit, and have a working deployment with HTTPS at a domain of their choice within 15 minutes of starting.

**Why this priority**: Without table-stakes deployment, every AI-native feature is moot. Solo devs are also the primary OSS adoption funnel — they drive star count, community contributions, and word-of-mouth. If undevops cannot match Dokploy on this baseline, no one tries it long enough to discover the AI features.

**Independent Test**: From a fresh Linux VPS, install undevops via documented install path. Add a git repo containing a small Dockerfile-based web app. Trigger a deploy. Verify the app responds over HTTPS at a configured domain within 15 minutes from the start of installation.

**Acceptance Scenarios**:

1. **Given** a fresh Linux server reachable over SSH, **When** the user runs the documented install command, **Then** undevops web UI is reachable on port 443 with a Let's Encrypt-issued certificate
2. **Given** undevops is installed and the user has a GitHub repo with a Dockerfile, **When** they connect the repo and trigger a deploy, **Then** the application is built, started, and reachable at the configured domain within 5 minutes
3. **Given** a deployment is in progress, **When** the user opens the deployment view, **Then** they see streaming build and runtime logs in real time
4. **Given** a successful deployment, **When** a new commit is pushed to the connected branch, **Then** a new deployment starts automatically and the previous version remains reachable until the new one is healthy

---

### User Story 2 — AI Coding Agent Reads Infrastructure State via MCP (Priority: P1)

A developer using Claude Code (or any MCP-compatible AI client) connects undevops as an MCP server. The agent can list servers, projects, deployments, and recent logs through MCP resources/tools without any custom integration code. The developer asks Claude "почему мой prod пятисотит" and Claude reads recent error logs from undevops via MCP and answers correctly.

**Why this priority**: This is the **single most differentiating capability** for undevops in the 2026 market. Coolify and Dokploy expose REST APIs that AI agents can theoretically call, but MCP is the actual protocol agents speak natively. Read-only MCP is the prerequisite for read/write MCP (P3), and shipping it first establishes the integration pattern with low blast radius.

**Independent Test**: Configure undevops as an MCP server in Claude Code. From a fresh Claude Code session, ask it to list current deployments — the agent retrieves and displays them. Ask it to show recent error logs from a named project — the agent retrieves and analyzes them. No custom tools, no REST scaffolding, no glue code.

**Acceptance Scenarios**:

1. **Given** undevops is running and an MCP client is configured against it, **When** the client lists available resources, **Then** servers, projects, deployments, and logs are enumerable as MCP resources
2. **Given** an MCP client has read access, **When** it requests the last 100 log lines for a specific deployment, **Then** the lines are returned in under 500ms (p95)
3. **Given** an MCP client requests data for a resource it is not authorized to see, **Then** the request returns an authorization error and the attempt is recorded in the audit log
4. **Given** undevops exposes secrets to the application runtime, **When** an MCP read request touches a secret-bearing resource, **Then** secret values are redacted in the MCP response (never sent to the AI client)

---

### User Story 3 — Platform Author Writes a Custom Plugin in TypeScript (Priority: P2)

A platform author wants to add custom behavior — e.g. send a Slack notification on every successful deploy. They write a TypeScript plugin against the documented plugin SDK, install it via a documented install command, and the hook fires on the next deployment without any modification to undevops core.

**Why this priority**: A plugin system is the **architectural foundation for the future open-core split** — enterprise modules will eventually be loaded through the same plugin contract that community plugins use. Shipping it in v0.x is dramatically cheaper than retrofitting later (Coolify's monolithic Laravel core is the cautionary tale). It also signals "extensible platform" to early adopters, who tend to want exactly this.

**Independent Test**: Author a "log every deployment event to stdout" plugin in TypeScript using the SDK. Install it via the documented command. Trigger a deployment. Verify the plugin's hook fired and produced the expected output.

**Acceptance Scenarios**:

1. **Given** a plugin manifest and a hook implementation in TypeScript, **When** the developer runs the plugin install command, **Then** undevops loads the plugin without restarting and the hook becomes active
2. **Given** a plugin is registered for the `post-deploy` lifecycle hook, **When** a deployment completes, **Then** the hook function is invoked with a typed payload describing the deployment
3. **Given** a plugin throws an exception in its hook, **When** the hook is invoked, **Then** undevops captures the exception, marks the plugin as faulted in the UI, and continues the deployment flow without the plugin's contribution
4. **Given** a plugin declares a permission requirement (e.g. read project logs), **When** the user enables it, **Then** undevops prompts to grant or deny the permission and records the decision

---

### User Story 4 — AI Agent Performs an Authorized Deployment via MCP (Priority: P2)

The same developer from Story 2 grants their AI agent write capabilities for a specific project. They tell Claude "deploy the feature-x branch to staging with 2GB RAM." Claude composes the action via MCP, undevops confirms the change in the UI (or via a configured approval channel), the developer approves, and the deployment proceeds. The agent reports back when it is healthy.

**Why this priority**: Read-only MCP is interesting; read/write MCP is the actual paradigm shift. Solo developers and small teams will value this immediately — they spend most of their day in Claude Code or Cursor anyway. Enterprise compliance gets added later via finer-grained approval policies (multi-AI review in Story 5, RBAC in a later release).

**Independent Test**: Configure an MCP client with write access scoped to a named project. From the agent, issue a deploy command for that project. Verify the action requires explicit approval, that approval succeeds, that the deployment proceeds, and that the agent receives a structured completion result.

**Acceptance Scenarios**:

1. **Given** an MCP client has write access to project X, **When** the agent invokes the `deploy` action, **Then** undevops creates a pending action that requires human approval before execution
2. **Given** a pending agent-initiated action exists, **When** the user approves it in the UI, **Then** the deployment proceeds with the agent identified as the initiating actor in the audit log
3. **Given** an MCP client attempts an action outside its scoped permissions, **When** the action is issued, **Then** the action is rejected immediately, no pending state is created, and the rejection is logged
4. **Given** a deployment initiated by an agent is in progress, **When** the agent polls or subscribes for status, **Then** it receives structured progress updates and a final outcome (success / failure / cancelled)

---

### User Story 5 — Multi-AI Pre-Deploy Review Gates a Production Change (Priority: P3)

A team uses undevops in production with a "multi-AI review" gate configured for the production environment. Before any deploy proceeds, the change (commit diff, env var changes, compose changes) is sent to two configured AI reviewers (e.g. Claude and Gemini). Each reviewer writes a verdict and concerns. The deploy proceeds only if both pass, or if a human explicitly overrides.

**Why this priority**: This is the **enterprise-grade compliance feature** that justifies a future paid tier. It mirrors the SpecKit cross-AI review gate pattern (constitution Principle VI) applied to operations. No competing PaaS offers this. It is also the cleanest path to demonstrating SOC2-friendly change controls without the operational burden of human-only approval boards.

**Independent Test**: Configure two AI reviewers for a project's production environment. Trigger a deploy. Verify both reviewers receive the change payload, both write verdicts, and the deploy waits on the gate. Then approve a failing review and verify the override is logged with reason and actor.

**Acceptance Scenarios**:

1. **Given** a production environment has two configured AI reviewers, **When** a deploy is triggered, **Then** the deploy enters a "pending review" state and a review request is sent to each reviewer
2. **Given** all configured reviewers returned PASS verdicts, **When** the gate evaluator runs, **Then** the deploy automatically proceeds
3. **Given** at least one reviewer returned FAIL, **When** the gate evaluator runs, **Then** the deploy is blocked, the verdicts are surfaced in the UI, and a human can choose to override with a written reason
4. **Given** a reviewer fails to respond within the configured timeout, **When** the gate evaluator runs, **Then** the reviewer is treated as ABSTAIN, the timeout is logged, and the gate evaluates only the remaining reviewers (configurable: pass on majority, fail on any absent)

---

### User Story 6 — Multi-Server Cluster with Horizontal Scaling (Priority: P3)

A growing team outgrows a single VPS. They add a second and third server to undevops. They deploy a project with a "replicas: 3" setting, and undevops distributes the application across the cluster with the reverse proxy load-balancing requests.

**Why this priority**: Multi-server is the typical "next step" for teams who graduated from solo. Dokploy already supports this via Docker Swarm under the hood — the work is mostly preserving and re-skinning that capability, not building it from scratch. It is not P1 because most early adopters will run single-server first.

**Independent Test**: Connect a second and third server to undevops. Configure a project to deploy with 3 replicas. Verify the application is distributed across all three nodes, that the reverse proxy load-balances traffic, and that killing one node does not interrupt service.

**Acceptance Scenarios**:

1. **Given** multiple servers are connected, **When** a project is deployed with `replicas > 1`, **Then** the replicas are scheduled across distinct nodes
2. **Given** a multi-replica deployment is healthy, **When** one node becomes unreachable, **Then** undevops marks the node degraded, reschedules its replicas to remaining nodes, and the reverse proxy stops sending traffic to the dead node
3. **Given** a recovered node rejoins the cluster, **When** the next deploy or rebalance occurs, **Then** the node is eligible for new placements

---

### Edge Cases

- **AI reviewer outage during gated deploy**: undevops marks the reviewer ABSENT after the per-reviewer timeout expires. Under the default strict policy, ABSENT counts as FAIL and blocks the deploy until an administrator overrides with a written reason. The outage is surfaced prominently in the UI so the administrator can distinguish "reviewer disagreed" from "reviewer was unreachable"
- **MCP-initiated action conflicts with a human-initiated action on the same resource**: the second action queues behind the first; if optimistic concurrency is violated, the queued action returns a conflict error to the agent
- **Secrets in AI context**: under no condition do secret values appear in MCP responses, AI reviewer payloads, or audit log free-text fields. Secret keys may be referenced; values are always redacted upstream of the AI boundary
- **Plugin crashes during a deployment hook**: the deployment continues; the plugin is marked faulted; subsequent invocations are suppressed until the user re-enables it; the fault is recorded for `/learn`-style analysis
- **undevops self-recovery after a host crash**: on startup, undevops reconciles its internal state with running containers and external certificate state. It does NOT automatically re-deploy applications that were running before the crash unless explicitly configured to do so. Full restoration of the undevops controller itself from a documented backup MUST achievable within an RTO of approximately 30 minutes by a single administrator following the documented procedure
- **undevops controller is single-instance in v0.x**: there is no built-in high-availability for the undevops control plane. The control plane being temporarily unavailable does NOT take down already-running deployed applications — they continue serving traffic via the reverse proxy independently of the control plane's liveness
- **License attribution**: every distributed artifact (Docker image, npm package, binary) preserves the Dokploy upstream attribution as required by Apache 2.0
- **Windows development environment**: undevops runs on Linux servers but its source code, build tooling, and CLI MUST work on Windows hosts. Bash-only scripts are an anti-pattern
- **Open-core readiness check**: the `packages/core` build MUST succeed without `packages/enterprise` or `packages/ai-pack` present in the working tree. A CI gate verifies this on every PR
- **Concurrent deployments of the same project**: only one deployment per project may run at a time. A second trigger queues; a third or later trigger collapses the queue to the latest commit only
- **Reverse-proxy certificate expiry under rate-limit**: undevops monitors certificate expiry and refreshes ≥30 days before expiry; if Let's Encrypt rate-limits, undevops falls back to the existing certificate until expiry-7 days, then surfaces a critical alert

## Requirements *(mandatory)*

### Functional Requirements

**Core Deployment (P1)**:
- **FR-001**: System MUST connect to remote Linux servers via key-based authenticated remote shell
- **FR-002**: System MUST deploy applications described by container-based build configurations in a connected git repository
- **FR-003**: System MUST manage a reverse proxy that terminates TLS, routes by hostname, and obtains/renews trusted certificates automatically
- **FR-004**: System MUST stream build and runtime logs in real time to the web UI and via API
- **FR-005**: System MUST durably persist project, deployment, server, and audit data across restarts
- **FR-006**: System MUST keep the previous healthy deployment serving traffic until a new deployment passes its configured health check (zero-downtime deploy)

**Authentication & Authorization (P1, expanded later)**:
- **FR-007**: System MUST authenticate a single administrator via password (v0.1 baseline); SSO/RBAC are explicit non-goals for v0.x but the auth layer MUST be architected as a pluggable boundary
- **FR-008**: System MUST encrypt secrets at rest using a deployment-scoped key; secret values MUST NEVER appear in logs, MCP responses, audit free-text, or AI reviewer payloads

**Web UI & CLI (P1)**:
- **FR-009**: Users MUST be able to perform all P1 operations (add server, add project, trigger deploy, view logs, view audit log) via the web UI
- **FR-010**: A CLI MUST exist that performs the same operations headlessly with output suitable for piping and scripting

**MCP Gateway — Read (P1)**:
- **FR-011**: System MUST expose an MCP server that publishes servers, projects, deployments, logs, and recent events as MCP resources
- **FR-012**: MCP responses MUST redact secret values before transmission
- **FR-013**: MCP access MUST be governed by per-client long-lived bearer tokens. Each token's scope is the cross-product of (access-level: `read` / `write` / `exec`) and (target: a specific project or all-projects). Tokens are issued by an administrator and do not expire automatically
- **FR-013a**: An administrator MUST be able to revoke any MCP token at any time. Revocation MUST take effect on the next request from that token, with a structured rejection response
- **FR-013b**: An administrator MUST be able to view, for each token: name, scope, creation timestamp, last-used timestamp, and the count of requests since creation, to support manual rotation decisions
- **FR-014**: All MCP requests MUST be recorded in the audit log with the initiating client identifier

**Plugin System (P2)**:
- The Plugin SDK supports an **External API Consumer Pattern** for integrating self-hosted services that expose their own control plane API (e.g., network tunnel managers, monitoring stacks). In this pattern, the plugin acts as a typed API client — surfacing status, triggering actions, and registering UI panels — without replicating the external service's data model or logic. Auth credentials are stored via undevops secrets; degraded-mode behavior is required when the external service is unreachable. See `contracts/plugin-sdk.md` §External API Consumer Pattern for the full contract, and the unet tunnel manager plugin as the reference implementation.
- **FR-015**: System MUST load TypeScript plugins from a documented directory or via an `install` command
- **FR-016**: Plugins MUST be able to subscribe to lifecycle hooks: `pre-deploy`, `post-deploy`, `deploy-failed`, `server-added`, `server-removed`, `project-created`, `project-deleted` (extensible list)
- **FR-017**: Plugin hook invocations MUST receive typed payloads matching a versioned plugin SDK contract
- **FR-018**: A failed plugin MUST NOT block the lifecycle event it subscribes to; the failure MUST be recorded and the plugin MUST be marked faulted in the UI
- **FR-019**: Plugins MUST declare required permissions in their manifest; the user MUST explicitly grant permissions on install

**MCP Gateway — Write (P2)**:
- **FR-020**: System MUST allow MCP clients with write scope to invoke `deploy`, `rollback`, and `scale` actions
- **FR-021**: Agent-initiated actions MUST require either explicit human approval in the UI or a pre-configured auto-approval policy scoped to specific projects/agents
- **FR-022**: Agent-initiated actions MUST be recorded in the audit log with the agent identifier as the initiating actor

**Multi-AI Pre-Deploy Review (P3)**:
- **FR-023**: System MUST allow an environment (e.g. "production") to be configured with N AI reviewers, where each reviewer is identified by provider + credential reference
- **FR-024**: When a deploy is triggered against a gated environment, the system MUST submit the change payload (diff, env changes, compose changes) to each configured reviewer and wait for verdicts
- **FR-025**: The deploy MUST be blocked until either (a) every configured reviewer returned a PASS verdict, or (b) a human administrator explicitly overrides with a written reason recorded to the audit log. The default policy is **strict**: any single FAIL or ABSENT (timeout) verdict blocks the deploy. This default MAY be relaxed per-environment via configuration, but the strict policy is what ships by default
- **FR-025a**: A reviewer that does not respond within the configured per-reviewer timeout MUST be treated as ABSENT. Under the default strict policy, ABSENT counts as FAIL for gate evaluation
- **FR-026**: Reviewer responses (verdict, concerns, timestamps) MUST be persisted and viewable per-deployment for retrospective analysis

**Multi-Server Cluster (P3)**:
- **FR-027**: System MUST support adding multiple servers and treating them as a single deployment cluster
- **FR-028**: System MUST schedule replicas across distinct nodes when a project requests more than one replica
- **FR-029**: System MUST monitor node health and reschedule replicas from degraded/unreachable nodes within a configured drain timeout

**Architectural / Cross-Cutting**:
- **FR-030**: The codebase MUST be organized into separable modules along three boundaries: (a) core deployment functionality, (b) plugin host + SDK, (c) AI-native operational features. Each module MUST be loadable, buildable, and testable independently of the others to preserve a future open-core split option without rewrites
- **FR-031**: System MUST preserve all upstream attributions required by the upstream project's license in every distributed artifact (binary image, package, source distribution, in-product "About" surface)
- **FR-032**: System MUST be developable on Windows, macOS, and Linux developer hosts. Build and developer scripts MUST work on all three host platforms without manual translation
- **FR-033**: System MUST surface its own version, the upstream project version it was forked from, and the list of loaded plugins via both an HTTP endpoint and MCP
- **FR-034**: System MUST follow the `underhelpers` SpecKit constitution for its own development (Principles I–VIII), including the cross-AI review gate for any change to spec/plan/tasks artifacts

**Backup & Restore (P2)**:
- **FR-035**: System MUST take periodic backups of its own state (project definitions, server registrations, secrets, audit log, MCP tokens, plugin manifests, deployment history) on an administrator-configured schedule. The default schedule is every 6 hours
- **FR-036**: Backups MUST be written to administrator-configured S3-compatible object storage. The administrator supplies the endpoint, bucket, credentials, and optional path prefix. No backup target is assumed by default — backups are inactive until configured
- **FR-037**: Backups MUST be encrypted at rest with an administrator-controlled key. The restore procedure MUST require the same key
- **FR-038**: System MUST surface backup status (last successful backup timestamp, last attempted backup timestamp, last error if any) in the UI and via MCP
- **FR-039**: A documented restore command MUST exist that takes a backup archive (downloaded from object storage by the administrator) and a fresh undevops install, and restores the control-plane state to the moment of that backup

### Key Entities

- **Server**: a remote Linux host registered for deployments. Attributes: ID, name, address, SSH credentials reference, role (manager / worker for Swarm), health status, attached labels.
- **Project**: a deployable unit linked to a git repository. Attributes: ID, name, repo URL, default branch, build configuration (Dockerfile path / Compose path), environment-specific overrides, secret references, replica count, health-check configuration.
- **Environment**: a named context within a project (e.g. `production`, `staging`). Attributes: name, project reference, target servers/cluster, gate configuration (which AI reviewers, pass policy, timeout policy).
- **Deployment**: an attempt to bring a project to a specific commit. Attributes: ID, project reference, environment reference, commit SHA, initiating actor (human user ID / agent client ID / system), status (pending-review / queued / building / running / healthy / failed / rolled-back / cancelled), timestamps, log reference, reviewer verdicts (if gated).
- **Plugin**: an installed extension. Attributes: name, version, manifest, granted permissions, faulted flag, hook subscriptions.
- **AIReviewer**: a configured external AI used for pre-deploy review. Attributes: provider (claude / codex / gemini / antigravity / copilot / custom), credential reference, configuration (model, temperature), associated environments.
- **AuditEvent**: an immutable record of any state change. Attributes: timestamp, actor (user / agent / plugin / system), action, target resource, before/after snapshot reference, free-text annotation (NEVER contains secret values).
- **Secret**: an encrypted key-value pair scoped to a project or server. Attributes: scope, key, encrypted value, created-by, last-rotated. Values are never exposed via MCP, audit log, or AI reviewer payloads.
- **MCPClient**: an authenticated MCP integration. Attributes: name, token reference, scopes (read / write per resource type and per project), last-seen timestamp.

## Assumptions

- **Upstream foundation**: undevops forks Dokploy (Apache 2.0, TypeScript stack) as its starting codebase. The fork preserves Dokploy's container-orchestration, reverse-proxy, multi-server-clustering, and one-click-service capabilities. Where this spec describes "inherited" behavior, the assumption is that Dokploy already implements an acceptable version of it; new work focuses on the AI-native, plugin, and modularity-for-open-core additions
- **Target deployment OS**: deployments themselves run on modern Linux servers (Ubuntu 22.04+, Debian 12+, or equivalent). Developer hosts may be Windows, macOS, or Linux
- **Container runtime present on targets**: each managed server has a working container runtime installed (the install procedure may automate this or require it as a prerequisite — to be decided at plan time)
- **Network reachability**: undevops needs outbound internet access (for git fetch, container image pulls, certificate authority, AI provider APIs, plugin sources). Air-gapped environments are an explicit non-goal for v0.x
- **AI provider availability**: pre-deploy review and MCP-driven workflows depend on external AI providers (Claude, Gemini, Codex, etc.). Provider outages degrade those features (per outage policy) but MUST NOT break baseline deployment
- **Single-administrator model in v0.1**: the initial release assumes one human administrator. Multi-user, SSO, and RBAC are explicit non-goals for v0.x but the auth layer is architected as a pluggable boundary for later expansion
- **License compliance**: by forking under Apache 2.0, undevops is obligated to preserve upstream copyright notices and license text in every distributed artifact. This is a hard requirement, not a preference
- **Scale envelope (v0.x design bounds)**: a single undevops instance is designed to handle up to 50 connected servers, up to 500 projects per administrator, up to 30 replicas per deployment, and 30 days of audit/log retention. Behavior above these bounds is undefined for v0.x. Raising them is a v0.y concern that requires explicit re-design of indexing, archival, and pagination

## Out of Scope (for v0.x)

The following are intentionally excluded from this initial release scope. They may appear in later releases or remain permanently out of scope; the decision is deferred until product-market signal informs it:

- Multi-user RBAC, fine-grained permissions, team workspaces
- SSO / SAML / OIDC / external identity providers
- Air-gapped install support
- Enterprise compliance bundles (SOC2 / HIPAA / PCI playbooks)
- Cost analytics, budgets, FinOps reporting
- Custom branding / white-label
- Multi-region active-active orchestration
- Marketplace with paid plugins
- Managed cloud offering (undevops Cloud)
- AI incident response with autonomous remediation (read-only AI analysis is in scope via P5/MCP; autonomous fix-and-deploy is not)

These deferred items are listed here so reviewers and contributors can quickly distinguish "not yet" from "we forgot."

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A solo developer can go from "fresh VPS" to "deployed application reachable over HTTPS" in under 15 minutes, following only the public quickstart documentation
- **SC-002**: MCP read requests (server list, project list, last 100 log lines for a deployment) return in under 500ms at the 95th percentile under typical single-server load
- **SC-003**: A TypeScript plugin authored against the documented SDK can be installed and produce a visible side-effect on the next deployment within 5 minutes of starting from the SDK template
- **SC-004**: A multi-AI pre-deploy review with 2 configured reviewers completes verdict collection within 60 seconds for a typical change payload (≤200 changed lines), assuming the upstream AI providers respond within their stated SLAs
- **SC-005**: Core deployment functionality builds, tests, and starts successfully in CI when AI-native and any future enterprise modules are absent from the working tree (open-core readiness)
- **SC-006**: 100% of state-changing actions — whether initiated by humans, agents, or plugins — are recorded in the audit log with actor identity, action, target, and timestamp
- **SC-007**: 100% of distributed artifacts preserve the upstream copyright notice and license file required by the upstream project's open-source license
- **SC-008**: No secret value appears in any MCP response, AI reviewer payload, audit log free-text field, or application log in automated scanning of a representative test workload
- **SC-009**: The development environment installs and runs the full test suite successfully on current Windows, macOS, and mainstream Linux developer hosts from a single documented setup procedure
- **SC-010**: An agent-initiated `deploy` action issued via MCP is observable end-to-end (request received → approval gate → execution → completion notification to the agent) with structured progress events at each transition
- **SC-011**: From a verified backup, a single administrator can restore the undevops control plane to a working state on a fresh host within 30 minutes, following only the public recovery documentation. Deployed applications continue serving traffic during the control-plane outage
- **SC-012**: At the documented scale envelope (50 servers, 500 projects, 30-day log retention populated to capacity), all P1 operations meet their performance targets (e.g. SC-002 MCP read p95 under 500ms), and no operation degrades non-linearly
- **SC-013**: With backups configured to a working S3-compatible target, the most recent successful backup is no more than 6 hours old at any time, and the surfaced last-backup-timestamp reflects this within 1 minute of completion
