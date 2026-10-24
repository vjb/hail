// Safety screening. Day 4: a stub that always allows. Day 5 replaces it with rules + AI.
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

export async function screenBounty(input: ScreenInput): Promise<ScreenResult> {
  void input;
  const r = { decision: "allow" as const, category: "general", rationale: "Screening stub: allowed." };
  return { final: r, layers: [{ layer: "rules", ...r }] };
}
