import { and, eq, isNull, lt } from "drizzle-orm";
import type { DB } from "@/db/client";
import { bounties, submissions, verifications } from "@/db/schema";
import { pollPayouts, startPayout } from "@/domain/payouts/payouts";
import { verifySubmission } from "@/domain/verify/verify";
import { expireOverdueClaims } from "@/domain/work/work";

/**
 * The sweeper (Render Cron, every minute). Idempotent. Day 7: claim expiry, stuck verifications,
 * unsent payouts, payout status. Day 8 adds bounty expiry, review/appeal windows and callbacks.
 */
export async function sweep(database: DB) {
  const claimsExpired = await expireOverdueClaims(database);

  // Submissions still verifying with no verification after 2 minutes: run (again).
  const stuck = await database
    .select({ id: submissions.id })
    .from(submissions)
    .innerJoin(bounties, eq(bounties.id, submissions.bountyId))
    .leftJoin(verifications, eq(verifications.submissionId, submissions.id))
    .where(and(eq(bounties.status, "verifying"), isNull(verifications.id), lt(submissions.createdAt, new Date(Date.now() - 120_000))));
  let verified = 0;
  for (const s of stuck) if (await verifySubmission(database, s.id)) verified++;

  // Approved but never sent (e.g. a crash between approval and send).
  const approved = await database.select({ id: bounties.id }).from(bounties).where(eq(bounties.status, "approved"));
  for (const b of approved) await startPayout(database, b.id);

  const payouts = await pollPayouts(database);
  return { claimsExpired, verified, payoutsStarted: approved.length, payoutsChecked: payouts.checked, payoutsSettled: payouts.settled };
}
