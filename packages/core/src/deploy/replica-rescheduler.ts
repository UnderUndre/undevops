import { db, eq, and } from "@undevops/server/db";
import { applications } from "@undevops/server/db/schema/application";
import { server } from "@undevops/server/db/schema/server";
import { environments } from "@undevops/server/db/schema/environment";
import { projects } from "@undevops/server/db/schema/project";
import { organization } from "@undevops/server/db/schema/account";
import { findServerById } from "@undevops/server/services/server";
import { execAsyncRemote } from "@undevops/server/utils/process/execAsync";

export interface RescheduleAction {
	applicationId: string;
	appName: string;
	degradedServerId: string;
	targetServerId?: string;
	replicasToMove: number;
}

export async function identifyRescheduleCandidates(
	degradedServerId: string,
	organizationId: string,
): Promise<RescheduleAction[]> {
	const apps = await db
		.select({
			applicationId: applications.applicationId,
			appName: applications.appName,
			serverId: applications.serverId,
			replicas: applications.replicas,
		})
		.from(applications)
		.innerJoin(
			environments,
			eq(applications.environmentId, environments.environmentId),
		)
		.innerJoin(projects, eq(environments.projectId, projects.projectId))
		.innerJoin(
			organization,
			eq(projects.organizationId, organization.id),
		)
		.where(
			and(
				eq(applications.serverId, degradedServerId),
				eq(organization.id, organizationId),
			),
		);

	return apps
		.filter((app) => app.replicas > 0)
		.map((app) => ({
			applicationId: app.applicationId,
			appName: app.appName,
			degradedServerId,
			replicasToMove: app.replicas,
		}));
}

async function findManagerServerId(
	organizationId: string,
): Promise<string | null> {
	const result = await db
		.select({ serverId: server.serverId })
		.from(server)
		.where(eq(server.organizationId, organizationId))
		.limit(1);
	return result[0]?.serverId ?? null;
}

async function getSwarmNodeHostname(
	managerServerId: string,
	degradedServerId: string,
): Promise<string> {
	const degraded = await findServerById(degradedServerId);
	const { stdout } = await execAsyncRemote(
		managerServerId,
		`docker node ls --format '{{.Hostname}}' --filter name=${degraded.appName}`,
	);
	const hostname = stdout.trim().split("\n")[0];
	if (!hostname) {
		return degraded.appName;
	}
	return hostname;
}

async function waitForReschedule(
	managerServerId: string,
	nodeHostname: string,
	timeoutSeconds: number,
): Promise<boolean> {
	const deadline = Date.now() + timeoutSeconds * 1000;
	const checkInterval = 5000;

	while (Date.now() < deadline) {
		const { stdout } = await execAsyncRemote(
			managerServerId,
			`docker node ls --format '{{.Hostname}} {{.Status}} {{.Availability}}'`,
		);

		const nodeLine = stdout
			.trim()
			.split("\n")
			.find((line) => line.startsWith(nodeHostname));

		if (nodeLine?.includes("Drain")) {
			const { stdout: taskStdout } = await execAsyncRemote(
				managerServerId,
				`docker node ps ${nodeHostname} --filter desired-state=running --format '{{.Name}}'`,
			);
			const runningTasks = taskStdout.trim().split("\n").filter(Boolean);
			if (runningTasks.length === 0) {
				return true;
			}
		}

		await new Promise((resolve) => setTimeout(resolve, checkInterval));
	}

	return false;
}

export async function drainNodeAndReschedule(
	degradedServerId: string,
	organizationId: string,
	timeoutSeconds: number = 300,
): Promise<{ drained: boolean; rescheduled: RescheduleAction[] }> {
	const candidates = await identifyRescheduleCandidates(
		degradedServerId,
		organizationId,
	);

	if (candidates.length === 0) {
		return { drained: true, rescheduled: [] };
	}

	const managerServerId = await findManagerServerId(organizationId);
	if (!managerServerId) {
		throw new Error("No manager server found for organization");
	}

	const nodeHostname = await getSwarmNodeHostname(
		managerServerId,
		degradedServerId,
	);

	await execAsyncRemote(
		managerServerId,
		`docker node update --availability drain ${nodeHostname}`,
	);

	const rescheduled = await waitForReschedule(
		managerServerId,
		nodeHostname,
		timeoutSeconds,
	);

	if (!rescheduled) {
		return { drained: true, rescheduled: candidates };
	}

	return { drained: true, rescheduled: candidates };
}
