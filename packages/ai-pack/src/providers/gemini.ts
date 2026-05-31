import type { AIReviewerProvider, ReviewRequest, ReviewVerdict, Verdict } from "../types/reviewer.js";

const DEFAULT_SYSTEM_PROMPT = `You are a deployment reviewer. Analyze the described change and determine if it is safe to deploy.

Respond ONLY with valid JSON in this exact format:
{"verdict": "pass|fail|abstain", "reasoning": "your reasoning here", "confidence": <0-100>}

Rules:
- "pass": Change looks safe, low risk
- "fail": Change is risky, has issues, or needs human review
- "abstain": Not enough information to judge
- confidence: integer 0-100, how confident you are in the verdict
- Never respond with "error" — that is reserved for system errors`;

interface GeminiConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
  timeoutSeconds?: number;
  systemPrompt?: string;
  temperature?: number;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text: string }[];
    };
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export class GeminiReviewer implements AIReviewerProvider {
  readonly name: string;
  readonly provider = "gemini" as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly systemPrompt: string;
  private readonly temperature: number;

  constructor(config: GeminiConfig) {
    this.name = `gemini/${config.model}`;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl =
      config.apiUrl ?? "https://generativelanguage.googleapis.com/v1beta/models";
    this.timeoutMs = (config.timeoutSeconds ?? 30) * 1000;
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.temperature = config.temperature ?? 0.3;
  }

  async review(payload: ReviewRequest): Promise<ReviewVerdict> {
    const start = Date.now();

    const userMessage = this.buildUserMessage(payload);
    const fullPrompt = `${this.systemPrompt}\n\n${userMessage}`;

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          verdict: "error",
          reasoning: `Gemini API error: ${response.status} ${response.statusText}`,
          confidence: 0,
          rawResponse: body,
          durationMs: Date.now() - start,
        };
      }

      const data = (await response.json()) as GeminiResponse;
      const rawResponse =
        data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";

      const parsed = this.parseResponse(rawResponse);

      return {
        ...parsed,
        rawResponse,
        tokenUsage: data.usageMetadata
          ? {
              prompt: data.usageMetadata.promptTokenCount ?? 0,
              completion: data.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
        durationMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        verdict: "error",
        reasoning: `Request failed: ${message}`,
        confidence: 0,
        rawResponse: "",
        durationMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUserMessage(payload: ReviewRequest): string {
    const lines: string[] = [
      `Service: ${payload.serviceName}`,
      `Environment: ${payload.environmentName}`,
      `Change: ${payload.changeDescription}`,
    ];

    if (payload.diff) {
      lines.push(`\nDiff:\n${payload.diff}`);
    }

    if (payload.previousDeployment) {
      lines.push(
        `\nPrevious deployment: ${payload.previousDeployment.title} (${payload.previousDeployment.id}) finished at ${payload.previousDeployment.finishedAt}`,
      );
    }

    return lines.join("\n");
  }

  private parseResponse(raw: string): { verdict: Verdict; reasoning: string; confidence: number } {
    try {
      const json = JSON.parse(raw);
      const verdict = ["pass", "fail", "abstain"].includes(json.verdict)
        ? (json.verdict as Verdict)
        : "error";
      return {
        verdict,
        reasoning: String(json.reasoning ?? ""),
        confidence: Number(json.confidence ?? 0),
      };
    } catch {
      return { verdict: "error", reasoning: "Failed to parse AI response as JSON", confidence: 0 };
    }
  }
}
