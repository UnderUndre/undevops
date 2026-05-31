import { db, eq } from "@undevops/server/db";
import { applications } from "@undevops/server/db/schema/application";
import { getSwarmNodes } from "@undevops/server/services/docker";

interface NodeInfo {
	nodeId: string;
	hostname: string;
	status: "ready" | "down" | "unknown";
	role: "manager" | "worker";
	availability: "active" | "pause" | "drain";
	platform?: { Architecture: string; OS: string };
}

interface SchedulingDecision {
	applicationId: string;
	totalReplicas: number;
	placement: { nodeId?: string; replicas: number }[];
	spreadAcrossNodes: boolean;
}

export function calculatePlacement(
	totalReplicas: number,
	availableNodes: NodeInfo[],
): SchedulingDecision["placement"] {
	const eligible = availableNodes.filter(
		(n) => n.status === "ready" && n.availability === "active",
	);

	if (eligible.length === 0 || totalReplicas <= 0) {
		return [];
	}

	if (eligible.length === 1) {
		return [{ nodeId: eligible[0].nodeId, replicas: totalReplicas }];
	}

	const base = Math.floor(totalReplicas / eligible.length);
	const remainder = totalReplicas % eligible.length;

	return eligible.map((node, i) => ({
		nodeId: node.nodeId,
		replicas: base + (i < remainder ? 1 : 0),
	}));
}

export function buildSpreadPlacementPreference(): Array<{
	Spread: { SpreadDescriptor: string };
}> {
	return [{ Spread: { SpreadDescriptor: "node.id" } }];
}

export async function scheduleReplicasForApplication(
	applicationId: string,
): Promise<SchedulingDecision> {
	const app = await db.query.applications.findFirst({
		where: eq(applications.applicationId, applicationId),
	});

	if (!app) {
		throw new Error(`Application not found: ${applicationId}`);
	}

	const totalReplicas = app.modeSwarm?.Replicated?.Replicas ?? app.replicas ?? 1;

	const rawNodes = await getSwarmNodes(app.serverId ?? undefined);

	const availableNodes: NodeInfo[] = Array.isArray(rawNodes)
		? rawNodes.map((n: any) => ({
				nodeId: n.ID ?? n.id ?? "",
				hostname: n.Hostname ?? n.hostname ?? "",
				status: (n.Status ?? n.status ?? "unknown") as NodeInfo["status"],
				role: (n.Role ?? n.role ?? "worker") as NodeInfo["role"],
				availability: (n.Availability ?? n.availability ?? "active") as NodeInfo["availability"],
				platform: n.Platform ?? n.platform ?? undefined,
			}))
		: [];

	const placement = calculatePlacement(totalReplicas, availableNodes);

	return {
		applicationId,
		totalReplicas,
		placement,
		spreadAcrossNodes: availableNodes.filter(
			(n) => n.status === "ready" && n.availability === "active",
		).length > 1,
	};
}
