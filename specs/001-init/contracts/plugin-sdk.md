# Plugin SDK Contract: undevops Plugin System

**Branch**: `specs/001-init` | **Date**: 2026-05-25 | **Version**: 0.1.0

## Overview

The undevops plugin SDK allows TypeScript plugins to subscribe to lifecycle hooks and extend platform behavior. The plugin system is inspired by Dokku's plugn, adapted for TypeScript with typed payloads and a permission model.

**Package**: `@undevops/plugin-sdk`
**Runtime**: Node.js 20+

### Architecture

```
packages/plugin-sdk/              → Types, interfaces, test utilities (plugin authors depend on this)
packages/core/src/plugins/        → Host implementation: loader, dispatcher, lifecycle manager

┌─────────────────────────────────────────────────┐
│                  Plugin Host                     │
│  (packages/core/src/plugins/ — loads at startup) │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Plugin A │  │ Plugin B │  │ Plugin C │      │
│  │ (loaded) │  │ (loaded) │  │ (faulted)│      │
│  └────┬─────┘  └────┬─────┘  └──────────┘      │
│       │              │                           │
│  ┌────▼──────────────▼────┐                     │
│  │   Hook Dispatcher      │                     │
│  │  (sequential, ordered) │                     │
│  └────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

- **`packages/plugin-sdk/`** — Published as `@undevops/plugin-sdk`. Contains TypeScript types, interfaces, and test utilities. Plugin authors depend on this package. It does NOT import from `@undevops/core`, avoiding circular dependencies.
- **`packages/core/src/plugins/`** — Internal host implementation. Imports types from `@undevops/plugin-sdk`. Contains the plugin loader, hook dispatcher, lifecycle manager, and permission enforcement.

Plugins are loaded at startup from a configurable directory. Each plugin is an independent module with its own `undevops-plugin.json` manifest and a default export implementing the plugin interface.

---

## Plugin Manifest (`undevops-plugin.json`)

Every plugin must include a `undevops-plugin.json` file at its root. This manifest declares the plugin's identity, hooks, permissions, and compatibility.

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$",
      "minLength": 2,
      "maxLength": 64,
      "description": "Unique plugin identifier (slug format)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$",
      "description": "Semantic version of the plugin"
    },
    "description": {
      "type": "string",
      "maxLength": 256,
      "description": "Human-readable description"
    },
    "author": {
      "type": "string",
      "maxLength": 128,
      "description": "Author name or organization"
    },
    "license": {
      "type": "string",
      "description": "SPDX license identifier"
    },
    "homepage": {
      "type": "string",
      "format": "uri",
      "description": "Plugin homepage or repository URL"
    },
    "sdkVersion": {
      "type": "string",
      "pattern": "^\\^\\d+\\.\\d+\\.\\d+$",
      "description": "Compatible SDK version range (caret syntax)"
    },
    "hooks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "enum": [
              "pre-deploy",
              "post-deploy",
              "deploy-failed",
              "server-added",
              "server-removed",
              "project-created",
              "project-deleted"
            ]
          },
          "priority": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "default": 50,
            "description": "Execution order. Lower = earlier. Same priority = alphabetical by plugin name."
          }
        },
        "required": ["name"]
      },
      "description": "Lifecycle hooks this plugin subscribes to"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "deploy:read",
          "deploy:write",
          "server:read",
          "server:write",
          "project:read",
          "project:write",
          "logs:read",
          "audit:read",
          "env:read",
          "env:write",
          "network:read",
          "network:write"
        ]
      },
      "description": "Permissions required by this plugin. Empty array = read-only metadata access."
    },
    "config": {
      "type": "object",
      "properties": {
        "timeoutMs": {
          "type": "integer",
          "minimum": 1000,
          "maximum": 30000,
          "default": 5000,
          "description": "Maximum execution time per hook invocation in milliseconds"
        },
        "retryOnError": {
          "type": "boolean",
          "default": false,
          "description": "Whether the host should retry the hook on transient errors"
        },
        "maxRetries": {
          "type": "integer",
          "minimum": 0,
          "maximum": 3,
          "default": 0
        }
      },
      "description": "Execution configuration"
    },
    "settings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "pattern": "^[A-Z][A-Z0-9_]*$",
            "description": "Setting key (CONSTANT_CASE)"
          },
          "label": {
            "type": "string",
            "description": "Human-readable label for the Web UI"
          },
          "type": {
            "type": "string",
            "enum": ["string", "number", "boolean", "select"],
            "description": "Setting type"
          },
          "required": {
            "type": "boolean",
            "default": false
          },
          "default": {
            "description": "Default value (type matches 'type' field)"
          },
          "options": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "label": { "type": "string" },
                "value": {}
              }
            },
            "description": "Options for 'select' type"
          },
          "secret": {
            "type": "boolean",
            "default": false,
            "description": "If true, value is stored encrypted and redacted in API responses"
          }
        },
        "required": ["key", "label", "type"]
      },
      "description": "User-configurable settings exposed via Web UI"
    }
  },
  "required": ["name", "version", "sdkVersion", "hooks"]
}
```

### Example Manifest

```json
{
  "name": "slack-notify",
  "version": "1.0.0",
  "description": "Send deployment notifications to Slack",
  "author": "undevops-community",
  "license": "MIT",
  "sdkVersion": "^0.1.0",
  "hooks": [
    { "name": "post-deploy", "priority": 80 },
    { "name": "deploy-failed", "priority": 80 }
  ],
  "permissions": ["deploy:read", "project:read"],
  "config": {
    "timeoutMs": 10000,
    "retryOnError": true,
    "maxRetries": 2
  },
  "settings": [
    {
      "key": "SLACK_WEBHOOK_URL",
      "label": "Slack Webhook URL",
      "type": "string",
      "required": true,
      "secret": true
    },
    {
      "key": "NOTIFY_ON_SUCCESS",
      "label": "Notify on successful deploy",
      "type": "boolean",
      "default": true
    },
    {
      "key": "CHANNEL",
      "label": "Slack Channel",
      "type": "string",
      "required": false
    }
  ]
}
```

---

## Plugin Interface

### TypeScript Types

```typescript
import type { ZodSchema } from "zod";

interface UndevopsPlugin {
  readonly manifest: PluginManifest;

  onPreDeploy?(payload: PreDeployPayload): Promise<PreDeployResult>;
  onPostDeploy?(payload: PostDeployPayload): Promise<PostDeployResult>;
  onDeployFailed?(payload: DeployFailedPayload): Promise<DeployFailedResult>;
  onServerAdded?(payload: ServerAddedPayload): Promise<void>;
  onServerRemoved?(payload: ServerRemovedPayload): Promise<void>;
  onProjectCreated?(payload: ProjectCreatedPayload): Promise<void>;
  onProjectDeleted?(payload: ProjectDeletedPayload): Promise<void>;
}

interface PluginContext {
  pluginName: string;
  pluginVersion: string;
  settings: Record<string, unknown>;
  logger: PluginLogger;
  api: PluginApiClient;
}

interface PluginLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

interface PluginApiClient {
  getProject(projectId: string): Promise<Project>;
  getServer(serverId: string): Promise<Server>;
  getDeployment(deploymentId: string): Promise<Deployment>;
  getProjectLogs(projectId: string, opts?: { lines?: number; level?: string }): Promise<LogLine[]>;
}
```

---

## Lifecycle Hooks

### `pre-deploy`

Fired before a deployment begins. Plugins can validate, mutate, or veto the deployment.

**When**: After deployment is queued, before the build starts.
**Order**: Sequential by priority (ascending). If any plugin returns `{ abort: true }`, the deployment is cancelled.
**Timeout**: Configurable per plugin (default 5s).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "projectId": { "type": "string" },
    "projectName": { "type": "string" },
    "projectSlug": { "type": "string" },
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "environment": { "type": "string", "maxLength": 64 },
    "trigger": { "type": "string", "enum": ["manual", "webhook", "cli", "mcp", "plugin", "rollback"] },
    "actorType": { "type": "string", "enum": ["human", "agent", "plugin", "system"] },
    "actorId": { "type": "string" },
    "branch": { "type": "string" },
    "commitHash": { "type": "string" },
    "commitMessage": { "type": "string" },
    "previousDeploymentId": { "type": "string" },
    "previousStatus": { "type": "string" },
    "envVars": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Environment variables (secret values REDACTED regardless of permissions; non-secret values require env:read permission)"
    },
    "buildType": { "type": "string" },
    "imageTag": { "type": "string" },
    "replicas": { "type": "integer" },
    "domain": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["deploymentId", "projectId", "projectName", "serverId", "environment", "trigger", "timestamp"]
}
```

**Return type:**

```typescript
interface PreDeployResult {
  abort?: boolean;
  reason?: string;
  envOverrides?: Record<string, string>;
  metadata?: Record<string, unknown>;
}
```

If `abort: true`, the deployment is cancelled with status `cancelled`. The `reason` is recorded in the deployment record and audit log. Subsequent plugins in the chain are NOT called.

If `envOverrides` is provided, these values are merged into the deployment's environment (overriding existing values). This allows plugins like config-injection to work.

---

### `post-deploy`

Fired after a deployment succeeds and passes health checks.

**When**: After the new container is running and healthy.
**Order**: Sequential by priority (ascending). Failures are logged but do NOT affect the deployment.
**Timeout**: Configurable per plugin (default 5s).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "projectId": { "type": "string" },
    "projectName": { "type": "string" },
    "projectSlug": { "type": "string" },
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "environment": { "type": "string", "maxLength": 64 },
    "trigger": { "type": "string" },
    "actorType": { "type": "string" },
    "actorId": { "type": "string" },
    "branch": { "type": "string" },
    "commitHash": { "type": "string" },
    "commitMessage": { "type": "string" },
    "imageTag": { "type": "string" },
    "replicas": { "type": "integer" },
    "domain": { "type": "string" },
    "previousDeploymentId": { "type": "string" },
    "buildDurationMs": { "type": "integer" },
    "deployDurationMs": { "type": "integer" },
    "totalDurationMs": { "type": "integer" },
    "healthStatus": {
      "type": "object",
      "properties": {
        "healthy": { "type": "boolean" },
        "httpStatusCode": { "type": "integer" },
        "responseTimeMs": { "type": "integer" }
      }
    },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["deploymentId", "projectId", "projectName", "serverId", "environment", "timestamp"]
}
```

**Return type:**

```typescript
interface PostDeployResult {
  metadata?: Record<string, unknown>;
}
```

---

### `deploy-failed`

Fired when a deployment fails (build error, container crash, health check failure).

**When**: Immediately after failure is detected.
**Order**: Sequential by priority (ascending). Failures are logged but do NOT affect the error handling.
**Timeout**: Configurable per plugin (default 5s).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "projectId": { "type": "string" },
    "projectName": { "type": "string" },
    "projectSlug": { "type": "string" },
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "environment": { "type": "string", "maxLength": 64 },
    "trigger": { "type": "string" },
    "actorType": { "type": "string" },
    "actorId": { "type": "string" },
    "branch": { "type": "string" },
    "commitHash": { "type": "string" },
    "commitMessage": { "type": "string" },
    "failureStage": {
      "type": "string",
      "enum": ["build", "deploy", "health_check", "pre_deploy_hook", "unknown"]
    },
    "errorMessage": { "type": "string" },
    "errorStack": { "type": "string" },
    "buildLogs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "level": { "type": "string" },
          "message": { "type": "string" }
        }
      },
      "description": "Last 20 log lines from the failed stage"
    },
    "previousDeploymentId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["deploymentId", "projectId", "projectName", "serverId", "failureStage", "errorMessage", "timestamp"]
}
```

**Return type:**

```typescript
interface DeployFailedResult {
  metadata?: Record<string, unknown>;
}
```

---

### `server-added`

Fired when a new server is registered to the cluster.

**When**: After the server passes initial health check and SSH connectivity test.
**Order**: Sequential by priority (ascending).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "address": {
      "type": "string",
      "description": "IP address (v4/v6) or hostname of the server"
    },
    "port": { "type": "integer" },
    "os": { "type": "string" },
    "cpuCores": { "type": "integer" },
    "totalMemoryMB": { "type": "integer" },
    "dockerVersion": { "type": "string" },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "actorType": { "type": "string", "enum": ["human", "agent", "plugin", "system"] },
    "actorId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["serverId", "serverName", "address", "timestamp"]
}
```

**Return type:** `Promise<void>` — return value is ignored.

---

### `server-removed`

Fired when a server is removed from the cluster.

**When**: Before the server record is deleted. Projects on this server have already been migrated or stopped.
**Order**: Sequential by priority (ascending).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "address": {
      "type": "string",
      "description": "IP address (v4/v6) or hostname of the server"
    },
    "projectsAffected": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "projectId": { "type": "string" },
          "projectName": { "type": "string" },
          "action": { "type": "string", "enum": ["migrated", "stopped", "deleted"] }
        }
      }
    },
    "reason": { "type": "string", "enum": ["manual", "health_failure", "decommissioned"] },
    "actorType": { "type": "string", "enum": ["human", "agent", "plugin", "system"] },
    "actorId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["serverId", "serverName", "address", "reason", "timestamp"]
}
```

**Return type:** `Promise<void>` — return value is ignored.

---

### `project-created`

Fired when a new project is created.

**When**: After the project record is persisted. Before any deployment.
**Order**: Sequential by priority (ascending).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": { "type": "string" },
    "projectName": { "type": "string" },
    "projectSlug": { "type": "string" },
    "description": { "type": "string" },
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "environment": { "type": "string", "maxLength": 64 },
    "repository": {
      "type": "object",
      "properties": {
        "url": { "type": "string" },
        "branch": { "type": "string" },
        "provider": { "type": "string" }
      }
    },
    "buildType": { "type": "string" },
    "domain": { "type": "string" },
    "actorType": { "type": "string", "enum": ["human", "agent", "plugin", "system"] },
    "actorId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["projectId", "projectName", "projectSlug", "serverId", "environment", "timestamp"]
}
```

**Return type:** `Promise<void>` — return value is ignored.

---

### `project-deleted`

Fired when a project is deleted.

**When**: Before the project record is deleted. All containers have been stopped.
**Order**: Sequential by priority (ascending).

**Payload schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": { "type": "string" },
    "projectName": { "type": "string" },
    "projectSlug": { "type": "string" },
    "serverId": { "type": "string" },
    "serverName": { "type": "string" },
    "environment": { "type": "string" },
    "lastDeploymentId": { "type": "string" },
    "totalDeployments": { "type": "integer" },
    "actorType": { "type": "string", "enum": ["human", "agent", "plugin", "system"] },
    "actorId": { "type": "string" },
    "reason": { "type": "string", "enum": ["manual", "cleanup", "cascade"] },
    "timestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["projectId", "projectName", "projectSlug", "serverId", "reason", "timestamp"]
}
```

**Return type:** `Promise<void>` — return value is ignored.

---

## Permission Model

Plugins declare required permissions in their manifest. The plugin host enforces these at runtime.

The canonical permission enum is defined in this document (§Permission Definitions). Plugin manifests declaring permissions outside this set MUST be rejected at install time by the plugin loader (T073). The data model stores granted permissions as `text[]` but validation against this enum is mandatory.

### Permission Definitions

| Permission      | Scope                            | Description                                       |
|----------------|----------------------------------|---------------------------------------------------|
| `deploy:read`  | Deployment metadata              | Read deployment status, history, build info       |
| `deploy:write` | Deployment actions               | Trigger deployments, rollbacks                     |
| `server:read`  | Server metadata                  | Read server details, resource usage               |
| `server:write` | Server management                | Add, remove, update servers                        |
| `project:read` | Project metadata                 | Read project config, repository info              |
| `project:write`| Project management               | Create, update, delete projects                    |
| `logs:read`    | Application logs                 | Read structured log output                         |
| `audit:read`   | Audit events                     | Read audit trail                                   |
| `env:read`     | Environment variables            | Read non-secret environment variable keys and redacted values. Secret values are ALWAYS redacted regardless of this permission. Plugins cannot access raw secret values. |
| `env:write`    | Environment variables            | Set/update env vars                                |
| `network:read` | Network configuration            | Read Traefik routes, domains, TLS state           |
| `network:write`| Network configuration            | Modify routes, domains, TLS settings               |

**Note**: There is no permission that grants access to raw secret values. This is by design (SC-008).

### Enforcement

1. **Manifest declaration**: Plugin must declare all permissions it needs.
2. **Admin approval**: On install, the admin sees requested permissions and must approve.
3. **Runtime check**: Plugin host wraps the `PluginApiClient` with permission checks. Any call requiring an ungranted permission throws `PluginPermissionError`.
4. **Payload filtering**: Hook payloads are filtered based on permissions:
   - Without `env:read`: `envVars` field is omitted from `pre-deploy` payload
   - Without `logs:read`: `buildLogs` field is omitted from `deploy-failed` payload
   - Without `project:read`: repository URL is omitted from payloads

### Permission Approval Flow

```
Plugin installed → Manifest parsed → Permissions extracted
                                         │
                                         ▼
                                Admin sees permission list
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                          Approve ALL            Reject
                              │                     │
                    Plugin: active          Plugin: disabled
                    (granted permissions)   (admin notified)
```

---

## Error Handling

Plugin fault isolation per FR-018. A failing plugin must never compromise the platform.

### Fault States

| State      | Meaning                                              | Recovery                          |
|-----------|------------------------------------------------------|-----------------------------------|
| `active`  | Plugin loaded and running normally                   | N/A                               |
| `faulted` | Plugin threw an unhandled error during hook execution | Auto-retried on next hook invocation |
| `disabled`| Admin manually disabled the plugin                   | Admin re-enables via UI/CLI       |
| `failed`  | Plugin failed to load (manifest error, syntax error) | Fix plugin + restart platform     |

### Error Handling Rules

1. **Hook execution timeout**: If a plugin exceeds its configured `timeoutMs`, the hook is aborted. Plugin transitions to `faulted`. The hook execution continues with the next plugin.

2. **Unhandled exception**: If a plugin throws during a hook:
   - Error is logged with full stack trace
   - Plugin transitions to `faulted`
   - If `retryOnError: true`, the host retries up to `maxRetries` times with 1s backoff
   - If all retries fail, plugin stays `faulted`

3. **Pre-deploy abort propagation**: If a plugin returns `{ abort: true }`, the deployment is cancelled. No subsequent plugins run. The abort reason is recorded.

4. **Non-critical hooks**: For `post-deploy`, `deploy-failed`, `server-*`, `project-*` hooks, a plugin failure does NOT affect the operation. The error is logged and the plugin is marked `faulted`.

5. **Critical hooks**: For `pre-deploy`, if a faulted plugin is next in the chain, it is **skipped** (not executed). The deployment proceeds. Admin is notified of the skip.

6. **Crash loop prevention**: If a plugin transitions to `faulted` more than 3 times within 10 minutes, it transitions to `disabled` automatically. Admin must re-enable it. The fault counter resets only when the plugin transitions back to `active` state (not on restart).

### Error Types

```typescript
class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginName: string,
    public readonly hookName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "PluginError";
  }
}

class PluginTimeoutError extends PluginError {
  constructor(pluginName: string, hookName: string, timeoutMs: number) {
    super(
      `Plugin ${pluginName} timed out on ${hookName} after ${timeoutMs}ms`,
      pluginName,
      hookName
    );
    this.name = "PluginTimeoutError";
  }
}

class PluginPermissionError extends PluginError {
  constructor(
    pluginName: string,
    permission: string,
    action: string
  ) {
    super(
      `Plugin ${pluginName} lacks permission ${permission} for ${action}`,
      pluginName,
      "permission_check"
    );
    this.name = "PluginPermissionError";
  }
}

class PluginManifestError extends Error {
  constructor(
    public readonly pluginName: string,
    public readonly validationErrors: string[]
  ) {
    super(`Invalid manifest for plugin ${pluginName}: ${validationErrors.join(", ")}`);
    this.name = "PluginManifestError";
  }
}
```

---

## Plugin Loading

### Directory Structure

```
plugins/
├── slack-notify/
│   ├── undevops-plugin.json
│   ├── index.ts          (or index.js)
│   └── package.json
├── auto-scaler/
│   ├── undevops-plugin.json
│   ├── index.ts
│   └── package.json
└── ...
```

Plugin directory is configurable via `UNDEVOPS_PLUGINS_DIR` environment variable. Default: `./plugins` relative to the working directory.

### Load Sequence

1. Scan plugin directory for subdirectories containing `undevops-plugin.json`
2. Validate each manifest against the schema
3. Check SDK version compatibility
4. Load plugin module (dynamic import)
5. Verify plugin exports match declared hooks
6. Record plugin state as `active` in `plugins` table
7. Register hook subscriptions with the hook dispatcher

### Startup Validation

If any plugin fails validation (step 2-5), it is recorded as `failed` in the database with the validation error. The platform starts normally without that plugin. Admin is notified via the Web UI.

---

## Plugin API Client

The `PluginApiClient` provided in the `PluginContext` is a scoped, permission-checked API client.

```typescript
interface PluginApiClient {
  getProject(projectId: string): Promise<Project>;
  getServer(serverId: string): Promise<Server>;
  getDeployment(deploymentId: string): Promise<Deployment>;
  getProjectLogs(
    projectId: string,
    opts?: { lines?: number; level?: string }
  ): Promise<LogLine[]>;
}
```

All calls are:
- **Permission-checked**: Throws `PluginPermissionError` if the plugin lacks the required permission
- **Rate-limited**: 30 requests per minute per plugin
- **Timeout-bounded**: 5s per call
- **Audit-logged**: Every API call is recorded in the audit trail with `actorType: "plugin"` and `actorId: <plugin-name>`

---

## Versioning

### SDK Version Contract

The `sdkVersion` field in the manifest uses caret semver (`^major.minor.patch`):

| SDK Version | Manifest `sdkVersion` | Compatibility |
|-------------|----------------------|---------------|
| 0.1.0       | `^0.1.0`             | 0.1.x         |
| 0.2.0       | `^0.2.0`             | 0.2.x         |
| 1.0.0       | `^1.0.0`             | 1.x           |

**Rules:**
- **0.x**: Minor version bumps MAY contain breaking changes (pre-release semver rules)
- **1.x+**: Minor version bumps are backward-compatible. Breaking changes require a major version bump
- A plugin with `sdkVersion: "^0.1.0"` will NOT load against SDK `0.2.0` — explicit opt-in required
- A plugin with `sdkVersion: "^1.0.0"` WILL load against SDK `1.5.0`

### Contract Stability

| Component           | Stability | Breaking change policy            |
|---------------------|-----------|-----------------------------------|
| Manifest schema     | Stable    | Additive only within major version |
| Hook names          | Locked    | New hooks = minor version bump    |
| Hook payload fields | Stable    | New optional fields = patch bump  |
| Plugin interface    | Stable    | New optional methods = minor bump |
| Permission set      | Stable    | New permissions = minor bump      |
| Error types         | Stable    | New error types = minor bump      |

### Deprecation Policy

When a hook payload field or API method is deprecated:
1. Marked as `@deprecated` in TypeScript types
2. Remains functional for at least 2 minor versions
3. Removal requires a major version bump
4. Deprecation notices appear in plugin logs at startup

---

## Testing Support

The SDK exports test utilities for plugin authors:

```typescript
import { createTestContext, mockPayload } from "@undevops/plugin-sdk/testing";

const ctx = createTestContext({
  settings: { SLACK_WEBHOOK_URL: "https://hooks.slack.com/test" }
});

const payload = mockPayload.preDeploy({
  projectName: "my-app",
  environment: "production"
});
```

### Test Utilities API

```typescript
interface TestContextOptions {
  settings?: Record<string, unknown>;
  permissions?: string[];
  apiOverrides?: Partial<PluginApiClient>;
}

function createTestContext(opts?: TestContextOptions): PluginContext;

interface MockPayloadBuilders {
  preDeploy(overrides?: Partial<PreDeployPayload>): PreDeployPayload;
  postDeploy(overrides?: Partial<PostDeployPayload>): PostDeployPayload;
  deployFailed(overrides?: Partial<DeployFailedPayload>): DeployFailedPayload;
  serverAdded(overrides?: Partial<ServerAddedPayload>): ServerAddedPayload;
  serverRemoved(overrides?: Partial<ServerRemovedPayload>): ServerRemovedPayload;
  projectCreated(overrides?: Partial<ProjectCreatedPayload>): ProjectCreatedPayload;
  projectDeleted(overrides?: Partial<ProjectDeletedPayload>): ProjectDeletedPayload;
}
```

---

## Example Plugin

```typescript
import type { UndevopsPlugin, PostDeployPayload, DeployFailedPayload, PostDeployResult, DeployFailedResult } from "@undevops/plugin-sdk";

export default class SlackNotifyPlugin implements UndevopsPlugin {
  readonly manifest = {
    name: "slack-notify",
    version: "1.0.0",
  } as const;

  async onPostDeploy(payload: PostDeployPayload): Promise<PostDeployResult> {
    const webhookUrl = payload.context.settings.SLACK_WEBHOOK_URL as string;
    if (!webhookUrl) {
      payload.context.logger.warn("SLACK_WEBHOOK_URL not configured, skipping notification");
      return {};
    }

    const text = [
      `✅ *${payload.projectName}* deployed successfully`,
      `> Environment: \`${payload.environment}\``,
      `> Branch: \`${payload.branch}\``,
      `> Commit: \`${(payload.commitHash ?? "").slice(0, 7)}\``,
      `> Duration: ${(payload.totalDurationMs ?? 0) / 1000}s`,
      `> Server: \`${payload.serverName}\``,
    ].join("\n");

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    return {};
  }

  async onDeployFailed(payload: DeployFailedPayload): Promise<DeployFailedResult> {
    const webhookUrl = payload.context.settings.SLACK_WEBHOOK_URL as string;
    if (!webhookUrl) return {};

    const text = [
      `🔴 *${payload.projectName}* deployment FAILED`,
      `> Stage: \`${payload.failureStage}\``,
      `> Error: ${payload.errorMessage}`,
      `> Environment: \`${payload.environment}\``,
      `> Server: \`${payload.serverName}\``,
    ].join("\n");

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    return {};
  }
}
```

---

## Database Schema

### `plugin` table

> **Note**: The canonical schema is defined in `data-model.md` (Drizzle ORM). The SQL below is kept in sync for reference.

```sql
CREATE TABLE "plugin" (
  "pluginId" text NOT NULL PRIMARY KEY DEFAULT nanoid(),
  "name" text NOT NULL UNIQUE,
  "version" text NOT NULL,
  "manifestJson" jsonb NOT NULL,
  "grantedPermissions" text[] NOT NULL DEFAULT '{}',
  "enabled" boolean NOT NULL DEFAULT true,
  "faulted" boolean NOT NULL DEFAULT false,
  "faultMessage" text,
  "hookSubscriptions" text[] NOT NULL DEFAULT '{}',
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "installedBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "installed_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp,
  "last_invoked_at" timestamp,
  "invoke_count" integer NOT NULL DEFAULT 0
);

CREATE INDEX "plugin_organizationId_idx" ON "plugin"("organizationId");
CREATE INDEX "plugin_enabled_idx" ON "plugin"("enabled") WHERE "enabled" = true;
```