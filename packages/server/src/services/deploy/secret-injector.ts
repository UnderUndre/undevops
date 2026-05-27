import { db } from "@undevops/server/db";
import { secrets } from "@undevops/server/db/schema";
import { decrypt } from "@undevops/core/secrets";
import { eq, and, or } from "drizzle-orm";
import pino from "pino";

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
