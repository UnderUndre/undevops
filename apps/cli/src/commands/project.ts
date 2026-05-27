import { Command } from "commander";
import { db } from "@undevops/server/db";
import { projects } from "@undevops/server/db/schema";
import { eq } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";

export const projectCommand = new Command("project")
	.description("Manage projects");

projectCommand.command("list")
	.description("List projects")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const rows = await db.select({
			projectId: projects.projectId,
			name: projects.name,
			description: projects.description,
			createdAt: projects.createdAt,
		}).from(projects);
		fmt.output(rows, ["projectId", "name", "description", "createdAt"]);
	});

projectCommand.command("create")
	.description("Create a project")
	.requiredOption("--name <name>", "Project name")
	.requiredOption("--org-id <orgId>", "Organization ID")
	.option("--description <desc>", "Description")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const [row] = await db.insert(projects).values({
			name: opts.name,
			description: opts.description,
			organizationId: opts.orgId,
		}).returning();
		fmt.output([row], ["projectId", "name", "description"]);
	});
