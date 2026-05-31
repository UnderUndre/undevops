import { Command } from "commander";
import { createHash, randomBytes } from "crypto";
import { db } from "@undevops/server/db";
import { mcpTokens } from "@undevops/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";

export const mcpTokensCommand = new Command("mcp-tokens")
	.description("Manage MCP tokens");

mcpTokensCommand.command("create")
	.description("Create a new MCP token")
	.requiredOption("--name <name>", "Token name")
	.requiredOption("--scope <scope>", "Token scope (read|deploy|admin)")
	.requiredOption("--org-id <orgId>", "Organization ID")
	.option("--target-scope <scope>", "Optional target scope")
	.action(async (opts) => {
		if (!["read", "deploy", "admin"].includes(opts.scope)) {
			throw new Error("Scope must be one of: read, deploy, admin");
		}

		const raw = `mcp_${randomBytes(32).toString("hex")}`;
		const hash = createHash("sha256").update(raw).digest("hex");
		const prefix = raw.slice(0, 8);

		const result = await db.insert(mcpTokens).values({
			name: opts.name,
			scope: opts.scope,
			targetScope: opts.targetScope,
			tokenHash: hash,
			prefix,
			organizationId: opts.orgId,
		}).returning({
			mcpTokenId: true,
		});

		console.log(`Token created (ID: ${result[0].mcpTokenId})`);
		console.log(`\n${raw}\n`);
		console.log("Store this token securely — it will not be shown again.");
	});

mcpTokensCommand.command("list")
	.description("List MCP tokens")
	.requiredOption("--org-id <orgId>", "Organization ID")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const rows = await db.select({
			mcpTokenId: mcpTokens.mcpTokenId,
			name: mcpTokens.name,
			scope: mcpTokens.scope,
			prefix: mcpTokens.prefix,
			lastUsedAt: mcpTokens.lastUsedAt,
			requestCount: mcpTokens.requestCount,
			revokedAt: mcpTokens.revokedAt,
			createdAt: mcpTokens.createdAt,
		}).from(mcpTokens)
			.where(eq(mcpTokens.organizationId, opts.orgId))
			.orderBy(desc(mcpTokens.createdAt));
		fmt.output(rows, ["mcpTokenId", "name", "scope", "prefix", "revokedAt", "createdAt"]);
	});

mcpTokensCommand.command("revoke")
	.description("Revoke an MCP token")
	.requiredOption("--id <tokenId>", "Token ID")
	.action(async (opts) => {
		await db.update(mcpTokens)
			.set({ revokedAt: new Date() })
			.where(eq(mcpTokens.mcpTokenId, opts.id));
		console.log(`Token ${opts.id} revoked`);
	});
