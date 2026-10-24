// USD per million tokens, from Anthropic's published pricing (checked 2026-10-24).
// Used only for cost estimates in ai_calls; keep in sync with the pricing page.
const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

export type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

/** Estimated cost in micro-dollars (1e-6 USD), rounded. Unknown models return null. */
export function costMicros(model: string, u: Usage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const dollars =
    (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1_000_000;
  return Math.round(dollars * 1_000_000);
}
