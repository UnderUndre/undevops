import { z } from "zod";

export type Verdict = "pass" | "fail" | "abstain" | "error";

export interface ReviewRequest {
  changeDescription: string;
  diff?: string;
  environmentName: string;
  serviceName: string;
  previousDeployment?: { id: string; title: string; finishedAt: string };
}

export interface ReviewVerdict {
  verdict: Verdict;
  reasoning: string;
  confidence: number;
  rawResponse: string;
  tokenUsage?: { prompt: number; completion: number };
  durationMs: number;
}

export interface AIReviewerProvider {
  readonly name: string;
  readonly provider: "claude" | "openai" | "gemini" | "codex" | "custom";
  review(payload: ReviewRequest): Promise<ReviewVerdict>;
}

export const reviewRequestSchema = z.object({
  changeDescription: z.string().min(1),
  diff: z.string().optional(),
  environmentName: z.string(),
  serviceName: z.string(),
  previousDeployment: z
    .object({ id: z.string(), title: z.string(), finishedAt: z.string() })
    .optional(),
});

export const reviewVerdictSchema = z.object({
  verdict: z.enum(["pass", "fail", "abstain", "error"]),
  reasoning: z.string(),
  confidence: z.number().int().min(0).max(100),
  rawResponse: z.string(),
  tokenUsage: z
    .object({ prompt: z.number(), completion: z.number() })
    .optional(),
  durationMs: z.number(),
});
