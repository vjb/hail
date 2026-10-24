import { z } from "zod";
import type { CreateBountyInput } from "./service";

// Request validation for POST /api/v1/bounties and the MCP create_bounty tool.
// Limits come from docs/public/api.md. Messages are written for outside developers.

const deliverable = z.object({
  type: z.enum(["photo", "text", "location"], { error: "deliverables[].type must be photo, text or location" }),
  description: z.string({ error: "deliverables[].description is required" }).trim().min(1, "deliverables[].description is required").max(300, "deliverables[].description must be 300 characters or fewer"),
});

const httpsUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "callback_url must be an https URL");

export const createBountySchema = z.object({
  title: z.string({ error: "title is required" }).trim().min(1, "title is required").max(120, "title must be 120 characters or fewer"),
  instructions: z.string({ error: "instructions is required" }).trim().min(1, "instructions is required").max(2000, "instructions must be 2,000 characters or fewer"),
  deliverables: z.array(deliverable, { error: "deliverables must be an array" }).min(1, "deliverables needs 1 to 5 items").max(5, "deliverables needs 1 to 5 items"),
  acceptance_checklist: z
    .array(z.string().trim().min(1, "acceptance_checklist items can't be empty").max(300, "acceptance_checklist items must be 300 characters or fewer"), { error: "acceptance_checklist must be an array of strings" })
    .min(1, "acceptance_checklist needs 1 to 8 items")
    .max(8, "acceptance_checklist needs 1 to 8 items"),
  reward_cents: z.number({ error: "reward_cents must be an integer number of cents" }).int("reward_cents must be an integer number of cents").min(100, "reward_cents must be between 100 and 20000").max(20000, "reward_cents must be between 100 and 20000"),
  expires_in_minutes: z.number().int("expires_in_minutes must be an integer").min(30, "expires_in_minutes must be between 30 and 10080").max(10080, "expires_in_minutes must be between 30 and 10080").default(1440),
  spots: z.number().int("spots must be an integer").min(1, "spots must be 1").max(1, "spots must be 1 for now. Post separate bounties for more people.").default(1),
  location: z
    .object({
      address: z.string().trim().max(300).optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      radius_m: z.number().int().min(1).max(50_000).optional(),
    })
    .refine((l) => l.address || (l.lat !== undefined && l.lng !== undefined), "location needs an address or both lat and lng")
    .optional(),
  product_query: z.string().trim().min(1).max(200, "product_query must be 200 characters or fewer").optional(),
  callback_url: httpsUrl.optional(),
});

export type CreateBountyBody = z.infer<typeof createBountySchema>;

export function toCreateInput(b: CreateBountyBody): CreateBountyInput {
  return {
    title: b.title,
    instructions: b.instructions,
    deliverables: b.deliverables,
    acceptanceChecklist: b.acceptance_checklist,
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
