import { db } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema";
import { docker } from "@undevops/server/constants";
import { getRemoteDocker } from "@undevops/server/utils/servers/remote-docker";
import { eq, and, isNull, ne } from "drizzle-orm";
import type { ContainerInfo } from "dockerode";
import pino from "pino";

const logger = pino({ name: "reconciliation" });

interface ReconciliationResult {
	orphanedContainers: ContainerInfo[];
	staleDeployments: Array<{ deploymentId: string; appName: string; status: string }>;
	missingContainers: Array<{ deploymentId: string; appName: string }>;
}

export async function reconcileOnStartup(): Promise<ReconciliationResult> {
	logger.info("Starting startup reconciliation");

	const result: ReconciliationResult = {
		orphanedContainers: [],
		staleDeployments: [],
		missingContainers: [],
	};

	try {
		const [runningContainers, activeDeployments] = await Promise.all([
			getAllRunningContainers(),
			getActiveDeployments(),
		]);

		const containerAppNames = new Map<string, ContainerInfo>();
		for (const container of runningContainers) {
			const names = container.Names || [];
			for (const name of names) {
				const cleanName = name.replace(/^\//, "");
				containerAppNames.set(cleanName, container);
			}
		}

		for (const deployment of activeDeployments) {
			const found = containerAppNames.has(deployment.appName);
			if (!found) {
				result.missingContainers.push({
					deploymentId: deployment.deploymentId,
					appName: deployment.appName,
				});
				logger.warn({ deploymentId: deployment.deploymentId, appName: deployment.appName }, "Deployment record exists but container not running");
			}
		}

		const deploymentAppNames = new Set(activeDeployments.map((d) => d.appName));
		const knownInfrastructure = new Set([
			"dokploy-traefik",
			"dokploy-postgres",
			"dokploy-redis",
			"dokploy-monitoring",
		]);

		for (const [name, container] of containerAppNames) {
			if (!deploymentAppNames.has(name) && !knownInfrastructure.has(name)) {
				const labels = container.Labels || {};
				const isSwarmService = labels["com.docker.swarm.service.name"] !== undefined;
				const isCompose = labels["com.docker.compose.project"] !== undefined;

				if (isSwarmService || isCompose) {
					result.orphanedContainers.push(container);
					logger.warn({ containerName: name, containerId: container.Id }, "Orphaned container found");
				}
			}
		}

		for (const deployment of activeDeployments) {
			if (deployment.status === "running") {
				const found = containerAppNames.has(deployment.appName);
				if (!found) {
					result.staleDeployments.push({
						deploymentId: deployment.deploymentId,
						appName: deployment.appName,
						status: deployment.status,
					});
					logger.warn({ deploymentId: deployment.deploymentId }, "Stale deployment marked as running but container missing");
				}
			}
		}

		logger.info({
			orphaned: result.orphanedContainers.length,
			stale: result.staleDeployments.length,
			missing: result.missingContainers.length,
		}, "Reconciliation complete");

	} catch (error) {
		logger.error({ error }, "Reconciliation failed");
	}

	return result;
}

async function getAllRunningContainers(): Promise<ContainerInfo[]> {
	try {
		return await docker.listContainers({ all: false });
	} catch (error) {
		logger.error({ error }, "Failed to list containers");
		return [];
	}
}

async function getActiveDeployments(): Promise<Array<{ deploymentId: string; appName: string; status: string | null }>> {
	try {
		const rows = await db
			.select({
				deploymentId: deployments.deploymentId,
				status: deployments.status,
				logPath: deployments.logPath,
			})
			.from(deployments)
			.where(eq(deployments.status, "running"));

		return rows.map((r) => ({
			deploymentId: r.deploymentId,
			appName: extractAppNameFromLogPath(r.logPath),
			status: r.status,
		}));
	} catch (error) {
		logger.error({ error }, "Failed to query active deployments");
		return [];
	}
}

function extractAppNameFromLogPath(logPath: string): string {
	const parts = logPath.split("/");
	const logsIdx = parts.lastIndexOf("logs");
	if (logsIdx >= 0 && parts.length > logsIdx + 1) {
		return parts[logsIdx + 1];
	}
	return logPath;
}
