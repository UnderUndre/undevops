# Feature Specification: 003-undrlla-one-click-deploy (undevops 1-Click Provisioner)

**Feature Branch**: `003-undrlla-one-click-deploy`
**Created**: 2026-07-19
**Status**: Approved / In Specification
**Input**: Implement an automated 1-click deployment pipeline in `undevops` PaaS for client marketplace instances (`undrlla-core`). Upon receiving a provision payload from `undrlla` (via REST API or MCP gateway), `undevops` spawns an isolated per-tenant Directus container, applies `schema.snapshot.yaml`, writes `@underundre/undesign` theme tokens into the tenant configuration, deploys the `undrllanding` storefront, and configures Traefik reverse proxy routing with automatic Let's Encrypt TLS certificate issuance.

---

## Executive Context & Architecture

`undevops` acts as the PaaS orchestration engine for the Undrlla ecosystem.

### Provisioning Pipeline

1. **Trigger & Authorization**:
   - `undrlla` triggers `/api/v1/deploy/marketplace` (authenticated via HMAC token).
   - Payload: `{ tenant_id, domain, admin_email, undesign_theme, custom_colors }`.

2. **Container Orchestration (Docker / Traefik)**:
   - **Directus Service Container**: Spawns an isolated `directus/directus:12.1.1` instance with dedicated PostgreSQL database schema.
   - **Schema Migration**: Executes `npx directus schema apply ./schema.snapshot.yaml` to initialize core collections and RLS/FLS security policies.
   - **Branding Injection**: Populates `branding_settings` collection with design tokens derived from `@underundre/undesign`.
   - **Storefront Container (`undrllanding`)**: Spawns Next.js storefront container with `DIRECTUS_URL` and `TENANT_ID` env vars.
   - **Ingress & SSL (Traefik)**: Registers host router rules in Traefik with ACME Let's Encrypt automatic TLS issuance.

---

## User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 — 1-Click Client Marketplace Provisioning (Priority: P1)

As an operator or automated billing hook, I want `undevops` to accept a deployment request and fully bootstrap a client marketplace instance in under 60 seconds, so that new clients get an instant live storefront with SSL.

**Acceptance Scenarios**:

1. **Given** a valid HMAC-signed provision request payload, **When** `POST /api/v1/deploy/marketplace` is invoked, **Then** `undevops` launches the isolated Directus and Next.js containers, applies `schema.snapshot.yaml`, and returns HTTP 201 Created with service health URLs.
2. **Given** Traefik router configuration, **When** HTTP traffic hits `https://zernyoshko.undrlla.com`, **Then** Traefik terminates TLS using a valid Let's Encrypt certificate and proxies traffic to the storefront container.

---

### User Story 2 — Directus Schema Application & Branding Injection (Priority: P2)

As a tenant administrator, I want my provisioned instance to automatically receive the standard `undrlla-core` schema and my custom `@underundre/undesign` brand palette without manual DB configuration.

**Acceptance Scenarios**:

1. **Given** a newly spawned Directus container, **When** the bootstrap runner executes `directus schema apply`, **Then** all 14 core collections and RLS/FLS policies are instantiated without errors.
2. **Given** `undesign_theme` parameters in the deployment payload, **When** Directus starts, **Then** `branding_settings` contains the exact CSS variables and palette tokens requested.

---

## Functional Requirements

- **FR-001**: System MUST provide an authenticated API endpoint (`POST /api/v1/deploy/marketplace`) and MCP tool `deploy_marketplace`.
- **FR-002**: System MUST validate HMAC request signatures using a shared secret between `undrlla` and `undevops`.
- **FR-003**: System MUST execute container creation and schema application asynchronously with job status polling (`GET /api/v1/deploy/jobs/:id`).
- **FR-004**: System MUST apply `schema.snapshot.yaml` via Directus CLI migration runner on startup.
- **FR-005**: System MUST configure Traefik HTTP router and ACME TLS certificate solver for tenant custom domains and subdomains.
- **FR-006**: System MUST record deployment logs in S3-compatible backup and observability store.

---

## Success Criteria

- **SC-001**: Total end-to-end deployment time from payload ingestion to live TLS HTTPS endpoint is under 60 seconds.
- **SC-002**: 100% of provisioned client instances pass schema integrity checks and RLS policy verification.
- **SC-003**: Zero manual shell commands required from operators during standard client onboarding.

---
*End of Specification.*
