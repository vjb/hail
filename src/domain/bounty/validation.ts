import { z } from "zod";
import { bountyStatusEnum } from "@/db/schema";
import type { CreateBountyInput } from "./service";

// Request validation for POST /api/v1/bounties and the MCP create_bounty tool.
// Limits come from docs/public/api.md. Messages are written for outside developers.

/** Field limits from docs/public/api.md. Enforced below; the MCP tool schemas advertise the same values. */
export const LIMITS = {
  title: 120,
  instructions: 2000,
  itemText: 300,
  expected: 120,
  deliverables: { min: 1, max: 5 },
  checklist: { min: 1, max: 8 },
  reward: { min: 100, max: 20000 },
  expires: { min: 30, max: 10080, default: 1440 },
  address: 300,
  radius: { min: 100, max: 50_000 },
  productQuery: 200,
  url: 2000,
  list: { min: 1, max: 100, default: 20 },
  idempotencyKey: 64,
} as const;

export const DELIVERABLE_TYPES = ["photo", "text", "location"] as const;

/** Statuses an agent can see or filter by (internal pre-screening states are never exposed). */
export const PUBLIC_STATUSES = bountyStatusEnum.enumValues.filter((s) => s !== "created" && s !== "screening");

const deliverable = z.object({
  type: z.enum(DELIVERABLE_TYPES, { error: "deliverables[].type must be photo, text or location" }),
  description: z.string({ error: "deliverables[].description is required" }).trim().min(1, "deliverables[].description is required").max(LIMITS.itemText, "deliverables[].description must be 300 characters or fewer"),
});

const checklistText = z.string().trim().min(1, "acceptance_checklist items can't be empty").max(LIMITS.itemText, "acceptance_checklist items must be 300 characters or fewer");
// A hidden value: what the agent knows the item shows (e.g. the listing's serial). Workers never see it (D-034).
const expectedValue = z.string().trim().min(1, "acceptance_checklist[].expected can't be empty").max(LIMITS.expected, "acceptance_checklist[].expected must be 120 characters or fewer");

const httpsUrl = z
  .string()
  .max(LIMITS.url)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "callback_url must be an https URL");

export const createBountySchema = z.object({
  title: z.string({ error: "title is required" }).trim().min(1, "title is required").max(LIMITS.title, "title must be 120 characters or fewer"),
  instructions: z.string({ error: "instructions is required" }).trim().min(1, "instructions is required").max(LIMITS.instructions, "instructions must be 2,000 characters or fewer"),
  deliverables: z.array(deliverable, { error: "deliverables must be an array" }).min(LIMITS.deliverables.min, "deliverables needs 1 to 5 items").max(LIMITS.deliverables.max, "deliverables needs 1 to 5 items"),
  acceptance_checklist: z
    .array(z.union([checklistText, z.object({ item: checklistText, expected: expectedValue.optional() }, { error: "acceptance_checklist items must be strings or { item, expected } objects" })], { error: "acceptance_checklist items must be strings or { item, expected } objects" }), {
      error: "acceptance_checklist must be an array",
    })
    .min(LIMITS.checklist.min, "acceptance_checklist needs 1 to 8 items")
    .max(LIMITS.checklist.max, "acceptance_checklist needs 1 to 8 items"),
  reward_cents: z.number({ error: "reward_cents must be an integer number of cents" }).int("reward_cents must be an integer number of cents").min(LIMITS.reward.min, "reward_cents must be between 100 and 20000").max(LIMITS.reward.max, "reward_cents must be between 100 and 20000"),
  expires_in_minutes: z.number().int("expires_in_minutes must be an integer").min(LIMITS.expires.min, "expires_in_minutes must be between 30 and 10080").max(LIMITS.expires.max, "expires_in_minutes must be between 30 and 10080").default(LIMITS.expires.default),
  spots: z.number().int("spots must be an integer").min(1, "spots must be 1").max(1, "spots must be 1 for now. Post separate bounties for more people.").default(1),
  location: z
    .object({
      address: z.string().trim().max(LIMITS.address).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      radius_m: z
        .number()
        .int("location.radius_m must be a whole number of meters")
        .min(LIMITS.radius.min, "location.radius_m must be between 100 and 50000")
        .max(LIMITS.radius.max, "location.radius_m must be between 100 and 50000")
        .optional(),
    })
    .refine((l) => (l.lat === undefined) === (l.lng === undefined), "location.lat and location.lng must be sent together")
    .refine((l) => l.address || (l.lat !== undefined && l.lng !== undefined), "location needs an address or both lat and lng")
    .refine((l) => l.radius_m === undefined || l.lat !== undefined, "location.radius_m only applies with lat and lng")
    .optional(),
  product_query: z.string().trim().min(1).max(LIMITS.productQuery, "product_query must be 200 characters or fewer").optional(),
  callback_url: httpsUrl.optional(),
});

export type CreateBountyBody = z.infer<typeof createBountySchema>;

export function toCreateInput(b: CreateBountyBody): CreateBountyInput {
  return {
    title: b.title,
    instructions: b.instructions,
    deliverables: b.deliverables,
    acceptanceChecklist: b.acceptance_checklist.map((c) => (typeof c === "string" ? c : c.item)),
    checklistExpected: b.acceptance_checklist.some((c) => typeof c !== "string" && c.expected) ? b.acceptance_checklist.map((c) => (typeof c === "string" ? null : (c.expected ?? null))) : null,
    rewardCents: b.reward_cents,
    expiresInMinutes: b.expires_in_minutes,
    spots: b.spots,
    location: b.location ?? null,
    productQuery: b.product_query ?? null,
    callbackUrl: b.callback_url ?? null,
  };
}

/** First validation problem, phrased for the documented `invalid_request` message. */
export function firstIssue(error: z.ZodError): string {
  const i = error.issues[0];
  if (!i) return "The request is not valid.";
  if (i.code === "invalid_type" && i.input === undefined) return `${i.path.join(".") || "body"} is required`;
  return i.message;
}
