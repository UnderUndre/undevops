import { execAsync, execAsyncRemote } from "@undevops/server/utils/process/execAsync";
import { getRemoteDocker } from "@undevops/server/utils/servers/remote-docker";

export interface TraefikLBConfig {
	networkName: string;
	exposedByDefault: boolean;
	swarmWatch: boolean;
}

export function generateMultiNodeTraefikConfig(): TraefikLBConfig {
	return {
		networkName: "dokploy-network",
		exposedByDefault: false,
		swarmWatch: true,
	};
}

export async function verifyTraefikSwarmConfig(
	serverId?: string,
): Promise<{
	healthy: boolean;
	swarmProviderEnabled: boolean;
	overlayNetworkExists: boolean;
	traefikRunning: boolean;
	details: string;
}> {
	const remoteDocker = await getRemoteDocker(serverId);

	let traefikRunning = false;
	try {
		const container = remoteDocker.getContainer("dokploy-traefik");
		const info = await container.inspect();
		traefikRunning = info.State.Running === true;
	} catch {
		try {
			const service = remoteDocker.getService("dokploy-traefik");
			await service.inspect();
			traefikRunning = true;
		} catch {}
	}

	let overlayNetworkExists = false;
	try {
		const network = remoteDocker.getNetwork("dokploy-network");
		const inspect = await network.inspect();
		overlayNetworkExists = inspect.Scope === "swarm";
	} catch {}

	let swarmProviderEnabled = false;
	let traefikConfigRaw = "";
	if (serverId) {
		try {
			const { stdout } = await execAsyncRemote(
				serverId,
				"cat /etc/dokploy/traefik/traefik.yml 2>/dev/null || cat /etc/traefik/traefik.yml 2>/dev/null || echo ''",
			);
			traefikConfigRaw = stdout;
		} catch {}
	} else {
		try {
			const { stdout } = await execAsync(
				"cat /etc/dokploy/traefik/traefik.yml 2>/dev/null || cat /etc/traefik/traefik.yml 2>/dev/null || echo ''",
			);
			traefikConfigRaw = stdout;
		} catch {}
	}

	if (traefikConfigRaw) {
		swarmProviderEnabled = traefikConfigRaw.includes("swarm:");
	}

	const healthy =
		traefikRunning && overlayNetworkExists && swarmProviderEnabled;

	const details = [
		traefikRunning ? "Traefik: running" : "Traefik: NOT running",
		overlayNetworkExists
			? "Overlay network (dokploy-network): exists"
			: "Overlay network (dokploy-network): MISSING",
		swarmProviderEnabled
			? "Swarm provider: enabled"
			: "Swarm provider: DISABLED",
	].join("; ");

	return {
		healthy,
		swarmProviderEnabled,
		overlayNetworkExists,
		traefikRunning,
		details,
	};
}

export async function ensureOverlayNetwork(): Promise<{
	created: boolean;
	networkId: string;
}> {
	const remoteDocker = await getRemoteDocker(undefined);

	try {
		const network = remoteDocker.getNetwork("dokploy-network");
		const inspect = await network.inspect();
		return { created: false, networkId: inspect.Id };
	} catch {}

	const network = await remoteDocker.createNetwork({
		Name: "dokploy-network",
		Driver: "overlay",
		Attachable: true,
		CheckDuplicate: true,
	});

	return { created: true, networkId: network.id };
}
