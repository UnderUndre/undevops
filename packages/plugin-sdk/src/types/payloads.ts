export interface PreDeployPayload {
	deploymentId: string;
	projectId: string;
	projectName: string;
	projectSlug?: string;
	serverId: string;
	serverName?: string;
	environment: string;
	trigger: "manual" | "webhook" | "cli" | "mcp" | "plugin" | "rollback";
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
	branch?: string;
	commitHash?: string;
	commitMessage?: string;
	previousDeploymentId?: string;
	previousStatus?: string;
	envVars?: Record<string, string>;
	buildType?: string;
	imageTag?: string;
	replicas?: number;
	domain?: string;
	timestamp: string;
}

export interface PreDeployResult {
	abort?: boolean;
	reason?: string;
	envOverrides?: Record<string, string>;
	metadata?: Record<string, unknown>;
}

export interface PostDeployPayload {
	deploymentId: string;
	projectId: string;
	projectName: string;
	projectSlug?: string;
	serverId: string;
	serverName?: string;
	environment: string;
	trigger?: string;
	actorType?: string;
	actorId?: string;
	branch?: string;
	commitHash?: string;
	commitMessage?: string;
	imageTag?: string;
	replicas?: number;
	domain?: string;
	previousDeploymentId?: string;
	buildDurationMs?: number;
	deployDurationMs?: number;
	totalDurationMs?: number;
	healthStatus?: {
		healthy: boolean;
		httpStatusCode?: number;
		responseTimeMs?: number;
	};
	timestamp: string;
}

export interface PostDeployResult {
	metadata?: Record<string, unknown>;
}

export interface DeployFailedPayload {
	deploymentId: string;
	projectId: string;
	projectName: string;
	projectSlug?: string;
	serverId: string;
	serverName?: string;
	environment?: string;
	trigger?: string;
	actorType?: string;
	actorId?: string;
	branch?: string;
	commitHash?: string;
	commitMessage?: string;
	failureStage: "build" | "deploy" | "health_check" | "pre_deploy_hook" | "unknown";
	errorMessage: string;
	errorStack?: string;
	buildLogs?: Array<{
		timestamp: string;
		level: string;
		message: string;
	}>;
	previousDeploymentId?: string;
	timestamp: string;
}

export interface DeployFailedResult {
	metadata?: Record<string, unknown>;
}

export interface ServerAddedPayload {
	serverId: string;
	serverName: string;
	address: string;
	port?: number;
	os?: string;
	cpuCores?: number;
	totalMemoryMB?: number;
	dockerVersion?: string;
	tags?: string[];
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
	timestamp: string;
}

export interface ServerRemovedPayload {
	serverId: string;
	serverName: string;
	address: string;
	projectsAffected?: Array<{
		projectId: string;
		projectName: string;
		action: "migrated" | "stopped" | "deleted";
	}>;
	reason: "manual" | "health_failure" | "decommissioned";
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
	timestamp: string;
}

export interface ProjectCreatedPayload {
	projectId: string;
	projectName: string;
	projectSlug: string;
	description?: string;
	serverId: string;
	serverName?: string;
	environment: string;
	repository?: {
		url: string;
		branch: string;
		provider: string;
	};
	buildType?: string;
	domain?: string;
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
	timestamp: string;
}

export interface ProjectDeletedPayload {
	projectId: string;
	projectName: string;
	projectSlug: string;
	serverId: string;
	serverName?: string;
	environment?: string;
	lastDeploymentId?: string;
	totalDeployments?: number;
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
	reason: "manual" | "cleanup" | "cascade";
	timestamp: string;
}

export interface Project {
	projectId: string;
	name: string;
	slug?: string;
	description?: string;
	environment?: string;
	createdAt?: string;
}

export interface Server {
	serverId: string;
	name: string;
	ipAddress: string;
	port: number;
	status: string;
}

export interface Deployment {
	deploymentId: string;
	title?: string;
	status: string;
	createdAt: string;
	startedAt?: string;
	finishedAt?: string;
	errorMessage?: string;
}

export interface LogLine {
	timestamp: string;
	level: string;
	message: string;
}

export interface PluginLogger {
	info(message: string, meta?: Record<string, unknown>): void;
	warn(message: string, meta?: Record<string, unknown>): void;
	error(message: string, meta?: Record<string, unknown>): void;
	debug(message: string, meta?: Record<string, unknown>): void;
}

export interface PluginApiClient {
	getProject(projectId: string): Promise<Project>;
	getServer(serverId: string): Promise<Server>;
	getDeployment(deploymentId: string): Promise<Deployment>;
	getProjectLogs(projectId: string, opts?: { lines?: number; level?: string }): Promise<LogLine[]>;
}

export interface PluginContext {
	pluginName: string;
	pluginVersion: string;
	settings: Record<string, unknown>;
	logger: PluginLogger;
	api: PluginApiClient;
}

export type HookName =
	| "pre-deploy"
	| "post-deploy"
	| "deploy-failed"
	| "server-added"
	| "server-removed"
	| "project-created"
	| "project-deleted";

export interface UndevopsPlugin {
	onPreDeploy?(payload: PreDeployPayload, context: PluginContext): Promise<PreDeployResult>;
	onPostDeploy?(payload: PostDeployPayload, context: PluginContext): Promise<PostDeployResult>;
	onDeployFailed?(payload: DeployFailedPayload, context: PluginContext): Promise<DeployFailedResult>;
	onServerAdded?(payload: ServerAddedPayload, context: PluginContext): Promise<void>;
	onServerRemoved?(payload: ServerRemovedPayload, context: PluginContext): Promise<void>;
	onProjectCreated?(payload: ProjectCreatedPayload, context: PluginContext): Promise<void>;
	onProjectDeleted?(payload: ProjectDeletedPayload, context: PluginContext): Promise<void>;
}

export const HOOK_TO_METHOD: Record<HookName, keyof UndevopsPlugin> = {
	"pre-deploy": "onPreDeploy",
	"post-deploy": "onPostDeploy",
	"deploy-failed": "onDeployFailed",
	"server-added": "onServerAdded",
	"server-removed": "onServerRemoved",
	"project-created": "onProjectCreated",
	"project-deleted": "onProjectDeleted",
};
