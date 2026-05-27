import { Command } from "commander";
import { db } from "@undevops/server/db";
import { secrets } from "@undevops/server/db/schema";
import { encrypt } from "@undevops/core/secrets";
import { eq, and } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";

export const secretCommand = new Command("secret")
	.description("Manage secrets");

secretCommand.command("set")
	.description("Set a secret")
	.requiredOption("--key <key>", "Secret key")
	.requiredOption("--value <value>", "Secret value")
	.requiredOption("--scope <scope>", "Scope (organization|project|environment|application|compose)")
	.requiredOption("--scope-id <id>", "Scope ID")
	.requiredOption("--org-id <orgId>", "Organization ID")
	.option("--description <desc>", "Description")
	.action(async (opts) => {
		const { encrypted, iv, tag } = encrypt(opts.value);

		const existing = await db.select({ secretId: secrets.secretId })
			.from(secrets)
			.where(and(
				eq(secrets.scope, opts.scope),
				eq(secrets.scopeId, opts.scopeId),
				eq(secrets.key, opts.key),
			))
			.limit(1);

		if (existing.length > 0) {
			await db.update(secrets)
				.set({
					encryptedValue: encrypted,
					encryptionIv: iv,
					encryptionTag: tag,
					description: opts.description,
					lastRotatedAt: new Date(),
				})
				.where(eq(secrets.secretId, existing[0].secretId));
			console.log(`Secret "${opts.key}" rotated`);
		} else {
			await db.insert(secrets).values({
				key: opts.key,
				encryptedValue: encrypted,
				encryptionIv: iv,
				encryptionTag: tag,
				scope: opts.scope,
				scopeId: opts.scopeId,
				organizationId: opts.orgId,
				description: opts.description,
			});
			console.log(`Secret "${opts.key}" created`);
		}
	});

secretCommand.command("list")
	.description("List secrets (metadata only, no values)")
	.requiredOption("--scope <scope>", "Scope")
	.requiredOption("--scope-id <id>", "Scope ID")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const rows = await db.select({
			secretId: secrets.secretId,
			key: secrets.key,
			scope: secrets.scope,
			scopeId: secrets.scopeId,
			description: secrets.description,
			version: secrets.version,
			createdAt: secrets.createdAt,
			lastRotatedAt: secrets.lastRotatedAt,
		}).from(secrets)
			.where(and(
				eq(secrets.scope, opts.scope),
				eq(secrets.scopeId, opts.scopeId),
			));
		fmt.output(rows, ["secretId", "key", "scope", "version", "createdAt"]);
	});
