import { db } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema";
import { docker } from "@undevops/server/constants";
import { getRemoteDocker } from "@undevops/server/utils/servers/remote-docker";
import { eq, desc, and } from "drizzle-orm";
import type { Dockerode } from "dockerode";
import pino from "pino";

const logger = pino({ name: "deploy-queue" });

const QUEUE_PREFIX = "undevops:deploy:";
const ACTIVE_KEY = ":active";

interface DeployJob {
	applicationId: string;
	commit: string;
	title: string;
	description?: string;
	type: "deploy" | "redeploy";
	priority: number;
	createdAt: number;
}

interface QueueEntry {
	projectId: string;
	activeJob: DeployJob | null;
	pendingJobs: DeployJob[];
}

const queues = new Map<string, QueueEntry>();

export function getQueueKey(projectId: string): string {
	return `${QUEUE_PREFIX}${projectId}`;
}

export async function enqueueDeploy(projectId: string, job: Omit<DeployJob, "priority" | "createdAt">): Promise<{ queued: boolean; skipped: boolean }> {
	const key = getQueueKey(projectId);
	let queue = queues.get(key);

	if (!queue) {
		queue = { projectId, activeJob: null, pendingJobs: [] };
		queues.set(key, queue);
	}

	const fullJob: DeployJob = {
		...job,
		priority: 0,
		createdAt: Date.now(),
	};

	if (queue.activeJob) {
		queue.pendingJobs.push(fullJob);
		queue.pendingJobs.sort((a, b) => b.createdAt - a.createdAt);

		if (queue.pendingJobs.length > 1) {
			const collapsed = queue.pendingJobs[0];
			const removed = queue.pendingJobs.splice(1);
			logger.info({ projectId, removed: removed.length }, "Collapsed queue to latest commit");
		}

		return { queued: true, skipped: false };
	}

	queue.activeJob = fullJob;
	logger.info({ projectId, commit: job.commit }, "Job started immediately (queue empty)");
	return { queued: true, skipped: false };
}

export function dequeueDeploy(projectId: string): DeployJob | null {
	const key = getQueueKey(projectId);
	const queue = queues.get(key);
	if (!queue) return null;

	if (queue.pendingJobs.length > 0) {
		const next = queue.pendingJobs.shift()!;
		queue.activeJob = next;
		return next;
	}

	queue.activeJob = null;
	return null;
}

export function completeDeploy(projectId: string): DeployJob | null {
	const key = getQueueKey(projectId);
	const queue = queues.get(key);
	if (!queue) return null;

	const completed = queue.activeJob;
	queue.activeJob = null;

	if (queue.pendingJobs.length > 0) {
		return dequeueDeploy(projectId);
	}

	return null;
}

export function getQueueStatus(projectId: string): { active: DeployJob | null; pending: number } {
	const key = getQueueKey(projectId);
	const queue = queues.get(key);
	if (!queue) return { active: null, pending: 0 };
	return { active: queue.activeJob, pending: queue.pendingJobs.length };
}

export function clearQueue(projectId: string): void {
	const key = getQueueKey(projectId);
	queues.delete(key);
}

export function listAllQueues(): Array<{ projectId: string; active: boolean; pending: number }> {
	const result: Array<{ projectId: string; active: boolean; pending: number }> = [];
	for (const [key, queue] of queues) {
		result.push({
			projectId: queue.projectId,
			active: queue.activeJob !== null,
			pending: queue.pendingJobs.length,
		});
	}
	return result;
}
