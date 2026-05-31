import { db } from "@undevops/server/db";
import { secrets } from "@undevops/server/db/schema";
import { createDecipheriv, scryptSync } from "node:crypto";
import { eq, and, or } from "drizzle-orm";
import pino from "pino";

function decrypt(encrypted: string, iv: string, tag: string): string {
	const ALGORITHM = "aes-256-gcm";
	const KEY_LENGTH = 32;
	const AUTH_TAG_LENGTH = 16;
	const key = process.env.UNDEVOPS_ENCRYPTION_KEY;
	if (!key) throw new Error("UNDEVOPS_ENCRYPTION_KEY environment variable is not set");
	const derivedKey = scryptSync(key, "undevops-salt", KEY_LENGTH);
	const decipher = createDecipheriv(ALGORITHM, derivedKey, Buffer.from(iv, "base64"), { authTagLength: AUTH_TAG_LENGTH });
	decipher.setAuthTag(Buffer.from(tag, "base64"));
	const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
	return decrypted.toString("utf8");
}

const logger = pino({
	name: "secret-injector",
	redact: ["*.value", "*.decrypted"],
});

interface ResolvedSecret {
	key: string;
	value: string;
}

export async function resolveSecretsForScope(
	scope: "project" | "environment" | "application" | "compose",
	scopeId: string,
	organizationId: string,
): Promise<ResolvedSecret[]> {
	try {
		const rows = await db
			.select()
			.from(secrets)
			.where(
				and(
					eq(secrets.organizationId, organizationId),
					eq(secrets.scope, scope),
					eq(secrets.scopeId, scopeId),
				),
			);

		const resolved: ResolvedSecret[] = [];
		for (const row of rows) {
			if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
				logger.warn({ key: row.key, secretId: row.secretId }, "Secret expired, skipping");
				continue;
			}

			try {
				const value = decrypt(row.encryptedValue, row.encryptionIv, row.encryptionTag);
				resolved.push({ key: row.key, value });
			} catch (error) {
				logger.error({ key: row.key, error }, "Failed to decrypt secret");
			}
		}

		return resolved;
	} catch (error) {
		logger.error({ error, scope, scopeId }, "Failed to resolve secrets");
		return [];
	}
}

export async function resolveAllSecretsForDeployment(
	projectScopeId: string,
	environmentScopeId: string,
	applicationScopeId: string,
	organizationId: string,
): Promise<ResolvedSecret[]> {
	const [projectSecrets, envSecrets, appSecrets] = await Promise.all([
		resolveSecretsForScope("project", projectScopeId, organizationId),
		resolveSecretsForScope("environment", environmentScopeId, organizationId),
		resolveSecretsForScope("application", applicationScopeId, organizationId),
	]);

	const merged = new Map<string, string>();
	for (const s of projectSecrets) merged.set(s.key, s.value);
	for (const s of envSecrets) merged.set(s.key, s.value);
	for (const s of appSecrets) merged.set(s.key, s.value);

	return Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
}

export function secretsToEnvArray(secretsList: ResolvedSecret[]): string[] {
	return secretsList.map((s) => `${s.key}=${s.value}`);
}
