import { createAuditLog } from "@undevops/server/services/proprietary/audit-log";
import type { AuditAction, AuditResourceType } from "@undevops/server/db/schema/audit-log";

interface AuditActor {
	userId: string;
	userEmail: string;
	userRole: string;
	organizationId: string;
	actorType?: "human" | "agent" | "plugin" | "system";
	actorId?: string;
}

function audit(
	actor: AuditActor,
	action: AuditAction,
	resourceType: AuditResourceType,
	resourceId: string,
	resourceName?: string,
	payload?: Record<string, unknown>,
) {
	return createAuditLog({
		organizationId: actor.organizationId,
		userId: actor.userId,
		userEmail: actor.userEmail,
		userRole: actor.userRole,
		action,
		resourceType,
		resourceId,
		resourceName,
		metadata: {
			actor_type: actor.actorType ?? "human",
			actor_id: actor.actorId ?? actor.userId,
			payload,
		},
	});
}

export function auditDeploy(actor: AuditActor, deploymentId: string, details?: { appName?: string; commit?: string }) {
	return audit(actor, "deploy", "deployment", deploymentId, details?.appName, details);
}

export function auditServerAdd(actor: AuditActor, serverId: string, serverName?: string) {
	return audit(actor, "create", "server", serverId, serverName);
}

export function auditServerRemove(actor: AuditActor, serverId: string, serverName?: string) {
	return audit(actor, "delete", "server", serverId, serverName);
}

export function auditProjectCreate(actor: AuditActor, projectId: string, projectName?: string) {
	return audit(actor, "create", "project", projectId, projectName);
}

export function auditProjectDelete(actor: AuditActor, projectId: string, projectName?: string) {
	return audit(actor, "delete", "project", projectId, projectName);
}

export function auditSecretSet(actor: AuditActor, secretId: string, details?: { key?: string; scope?: string }) {
	return audit(actor, "update", "security", secretId, details?.key, details);
}

export function auditRedeploy(actor: AuditActor, deploymentId: string, details?: { appName?: string }) {
	return audit(actor, "redeploy", "deployment", deploymentId, details?.appName, details);
}

export function auditCancel(actor: AuditActor, deploymentId: string) {
	return audit(actor, "cancel", "deployment", deploymentId);
}

export function auditEnvironmentCreate(actor: AuditActor, environmentId: string, envName?: string) {
	return audit(actor, "create", "environment", environmentId, envName);
}
