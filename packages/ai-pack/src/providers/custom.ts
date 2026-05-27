import type { AIReviewerProvider, ReviewRequest, ReviewVerdict } from "../types/reviewer";
import {
  buildSystemPrompt,
  buildUserMessage,
  createTimeoutController,
  parseVerdictResponse,
} from "./review-prompt";

export interface CustomProviderConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  timeoutSeconds?: number;
  systemPrompt?: string;
  temperature?: number;
}

export class CustomProvider implements AIReviewerProvider {
  readonly name: string;
  readonly provider = "custom" as const;

  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly timeoutSeconds: number;
  private readonly systemPrompt: string;
  private readonly temperature: number;

  constructor(config: CustomProviderConfig) {
    if (!config.apiUrl) {
      throw new Error("CustomProvider requires apiUrl");
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.model = config.model;
    this.timeoutSeconds = config.timeoutSeconds ?? 30;
    this.systemPrompt = buildSystemPrompt(config.systemPrompt);
    this.temperature = config.temperature ?? 0.3;
    this.name = `custom/${this.model}@${new URL(this.apiUrl).host}`;
  }

  async review(payload: ReviewRequest): Promise<ReviewVerdict> {
    const start = Date.now();
    const { controller, clear } = createTimeoutController(this.timeoutSeconds);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: this.systemPrompt },
            { role: "user", content: buildUserMessage(payload) },
          ],
          max_tokens: 1024,
          temperature: this.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Custom API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content ?? "";

      if (!raw) {
        throw new Error("Empty response from custom API");
      }

      const parsed = parseVerdictResponse(raw);

      return {
        verdict: parsed.verdict,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence,
        rawResponse: raw,
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
        },
        durationMs: Date.now() - start,
      };
    } finally {
      clear();
    }
  }
}
