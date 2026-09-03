# Tasks: 003-undrlla-one-click-deploy (Medusa)

1. [BE] U-T1 — Ingest **Medusa** ProvisioningManifest schema (`2.0-medusa`) + OpenAPI  
   - Owner: backend-specialist  
   - Align with `undrlla/specs/002-provisioning-portal/contracts/medusa-provisioning-manifest.schema.json`  
   - Reject raw secrets; require `runtime.engine=medusa`

2. [BE] U-T2 — HMAC auth + nonce store + rate limit  
   - Depends: U-T1  

3. [BE] U-T3 — Job collection + state machine + cleanup worker  
   - Depends: U-T1  
   - States: pending / provisioning / awaiting_dns / ready / failed / rolled_back  

4. [BE] U-T4 — Postgres + Redis + Medusa template-shop bootstrap  
   - Depends: U-T3  
   - Pull `runtime.image`, inject secrets, `medusa db:migrate`, healthchecks  
   - **Not** Directus schema.snapshot  

5. [BE] U-T5 — undrllanding deploy + Traefik labels + ACME / awaiting_dns  
   - Depends: U-T4  
   - Env: `MEDUSA_BACKEND_URL`, `TENANT_MODE=client`, `FEATURES=shop`, Paddle public token  

6. [BE] U-T6 — Status webhook to undrlla + MCP `ingest_provisioning_manifest`  
   - Depends: U-T3  

7. [QA] U-T7 — Contract test: `medusa-manifest.example.json` → ready job  
   - Depends: U-T5, U-T6  

**Total estimate**: 13d  

**Depends**: undreseller template-shop image buildable (Gate 0).
