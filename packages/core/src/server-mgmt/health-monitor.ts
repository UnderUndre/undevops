import { db, eq, and } from "@undevops/server/db";
import { server } from "@undevops/server/db/schema/server";
import { execAsyncRemote } from "@undevops/server/utils/process/execAsync";

export type NodeHealthStatus = "online" | "offline" | "degraded";

export interface NodeHealthResult {
	serverId: string;
	status: NodeHealthStatus;
	checkedAt: string;
	details: {
		dockerVersion?: string;
		containersRunning?: number;
		cpuUsagePercent?: number;
		memoryUsedMB?: number;
		diskUsedGB?: number;
		error?: string;
	};
}

export async function checkNodeHealth(
	serverId: string,
): Promise<NodeHealthResult> {
	const checkedAt = new Date().toISOString();
	const result: NodeHealthResult = {
		serverId,
		status: "offline",
		checkedAt,
		details: {},
	};

	const srv = await db.query.server.findFirst({
		where: eq(server.serverId, serverId),
	});

	if (!srv) {
		result.details.error = `Server not found: ${serverId}`;
		return result;
	}

	try {
		const versionRes = await execAsyncRemote(
			serverId,
			"docker info --format '{{.ServerVersion}}'",
		);

		if (versionRes.stderr && !versionRes.stdout.trim()) {
			result.status = "offline";
			result.details.error = versionRes.stderr.trim();
			await db
				.update(server)
				.set({ serverStatus: "inactive" })
				.where(eq(server.serverId, serverId));
			return result;
		}

		result.details.dockerVersion = versionRes.stdout.trim() || undefined;

		const containersRes = await execAsyncRemote(
			serverId,
			"docker ps -q | wc -l",
		);
		result.details.containersRunning = Number.parseInt(
			containersRes.stdout.trim(),
			10,
		) || 0;

		const cpuRes = await execAsyncRemote(
			serverId,
			"grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'",
		);
		result.details.cpuUsagePercent = Number.parseFloat(
			cpuRes.stdout.trim(),
		) || undefined;

		const memRes = await execAsyncRemote(
			serverId,
			"awk '/MemAvailable/ {avail=$2} /MemTotal/ {total=$2} END {if(total>0) print (total-avail)/1024}' /proc/meminfo",
		);
		result.details.memoryUsedMB = Number.parseFloat(memRes.stdout.trim()) || undefined;

		const diskRes = await execAsyncRemote(
			serverId,
			"df -BG / | awk 'NR==2 {print $3}' | tr -d 'G'",
		);
		result.details.diskUsedGB = Number.parseFloat(diskRes.stdout.trim()) || undefined;

		result.status = "online";
		await db
			.update(server)
			.set({ serverStatus: "active" })
			.where(eq(server.serverId, serverId));
	} catch (err) {
		result.status = "offline";
		result.details.error =
			err instanceof Error ? err.message : String(err);
		await db
			.update(server)
			.set({ serverStatus: "inactive" })
			.where(eq(server.serverId, serverId));
	}

	return result;
}

export async function checkAllNodes(
	organizationId: string,
): Promise<NodeHealthResult[]> {
	const servers = await db.query.server.findMany({
		where: eq(server.organizationId, organizationId),
	});

	const results = await Promise.allSettled(
		servers.map((s) => checkNodeHealth(s.serverId)),
	);

	return results.map((r, i) => {
		if (r.status === "fulfilled") {
			return r.value;
		}
		return {
			serverId: servers[i].serverId,
			status: "offline" as NodeHealthStatus,
			checkedAt: new Date().toISOString(),
			details: {
				error: r.reason instanceof Error ? r.reason.message : String(r.reason),
			},
		};
	});
}
