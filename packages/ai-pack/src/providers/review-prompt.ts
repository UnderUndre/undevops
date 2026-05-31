import { z } from "zod";
import type { ReviewRequest, Verdict } from "../types/reviewer.js";

const VerdictSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
});

const DEFAULT_SYSTEM_PROMPT = `You are an infrastructure change reviewer. Analyze the proposed deployment change and assess risk.

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "pass" or "fail",
  "reasoning": "detailed explanation of your assessment",
  "confidence": <number 0-100>
}

Criteria for "fail":
- Breaking changes without migration plan
- Security vulnerabilities introduced
- Critical configuration errors
- Missing rollback strategy for high-risk changes
- Resource limits that could cause outages

Criteria for "pass":
- Well-understood changes with low risk
- Proper rollback mechanisms in place
- Non-breaking configuration updates
- Routine deployments with established patterns`;

export function buildSystemPrompt(customPrompt?: string): string {
  return customPrompt ?? DEFAULT_SYSTEM_PROMPT;
}

export function buildUserMessage(request: ReviewRequest): string {
  const parts: string[] = [
    `## Review Request`,
    ``,
    `**Service:** ${request.serviceName}`,
    `**Environment:** ${request.environmentName}`,
    ``,
    `### Change Description`,
    request.changeDescription,
  ];

  if (request.diff) {
    parts.push(``, `### Diff`, "```diff", request.diff, "```");
  }

  if (request.previousDeployment) {
    parts.push(
      ``,
      `### Previous Deployment`,
      `- ID: ${request.previousDeployment.id}`,
      `- Title: ${request.previousDeployment.title}`,
      `- Finished: ${request.previousDeployment.finishedAt}`,
    );
  }

  return parts.join("\n");
}

export function parseVerdictResponse(raw: string): {
  verdict: Verdict;
  reasoning: string;
  confidence: number;
} {
  let jsonStr = raw.trim();

  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const embeddedMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (embeddedMatch) {
    jsonStr = embeddedMatch[0];
  }

  const parsed = VerdictSchema.parse(JSON.parse(jsonStr));

  return {
    verdict: parsed.verdict,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence,
  };
}

export function createTimeoutController(timeoutSeconds: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  return {
    controller,
    timeoutId,
    clear: () => clearTimeout(timeoutId),
  };
}
