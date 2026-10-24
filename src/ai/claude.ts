import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";
import { SCREEN_PROMPT_VERSION, SCREEN_SYSTEM } from "./prompts/screening";
import { ScreenOutput, type AIContext, type AIProvider, type AIResult, type BountyForAI } from "./provider";
import { recordAICall } from "./telemetry";

// Claude implementation of AIProvider. Model IDs come from env; prompts are versioned files.

let client: Anthropic | undefined;
const anthropic = () => (client ??= new Anthropic({ apiKey: env().ANTHROPIC_API_KEY || undefined, maxRetries: 2, timeout: 60_000 }));

type Call<T> = {
  purpose: "screen" | "verify" | "photo_check" | "ops";
  model: string;
  promptVersion: string;
  system: string;
  content: Anthropic.MessageParam["content"];
  schema: z.ZodType<T>;
  maxTokens: number;
  effort: "low" | "medium" | "high";
  ctx?: AIContext;
  outcome: (v: T) => string;
};

/** One structured call with telemetry; retries once on a parse failure, then reports failure (callers fail safe). */
async function structured<T>(c: Call<T>): Promise<AIResult<T>> {
  let lastError = "unknown error";
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const res = await anthropic().messages.parse({
        model: c.model,
        max_tokens: c.maxTokens,
        system: [{ type: "text", text: c.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: c.content }],
        output_config: { effort: c.effort, format: zodOutputFormat(c.schema) },
      });
      const latencyMs = Date.now() - started;
      if (res.stop_reason === "refusal") {
        lastError = `model declined (${res.stop_details?.category ?? "no category"})`;
        await recordAICall({ purpose: c.purpose, model: c.model, usage: res.usage, latencyMs, promptVersion: c.promptVersion, ctx: c.ctx, outcome: "refusal", error: lastError });
        break; // a refusal won't change on retry
      }
      const parsed = res.parsed_output;
      if (!parsed) {
        lastError = `unparseable output (stop: ${res.stop_reason})`;
        await recordAICall({ purpose: c.purpose, model: c.model, usage: res.usage, latencyMs, promptVersion: c.promptVersion, ctx: c.ctx, outcome: "parse_error", error: lastError });
        continue;
      }
      await recordAICall({ purpose: c.purpose, model: c.model, usage: res.usage, latencyMs, promptVersion: c.promptVersion, ctx: c.ctx, outcome: c.outcome(parsed) });
      return { ok: true, value: parsed, model: c.model, promptVersion: c.promptVersion };
    } catch (e) {
      lastError = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
      await recordAICall({ purpose: c.purpose, model: c.model, usage: null, latencyMs: Date.now() - started, promptVersion: c.promptVersion, ctx: c.ctx, outcome: "error", error: lastError });
      if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.AuthenticationError) break;
    }
  }
  return { ok: false, error: lastError, model: c.model, promptVersion: c.promptVersion };
}

/** Untrusted text is serialized as JSON inside tags; the model is told it is data. */
const asData = (tag: string, value: unknown) => `<${tag}>\n${JSON.stringify(value, null, 2).replaceAll(`</${tag}>`, `<\\/${tag}>`)}\n</${tag}>`;

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";

  screenBounty(input: BountyForAI, ctx?: AIContext) {
    const bounty = {
      title: input.title,
      instructions: input.instructions,
      deliverables: input.deliverables,
      acceptance_checklist: input.acceptanceChecklist,
      reward_usd: (input.rewardCents / 100).toFixed(2),
      location: input.location?.address ?? null,
      product: input.productQuery ?? null,
    };
    return structured({
      purpose: "screen",
      model: env().AI_MODEL_SCREEN,
      promptVersion: SCREEN_PROMPT_VERSION,
      system: SCREEN_SYSTEM,
      content: `Classify this bounty.\n\n${asData("bounty", bounty)}`,
      schema: ScreenOutput,
      maxTokens: 4000,
      effort: "medium",
      ctx,
      outcome: (v) => `${v.decision}:${v.category}`,
    });
  }
}
