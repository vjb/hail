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
};

export type AIContext = { bountyId?: string; submissionId?: string };

export type AIResult<T> = { ok: true; value: T; model: string; promptVersion: string } | { ok: false; error: string; model: string; promptVersion: string };

export interface AIProvider {
  readonly name: string;
  screenBounty(input: BountyForAI, ctx?: AIContext): Promise<AIResult<ScreenOutput>>;
  checkPhoto(input: PhotoCheckInput, ctx?: AIContext): Promise<AIResult<PhotoCheckOutput>>;
}
