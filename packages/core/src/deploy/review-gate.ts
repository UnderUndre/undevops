import { db, eq } from "@undevops/server/db";
import { deployments } from "@undevops/server/db/schema/deployment";
import { applications } from "@undevops/server/db/schema/application";
import { environments } from "@undevops/server/db/schema/environment";
import { aiReviewers } from "@undevops/server/db/schema/ai-reviewer";
import { deploymentReviewVerdicts } from "@undevops/server/db/schema/deployment-review-verdict";
import { auditLog } from "@undevops/server/db/schema/audit-log";
import { buildChangePayload, evaluateGate, type ReviewerConfig, type GateResult } from "@undevops/ai-pack";

export type GateDecision = "skipped" | "pending" | "approved" | "rejected" | "timed_out";

export async function checkGateRequired(deploymentId: string): Promise<{
  required: boolean;
  gatePolicy: string;
  reviewerIds: string[];
}> {
  const deployment = await db.query.deployments.findFirst({
    where: eq(deployments.deploymentId, deploymentId),
    with: { application: true },
  });

  if (!deployment) {
    throw new Error(`Deployment not found: ${deploymentId}`);
  }

  if (!deployment.application) {
    return { required: false, gatePolicy: "disabled", reviewerIds: [] };
  }

  const environment = await db.query.environments.findFirst({
    where: eq(environments.environmentId, deployment.application.environmentId),
  });

  if (!environment) {
    return { required: false, gatePolicy: "disabled", reviewerIds: [] };
  }

  if (environment.gatePolicy === "disabled") {
    return { required: false, gatePolicy: environment.gatePolicy, reviewerIds: environment.reviewerIds ?? [] };
  }

  return {
    required: true,
    gatePolicy: environment.gatePolicy,
    reviewerIds: environment.reviewerIds ?? [],
  };
}

export async function runReviewGate(
  deploymentId: string,
  secrets?: Map<string, string>,
): Promise<{
  decision: GateDecision;
  verdicts: typeof deploymentReviewVerdicts.$inferSelect[];
}> {
  const gateCheck = await checkGateRequired(deploymentId);

  if (!gateCheck.required) {
    await db
      .update(deployments)
      .set({ gateStatus: "skipped" })
      .where(eq(deployments.deploymentId, deploymentId));

    return { decision: "skipped" as GateDecision, verdicts: [] };
  }

  await db
    .update(deployments)
    .set({ gateStatus: "pending" })
    .where(eq(deployments.deploymentId, deploymentId));

  const reviewerRows = await db
    .select()
    .from(aiReviewers)
    .where(eq(aiReviewers.isEnabled, true));

  const filtered = gateCheck.reviewerIds.length > 0
    ? reviewerRows.filter((r: typeof aiReviewers.$inferSelect) => gateCheck.reviewerIds.includes(r.aiReviewerId))
    : reviewerRows;

  if (filtered.length === 0) {
    await db
      .update(deployments)
      .set({ gateStatus: "approved" })
      .where(eq(deployments.deploymentId, deploymentId));

    return { decision: "approved", verdicts: [] };
  }

  const deployment = await db.query.deployments.findFirst({
    where: eq(deployments.deploymentId, deploymentId),
    with: { application: true },
  });

  if (!deployment) {
    throw new Error(`Deployment not found: ${deploymentId}`);
  }

  let environmentName = "unknown";
  if (deployment.application) {
    const env = await db.query.environments.findFirst({
      where: eq(environments.environmentId, deployment.application.environmentId),
    });
    if (env) environmentName = env.name;
  }

  const changeSet = buildChangePayload({
    environmentName,
    serviceName: deployment.application?.name ?? deployment.title,
    commitMessage: deployment.description ?? deployment.title,
  });

  const reviewerConfigs: ReviewerConfig[] = filtered.map((r: typeof aiReviewers.$inferSelect) => ({
    aiReviewerId: r.aiReviewerId,
    name: r.name,
    provider: r.provider,
    credentialRef: r.credentialRef,
    model: r.model,
    apiUrl: r.apiUrl ?? undefined,
    timeoutSeconds: r.timeoutSeconds,
    isEnabled: r.isEnabled,
    configJson: r.configJson ?? undefined,
  }));

  const secretsMap = secrets ?? new Map<string, string>();

  const requireAllPass = gateCheck.gatePolicy === "unanimous";

  let gateResult: GateResult;
  try {
    gateResult = await evaluateGate(
      reviewerConfigs,
      {
        changeDescription: changeSet.changeDescription,
        diff: changeSet.diff,
        environmentName: changeSet.environmentName,
        serviceName: changeSet.serviceName,
        previousDeployment: changeSet.previousDeployment,
      },
      secretsMap,
      {
        failOnAbsent: true,
        failOnAbstain: false,
        requireAllPass,
      },
    );
  } catch {
    await db
      .update(deployments)
      .set({ gateStatus: "rejected" })
      .where(eq(deployments.deploymentId, deploymentId));

    return { decision: "rejected", verdicts: [] };
  }

  const persistedVerdicts: typeof deploymentReviewVerdicts.$inferSelect[] = [];

  for (const result of gateResult.results) {
    const [inserted] = await db
      .insert(deploymentReviewVerdicts)
      .values({
        deploymentId,
        aiReviewerId: result.aiReviewerId,
        verdict: result.verdict,
        reasoning: result.reasoning,
        confidence: result.confidence,
        durationMs: result.durationMs,
        payload: {
          request: {
            changeDescription: changeSet.changeDescription,
            environmentName: changeSet.environmentName,
            serviceName: changeSet.serviceName,
          },
          response: {
            raw: result.reasoning,
            parsed: true,
            model: result.name,
          },
        },
      })
      .returning();

    if (inserted) persistedVerdicts.push(inserted);
  }

  type GateStatusValue = "approved" | "rejected" | "timed_out";

  const gateStatusMap: Record<GateResult["status"], GateStatusValue> = {
    approved: "approved",
    rejected: "rejected",
    timed_out: "timed_out",
  };

  const decision = gateStatusMap[gateResult.status];

  await db
    .update(deployments)
    .set({ gateStatus: decision })
    .where(eq(deployments.deploymentId, deploymentId));

  await db.insert(auditLog).values({
    action: "gate_evaluated",
    resourceType: "deployment",
    resourceId: deploymentId,
    actor_type: "system",
    actor_id: "review-gate",
    payload: {
      decision,
      policy: gateCheck.gatePolicy,
      totalReviewers: gateResult.totalReviewers,
      passCount: gateResult.passCount,
      failCount: gateResult.failCount,
      errorCount: gateResult.errorCount,
    },
    userId: "system",
    userEmail: "system",
    userRole: "system",
  });

  return { decision: decision as GateDecision, verdicts: persistedVerdicts };
}
