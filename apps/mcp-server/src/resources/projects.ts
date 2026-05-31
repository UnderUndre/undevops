import { desc, eq, db } from "@undevops/server/db";
import { projects } from "@undevops/server/db/schema/project";
import { environments } from "@undevops/server/db/schema/environment";
import { applications } from "@undevops/server/db/schema/application";
import { domains } from "@undevops/server/db/schema/domain";
import { redactJson } from "../redaction.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:resources:projects");

export async function listProjects(organizationId?: string) {
	const start = performance.now();

	const rows = organizationId
		? await db.select().from(projects).where(eq(projects.organizationId, organizationId)).orderBy(desc(projects.createdAt))
		: await db.select().from(projects).orderBy(desc(projects.createdAt));

	const result = redactJson(rows);

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), count: result.length }, "listProjects");

	return result;
}

export async function getProject(projectId: string) {
	const start = performance.now();

	const projectRows = await db.select().from(projects).where(eq(projects.projectId, projectId)).limit(1);
	const project = projectRows[0];

	if (!project) return null;

	const envRows = await db.select().from(environments).where(eq(environments.projectId, projectId));

	const envIds = envRows.map((e) => e.environmentId);

	const appRows = envIds.length > 0
		? await db.select({
				applicationId: applications.applicationId,
				name: applications.name,
				applicationStatus: applications.applicationStatus,
				environmentId: applications.environmentId,
			}).from(applications)
		: [];

	const result = redactJson({
		...project,
		environments: envRows,
		applications: appRows,
	});

	const elapsed = performance.now() - start;
	logger.info({ elapsed: Math.round(elapsed), projectId }, "getProject");

	return result;
}
