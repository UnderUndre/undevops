# MCP API Contract: undevops MCP Gateway

**Branch**: `specs/001-init` | **Date**: 2026-05-25 | **Version**: 0.1.0

## Overview

The undevops MCP server exposes infrastructure state and operations via the Model Context Protocol (MCP). This contract defines all resources, tools, and prompts available to MCP clients.

The MCP server runs as a standalone service (`apps/mcp-server`) using stdio and SSE transports. It shares the same PostgreSQL and Redis instances as the main undevops server and reuses `@undevops/core` for business logic.

**Transport**: stdio (primary) + SSE (secondary)
**Protocol version**: MCP 2024-11-05

## Authentication

Bearer token in MCP request metadata (`_meta.authorization`). Tokens issued by admin via Web UI or CLI (`undevops mcp-tokens create`).

Token storage: SHA-256 hash in `mcp_clients` table. Revocation via `revoked_at` timestamp. Token value shown once at creation, never again (RQ-006).

```typescript
interface McpRequestMeta {
  authorization: `Bearer ${string}`;
}
```

Invalid or revoked tokens → `McpError` with code `-32001`.

---

## Resources

Resources are read-only views of infrastructure state. MCP clients can list and read them.

### `undevops://servers`

List all registered servers.

| Field        | Value    |
|-------------|----------|
| Description | List all servers in the cluster |
| Scope       | `read`   |
| p95 target  | < 200ms  |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "$ref": "#/$defs/Server"
  },
  "$defs": {
    "Server": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string", "minLength": 1, "maxLength": 128 },
        "address": {
          "type": "string",
          "description": "IP address (v4/v6) or hostname of the server"
        },
        "port": { "type": "integer", "minimum": 1, "maximum": 65535, "default": 22 },
        "status": {
          "type": "string",
          "enum": ["online", "offline", "provisioning", "degraded"]
        },
        "os": { "type": "string" },
        "cpuCores": { "type": "integer" },
        "totalMemoryMB": { "type": "integer" },
        "dockerVersion": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "name", "address", "status", "createdAt"]
    }
  }
}
```

### `undevops://servers/{serverId}`

Single server detail.

| Field        | Value    |
|-------------|----------|
| Description | Full detail for one server including resource utilization |
| Scope       | `read`   |
| p95 target  | < 150ms  |

**URI template**: `undevops://servers/{serverId}`

**Parameters:**

| Name     | Type   | Required | Description  |
|----------|--------|----------|--------------|
| serverId | string | yes      | ID of server |

**Output schema:** extends `Server` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "undevops://servers#/$defs/Server" },
    {
      "type": "object",
      "properties": {
        "cpuUsagePercent": { "type": "number", "minimum": 0, "maximum": 100 },
        "memoryUsedMB": { "type": "integer" },
        "diskUsedGB": { "type": "number" },
        "diskTotalGB": { "type": "number" },
        "containersRunning": { "type": "integer" },
        "containersTotal": { "type": "integer" },
        "uptimeSeconds": { "type": "integer" },
        "lastHealthCheckAt": { "type": "string", "format": "date-time" }
      }
    }
  ]
}
```

### `undevops://projects`

List all projects.

| Field        | Value    |
|-------------|----------|
| Description | List all projects across all servers |
| Scope       | `read`   |
| p95 target  | < 200ms  |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "$ref": "#/$defs/Project"
  },
  "$defs": {
    "Project": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string", "minLength": 1, "maxLength": 128 },
        "slug": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$" },
        "description": { "type": "string", "maxLength": 512 },
        "serverId": { "type": "string" },
        "serverName": { "type": "string" },
        "environment": { "type": "string", "maxLength": 64 },
        "repository": {
          "type": "object",
          "properties": {
            "url": { "type": "string", "format": "uri" },
            "branch": { "type": "string" },
            "provider": { "type": "string", "enum": ["github", "gitlab", "bitbucket", "gitea", "custom"] }
          }
        },
        "buildType": {
          "type": "string",
          "enum": ["nixpacks", "railpack", "paketo", "dockerfile", "static"]
        },
        "domain": { "type": "string", "format": "hostname" },
        "tlsStatus": {
          "type": "string",
          "enum": ["disabled", "issuing", "active", "expiring", "expired", "failed", "renewal-pending"],
          "description": "Current TLS certificate status"
        },
        "replicas": { "type": "integer", "minimum": 0 },
        "status": {
          "type": "string",
          "enum": ["deploying", "running", "stopped", "failed", "idle"]
        },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "name", "slug", "serverId", "status", "createdAt"]
    }
  }
}
```

### `undevops://projects/{projectId}`

Single project detail.

| Field        | Value    |
|-------------|----------|
| Description | Full detail for one project |
| Scope       | `read`   |
| p95 target  | < 150ms  |

**URI template**: `undevops://projects/{projectId}`

**Parameters:**

| Name      | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| projectId | string | yes      | ID of project |

**Output schema:** extends `Project` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "undevops://projects#/$defs/Project" },
    {
      "type": "object",
      "properties": {
        "envVars": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": { "type": "string" },
              "value": { "type": "string" }
            },
            "required": ["key", "value"]
          },
          "description": "Secret values replaced with ***REDACTED***"
        },
        "buildConfig": {
          "type": "object",
          "properties": {
            "dockerfile": { "type": "string" },
            "buildArgs": {
              "type": "object",
              "additionalProperties": { "type": "string" }
            },
            "buildPath": { "type": "string" }
          }
        },
        "networkConfig": {
          "type": "object",
          "properties": {
            "port": { "type": "integer" },
            "healthCheckPath": { "type": "string" },
            "healthCheckInterval": { "type": "integer", "description": "seconds" }
          }
        },
        "resourceLimits": {
          "type": "object",
          "properties": {
            "cpuLimit": { "type": "number" },
            "memoryLimitMB": { "type": "integer" }
          }
        },
        "lastDeploymentAt": { "type": "string", "format": "date-time" },
        "lastDeploymentId": { "type": "string" }
      }
    }
  ]
}
```

### `undevops://projects/{projectId}/deployments`

Deployment history for a project.

| Field        | Value    |
|-------------|----------|
| Description | Paginated deployment history for a project |
| Scope       | `read`   |
| p95 target  | < 300ms  |

**URI template**: `undevops://projects/{projectId}/deployments`

**Parameters:**

| Name      | Type    | Required | Description                     |
|-----------|---------|----------|---------------------------------|
| projectId | string  | yes      | ID of project                    |
| limit     | integer | no       | Max results (default 20, max 100) |
| offset    | integer | no       | Pagination offset                |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/DeploymentSummary" }
    },
    "total": { "type": "integer" },
    "limit": { "type": "integer" },
    "offset": { "type": "integer" }
  },
  "$defs": {
    "DeploymentSummary": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "projectId": { "type": "string" },
        "sequenceNumber": { "type": "integer" },
        "status": {
          "type": "string",
          "enum": ["queued", "building", "deploying", "running", "failed", "cancelled", "rolled_back"]
        },
        "trigger": {
          "type": "string",
          "enum": ["manual", "webhook", "cli", "mcp", "plugin", "rollback"]
        },
        "actorType": {
          "type": "string",
          "enum": ["human", "agent", "plugin", "system"]
        },
        "actorId": { "type": "string" },
        "commitHash": { "type": "string", "pattern": "^[0-9a-f]{7,40}$" },
        "commitMessage": { "type": "string" },
        "branch": { "type": "string" },
        "imageTag": { "type": "string" },
        "buildDurationMs": { "type": "integer" },
        "deployDurationMs": { "type": "integer" },
        "createdAt": { "type": "string", "format": "date-time" },
        "finishedAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "projectId", "sequenceNumber", "status", "trigger", "createdAt"]
    }
  }
}
```

### `undevops://deployments/{deploymentId}`

Single deployment detail.

| Field        | Value    |
|-------------|----------|
| Description | Full deployment record with build and runtime details |
| Scope       | `read`   |
| p95 target  | < 200ms  |

**URI template**: `undevops://deployments/{deploymentId}`

**Parameters:**

| Name         | Type   | Required | Description     |
|--------------|--------|----------|-----------------|
| deploymentId | string | yes      | ID of deployment |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "undevops://projects/{projectId}/deployments#/$defs/DeploymentSummary" },
    {
      "type": "object",
      "properties": {
        "buildLogs": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "timestamp": { "type": "string", "format": "date-time" },
              "level": { "type": "string", "enum": ["info", "warn", "error", "debug"] },
              "message": { "type": "string" }
            },
            "required": ["timestamp", "level", "message"]
          }
        },
        "deployLogs": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "timestamp": { "type": "string", "format": "date-time" },
              "level": { "type": "string", "enum": ["info", "warn", "error", "debug"] },
              "message": { "type": "string" }
            },
            "required": ["timestamp", "level", "message"]
          }
        },
        "healthStatus": {
          "type": "object",
          "properties": {
            "healthy": { "type": "boolean" },
            "httpStatusCode": { "type": "integer" },
            "responseTimeMs": { "type": "integer" },
            "lastCheckedAt": { "type": "string", "format": "date-time" }
          }
        },
        "previousDeploymentId": { "type": "string" },
        "rollbackOf": { "type": "string", "description": "If this is a rollback, the ID of the failed deployment" },
        "errorMessage": { "type": "string" },
        "errorStack": { "type": "string" }
      }
    }
  ]
}
```

### `undevops://deployments/{deploymentId}/logs`

Recent log lines for a deployment.

| Field        | Value    |
|-------------|----------|
| Description | Structured application logs from the deployment container |
| Scope       | `read`   |
| p95 target  | < 500ms  |

**URI template**: `undevops://deployments/{deploymentId}/logs`

**Parameters:**

| Name         | Type    | Required | Description                          |
|--------------|---------|----------|--------------------------------------|
| deploymentId | string  | yes      | ID of deployment                     |
| lines        | integer | no       | Number of lines (default 100, max 1000) |
| since        | string  | no       | ISO 8601 timestamp — only logs after  |
| level        | string  | no       | Filter by level: `error`, `warn`, `info`, `debug` |
| search       | string  | no       | Full-text search filter               |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "lines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "level": { "type": "string", "enum": ["error", "warn", "info", "debug"] },
          "message": { "type": "string" },
          "source": { "type": "string", "enum": ["stdout", "stderr", "system"] },
          "metadata": { "type": "object", "additionalProperties": true }
        },
        "required": ["timestamp", "level", "message"]
      }
    },
    "totalMatched": { "type": "integer" },
    "returnedCount": { "type": "integer" },
    "oldestTimestamp": { "type": "string", "format": "date-time" },
    "newestTimestamp": { "type": "string", "format": "date-time" }
  },
  "required": ["deploymentId", "lines", "returnedCount"]
}
```

### `undevops://audit`

Recent audit events.

| Field        | Value    |
|-------------|----------|
| Description | Audit trail for all platform operations |
| Scope       | `read`   |
| p95 target  | < 400ms  |

**URI template**: `undevops://audit`

**Parameters:**

| Name           | Type    | Required | Description                              |
|----------------|---------|----------|------------------------------------------|
| limit          | integer | no       | Max results (default 50, max 200)         |
| offset         | integer | no       | Pagination offset                         |
| actor_type     | string  | no       | Filter: `human`, `agent`, `plugin`, `system` |
| target_resource | string | no       | Filter by resource type: `server`, `project`, `deployment`, `mcp_token`, `plugin` |
| action         | string  | no       | Filter by action: `create`, `update`, `delete`, `deploy`, `rollback`, `scale` |
| since          | string  | no       | ISO 8601 — only events after             |
| until          | string  | no       | ISO 8601 — only events before            |

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/AuditEvent" }
    },
    "total": { "type": "integer" },
    "limit": { "type": "integer" },
    "offset": { "type": "integer" }
  },
  "$defs": {
    "AuditEvent": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "action": {
          "type": "string",
          "enum": ["create", "update", "delete", "deploy", "rollback", "scale", "login", "token_create", "token_revoke", "plugin_install", "plugin_enable", "plugin_disable"]
        },
        "actorType": {
          "type": "string",
          "enum": ["human", "agent", "plugin", "system"]
        },
        "actorId": { "type": "string" },
        "actorName": { "type": "string" },
        "targetResource": {
          "type": "string",
          "enum": ["server", "project", "deployment", "mcp_token", "plugin", "backup", "user"]
        },
        "targetId": { "type": "string" },
        "targetName": { "type": "string" },
        "metadata": { "type": "object", "additionalProperties": true },
        "ipAddress": { "type": "string" },
        "userAgent": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "action", "actorType", "actorId", "targetResource", "createdAt"]
    }
  }
}
```

---

## Tools

Tools are actionable operations that mutate infrastructure state.

### `undevops_deploy`

Trigger a new deployment.

| Field          | Value    |
|---------------|----------|
| Description   | Trigger a deployment for a project. Queues a build + deploy pipeline. |
| Scope         | `write`  |
| p95 target    | < 2s (queue acknowledgment; actual deploy is async) |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "ID of the project to deploy"
    },
    "branch": {
      "type": "string",
      "description": "Branch to deploy (defaults to project's configured branch)"
    },
    "commitHash": {
      "type": "string",
      "pattern": "^[0-9a-f]{7,40}$",
      "description": "Specific commit to deploy (defaults to HEAD of branch)"
    },
    "buildType": {
      "type": "string",
      "enum": ["nixpacks", "railpack", "paketo", "dockerfile", "static"],
      "description": "Override build type (defaults to project config)"
    },
    "envOverrides": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Environment variable overrides for this deployment only"
    },
    "skipReview": {
      "type": "boolean",
      "default": false,
      "description": "Skip AI review gate if enabled for this project. Requires explicit confirmation."
    },
    "description": {
      "type": "string",
      "maxLength": 512,
      "description": "Human-readable description of this deployment"
    }
  },
  "required": ["projectId"]
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "sequenceNumber": { "type": "integer" },
    "status": { "type": "string", "enum": ["queued", "building"] },
    "estimatedDurationMs": { "type": "integer" },
    "queuePosition": { "type": "integer" }
  },
  "required": ["deploymentId", "sequenceNumber", "status"]
}
```

### `undevops_rollback`

Rollback to a previous deployment.

| Field          | Value    |
|---------------|----------|
| Description   | Rollback a project to a previous deployment. Creates a new deployment record linked to the target. |
| Scope         | `write`  |
| p95 target    | < 2s (queue acknowledgment; actual rollback is async) |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "ID of the project to rollback"
    },
    "targetDeploymentId": {
      "type": "string",
      "description": "ID of the deployment to rollback to. If omitted, rolls back to the previous successful deployment."
    },
    "reason": {
      "type": "string",
      "maxLength": 512,
      "description": "Reason for rollback (recorded in audit log)"
    }
  },
  "required": ["projectId"]
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string", "description": "ID of the new rollback deployment" },
    "rolledBackFrom": { "type": "string", "description": "ID of the deployment that was replaced" },
    "rolledBackTo": { "type": "string", "description": "ID of the target deployment being restored" },
    "status": { "type": "string", "enum": ["queued", "deploying"] }
  },
  "required": ["deploymentId", "rolledBackTo", "status"]
}
```

### `undevops_scale`

Scale the number of replicas for a project.

| Field          | Value    |
|---------------|----------|
| Description   | Adjust the number of running replicas for a project. Takes effect immediately. |
| Scope         | `exec`   |
| p95 target    | < 5s     |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "ID of the project to scale"
    },
    "replicas": {
      "type": "integer",
      "minimum": 0,
      "maximum": 20,
      "description": "Target number of replicas. 0 stops the application."
    },
    "serverId": {
      "type": "string",
      "description": "Target server for placement. If omitted, uses current server."
    }
  },
  "required": ["projectId", "replicas"]
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": { "type": "string" },
    "previousReplicas": { "type": "integer" },
    "currentReplicas": { "type": "integer" },
    "status": {
      "type": "string",
      "enum": ["scaling", "completed"]
    },
    "containersReady": { "type": "integer" }
  },
  "required": ["projectId", "previousReplicas", "currentReplicas", "status"]
}
```

### `undevops_get_logs`

Get structured logs for a project or deployment.

| Field          | Value    |
|---------------|----------|
| Description   | Retrieve structured application logs. Alternative to the resource URI for tool-oriented workflows. |
| Scope         | `read`   |
| p95 target    | < 500ms  |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectId": {
      "type": "string",
      "description": "ID of the project"
    },
    "deploymentId": {
      "type": "string",
      "description": "ID of specific deployment. If omitted, uses latest deployment."
    },
    "lines": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "default": 100,
      "description": "Number of log lines to return"
    },
    "level": {
      "type": "string",
      "enum": ["error", "warn", "info", "debug"],
      "description": "Filter by log level"
    },
    "search": {
      "type": "string",
      "description": "Full-text search in log messages"
    },
    "since": {
      "type": "string",
      "format": "date-time",
      "description": "Only return logs after this timestamp"
    },
    "follow": {
      "type": "boolean",
      "default": false,
      "description": "If true, returns a streaming response (SSE only)"
    }
  },
  "required": ["projectId"]
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": { "type": "string" },
    "lines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "level": { "type": "string", "enum": ["error", "warn", "info", "debug"] },
          "message": { "type": "string" },
          "source": { "type": "string", "enum": ["stdout", "stderr", "system"] },
          "metadata": { "type": "object", "additionalProperties": true }
        },
        "required": ["timestamp", "level", "message"]
      }
    },
    "totalMatched": { "type": "integer" },
    "returnedCount": { "type": "integer" }
  },
  "required": ["deploymentId", "lines", "returnedCount"]
}
```

### `undevops_list_projects`

Explicit project listing tool (alternative to resource subscription).

| Field          | Value    |
|---------------|----------|
| Description   | List projects with optional filtering. Use when you need server-side filtering rather than client-side resource traversal. |
| Scope         | `read`   |
| p95 target    | < 200ms  |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "serverId": {
      "type": "string",
      "description": "Filter by server"
    },
    "status": {
      "type": "string",
      "enum": ["deploying", "running", "stopped", "failed", "idle"],
      "description": "Filter by project status"
    },
    "environment": {
      "type": "string",
      "maxLength": 64,
      "description": "Filter by environment"
    },
    "search": {
      "type": "string",
      "description": "Search project name or slug"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    }
  }
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": { "$ref": "undevops://projects#/$defs/Project" }
    },
    "total": { "type": "integer" },
    "limit": { "type": "integer" },
    "offset": { "type": "integer" }
  },
  "required": ["items", "total"]
}
```

### `undevops_inspect_deployment`

Detailed deployment info with health check results.

| Field          | Value    |
|---------------|----------|
| Description   | Get comprehensive deployment status including health, resource usage, and container details. |
| Scope         | `read`   |
| p95 target    | < 1s     |

**Input schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deploymentId": {
      "type": "string",
      "description": "ID of the deployment to inspect"
    },
    "includeLogs": {
      "type": "boolean",
      "default": false,
      "description": "Include recent log lines (last 20)"
    },
    "includeHealthHistory": {
      "type": "boolean",
      "default": false,
      "description": "Include last 10 health check results"
    }
  },
  "required": ["deploymentId"]
}
```

**Output schema:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "deployment": { "$ref": "undevops://deployments/{deploymentId}" },
    "health": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["healthy", "unhealthy", "degraded", "unknown"] },
        "uptimeSeconds": { "type": "integer" },
        "restartCount": { "type": "integer" },
        "lastRestartAt": { "type": "string", "format": "date-time" },
        "httpCheck": {
          "type": "object",
          "properties": {
            "statusCode": { "type": "integer" },
            "responseTimeMs": { "type": "integer" },
            "lastCheckedAt": { "type": "string", "format": "date-time" }
          }
        },
        "history": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "timestamp": { "type": "string", "format": "date-time" },
              "status": { "type": "string", "enum": ["healthy", "unhealthy"] },
              "responseTimeMs": { "type": "integer" },
              "statusCode": { "type": "integer" }
            },
            "required": ["timestamp", "status"]
          }
        }
      }
    },
    "resources": {
      "type": "object",
      "properties": {
        "cpuUsagePercent": { "type": "number" },
        "memoryUsageMB": { "type": "integer" },
        "memoryLimitMB": { "type": "integer" },
        "networkInKBps": { "type": "number" },
        "networkOutKBps": { "type": "number" },
        "diskUsageMB": { "type": "number" }
      }
    },
    "containers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "status": { "type": "string" },
          "startedAt": { "type": "string", "format": "date-time" },
          "restartCount": { "type": "integer" }
        },
        "required": ["id", "name", "status"]
      }
    },
    "recentLogs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "level": { "type": "string" },
          "message": { "type": "string" }
        },
        "required": ["timestamp", "level", "message"]
      }
    }
  },
  "required": ["deployment", "health"]
}
```

---

## Error Responses

All errors follow a standard envelope:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "error": {
      "type": "object",
      "properties": {
        "code": { "type": "integer" },
        "message": { "type": "string" },
        "details": {
          "type": "object",
          "properties": {
            "field": { "type": "string" },
            "constraint": { "type": "string" },
            "suggestion": { "type": "string" }
          }
        }
      },
      "required": ["code", "message"]
    }
  },
  "required": ["error"]
}
```

### Error Codes

| Code   | HTTP equivalent | Meaning                        | Retryable |
|--------|----------------|--------------------------------|-----------|
| `-32001` | 401          | Authentication failed          | No        |
| `-32002` | 403          | Insufficient scope             | No        |
| `-32003` | 404          | Resource not found             | No        |
| `-32004` | 409          | Conflict (e.g., deploy in progress) | No  |
| `-32005` | 422          | Validation error               | No        |
| `-32006` | 429          | Rate limit exceeded            | Yes       |
| `-32007` | 500          | Internal server error          | Yes       |
| `-32008` | 503          | Service unavailable            | Yes       |
| `-32009` | 408          | Request timeout                | Yes       |
| `-32010` | 400          | Bad request (malformed input)  | No        |

**Retry guidance**: For retryable errors, clients should use exponential backoff starting at 1s, max 5 retries, jitter ±500ms.

---

## Rate Limiting

Per-token rate limits enforced via Redis sliding window.

| Scope   | Window   | Limit | Burst |
|---------|----------|-------|-------|
| `read`  | 1 minute | 120   | 30    |
| `write` | 1 minute | 30    | 10    |
| `exec`  | 1 minute | 10    | 5     |

Rate limit headers in response metadata:

```typescript
interface RateLimitMeta {
  "x-ratelimit-limit": string;
  "x-ratelimit-remaining": string;
  "x-ratelimit-reset": string;
}
```

When rate limited (`-32006`), the `details.suggestion` field contains the retry-after seconds.

---

## Secret Redaction

Any resource or tool response that could contain secret values applies automatic redaction:

| Field pattern                          | Redaction                |
|---------------------------------------|--------------------------|
| `*.password`                          | `***REDACTED***`         |
| `*.secret`                            | `***REDACTED***`         |
| `*.token`                             | `***REDACTED***`         |
| `*.apiKey`                            | `***REDACTED***`         |
| `*.privateKey`                        | `***REDACTED***`         |
| `*.certificate`                       | `***REDACTED***`         |
| `envVars[*].value` (if marked secret) | `***REDACTED***`         |
| `*.connectionString`                  | `***REDACTED***`         |
| Log lines matching secret patterns    | `[REDACTED by undevops]` |

Redaction is applied at the MCP server layer before any response leaves the server. This is non-bypassable — even internal tool calls go through the redaction pipeline.

**Implementation**: Redaction runs as a response middleware in `apps/mcp-server`. It traverses the response JSON, matches field names against the pattern list, and replaces values. Pattern matching is case-insensitive.

---

## Transport-Specific Notes

### stdio

- Primary transport for local development and CLI integration
- Server reads from stdin, writes to stdout
-_stderr_ used for server-level diagnostics (not MCP messages)

### SSE (Server-Sent Events)

- Secondary transport for remote/integrated environments
- Endpoint: `GET /sse` for event stream, `POST /messages` for client requests
- Requires `Authorization: Bearer <token>` header on both endpoints
- Browser `EventSource` fallback: `GET /sse?token=<token>` — query parameter accepted when header cannot be set (e.g. browser-native `EventSource`). Token is not logged in server access logs.
- Heartbeat every 30 seconds
- Connection timeout: 5 minutes of inactivity → server closes

---

## Versioning

This contract follows semantic versioning:

- **Patch** (0.1.x): New optional fields, new enum values, clarification
- **Minor** (0.x.0): New resources, new tools, new prompts, non-breaking changes
- **Major** (1.0.0): Breaking changes to existing schemas

The contract version is advertised in the MCP server's `serverInfo`:

```json
{
  "name": "undevops-mcp",
  "version": "0.1.0",
  "contractVersion": "0.1.0"
}
```