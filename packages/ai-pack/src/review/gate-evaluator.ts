import type { AIReviewerProvider, ReviewRequest, ReviewVerdict } from "../types/reviewer.js";
import { ClaudeReviewer } from "../providers/claude.js";
import { GeminiReviewer } from "../providers/gemini.js";
import { OpenAIProvider } from "../providers/openai.js";
import { CodexProvider } from "../providers/codex.js";
import { CustomProvider } from "../providers/custom.js";

export type GateStatus = "approved" | "rejected" | "timed_out";

export interface ReviewerConfig {
  aiReviewerId: string;
  name: string;
  provider: "claude" | "openai" | "gemini" | "codex" | "custom";
  credentialRef: string;
  model: string;
  apiUrl?: string;
  timeoutSeconds: number;
  isEnabled: boolean;
  configJson?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    reviewFocus?: ("security" | "performance" | "best_practices" | "cost")[];
    customHeaders?: Record<string, string>;
  };
}

export interface IndividualResult {
  aiReviewerId: string;
  name: string;
  verdict: "pass" | "fail" | "abstain" | "error";
  reasoning: string;
  confidence: number;
  durationMs: number;
  error?: string;
}

export interface GateResult {
  status: GateStatus;
  results: IndividualResult[];
  totalReviewers: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  evaluatedAt: string;
}

export interface GatePolicy {
  failOnAbsent: boolean;
  failOnAbstain: boolean;
  requireAllPass: boolean;
}

export const DEFAULT_POLICY: GatePolicy = {
  failOnAbsent: true,
  failOnAbstain: false,
  requireAllPass: true,
};

export function resolveSecret(credentialRef: string, secrets: Map<string, string>): string {
  if (credentialRef.startsWith("secret:")) {
    const key = credentialRef.slice("secret:".length);
    const value = secrets.get(key);
    if (!value) throw new Error(`Secret '${key}' not found`);
    return value;
  }
  if (credentialRef.startsWith("env:")) {
    const key = credentialRef.slice("env:".length);
    const value = process.env[key];
    if (!value) throw new Error(`Env var '${key}' not found`);
    return value;
  }
  return credentialRef;
}

export function createProvider(config: ReviewerConfig, apiKey: string): AIReviewerProvider {
  const baseConfig = {
    apiKey,
    model: config.model,
    apiUrl: config.apiUrl,
    timeoutSeconds: config.timeoutSeconds,
    systemPrompt: config.configJson?.systemPrompt,
    temperature: config.configJson?.temperature,
  };

  switch (config.provider) {
    case "claude":
      return new ClaudeReviewer(baseConfig);
    case "openai":
      return new OpenAIProvider(baseConfig);
    case "gemini":
      return new GeminiReviewer(baseConfig);
    case "codex":
      return new CodexProvider(baseConfig);
    case "custom":
      return new CustomProvider({
        apiKey,
        model: config.model,
        apiUrl: config.apiUrl ?? "",
        timeoutSeconds: config.timeoutSeconds,
        systemPrompt: config.configJson?.systemPrompt,
        temperature: config.configJson?.temperature,
      });
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function toIndividualResult(
  config: ReviewerConfig,
  verdict: ReviewVerdict,
): IndividualResult {
  return {
    aiReviewerId: config.aiReviewerId,
    name: config.name,
    verdict: verdict.verdict,
    reasoning: verdict.reasoning,
    confidence: verdict.confidence,
    durationMs: verdict.durationMs,
    error: verdict.verdict === "error" ? verdict.reasoning : undefined,
  };
}

function toErrorResult(
  config: ReviewerConfig,
  error: unknown,
  durationMs: number,
): IndividualResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    aiReviewerId: config.aiReviewerId,
    name: config.name,
    verdict: "error",
    reasoning: message,
    confidence: 0,
    durationMs,
    error: message,
  };
}

function applyPolicy(results: IndividualResult[], policy: GatePolicy): GateStatus {
  const passCount = results.filter((r) => r.verdict === "pass").length;
  const failCount = results.filter((r) => r.verdict === "fail").length;
  const errorCount = results.filter((r) => r.verdict === "error").length;
  const abstainCount = results.filter((r) => r.verdict === "abstain").length;

  if (failCount > 0) {
    return "rejected";
  }

  if (policy.failOnAbsent && errorCount > 0) {
    return "rejected";
  }

  if (policy.failOnAbstain && abstainCount > 0) {
    return "rejected";
  }

  if (policy.requireAllPass) {
    const decisiveResults = results.filter(
      (r) =>
        r.verdict !== "error" &&
        (!policy.failOnAbstain || r.verdict !== "abstain"),
    );

    if (decisiveResults.length > 0 && passCount === decisiveResults.length) {
      return "approved";
    }

    if (decisiveResults.length === 0 && results.length > 0) {
      return "rejected";
    }
  } else {
    if (passCount > 0) {
      return "approved";
    }
  }

  return "rejected";
}

export async function evaluateGate(
  reviewers: ReviewerConfig[],
  request: ReviewRequest,
  secrets: Map<string, string>,
  policy: GatePolicy = DEFAULT_POLICY,
): Promise<GateResult> {
  const enabled = reviewers.filter((r) => r.isEnabled);

  if (enabled.length === 0) {
    return {
      status: "approved",
      results: [],
      totalReviewers: reviewers.length,
      passCount: 0,
      failCount: 0,
      errorCount: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const providerConfigs = enabled.map((config) => {
    const apiKey = resolveSecret(config.credentialRef, secrets);
    const provider = createProvider(config, apiKey);
    return { config, provider };
  });

  const settled = await Promise.allSettled(
    providerConfigs.map(async ({ config, provider }) => {
      const start = Date.now();
      const timeoutMs = config.timeoutSeconds * 1000;

      const result = await Promise.race([
        provider.review(request),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Reviewer '${config.name}' timed out after ${config.timeoutSeconds}s`)),
            timeoutMs,
          ),
        ),
      ]);

      return toIndividualResult(config, result);
    }),
  );

  const results: IndividualResult[] = settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    const config = providerConfigs[index].config;
    return toErrorResult(config, outcome.reason, 0);
  });

  const passCount = results.filter((r) => r.verdict === "pass").length;
  const failCount = results.filter((r) => r.verdict === "fail").length;
  const errorCount = results.filter((r) => r.verdict === "error").length;
  const status = applyPolicy(results, policy);

  return {
    status,
    results,
    totalReviewers: enabled.length,
    passCount,
    failCount,
    errorCount,
    evaluatedAt: new Date().toISOString(),
  };
}
