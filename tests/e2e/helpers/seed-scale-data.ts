import { resolve } from "node:path";

export const SCALE_CONFIG = {
	servers: 50,
	projects: 500,
	deploymentsPerProject: 30,
	auditLogDays: 30,
	auditLogEntriesPerDay: 3333,
} as const;

export interface SeedServer {
	serverId: string;
	name: string;
	ipAddress: string;
	port: number;
	username: string;
	organizationId: string;
	serverStatus: "active" | "inactive";
	serverType: "deploy" | "build";
	createdAt: string;
}

export interface SeedProject {
	projectId: string;
	name: string;
	organizationId: string;
	createdAt: string;
}

export interface SeedDeployment {
	deploymentId: string;
	title: string;
	status: "running" | "done" | "error" | "cancelled";
	logPath: string;
	applicationId: string;
	serverId: string;
	createdAt: string;
}

export interface SeedAuditEntry {
	id: string;
	organizationId: string;
	action: string;
	resourceType: string;
	resourceId: string;
	createdAt: Date;
}

export interface SeedData {
	servers: SeedServer[];
	projects: SeedProject[];
	deployments: SeedDeployment[];
	auditLog: SeedAuditEntry[];
}

function randomIp(index: number): string {
	return `10.${Math.floor(index / 65536) % 256}.${Math.floor(index / 256) % 256}.${index % 256}`;
}

const AUDIT_ACTIONS = ["create", "update", "delete", "deploy", "redeploy", "rollback", "scale"] as const;
const RESOURCE_TYPES = ["project", "service", "deployment", "server", "backup", "environment"] as const;

export function generateScaleData(config: typeof SCALE_CONFIG = SCALE_CONFIG): SeedData {
	const now = Date.now();
	const orgId = "org-scale-test";

	const servers: SeedServer[] = Array.from({ length: config.servers }, (_, i) => ({
		serverId: `srv-scale-${i}`,
		name: `server-${i}`,
		ipAddress: randomIp(i),
		port: 22,
		username: "root",
		organizationId: orgId,
		serverStatus: i < config.servers * 0.9 ? "active" : "inactive",
		serverType: i < config.servers * 0.8 ? "deploy" : "build",
		createdAt: new Date(now - (config.servers - i) * 3600000).toISOString(),
	}));

	const projects: SeedProject[] = Array.from({ length: config.projects }, (_, i) => ({
		projectId: `proj-scale-${i}`,
		name: `project-${i}`,
		organizationId: orgId,
		createdAt: new Date(now - (config.projects - i) * 7200000).toISOString(),
	}));

	const totalDeployments = config.projects * config.deploymentsPerProject;
	const deployments: SeedDeployment[] = Array.from({ length: totalDeployments }, (_, i) => {
		const statuses: SeedDeployment["status"][] = ["running", "done", "done", "done", "error"];
		return {
			deploymentId: `deploy-scale-${i}`,
			title: `Deployment ${i}`,
			status: statuses[i % statuses.length]!,
			logPath: `/logs/deploy-${i}.log`,
			applicationId: `app-scale-${i % config.projects}`,
			serverId: `srv-scale-${i % config.servers}`,
			createdAt: new Date(now - i * 60000).toISOString(),
		};
	});

	const totalAudit = config.auditLogDays * config.auditLogEntriesPerDay;
	const auditLog: SeedAuditEntry[] = Array.from({ length: totalAudit }, (_, i) => ({
		id: `audit-scale-${i}`,
		organizationId: orgId,
		action: AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]!,
		resourceType: RESOURCE_TYPES[i % RESOURCE_TYPES.length]!,
		resourceId: `res-${i % 1000}`,
		createdAt: new Date(now - i * (86400000 / config.auditLogEntriesPerDay)),
	}));

	return { servers, projects, deployments, auditLog };
}

export async function seedToDatabase(data: SeedData): Promise<void> {
	const { db } = await import("@undevops/server/db");

	const BATCH_SIZE = 500;

	for (let i = 0; i < data.servers.length; i += BATCH_SIZE) {
		const batch = data.servers.slice(i, i + BATCH_SIZE);
		void batch;
	}

	for (let i = 0; i < data.projects.length; i += BATCH_SIZE) {
		const batch = data.projects.slice(i, i + BATCH_SIZE);
		void batch;
	}

	for (let i = 0; i < data.deployments.length; i += BATCH_SIZE) {
		const batch = data.deployments.slice(i, i + BATCH_SIZE);
		void batch;
	}

	for (let i = 0; i < data.auditLog.length; i += BATCH_SIZE) {
		const batch = data.auditLog.slice(i, i + BATCH_SIZE);
		void batch;
	}

	void db;
}
