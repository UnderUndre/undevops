import { db, eq } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema/deployment";
import { auditLog } from "@undevops/server/db/schema/audit-log";

export interface OverrideRequest {
  deploymentId: string;
  adminUserId: string;
  reason: string;
}

export interface OverrideResult {
  deploymentId: string;
  gateStatus: "approved";
  overriddenBy: string;
  reason: string;
  timestamp: string;
}

export async function processAdminOverride(
  request: OverrideRequest,
): Promise<OverrideResult> {
  const timestamp = new Date().toISOString();

  await db
    .update(deployments)
    .set({ gateStatus: "approved" })
    .where(eq(deployments.deploymentId, request.deploymentId));

  await db.insert(auditLog).values({
    action: "gate_bypassed",
    resourceType: "deployment",
    resourceId: request.deploymentId,
    actor_type: "human",
    actor_id: request.adminUserId,
    payload: {
      reason: request.reason,
      deploymentId: request.deploymentId,
    },
    userId: request.adminUserId,
    userEmail: "",
    userRole: "admin",
  });

  return {
    deploymentId: request.deploymentId,
    gateStatus: "approved",
    overriddenBy: request.adminUserId,
    reason: request.reason,
    timestamp,
  };
}
