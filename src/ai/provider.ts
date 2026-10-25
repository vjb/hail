import { z } from "zod";

// All AI in Hail goes through this interface. Feature code never calls an SDK directly.

export const SCREEN_CATEGORIES = {
  allowed: ["item_inspection", "place_photo", "business_check", "stock_or_price_check", "public_information", "simple_errand", "other_allowed"],
  needsApproval: ["private_property", "money_or_valuables", "third_party_call", "unclear"],
  blocked: [
    "credential_account_fraud",
    "identity_proxying",
    "otp_solicitation",
    "social_media_manipulation",
    "referral_promo_fraud",
    "private_individual_recon",
    "illegal_dangerous",
  ],
} as const;

export const ALL_SCREEN_CATEGORIES = [...SCREEN_CATEGORIES.allowed, ...SCREEN_CATEGORIES.needsApproval, ...SCREEN_CATEGORIES.blocked] as const;
export type ScreenCategory = (typeof ALL_SCREEN_CATEGORIES)[number];

export const ScreenOutput = z.object({
  decision: z.enum(["allow", "needs_owner_approval", "block"]),
  category: z.enum(ALL_SCREEN_CATEGORIES),
  rationale: z.string(),
  confidence: z.number(),
});
export type ScreenOutput = z.infer<typeof ScreenOutput>;

export type BountyForAI = {
  title: string;
  instructions: string;
  deliverables: Array<{ type: string; description: string }>;
  acceptanceChecklist: string[];
  rewardCents: number;
  location?: { address?: string } | null;
  productQuery?: string | null;
};

export const PhotoCheckOutput = z.object({
  usable: z.boolean(),
  problems: z.array(z.string()),
  retake_hint: z.string(),
});
export type PhotoCheckOutput = z.infer<typeof PhotoCheckOutput>;

export type PhotoCheckInput = {
  bounty: Pick<BountyForAI, "title" | "instructions" | "acceptanceChecklist"> & { product?: { title?: string; attributes?: Record<string, string> } | null };
  item: string;
  image: { mime: "image/jpeg"; base64: string };
  /** The fresh code the worker was asked to write on paper and include in this photo. */
  challengeCode?: string | null;
};

export const PhotoProofCheck = z.object({
  code: z.enum(["matches", "missing", "different", "unreadable", "not_requested"]),
  screen: z.boolean(),
  generated_or_edited: z.boolean(),
});

export const VerifyOutput = z.object({
  checklist: z.array(
    z.object({
      item: z.string(),
      passed: z.boolean().nullable(),
      // Why an item failed: the item itself doesn't meet it (honest finding) or the proof doesn't show it.
      cause: z.enum(["item", "proof"]).nullable().optional(),
      reason: z.string(),
      confidence: z.number(),
    }),
  ),
  // Proof checks (verify-v2): one per photo, in order. Optional so a model that omits them is treated as doubtful, not as a crash.
  photos: z.array(PhotoProofCheck).optional(),
  same_scene: z.boolean().nullable().optional(),
  concerns: z.array(z.string()).optional(),
  summary: z.string(),
});
export type VerifyOutput = z.infer<typeof VerifyOutput>;

export type VerifyInput = {
  /** `checklistExpected`: hidden values aligned with the checklist (D-034). Only the verifier sees them. */
  bounty: Pick<BountyForAI, "title" | "instructions" | "acceptanceChecklist"> & { product?: { title?: string; attributes?: Record<string, string> } | null; checklistExpected?: Array<string | null> | null };
  /** `challengeCode` is the code the worker was asked to include in that photo (null for photos taken without one). */
  photos: Array<{ label: string; base64: string; challengeCode?: string | null }>;
  notes: string | null;
  distanceMeters: number | null;
};

/** New proof photos and the same worker's earlier photos for other tasks, all JPEG base64. */
export type SamePhotoInput = { photos: string[]; earlier: string[] };

export const SamePhotoOutput = z.object({
  /** One entry per new photo made from an earlier one; `photo` and `earlier` are 1-based. */
  matches: z.array(z.object({ photo: z.number().int(), earlier: z.number().int(), shared_details: z.string() })),
});
export type SamePhotoOutput = z.infer<typeof SamePhotoOutput>;

export type AIContext = { bountyId?: string; submissionId?: string };

export type AIResult<T> = { ok: true; value: T; model: string; promptVersion: string } | { ok: false; error: string; model: string; promptVersion: string };

export interface AIProvider {
  readonly name: string;
  screenBounty(input: BountyForAI, ctx?: AIContext): Promise<AIResult<ScreenOutput>>;
  checkPhoto(input: PhotoCheckInput, ctx?: AIContext): Promise<AIResult<PhotoCheckOutput>>;
  verifyProof(input: VerifyInput, ctx?: AIContext): Promise<AIResult<VerifyOutput>>;
  comparePhotos(input: SamePhotoInput, ctx?: AIContext): Promise<AIResult<SamePhotoOutput>>;
}
