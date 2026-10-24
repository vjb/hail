import { ai } from "@/ai";
import { SCREEN_CATEGORIES } from "@/ai/provider";
import { applyRules } from "./rules";

// Safety screening = deterministic rules, then the AI classifier. The stricter outcome wins,
// confidence below 0.7 needs the owner, and any AI failure falls back to owner approval.

export type ScreenDecision = "allow" | "needs_owner_approval" | "block";

export type ScreenLayerResult = {
  layer: "rules" | "ai";
  decision: ScreenDecision;
  category: string;
  rationale: string;
  confidence?: number;
  model?: string;
  promptVersion?: string;
};

export type ScreenInput = {
  title: string;
  instructions: string;
  deliverables: Array<{ type: string; description: string }>;
  acceptanceChecklist: string[];
  rewardCents: number;
  spots: number;
  location?: { address?: string } | null;
  productQuery?: string | null;
  policy: { approvalThresholdCents: number; allowedCategories: string[] };
  bountyId?: string;
};

export type ScreenResult = { final: Omit<ScreenLayerResult, "layer">; layers: ScreenLayerResult[] };

const RANK: Record<ScreenDecision, number> = { allow: 0, needs_owner_approval: 1, block: 2 };
export const MIN_CONFIDENCE = 0.7;

export async function screenBounty(input: ScreenInput): Promise<ScreenResult> {
  const text = [input.title, input.instructions, ...input.deliverables.map((d) => d.description), ...input.acceptanceChecklist, input.location?.address ?? "", input.productQuery ?? ""].join("\n");
  const layers: ScreenLayerResult[] = [];

  const hits = applyRules({ text, rewardCents: input.rewardCents * input.spots, approvalThresholdCents: input.policy.approvalThresholdCents });
  const ruleTop = hits.sort((a, b) => RANK[b.decision] - RANK[a.decision])[0];
  layers.push(ruleTop ? { layer: "rules", ...ruleTop } : { layer: "rules", decision: "allow", category: "no_rule_matched", rationale: "No blocked or sensitive pattern found." });

  // Rules already block: the AI can't loosen it, so skip the call.
  if (ruleTop?.decision !== "block") {
    const r = await ai().screenBounty(input, { bountyId: input.bountyId });
    if (r.ok) {
      let { decision } = r.value;
      const { category, confidence } = r.value;
      let rationale = r.value.rationale;
      // Keep decision and category consistent; inconsistent output is treated as uncertain.
      const blockedCat = (SCREEN_CATEGORIES.blocked as readonly string[]).includes(category);
      const approvalCat = (SCREEN_CATEGORIES.needsApproval as readonly string[]).includes(category);
      if (blockedCat && decision !== "block") decision = "block";
      if (approvalCat && decision === "allow") decision = "needs_owner_approval";
      if (decision === "allow" && confidence < MIN_CONFIDENCE) {
        decision = "needs_owner_approval";
        rationale = `${rationale} (Hail wasn't confident enough to post it automatically.)`;
      }
      if (decision === "allow" && input.policy.allowedCategories.length > 0 && !input.policy.allowedCategories.includes(category)) {
        decision = "needs_owner_approval";
        rationale = `${rationale} (This kind of task isn't on your allowed list.)`;
      }
      layers.push({ layer: "ai", decision, category, rationale, confidence, model: r.model, promptVersion: r.promptVersion });
    } else {
      layers.push({ layer: "ai", decision: "needs_owner_approval", category: "unclear", rationale: "Automatic screening couldn't finish, so the owner must approve this task.", model: r.model, promptVersion: r.promptVersion });
    }
  }

  // Stricter decision wins. On a tie, a rule that actually matched explains it best; otherwise the AI's category does.
  const matched = (l: ScreenLayerResult) => l.layer === "ai" || l.category !== "no_rule_matched";
  const final = [...layers].sort((a, b) => RANK[b.decision] - RANK[a.decision] || Number(matched(b)) - Number(matched(a)) || (a.layer === "rules" ? -1 : 1))[0];
  const { layer: _l, ...rest } = final;
  void _l;
  return { final: rest, layers };
}
