import type { ChecklistResult } from "@/db/schema";

// Hidden values (D-034) never reach workers. The verifier is told not to quote them; this is the
// backstop for worker-facing text: any spelling of the value (case, spaces, dashes) is masked.

const MASK = "[the listing's value]";

function pattern(value: string) {
  const chars = value.replace(/[\s-]/g, "").split("");
  if (chars.length < 3) return null; // too short to mask without hiding ordinary words
  const esc = chars.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(esc.join("[\\s-]*"), "gi");
}

export function redactHidden(text: string, expected: Array<string | null> | null | undefined) {
  if (!expected) return text;
  let out = text;
  for (const v of expected) {
    const re = v ? pattern(v) : null;
    if (re) out = out.replace(re, MASK);
  }
  return out;
}

export function redactResults(results: ChecklistResult[], expected: Array<string | null> | null | undefined): ChecklistResult[] {
  if (!expected) return results;
  return results.map((r) => ({ ...r, reason: redactHidden(r.reason, expected) }));
}
