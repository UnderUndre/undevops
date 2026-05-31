export const AI_PACK_VERSION = "0.1.0";

export type { AIReviewerProvider, ReviewRequest, ReviewVerdict, Verdict } from "./types/reviewer.js";
export { reviewRequestSchema, reviewVerdictSchema } from "./types/reviewer.js";

export { ClaudeReviewer } from "./providers/claude.js";
export { GeminiReviewer } from "./providers/gemini.js";
export { OpenAIProvider } from "./providers/openai.js";
export { CodexProvider } from "./providers/codex.js";
export { CustomProvider } from "./providers/custom.js";
export { buildSystemPrompt, buildUserMessage, parseVerdictResponse, createTimeoutController } from "./providers/review-prompt.js";

export { buildChangePayload, changeSetSchema } from "./review/index.js";
export type { ChangeSet, EnvVarChange, ComposeChange } from "./review/index.js";

export {
  evaluateGate,
  resolveSecret,
  createProvider,
  DEFAULT_POLICY,
} from "./review/gate-evaluator.js";
export type {
  GateStatus,
  GateResult,
  GatePolicy,
  ReviewerConfig,
  IndividualResult,
} from "./review/gate-evaluator.js";
