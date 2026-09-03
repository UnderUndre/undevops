# SpecKit Review: 003-undrlla-one-click-deploy

**Reviewer**: grok
**Reviewed at**: 2026-07-23T10:06:54Z
**Commit**: 3598ff9eaf8e2275231bb70fe08e1a4eb7b976a6
**Artifacts reviewed**: spec.md; cross-checked undrlla/002, ECOSYSTEM.md

## Summary

Useful intent (Directus + undrllanding + Traefik TLS in <60s) but **critically diverges** from undrlla ProvisioningManifest SoT. Thin spec missing plan/tasks, day-2, secret injection detail, multi-tenant DB isolation proof.

## Findings

| ID | Severity | Area | Finding | Recommendation |
|---|---|---|---|---|
| F1 | CRITICAL | Cross-repo | Payload shape (	enant_id, domain, admin_email, undesign_theme) ≠ undrlla **ProvisioningManifest** (secrets refs, list_on_hub, share_catalog, billing_reference). ECOSYSTEM says undrlla wins. | Replace this API with manifest ingestion; keep HMAC + job status. |
| F2 | CRITICAL | Artifacts | No plan.md / tasks.md. | Author full SpecKit set. |
| F3 | HIGH | Security | HMAC shared secret between undrlla and undevops — rotation, multi-env, replay protection not specified. | Nonce/timestamp window; secret rotation runbook. |
| F4 | HIGH | Failure modes | Schema apply failure mid-bootstrap — rollback of half-created Directus/DB/Traefik routes unspecified. | Transactional job states: pending/provisioning/failed/rolled_back; cleanup worker. |
| F5 | MEDIUM | Perf | SC-001 60s E2E may be unrealistic for Directus image pull + schema apply cold start. | Dual metrics: warm vs cold; don't gate UX on cold pull. |
| F6 | MEDIUM | Edge case | Custom domain DNS not ready at provision — ACME fail loop. | Job waits for DNS or marks needs_dns with retries. |

## Alternative approaches considered

- GitOps: undevops watches desired tenant CRs.
- Shared Directus multi-tenant (rejected by undrlla isolation model).

## VERDICT

```yaml
verdict: CRITICAL
reviewer: grok
reviewed_at: 2026-07-23T10:06:54Z
commit: 3598ff9eaf8e2275231bb70fe08e1a4eb7b976a6
critical_count: 2
high_count: 2
medium_count: 2
low_count: 0
```
