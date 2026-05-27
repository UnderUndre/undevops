import { createHash } from "node:crypto";
import { db, eq, and } from "@undevops/server/db";
import { mcpClients } from "@undevops/server/db/schema/mcp-client";

export type McpScope = "read" | "deploy" | "admin";

interface TokenValidationResult {
  valid: boolean;
  clientId?: string;
  scope?: McpScope;
  organizationId?: string;
  targetId?: string | null;
  targetType?: string | null;
  error?: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function extractBearerToken(authHeader: string | undefined | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function validateBearerToken(token: string): Promise<TokenValidationResult> {
  const tokenHash = hashToken(token);

  const rows = await db
    .select({
      mcpClientId: mcpClients.mcpClientId,
      scope: mcpClients.scope,
      organizationId: mcpClients.organizationId,
      targetId: mcpClients.targetId,
      targetType: mcpClients.targetType,
      revokedAt: mcpClients.revokedAt,
    })
    .from(mcpClients)
    .where(eq(mcpClients.tokenHash, tokenHash))
    .limit(1);

  const client = rows[0];

  if (!client) {
    return { valid: false, error: "Invalid token" };
  }

  if (client.revokedAt) {
    return { valid: false, error: "Token revoked" };
  }

  return {
    valid: true,
    clientId: client.mcpClientId,
    scope: client.scope as McpScope,
    organizationId: client.organizationId,
    targetId: client.targetId,
    targetType: client.targetType,
  };
}

export function requireScope(actual: McpScope, required: McpScope): boolean {
  const hierarchy: Record<McpScope, number> = { read: 0, deploy: 1, admin: 2 };
  return hierarchy[actual] >= hierarchy[required];
}
