import { desc, eq, and, sql, db } from "@undevops/server/db";
import { deployments, deploymentStatus } from "@undevops/server/db/schema/deployment";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:deployments");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface ListDeploymentsOptions {
	applicationId?: string;
	composeId?: string;
	serverId?: string;
	status?: (typeof deploymentStatus.enumValues)[number];
	page?: number;
	pageSize?: number;
}

export async function listDeployments(options: ListDeploymentsOptions = {}) {
	const start = performance.now();
	const { applicationId, composeId, serverId, status, page = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

	const limit = Math.min(pageSize, MAX_PAGE_SIZE);
	const offset = (page - 1) * limit;

	const conditions = [];
	if (applicationId) conditions.push(eq(deployments.applicationId, applicationId));
	if (composeId) conditions.push(eq(deployments.composeId, composeId));
	if (serverId) conditions.push(eq(deployments.serverId, serverId));
	if (status) conditions.push(eq(deployments.status, status));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, countResult] = await Promise.all([
		db.select().from(deployments).where(where).orderBy(desc(deployments.createdAt)).limit(limit).offset(offset),
		db.select({ count: sql<number>`count(*)::int` }).from(deployments).where(where),
	]);

	const total = countResult[0]?.count ?? 0;

	const result = redactJson({
		items: rows,
		total,
		page,
		pageSize: limit,
		totalPages: Math.ceil(total / limit),
	});

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), count: rows.length, total }, "listDeployments");

	return result;
}

export async function getDeployment(deploymentId: string) {
	const start = performance.now();

	const rows = await db.select().from(deployments).where(eq(deployments.deploymentId, deploymentId)).limit(1);
	const row = rows[0];

	if (!row) return null;

	const result = redactJson(row);

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), deploymentId }, "getDeployment");

	return result;
}
