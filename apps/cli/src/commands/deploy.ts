import { Command } from "commander";
import { db } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";
import { existsSync } from "node:fs";
import { tailFile } from "@undevops/core";

export const deployCommand = new Command("deploy")
	.description("Deployment operations");

deployCommand.command("trigger")
	.description("Trigger a deployment")
	.requiredOption("--project <id>", "Project ID")
	.action(async (opts) => {
		console.log(`Deployment triggered for project ${opts.project}`);
		console.log("Note: Deployment queue integration requires running API server");
	});

const deploymentCommand = new Command("deployment")
	.description("View deployments");

deploymentCommand.command("list")
	.description("List deployments for a project")
	.requiredOption("--project <id>", "Project ID")
	.option("--limit <n>", "Limit results", "20")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const limit = Number.parseInt(opts.limit, 10);
		const rows = await db.select({
			deploymentId: deployments.deploymentId,
			title: deployments.title,
			status: deployments.status,
			createdAt: deployments.createdAt,
			startedAt: deployments.startedAt,
			finishedAt: deployments.finishedAt,
		}).from(deployments)
			.limit(limit)
			.orderBy(desc(deployments.createdAt));
		fmt.output(rows, ["deploymentId", "title", "status", "createdAt"]);
	});

deploymentCommand.command("logs")
	.description("View deployment logs")
	.requiredOption("--id <deploymentId>", "Deployment ID")
	.option("--tail <n>", "Number of lines", "100")
	.action(async (opts) => {
		const [row] = await db.select({ logPath: deployments.logPath })
			.from(deployments)
			.where(eq(deployments.deploymentId, opts.id))
			.limit(1);

		if (!row?.logPath || !existsSync(row.logPath)) {
			console.error("No logs found for deployment", opts.id);
			return;
		}

		const tail = Number.parseInt(opts.tail, 10);
		const { lines } = await tailFile(row.logPath, tail);
		for (const entry of lines) {
			console.log(entry.line);
		}
	});

export { deploymentCommand };
