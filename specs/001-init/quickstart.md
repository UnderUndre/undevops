# Quickstart: undevops

**Branch**: `specs/001-init` | **Date**: 2026-05-25

Get a self-hosted deployment platform running in under 15 minutes. No Kubernetes, no cloud vendor lock-in. Just you, a Linux server, and Docker.

---

## Prerequisites

- A Linux server (Ubuntu 22.04+ or Debian 12+) with:
  - At least **2GB RAM**, **2 CPU cores**
  - **Docker** and **Docker Compose** installed
  - A **public IP address**
  - A **domain name** pointing to the server (for automatic HTTPS via Traefik + Let's Encrypt)
- A machine with `curl` (or `wget`) to run the install script
- SSH access to the server (key-based recommended)

### Verify Prerequisites

```bash
# On your server
docker --version          # Docker version 24.0+
docker compose version    # Docker Compose v2+
free -h                   # At least 2GB total RAM
nproc                     # At least 2 cores
```

---

## Installation

### Step 1: Run the Installer

SSH into your server and run:

```bash
curl -fsSL https://get.undevops.com | bash
```

Or with `wget`:

```bash
wget -qO- https://get.undevops.com | bash
```

The installer will:
1. Create the `/opt/undevops` directory
2. Download `docker-compose.yml` and configuration files
3. Generate a random `UNDEVOPS_ENCRYPTION_KEY` for secret encryption
4. Prompt you for:
   - **Admin email** and **password** (first user)
   - **Domain name** (e.g., `deploy.yourdomain.com`)
   - **Email for Let's Encrypt** (TLS certificate notifications)
5. Pull Docker images and start services

### Step 2: Verify Installation

```bash
cd /opt/undevops

# Check all services are running
docker compose ps

# Expected output: all services "healthy" or "running"
# - undevops-server    (Next.js web UI + API)
# - undevops-mcp       (MCP gateway)
# - postgres            (PostgreSQL database)
# - redis               (Redis cache + queue)
# - traefik             (Reverse proxy + TLS)
```

Open your browser to `https://deploy.yourdomain.com`. You should see the login page.

### Step 3: Save Your Encryption Key

The encryption key was printed during installation. **Save it somewhere secure.**

```bash
# View the key (only works on the server)
cat /opt/undevops/.env | grep UNDEVOPS_ENCRYPTION_KEY
```

> **Warning**: If you lose this key, all encrypted secrets (environment variables, API keys) are unrecoverable. Store it in a password manager or offline backup. Do NOT commit it to git.

### Manual Installation (Alternative)

If you prefer manual setup or the installer doesn't work for your distro:

```bash
# Clone the repository
git clone https://github.com/undevops/undevops.git /opt/undevops
cd /opt/undevops

# Copy the example environment file
cp .env.example .env

# Edit .env — set at minimum:
#   UNDEVOPS_ADMIN_EMAIL, UNDEVOPS_ADMIN_PASSWORD
#   UNDEVOPS_DOMAIN, UNDEVOPS_ENCRYPTION_KEY
#   LETSENCRYPT_EMAIL
nano .env

# Generate an encryption key
openssl rand -hex 32

# Start services
docker compose up -d

# Run database migrations
docker compose exec server npx undevops db:migrate

# Create admin user
docker compose exec server npx undevops user:create \
  --email "admin@yourdomain.com" \
  --password "your-secure-password"
```

---

## First Deployment

### Step 1: Add Your Server

After logging in:

1. Go to **Servers** → **Add Server**
2. Enter your server's details:
   - **Name**: `my-server` (or any label)
   - **IP Address**: Your server's public IP
   - **SSH Port**: `22` (default)
   - **SSH Key**: Select or paste your SSH private key
3. Click **Connect**. undevops will verify SSH connectivity and install the Docker agent.

Or via CLI:

```bash
undevops servers add \
  --name "my-server" \
  --ip "203.0.113.42" \
  --ssh-key ~/.ssh/id_ed25519
```

### Step 2: Create a Project

1. Go to **Projects** → **New Project**
2. Fill in:
   - **Name**: `my-app`
   - **Repository URL**: `https://github.com/your-org/your-repo`
   - **Branch**: `main`
   - **Build Type**: `auto` (undevops detects Dockerfile, or uses nixpacks)
   - **Domain**: `app.yourdomain.com`
   - **Environment**: `production`
3. Click **Create**

Or via CLI:

```bash
undevops projects create \
  --name "my-app" \
  --repo "https://github.com/your-org/your-repo" \
  --branch main \
  --domain "app.yourdomain.com" \
  --environment production \
  --server my-server
```

### Step 3: Deploy

1. Click **Deploy** on the project page
2. Watch the build logs in real time
3. Once complete, verify your app is live at `https://app.yourdomain.com`

Or via CLI:

```bash
undevops deploy my-app

# Watch logs
undevops logs my-app --follow
```

### Step 4: Set Environment Variables

```bash
# Via CLI
undevops env set my-app \
  DATABASE_URL="postgresql://..." \
  API_KEY="sk-..."

# Redeploy to apply
undevops deploy my-app
```

Or via Web UI: **Project** → **Environment** → **Add Variable**

> Secret values are encrypted at rest with AES-256-GCM. They are never stored in plaintext in the database.

---

## MCP Integration

undevops exposes an MCP (Model Context Protocol) server that lets AI assistants like Claude Code manage your infrastructure directly.

### Step 1: Create an MCP Token

```bash
# Via CLI
undevops mcp-tokens create --name "claude-code" --scope "read,write"

# Output:
# Token: undevops_mcp_xxxxxxxxxxxxxxxx
# ⚠️  Copy this token now. It will NOT be shown again.
```

Or via Web UI: **Settings** → **MCP Tokens** → **Create Token**

### Step 2: Configure Claude Code

Add to your project's `.claude/settings.json` or global `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "undevops": {
      "command": "npx",
      "args": ["-y", "@undevops/mcp-client"],
      "env": {
        "UNDEVOPS_URL": "https://deploy.yourdomain.com",
        "UNDEVOPS_TOKEN": "undevops_mcp_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Step 3: Use MCP in Claude Code

Once configured, you can ask Claude Code to interact with your infrastructure:

```
> List all my projects and their status
> Deploy my-app to production
> Show me the last deployment logs for my-api
> Scale my-app to 3 replicas
> Rollback my-api to the previous deployment
```

Claude Code will use the MCP tools (`undevops_deploy`, `undevops_get_logs`, `undevops_inspect_deployment`, etc.) to perform these operations. All actions are recorded in the audit log.

### Available MCP Operations

| Operation | MCP Tool | Scope |
|-----------|----------|-------|
| Deploy a project | `undevops_deploy` | write |
| Rollback | `undevops_rollback` | write |
| Scale replicas | `undevops_scale` | exec |
| View logs | `undevops_get_logs` | read |
| List projects | `undevops_list_projects` | read |
| Inspect deployment | `undevops_inspect_deployment` | read |
| Diagnose failures | `undevops_diagnose_deployment` (prompt) | read |

See the full [MCP API Contract](contracts/mcp-api.md) for complete schema definitions.

---

## Plugin Development

Plugins extend undevops with custom behavior — notifications, auto-scaling, custom validation, and more.

### Quick Plugin: Deployment Notifier

1. Create the plugin directory:

```bash
mkdir -p plugins/deploy-notify
cd plugins/deploy-notify
```

2. Create `undevops-plugin.json`:

```json
{
  "name": "deploy-notify",
  "version": "1.0.0",
  "description": "Log a message after every successful deploy",
  "sdkVersion": "^0.1.0",
  "hooks": [
    { "name": "post-deploy", "priority": 90 }
  ],
  "permissions": ["deploy:read", "project:read"],
  "config": {
    "timeoutMs": 5000
  }
}
```

3. Create `index.ts`:

```typescript
import type { UndevopsPlugin, PostDeployPayload, PostDeployResult } from "@undevops/plugin-sdk";

export default class DeployNotifyPlugin implements UndevopsPlugin {
  readonly manifest = { name: "deploy-notify", version: "1.0.0" } as const;

  async onPostDeploy(payload: PostDeployPayload): Promise<PostDeployResult> {
    payload.context.logger.info("Deployment complete", {
      project: payload.projectName,
      environment: payload.environment,
      duration: `${(payload.totalDurationMs ?? 0) / 1000}s`,
    });

    return {};
  }
}
```

4. Install and enable:

```bash
# Via CLI
undevops plugins install ./plugins/deploy-notify
undevops plugins enable deploy-notify

# Verify
undevops plugins list
```

5. Test it — deploy any project and check the plugin logs:

```bash
undevops plugins logs deploy-notify
```

### Next Steps with Plugins

- See the [Plugin SDK Contract](contracts/plugin-sdk.md) for all lifecycle hooks and the full API
- Use the built-in test utilities: `import { createTestContext, mockPayload } from "@undevops/plugin-sdk/testing"`
- Publish your plugin to the community registry (coming soon)

---

## Backup Setup

Backups are encrypted and stored on S3-compatible storage. Works with AWS S3, MinIO, Cloudflare R2, Wasabi, or any S3-compatible provider.

### Step 1: Configure Backup Target

```bash
# Via CLI
undevops backup configure \
  --endpoint "https://s3.amazonaws.com" \
  --bucket "my-undevops-backups" \
  --region "us-east-1" \
  --access-key "AKIAIOSFODNN7EXAMPLE" \
  --secret-key "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  --path-prefix "undevops/" \
  --encryption-key "$(openssl rand -hex 32)"
```

Or via Web UI: **Settings** → **Backups** → **Configure**

> **Note**: The backup encryption key is separate from `UNDEVOPS_ENCRYPTION_KEY` for blast-radius isolation. Store it separately.

### Step 2: Create a Backup

```bash
# Manual backup
undevops backup create

# Check status
undevops backup list
```

### Step 3: Schedule Automatic Backups

```bash
# Daily at 3 AM UTC
undevops backup schedule --cron "0 3 * * *"

# Every 6 hours
undevops backup schedule --cron "0 */6 * * *"
```

Or via Web UI: **Settings** → **Backups** → **Schedule**

### Step 4: Restore from Backup

```bash
# List available backups
undevops backup list

# Restore from a specific backup
undevops backup restore --backup-id <backup-uuid>

# Restore to a fresh instance (disaster recovery)
# 1. Install undevops on a new server
# 2. Configure the same backup target
# 3. Run:
undevops backup restore --backup-id <backup-uuid> --target fresh
```

> **Restore process**: Download from S3 → Decrypt (AES-256-GCM) → pg_restore to PostgreSQL. Applications are stopped during restore.

---

## CLI Usage

The undevops CLI (`undevops`) talks directly to PostgreSQL and Redis — no API server dependency.

### Installation

```bash
# Install globally
npm install -g @undevops/cli

# Or use npx (no install)
npx @undevops/cli --help
```

### Common Commands

```bash
# Servers
undevops servers list
undevops servers add --name "prod-1" --ip "203.0.113.42"
undevops servers remove prod-1
undevops servers status prod-1

# Projects
undevops projects list
undevops projects create --name "my-app" --repo "https://github.com/org/repo"
undevops projects delete my-app
undevops projects info my-app

# Deployments
undevops deploy my-app
undevops deploy my-app --branch staging
undevops deploy my-app --commit abc1234
undevops rollback my-app
undevops rollback my-app --target-deployment <uuid>
undevops deployments list my-app
undevops deployments info <deployment-uuid>

# Logs
undevops logs my-app
undevops logs my-app --follow --level error
undevops logs my-app --since "2026-05-25T10:00:00Z"

# Scaling
undevops scale my-app --replicas 3
undevops scale my-app --replicas 0    # stop the app

# Environment Variables
undevops env list my-app
undevops env set my-app KEY1=value1 KEY2=value2
undevops env unset my-app KEY1

# MCP Tokens
undevops mcp-tokens create --name "ci-pipeline" --scope "read,write"
undevops mcp-tokens list
undevops mcp-tokens revoke <token-id>

# Plugins
undevops plugins install ./path/to/plugin
undevops plugins list
undevops plugins enable <plugin-name>
undevops plugins disable <plugin-name>
undevops plugins logs <plugin-name>

# Backups
undevops backup configure --endpoint ... --bucket ...
undevops backup create
undevops backup list
undevops backup restore --backup-id <uuid>
undevops backup schedule --cron "0 3 * * *"

# Audit
undevops audit list --limit 50
undevops audit list --actor mcp_token --action deploy

# System
undevops status
undevops db:migrate
undevops db:migrate:status
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for scripting) |
| `--quiet` | Suppress non-essential output |
| `--config <path>` | Use a specific config file |
| `--help` | Show help for any command |
| `--version` | Show CLI version |

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   Your Browser   │
                    │   (Web UI)       │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │    Traefik       │
                    │  (Reverse Proxy  │
                    │   + TLS/Let's   │
                    │    Encrypt)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐  ┌─────▼──────┐  ┌───▼──────────┐
     │  Web UI +   │  │  MCP Server│  │  CLI         │
     │  API Server │  │  (stdio/   │  │  (direct DB) │
     │  (Next.js)  │  │   SSE)     │  │              │
     └────────┬────┘  └─────┬──────┘  └───┬──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     @undevops/core          │
              │  (shared business logic)    │
              └──────┬──────────────┬───────┘
                     │              │
           ┌─────────▼──┐    ┌─────▼──────┐
           │ PostgreSQL │    │   Redis    │
           │ (state)    │    │ (cache +   │
           │            │    │  queues)   │
           └────────────┘    └────────────┘
                     │
              ┌──────▼───────┐
              │  Docker      │
              │  (containers)│
              └──────────────┘
```

---

## Next Steps

| Want to... | Go to |
|-----------|-------|
| Understand the full architecture | [Architecture](architecture.md) |
| Read all functional requirements | [Requirements](requirements.md) |
| Integrate MCP with your AI tools | [MCP API Contract](contracts/mcp-api.md) |
| Write a custom plugin | [Plugin SDK Contract](contracts/plugin-sdk.md) |
| Configure CI/CD webhooks | Web UI → Project → Webhooks |
| Set up multi-server cluster | Web UI → Servers → Add Server |
| Configure custom domains | Web UI → Project → Networking |
| View audit trail | Web UI → Audit or `undevops audit list` |

---

## Troubleshooting

### Services won't start

```bash
cd /opt/undevops
docker compose logs --tail=50
docker compose restart
```

### Can't connect to server via SSH

```bash
# Verify SSH connectivity from the undevops container
docker compose exec server undevops servers test-connection <server-name>

# Common issues:
# - SSH key not added to server's authorized_keys
# - Firewall blocking port 22
# - Wrong IP address
```

### TLS certificate not issued

```bash
# Check Traefik logs
docker compose logs traefik --tail=100

# Common issues:
# - DNS not pointing to server IP
# - Port 80/443 blocked by firewall
# - Let's Encrypt rate limit (5 certs/week per domain)
```

### Lost encryption key

If you lose `UNDEVOPS_ENCRYPTION_KEY`:
- All encrypted secrets (env vars, API keys) are **permanently unrecoverable**
- You can generate a new key and re-enter secrets manually
- Database backups encrypted with the backup key are unaffected (separate key)

```bash
# Generate a new key
openssl rand -hex 32

# Update .env
nano /opt/undevops/.env

# Restart services
docker compose restart
```

### Reset admin password

```bash
docker compose exec server npx undevops user:reset-password \
  --email "admin@yourdomain.com" \
  --password "new-secure-password"
```
