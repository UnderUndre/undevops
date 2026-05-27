export {
  mechanizeDockerContainer,
  getBuildCommand,
  getAuthConfig,
} from "@undevops/server/utils/builders";

export type { ApplicationNested } from "@undevops/server/utils/builders";

export {
  pullImage,
  pullRemoteImage,
  stopService,
  startService,
  removeService,
  getServiceContainer,
  cleanupAll,
  cleanupAllBackground,
  prepareEnvironmentVariables,
} from "@undevops/server/utils/docker/utils";

export {
  loadDockerCompose,
  writeDomainsToCompose,
  createDomainLabels,
} from "@undevops/server/utils/docker/domain";

export {
  zeroDowntimeDeploy,
} from "@undevops/server/services/deploy/zero-downtime";

export {
  enqueueDeploy,
  dequeueDeploy,
  completeDeploy,
  getQueueStatus,
  clearQueue,
  listAllQueues,
} from "@undevops/server/services/deploy/deploy-queue";

export {
  handleLogStream,
  createLogStreamHandler,
} from "@undevops/server/services/deploy/log-stream";

export {
  resolveSecretsForScope,
  resolveAllSecretsForDeployment,
  secretsToEnvArray,
} from "@undevops/server/services/deploy/secret-injector";

export {
  reconcileOnStartup,
} from "@undevops/server/services/deploy/reconciliation";

export {
  checkGateRequired,
  runReviewGate,
  type GateDecision,
} from "./review-gate";

export {
  processAdminOverride,
  type OverrideRequest,
  type OverrideResult,
} from "./admin-override";

export {
  identifyRescheduleCandidates,
  drainNodeAndReschedule,
  type RescheduleAction,
} from "./replica-rescheduler";

export {
  calculatePlacement,
  buildSpreadPlacementPreference,
  scheduleReplicasForApplication,
} from "./replica-scheduler";
