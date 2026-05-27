import { desc, eq, db } from "@undevops/server/db";
import { server } from "@undevops/server/db/schema/server";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:servers");

export async function listServers(organizationId?: string) {
	const start = performance.now();

	const rows = organizationId
		? await db.select().from(server).where(eq(server.organizationId, organizationId)).orderBy(desc(server.createdAt))
		: await db.select().from(server).orderBy(desc(server.createdAt));

	const result = redactJson(rows);

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), count: result.length }, "listServers");

	return result;
}

export async function getServer(serverId: string) {
	const start = performance.now();

	const rows = await db.select().from(server).where(eq(server.serverId, serverId)).limit(1);
	const row = rows[0];

	if (!row) return null;

	const result = redactJson(row);

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), serverId }, "getServer");

	return result;
}
