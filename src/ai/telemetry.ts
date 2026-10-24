import { db } from "@/db/client";
import { aiCalls } from "@/db/schema";
import { costMicros, type Usage } from "./pricing";
import type { AIContext } from "./provider";

/** Writes one ai_calls row. Telemetry must never break the feature, so failures are logged and swallowed. */
export async function recordAICall(r: {
  purpose: string;
  model: string;
  usage: Usage | null;
  latencyMs: number;
  promptVersion: string;
  ctx?: AIContext;
  outcome: string;
  error?: string;
}) {
  try {
    await db()
      .insert(aiCalls)
      .values({
        purpose: r.purpose,
        provider: "claude",
        model: r.model,
        inputTokens: r.usage ? r.usage.input_tokens + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0) : null,
        outputTokens: r.usage?.output_tokens ?? null,
        latencyMs: r.latencyMs,
        costMicros: r.usage ? costMicros(r.model, r.usage) : null,
        outcome: r.outcome,
        promptVersion: r.promptVersion,
        bountyId: r.ctx?.bountyId,
        submissionId: r.ctx?.submissionId,
        error: r.error?.slice(0, 500),
      });
  } catch (e) {
    console.error("[ai] telemetry write failed", e instanceof Error ? e.message : e);
  }
}
