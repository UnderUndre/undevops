<div align="center">

# undevops

**AI-native, self-hosted deployment platform.** Forked from [Dokploy](https://github.com/Dokploy/dokploy) v0.29.5 (Apache 2.0), extended with a first-class [Model Context Protocol](https://modelcontextprotocol.io) gateway, multi-AI pre-deploy review, and a TypeScript plugin system.

</div>

---

undevops is a Platform as a Service (PaaS) for managing servers and deploying projects. It keeps everything that makes Dokploy a credible PaaS — Docker orchestration, Traefik routing + TLS, Docker Swarm clustering, one-click services, backups — and layers operational capabilities no incumbent offers in 2026:

- **AI agents are first-class operators**, not read-only spectators calling REST endpoints. They read infrastructure state, propose changes, and (with human approval) execute deployments — over MCP, the protocol agents speak natively.
- **Multi-AI pre-deploy review gates**: before a change hits production, N configured AI reviewers (Claude, Gemini, OpenAI, Codex, custom) each emit a verdict. Strict by default — any FAIL/ABSENT blocks the deploy until a human override is recorded.
- **Hook-based TypeScript plugin system** (Dokku's `plugn` pattern, translated to TS runtime) with fault isolation: one bad plugin never blocks a deploy.

> **Status**: v0.1–v0.5 initial release is under active design — see [`specs/001-init/spec.md`](specs/001-init/spec.md). All features are *Planned* until the relevant implementation wave ships.

---

## ✨ Features

**Core deployment (inherited from Dokploy v0.29.5)**
- Deploy any container-based app from git (Node.js, PHP, Python, Go, Ruby, …) via Dockerfile, Docker Compose, nixpacks, or railpack.
- Managed databases: PostgreSQL, MySQL, MongoDB, MariaDB, libsql, Redis.
- Automated database backups to S3-compatible storage (AWS S3, Backblaze B2, Cloudflare R2, MinIO).
- Multi-node scaling via Docker Swarm.
- Traefik integration: automatic routing + Let's Encrypt TLS.
- Real-time CPU / memory / storage / network monitoring.
- Notifications on deploy success/failure (Slack, Discord, Telegram, Email).

**AI-native layer (new in undevops)**
- **MCP read gateway** — servers, projects, deployments, logs, and audit events exposed as MCP resources. Secret values are redacted at the serialization boundary before any response leaves the platform.
- **MCP write gateway** — agents can `deploy`, `rollback`, `scale`. Write actions queue for human approval by default; per-project/per-agent auto-approval is available but off.
- **Multi-AI review gate** — fan out a change payload to N reviewers in parallel, collect verdicts within a per-reviewer timeout, enforce strict-by-default blocking.
- **TypeScript plugin SDK** — subscribe to `pre-deploy`, `post-deploy`, `deploy-failed`, `server-added`, … Faulted plugins are isolated and surfaced in the UI.
- **CLI** with direct PostgreSQL/Redis access (works even if the API server is down), JSON output suitable for piping.

---

## 🚀 Quickstart

From a fresh Linux server (Ubuntu 22.04+ / Debian 12+, 2 GB RAM, 2 cores, Docker + Docker Compose installed, a domain pointed at the box):

```bash
curl -fsSL https://get.undevops.com | bash
```

The installer creates `/opt/undevops`, generates an `UNDEVOPS_ENCRYPTION_KEY`, prompts for admin credentials + domain, and pulls the service stack: `undevops-server` (web + API), `undevops-mcp` (MCP gateway), `postgres`, `redis`, `traefik`.

Target: **fresh VPS → deployed app over HTTPS in under 15 minutes** (SC-001).

Full setup, encryption-key handling, backup/restore, and MCP-client wiring: see [`specs/001-init/quickstart.md`](specs/001-init/quickstart.md).

---

## 🧱 Monorepo layout

pnpm workspaces. Apps are thin transport layers; business logic lives in packages.

```text
undevops/
├── apps/
│   ├── web/              # Next.js 16 web UI
│   ├── api/              # Hono + tRPC REST API
│   ├── mcp-server/       # MCP gateway (stdio + SSE), standalone container
│   ├── cli/              # headless CLI, direct DB access
│   └── scheduler/        # BullMQ job scheduler (backups, cleanup)
├── packages/
│   ├── server/           # Drizzle schema + services (existing)
│   ├── core/             # core deployment engine (extracted, open-core boundary)
│   ├── plugin-sdk/       # plugin authoring SDK
│   └── ai-pack/          # MCP resource/tool logic, AI reviewers, gate evaluator
└── specs/                # architecture + feature specs (source of truth)
```

Package dependency rule: **`packages/core` MUST build without `packages/ai-pack` present.** This is the open-core readiness gate — enforced in CI on every push (FR-030, SC-005).

---

## 🛠 Tech stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Runtime          | Node.js 24+, TypeScript 5.8+                 |
| Package manager  | pnpm 10.22+                                  |
| Web              | Next.js 16                                   |
| API              | tRPC 11 + Hono 4                             |
| ORM              | Drizzle ORM 0.45                             |
| Database         | PostgreSQL 15+                               |
| Queue / cache    | Redis 7 (ioredis + BullMQ)                   |
| Containers       | dockerode 4 + Docker Swarm                   |
| Reverse proxy    | Traefik 3 (TLS via Let's Encrypt)            |
| Remote shell     | ssh2                                         |
| Auth             | better-auth 1.5                              |
| AI               | Vercel AI SDK 6 (provider-agnostic)          |
| Validation       | Zod 4                                        |
| Logging          | pino 9                                       |
| Lint / format    | Biome 2                                      |
| Tests            | Vitest 4                                     |
| CLI              | commander + ora                              |

Secrets at rest: AES-256-GCM with an admin-supplied `UNDEVOPS_ENCRYPTION_KEY`. The key is **not** stored in the database — losing it makes encrypted secrets unrecoverable by design. Backups use a separate key (blast-radius isolation).

---

## 🔒 Security boundaries

1. **Secret redaction** — every MCP response, AI payload, and audit-log entry strips secret values at the serialization boundary. Keys visible, values replaced with `***`.
2. **MCP token scopes** — long-lived bearer tokens, validated by SHA-256 hash + `revoked_at` lookup. Scope = access-level (`read` / `write` / `exec`) × target (specific project or all-projects).
3. **Plugin permissions** — declared in the manifest, granted by the admin at install time, enforced at runtime (least-privilege).
4. **Agent action approval** — write/exec MCP actions queue for human approval. Default-on; per-project auto-approve available. Every approve/reject is audit-logged with admin identity + reason.
5. **Encryption at rest** — secrets AES-256-GCM (env-var key), backups AES-256-GCM (separate key).

---

## 👥 User stories (v0.1–v0.5)

Full detail in [`specs/001-init/spec.md`](specs/001-init/spec.md). Priority order:

| #  | Story                                                     | Priority |
| -- | --------------------------------------------------------- | -------- |
| 1  | Solo dev deploys first project from git over HTTPS        | P1       |
| 2  | AI coding agent reads infra state via MCP                 | P1       |
| 3  | Platform author writes a custom TS plugin                 | P2       |
| 4  | AI agent performs an authorized deployment via MCP        | P2       |
| 5  | Multi-AI pre-deploy review gates a production change      | P3       |
| 6  | Multi-server cluster with horizontal scaling              | P3       |

---

## 📐 Scale envelope (v0.x)

Single-instance controller, no HA. Designed for solo developers and small teams.

| Dimension                          | Limit           |
| ---------------------------------- | --------------- |
| Servers per cluster                | 50              |
| Projects per admin                 | 500             |
| Replicas per deployment            | 30              |
| Audit / log retention              | 30 days         |
| MCP read p95 latency               | < 500 ms        |
| Fresh install → deployed app       | < 15 minutes    |
| AI verdict collection (2 reviewers)| < 60 seconds    |
| Backup RTO (fresh host)            | ~30 minutes     |
| Concurrent deploys per project     | 1 (queue collapses to latest) |

Above these bounds behavior is undefined for v0.x; raising them is a v0.y concern.

---

## 🧭 Development

```bash
pnpm install                 # install workspace deps
pnpm web:dev                 # Next.js dev server
pnpm server:dev              # packages/server watch mode
pnpm -r run typecheck        # typecheck all packages
pnpm build                   # build all packages
pnpm test                    # Vitest (web)
pnpm format-and-lint:fix     # Biome autofix
```

Requirements: Node 24+, pnpm 10.22+. The dev environment **must** work on Windows, macOS, and Linux from a single setup procedure (FR-032, SC-009) — bash-only scripts are an anti-pattern.

---

## 📚 Documentation

| Domain        | File                                                       |
| ------------- | ---------------------------------------------------------- |
| Architecture  | [`specs/main/architecture.md`](specs/main/architecture.md) |
| Requirements  | [`specs/001-init/spec.md`](specs/001-init/spec.md)         |
| Data model    | [`specs/001-init/data-model.md`](specs/001-init/data-model.md)        |
| Quickstart    | [`specs/001-init/quickstart.md`](specs/001-init/quickstart.md)        |
| Plan          | [`specs/001-init/plan.md`](specs/001-init/plan.md)                    |
| Research      | [`specs/001-init/research.md`](specs/001-init/research.md)            |
| API contracts | [`specs/001-init/contracts/`](specs/001-init/contracts/)              |

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Feature work follows the SpecKit pipeline (`specify → clarify → plan → tasks → review → implement`) — see `.claude/commands/speckit.*.md`. The cross-AI review gate (constitution Principle VI) blocks `/speckit.implement` until `analyze.md` PASS + ≥2 external reviewers PASS.

---

## 📄 License & attribution

Apache 2.0. undevops is forked from [Dokploy](https://github.com/Dokploy/dokploy) v0.29.5 (Apache 2.0); all original copyright notices and license text are preserved in every distributed artifact (Docker image, npm package, source distribution) per FR-031 / SC-007. ~85% of Docker/Traefik/SSH/build infrastructure is reused directly from upstream.
