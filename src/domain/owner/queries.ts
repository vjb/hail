import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { apiKeys, bounties, bountyEvents, payouts, screenings, submissions, verifications } from "@/db/schema";

// Read models for the owner dashboard (owner-scoped; never returns other owners' data).

export const CATEGORY_LABEL: Record<string, string> = {
  item_inspection: "Item inspection",
  place_photo: "Photo of a place",
  business_check: "Business check",
  stock_or_price_check: "Stock or price check",
  public_information: "Public information",
  simple_errand: "Simple errand",
  other_allowed: "Other task",
  private_property: "Private property",
  money_or_valuables: "Money or valuables",
  third_party_call: "Calls to other people",
  unclear: "Unclear request",
  over_threshold: "Above your approval threshold",
  unscreened: "Not screened",
  credential_account_fraud: "Account or login fraud",
  identity_proxying: "Identity misuse",
  otp_solicitation: "One-time code request",
  social_media_manipulation: "Fake reviews or engagement",
  referral_promo_fraud: "Referral or promo fraud",
  private_individual_recon: "Targeting a private person",
  illegal_dangerous: "Illegal or dangerous",
  no_rule_matched: "No issue found",
  general: "General",
};
export const categoryLabel = (c: string | null | undefined) => (c ? (CATEGORY_LABEL[c] ?? c.replace(/_/g, " ")) : "—");

export async function listOwnerBounties(database: DB, ownerId: string, statuses?: (typeof bounties.$inferSelect)["status"][], limit = 100) {
  const conds = [eq(bounties.ownerId, ownerId)];
  if (statuses?.length) conds.push(inArray(bounties.status, statuses));
  return database.select().from(bounties).where(and(...conds)).orderBy(desc(bounties.createdAt)).limit(limit);
}

export async function bountyDetail(database: DB, ownerId: string, bountyId: string) {
  const [b] = await database.select().from(bounties).where(and(eq(bounties.id, bountyId), eq(bounties.ownerId, ownerId)));
  if (!b) return null;
  const [events, screens] = await Promise.all([
    database.select().from(bountyEvents).where(eq(bountyEvents.bountyId, bountyId)).orderBy(asc(bountyEvents.createdAt), asc(bountyEvents.id)),
    database.select().from(screenings).where(eq(screenings.bountyId, bountyId)).orderBy(asc(screenings.id)),
  ]);
  return { bounty: b, events, screens };
}

export async function latestScreenings(database: DB, bountyIds: string[]) {
  if (!bountyIds.length) return new Map<string, typeof screenings.$inferSelect>();
  const rows = await database
    .select()
    .from(screenings)
    .where(and(inArray(screenings.bountyId, bountyIds), eq(screenings.layer, "final")))
    .orderBy(desc(screenings.id));
  const m = new Map<string, typeof screenings.$inferSelect>();
  for (const r of rows) if (!m.has(r.bountyId)) m.set(r.bountyId, r);
  return m;
}

export async function listKeys(database: DB, ownerId: string) {
  return database.select().from(apiKeys).where(eq(apiKeys.ownerId, ownerId)).orderBy(desc(apiKeys.createdAt));
}

export async function approvalCount(database: DB, ownerId: string) {
  const [r] = await database
    .select({ n: sql<string>`count(*)` })
    .from(bounties)
    .where(and(eq(bounties.ownerId, ownerId), inArray(bounties.status, ["pending_approval", "needs_owner_review", "appealed"])));
  return Number(r.n);
}

/** The latest proof for a bounty (owner-scoped): submission, verification and payout. */
export async function latestProof(database: DB, ownerId: string, bountyId: string) {
  const [b] = await database.select({ id: bounties.id }).from(bounties).where(and(eq(bounties.id, bountyId), eq(bounties.ownerId, ownerId)));
  if (!b) return null;
  const [sub] = await database.select().from(submissions).where(eq(submissions.bountyId, bountyId)).orderBy(desc(submissions.createdAt)).limit(1);
  if (!sub) return null;
  const [v] = await database.select().from(verifications).where(eq(verifications.submissionId, sub.id)).orderBy(desc(verifications.id)).limit(1);
  const [p] = await database.select().from(payouts).where(eq(payouts.bountyId, bountyId));
  return { submission: sub, verification: v ?? null, payout: p ?? null };
}
