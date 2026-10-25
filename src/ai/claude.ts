import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";
import { PHOTO_CHECK_PROMPT_VERSION, PHOTO_CHECK_SYSTEM } from "./prompts/photo-check";
import { SCREEN_PROMPT_VERSION, SCREEN_SYSTEM } from "./prompts/screening";
import { VERIFY_PROMPT_VERSION, VERIFY_SYSTEM } from "./prompts/verification";
import { PhotoCheckOutput, ScreenOutput, VerifyOutput, type AIContext, type AIProvider, type AIResult, type BountyForAI, type PhotoCheckInput, type VerifyInput } from "./provider";
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

  checkPhoto(input: PhotoCheckInput, ctx?: AIContext) {
    const task = { title: input.bounty.title, instructions: input.bounty.instructions, acceptance_checklist: input.bounty.acceptanceChecklist, product: input.bounty.product ?? null };
    return structured({
      purpose: "photo_check",
      model: env().AI_MODEL_VERIFY,
      promptVersion: PHOTO_CHECK_PROMPT_VERSION,
      system: PHOTO_CHECK_SYSTEM,
      content: [
        { type: "image", source: { type: "base64", media_type: input.image.mime, data: input.image.base64 } },
        { type: "text", text: `${asData("task", task)}

This photo is meant to show: ${JSON.stringify(input.item)}
${input.challengeCode ? `The worker was asked to write this code on paper and keep it in the photo: ${JSON.stringify(input.challengeCode)}
` : ""}Is it usable?` },
      ],
      schema: PhotoCheckOutput,
      maxTokens: 3000,
      effort: "low",
      ctx,
      outcome: (v) => (v.usable ? "usable" : "retake"),
    });
  }

  verifyProof(input: VerifyInput, ctx?: AIContext) {
    const expected = input.bounty.checklistExpected;
    const checklist = input.bounty.acceptanceChecklist.map((item, i) => (expected?.[i] ? { item, expected: expected[i] } : item));
    const task = { title: input.bounty.title, instructions: input.bounty.instructions, acceptance_checklist: checklist, reference_product: input.bounty.product ?? null };
    const content: Anthropic.ContentBlockParam[] = [];
    input.photos.forEach((p, i) => {
      const code = p.challengeCode ? ` Photo code the worker was asked to include: ${JSON.stringify(p.challengeCode)}.` : " No photo code was issued for this photo.";
      content.push({ type: "text", text: `Photo ${i + 1}, meant to show: ${JSON.stringify(p.label)}.${code}` });
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: p.base64 } });
    });
    const where = input.distanceMeters === null ? "The worker did not share a location." : `The worker's shared location was about ${Math.round(input.distanceMeters)} m from the task location.`;
    content.push({ type: "text", text: `${asData("task", task)}

${asData("worker_notes", input.notes ?? "")}

${where}

Check every acceptance checklist item, in order, then the proof checks for every photo, in order.` });
    return structured({
      purpose: "verify",
      model: env().AI_MODEL_VERIFY,
      promptVersion: VERIFY_PROMPT_VERSION,
      system: VERIFY_SYSTEM,
      content,
      schema: VerifyOutput,
      maxTokens: 6000,
      effort: "medium",
      ctx,
      outcome: (v) =>
        v.checklist.map((x) => (x.passed === true ? "P" : x.passed === false ? (x.cause === "item" ? "I" : "F") : "?")).join("") +
        (v.photos ?? []).map((p) => (p.code === "matches" || p.code === "not_requested") && !p.screen && !p.generated_or_edited ? "+" : "!").join(""),
    });
  }
}
