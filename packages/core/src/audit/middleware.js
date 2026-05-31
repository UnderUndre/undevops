import { createAuditLog } from "@undevops/server/services/proprietary/audit-log";
export function createActorAudit(actor) {
    return async function recordAudit(event) {
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
