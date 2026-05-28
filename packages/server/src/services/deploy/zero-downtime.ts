import { createHmac, timingSafeEqual } from "node:crypto";
import type { Readable } from "node:stream";
import { docker } from "@undevops/server/constants";
import { db } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema";
import { getRemoteDocker } from "@undevops/server/utils/servers/remote-docker";
import { eq } from "drizzle-orm";
import type Dockerode from "dockerode";
import type { Container } from "dockerode";
import pino from "pino";

const logger = pino({ name: "zero-downtime" });

const DEFAULT_HEALTH_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_HEALTH_INTERVAL_MS = 5000;
const DEFAULT_HEALTH_ENDPOINT = "/health";

interface ZeroDowntimeOptions {
	appName: string;
	serverId?: string | null;
	image: string;
	env: string[];
	healthCheckPath?: string;
	healthCheckPort?: number;
	healthTimeoutMs?: number;
	networkTarget?: string;
	labels?: Record<string, string>;
}

interface HealthCheckResult {
	healthy: boolean;
	statusCode?: number;
	error?: string;
}

export async function zeroDowntimeDeploy(options: ZeroDowntimeOptions): Promise<{ success: boolean; error?: string }> {
	const {
		appName,
		serverId,
		image,
		env,
		healthCheckPath = DEFAULT_HEALTH_ENDPOINT,
		healthCheckPort = 3000,
		healthTimeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
		networkTarget = "dokploy-network",
		labels = {},
	} = options;

	const dockerClient: Dockerode = await getRemoteDocker(serverId);
	const tempName = `${appName}-new-${Date.now()}`;

	try {
		const newContainer = await createAndStartContainer(dockerClient, {
			name: tempName,
			image,
			env,
			networkTarget,
			labels: { ...labels, "undevops.deploy.role": "candidate" },
		});

		logger.info({ tempName, image }, "New container started, waiting for health check");

		const healthy = await waitForHealthCheck(newContainer, {
			path: healthCheckPath,
			port: healthCheckPort,
			timeoutMs: healthTimeoutMs,
		});

		if (!healthy.healthy) {
			logger.warn({ tempName, error: healthy.error }, "Health check failed, rolling back");
			await stopAndRemove(newContainer);
			return { success: false, error: healthy.error || "Health check failed" };
		}

		logger.info({ tempName }, "Health check passed, switching traffic");

		const oldContainer = await findRunningContainer(dockerClient, appName);
		if (oldContainer) {
			await stopAndRemove(oldContainer);
		}

		await newContainer.rename({ name: appName });

		return { success: true };
	} catch (error) {
		logger.error({ error, appName }, "Zero-downtime deploy failed");
		try {
			const tempContainer = dockerClient.getContainer(tempName);
			await stopAndRemove(tempContainer);
		} catch {}
		return { success: false, error: error instanceof Error ? error.message : String(error) };
	}
}

async function createAndStartContainer(
	docker: Dockerode,
	opts: { name: string; image: string; env: string[]; networkTarget: string; labels: Record<string, string> },
): Promise<Container> {
	const container = await docker.createContainer({
		name: opts.name,
		Image: opts.image,
		Env: opts.env,
		Labels: opts.labels,
		NetworkingConfig: {
			EndpointsConfig: {
				[opts.networkTarget]: {},
			},
		},
	});

	await container.start();
	return container;
}

async function waitForHealthCheck(
	container: Container,
	config: { path: string; port: number; timeoutMs: number },
): Promise<HealthCheckResult> {
	const startTime = Date.now();

	while (Date.now() - startTime < config.timeoutMs) {
		try {
			const info = await container.inspect();
			if (!info.State.Running) {
				return { healthy: false, error: "Container stopped unexpectedly" };
			}

			const exec = await container.exec({
				Cmd: ["curl", "-sf", "-o", "/dev/null", "-w", "%{http_code}", `http://localhost:${config.port}${config.path}`],
				AttachStdout: true,
				AttachStderr: true,
			});

			const stream = await exec.start({});
			const output = await readStream(stream);
			const execInfo = await exec.inspect();

			if (execInfo.ExitCode === 0) {
				const statusCode = Number.parseInt(output.trim(), 10);
				if (statusCode >= 200 && statusCode < 400) {
					return { healthy: true, statusCode };
				}
			}
		} catch {
			// curl not available or container not ready yet
		}

		await sleep(DEFAULT_HEALTH_INTERVAL_MS);
	}

	return { healthy: false, error: `Health check timed out after ${config.timeoutMs}ms` };
}

async function findRunningContainer(docker: Dockerode, appName: string): Promise<Container | null> {
	try {
		const containers = await docker.listContainers({
			filters: JSON.stringify({ name: [appName], status: ["running"] }),
		});
		if (containers.length > 0 && containers[0]) {
			return docker.getContainer(containers[0].Id);
		}
	} catch {}
	return null;
}

async function stopAndRemove(container: Container): Promise<void> {
	try {
		await container.stop({ t: 10 });
	} catch {}
	try {
		await container.remove({ force: true });
	} catch {}
}

function readStream(stream: Readable): Promise<string> {
	return new Promise((resolve) => {
		let data = "";
		stream.on("data", (chunk: Buffer) => { data += chunk.toString(); });
		stream.on("end", () => resolve(data));
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
