import { createAuditLog } from "@undevops/server/services/proprietary/audit-log";
import type { AuditAction, AuditResourceType } from "@undevops/server/db/schema/audit-log";

type ActorType = "human" | "agent" | "plugin" | "system";

interface AuditEventInput {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  resourceName?: string;
  organizationId: string;
  payload?: Record<string, unknown>;
}

interface ActorContext {
  actorType: ActorType;
  actorId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export function createActorAudit(actor: ActorContext) {
  return async function recordAudit(event: AuditEventInput): Promise<void> {
    await createAuditLog({
      organizationId: event.organizationId,
      userId: actor.userId ?? actor.actorId ?? "system",
      userEmail: actor.userEmail ?? "system",
      userRole: actor.userRole ?? "system",
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      resourceName: event.resourceName,
      metadata: {
        actor_type: actor.actorType,
        actor_id: actor.actorId,
        payload: event.payload,
      },
    });
  };
}

export { type ActorType, type ActorContext, type AuditEventInput };
