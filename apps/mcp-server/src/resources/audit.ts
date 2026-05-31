import { desc, eq, and, gte, lte, sql, db } from "@undevops/server/db";
import { auditLog } from "@undevops/server/db/schema/audit-log";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:audit");

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface ListAuditOptions {
	actorType?: string;
	actorId?: string;
	action?: string;
	resourceType?: string;
	resourceId?: string;
	from?: string;
	to?: string;
	page?: number;
	pageSize?: number;
}

export async function listAuditEntries(options: ListAuditOptions = {}) {
	const start = performance.now();
	const {
		actorType,
		actorId,
		action,
		resourceType,
		resourceId,
		from,
		to,
		page = 1,
		pageSize = DEFAULT_PAGE_SIZE,
	} = options;

	const limit = Math.min(pageSize, MAX_PAGE_SIZE);
	const offset = (page - 1) * limit;

	const conditions = [];
	if (actorType) conditions.push(eq(auditLog.actor_type, actorType as "human" | "agent" | "plugin" | "system"));
	if (actorId) conditions.push(eq(auditLog.actor_id, actorId));
	if (action) conditions.push(eq(auditLog.action, action));
	if (resourceType) conditions.push(eq(auditLog.resourceType, resourceType));
	if (resourceId) conditions.push(eq(auditLog.resourceId, resourceId));
	if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
	if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [rows, countResult] = await Promise.all([
		db.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset),
		db.select({ count: sql<number>`count(*)::int` }).from(auditLog).where(where),
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
	logger.info({ elapsed: Math.round(elapsed), count: rows.length, total }, "listAuditEntries");

	return result;
}
