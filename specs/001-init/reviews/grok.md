# SpecKit Review: 001-init (undevops)

**Reviewer**: grok
**Reviewed at**: 2026-07-23T10:06:54Z
**Commit**: 3598ff9eaf8e2275231bb70fe08e1a4eb7b976a6
**Artifacts reviewed**: spec.md, architecture.md (main), README; plan/tasks if present under 001-init

## Summary

Strong PaaS differentiation (MCP, multi-AI review, plugins) on Dokploy foundations. Spec is large and credible for v0.x. Weak spots: **AI write-path abuse**, long-lived MCP tokens, and **undrlla-specific provision not owned by this feature** (split to 003). Constitution VI review gate analogy is good; operational RTO 30m may be optimistic for multi-tenant undrlla hosts.

## Findings

| ID | Severity | Area | Finding | Recommendation |
|---|---|---|---|---|
| F1 | HIGH | Security | MCP write actions + human approval — good. Long-lived bearer tokens without rotation automation (clarified) are a **stolen token = lasting blast radius**. | Max token TTL option; force rotation playbook; IP allowlist for exec scope. |
| F2 | HIGH | Security | Multi-AI review sends change payload to external AIs — **secrets in diffs/logs** risk. | Mandatory redaction pipeline before review fan-out; never attach .env. |
| F3 | MEDIUM | Failure modes | Plugin fault isolation specified; unclear if **pre-deploy plugin FAIL** blocks deploy. | Define hook severity: blocking vs best-effort per hook type. |
| F4 | MEDIUM | Scale | 50 servers / 500 projects design bound — undrlla many small tenants may hit **container density** before server count. | Add container/tenant density guidance for marketplace hosting. |
| F5 | MEDIUM | Stakeholder | Open-core split architected early — good; OSS purity vs undrlla proprietary shops co-hosting needs license clarity. | Document what can run closed marketplace code on OSS undevops. |
| F6 | LOW | Consistency | v0.x draft status vs "Approved" elsewhere — status hygiene. | Normalize Status field. |

## Alternative approaches considered

- Coolify/Dokploy unmodified + external CI only (no MCP moat).
- Kubernetes-native operators instead of Docker Swarm (heavier ops).

## VERDICT

```yaml
verdict: HIGH
reviewer: grok
reviewed_at: 2026-07-23T10:06:54Z
commit: 3598ff9eaf8e2275231bb70fe08e1a4eb7b976a6
critical_count: 0
high_count: 2
medium_count: 3
low_count: 1
```
