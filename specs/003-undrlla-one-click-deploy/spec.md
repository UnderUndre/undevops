# Feature Specification: 003-undrlla-one-click-deploy

**Feature Branch**: `003-undrlla-one-click-deploy`  
**Created**: 2026-07-19  
**Updated**: 2026-07-28 (Fully aligned with Medusa 2.0 + Postgres + Redis + Paddle deploy)  
**Status**: Draft — Active  
**Input**: One-click deploy of isolated client shops from `undrlla` provisioning portal into `undevops` PaaS.

---

## Executive Context

`undevops` is the PaaS that **executes** marketplace provisioning.  
**Source of truth for the request body** is `undrlla` feature `002-provisioning-portal`: the **`ProvisioningManifest` JSON**. This feature MUST NOT invent a parallel thin payload.

Cross-link: `repos/undrlla/specs/002-provisioning-portal/spec.md`, `repos/undrlla/specs/ECOSYSTEM.md` (Q7 locked).

### Pipeline

1. **Ingest**: `undrlla` (or operator) POSTs a validated `ProvisioningManifest` to `undevops` with HMAC auth (+ timestamp/nonce anti-replay).
2. **Job**: async job `pending → provisioning → ready | failed | rolled_back`.
3. **Orchestrate (Medusa 2.0 Stack)**:
   - Isolated **Medusa 2.0 template-shop** (`undreseller`) container.
   - Dedicated PostgreSQL database container / schema per tenant.
   - Shared/Isolated Redis cache instance.
   - Deploy `undrllanding` storefront container with env (`MEDUSA_BACKEND_URL`, `TENANT_MODE=client`, `FEATURES=shop`, Paddle public token).
   - Traefik routing + ACME TLS certificate issuance.
4. **Secrets**: resolve only `secret:<provider>/<key>` refs from `undevops` secret store; never accept raw secrets in manifest.
5. **Callback**: webhook/poll status to `undrlla` portal (`002` FR-008).

---

## Clarifications

- Q: Which payload? → **A: undrlla `ProvisioningManifest` only.** Deprecated: ad-hoc `{ tenant_id, domain, admin_email, undesign_theme }`.
- Q: HMAC? → Shared secret; request MUST include timestamp + nonce; reject skew > 5 minutes or replayed nonce.
- Q: Failure mid-bootstrap? → Job → `failed`; cleanup worker removes partial containers/routes/DB; optional `rolled_back`.
- Q: DNS not ready? → Job may sit `awaiting_dns` with retries; not infinite silent fail.
- Q: Day-2 (upgrade/suspend/destroy)? → **Out of scope for 003**; tracked as future `undevops` feature; do not claim in SC.

---

## User Stories

### US1 — Ingest manifest and provision (P1)
**Given** a valid HMAC-signed `ProvisioningManifest`, **When** `POST /api/v1/provisioning/manifests` (or MCP `ingest_provisioning_manifest`), **Then** `undevops` returns `202` + `job_id` and brings up Medusa + Postgres + Redis + Storefront + TLS for `manifest.domain`.

### US2 — Medusa DB Migration + Branding (P2)
**Given** provision job, **When** Medusa container starts, **Then** `medusa db:migrate` runs automatically and initial tenant configuration/theme matches manifest addons.

### US3 — Status to undrlla (P2)
**Given** job state changes, **When** polled or webhook, **Then** `undrlla` portal sees `queued|provisioning|ready|failed|awaiting_dns|rolled_back`.

---

## Functional Requirements

- **FR-001**: MUST accept **only** `ProvisioningManifest` (schema compatible with `undrlla` `002`, including `list_on_hub`, `share_catalog_to_hub`, `secrets` as refs, `initial_admin_email`, `domain`, `display_name`, `addons`).
- **FR-002**: MUST authenticate with HMAC shared secret + timestamp + nonce anti-replay.
- **FR-003**: MUST run provision asynchronously; expose `GET /api/v1/provisioning/jobs/:id`.
- **FR-004**: MUST run `medusa db:migrate` and seed initial store settings for new tenant Postgres DB.
- **FR-005**: MUST configure Traefik router + ACME for domain (custom or platform subdomain). Before requesting ACME TLS certificate, system MUST perform an active DNS A/CNAME lookup check; if DNS does not resolve to the cluster ingress IP, job MUST transition to `awaiting_dns` and retry with backoff, preventing Let's Encrypt ACME rate-limit (429) exhaustion.
- **FR-006**: MUST deploy `undrllanding` image with `MEDUSA_BACKEND_URL`, Paddle client token, and feature flags for Wave-1 shop.
- **FR-007**: MUST resolve secret refs from `undevops` store; fail closed if missing.
- **FR-008**: MUST log deploy artifacts to S3-compatible storage.
- **FR-009**: MUST cleanup partial resources on failure.
- **FR-010**: MCP tool MUST wrap the same ingest path (same authz).
- **FR-011**: Day-2 lifecycle (upgrade Medusa, suspend, destroy) is **OUT OF SCOPE**; document as future work.
- **FR-012**: Provisioned client storefronts and admin portals MUST be configured to integrate with **Undrlla IdP (`id.undrlla.network`)** for federated SSO (RS256 JWT validation over JWKS) per `undrlla/specs/005-sso-jwt-contract.md`.

---

## Success Criteria

- **SC-001**: Warm-path provision (images cached) reaches healthy HTTPS storefront within **10 minutes** p95 (align `undrlla` `002` SC-001).
- **SC-002**: 100% of `ready` jobs pass Medusa healthcheck (`/health`) and Store API status.
- **SC-003**: Zero manual shell for standard onboarding when DNS is preconfigured.
- **SC-004**: Contract test: sample `undrlla` `002` manifest fixture accepted end-to-end.

---

*End of Specification.*
