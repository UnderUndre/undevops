# Implementation Plan: 003-undrlla-one-click-deploy

**Spec**: `spec.md` (Medusa target, 2026-07-28/29)  
**Depends on**: undevops `001-init`, undrlla `002` **Medusa** ProvisioningManifest  
**Contract SoT**: `undrlla/specs/002-provisioning-portal/contracts/medusa-provisioning-manifest.schema.json`

## Summary

Ingest undrlla **Medusa** `ProvisioningManifest` (`manifest_version: 2.0-medusa`), async provision **Medusa template-shop + Postgres + Redis + undrllanding + Traefik TLS**, report job status. **Do not** implement Directus `schema.snapshot.yaml` for client shops.

## Milestones

1. **Medusa manifest schema + HMAC middleware** (2d)  
   - Vendored copy of undrlla `medusa-provisioning-manifest.schema.json`  
   - Validate `runtime.engine === "medusa"`; reject raw secrets  
   - HMAC + timestamp + nonce anti-replay  

2. **Job state machine + cleanup** (3d)  
   - States: `pending → provisioning → awaiting_dns → ready | failed | rolled_back`  
   - Cleanup worker for partial containers/DB/routes  

3. **Medusa + Postgres + Redis bootstrap** (4d)  
   - Pull `runtime.image` (template-shop)  
   - Provision Postgres schema + Redis  
   - Resolve secrets → env (Paddle, JWT, DB password)  
   - Run `medusa db:migrate` + optional seed  
   - Healthcheck Store/Admin  

4. **undrllanding + Traefik ACME** (2d)  
   - Deploy storefront image with `MEDUSA_BACKEND_URL`, `TENANT_MODE=client`, `FEATURES=shop`, Paddle public token  
   - Traefik labels + ACME; `awaiting_dns` retries  

5. **Webhook/poll + MCP + contract tests** (2d)  
   - Status webhook to undrlla portal  
   - MCP `ingest_provisioning_manifest` same path  
   - Fixture: undrlla `medusa-manifest.example.json` → job `ready`  

**Total**: ~13 dev-days

## Non-goals

- Directus client-shop provision  
- Day-2 upgrade/suspend/destroy (future)  
- Flagship housing stack (separate undrlla deploy)
