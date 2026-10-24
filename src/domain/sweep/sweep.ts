import { and, eq, isNull, lt } from "drizzle-orm";
import type { DB } from "@/db/client";
import { bounties, submissions, verifications } from "@/db/schema";
import { deliverCallbacks } from "@/domain/callbacks/callbacks";
import { pollPayouts, startPayout } from "@/domain/payouts/payouts";
import { expireBounties, lapseReviews, reopenUnappealed } from "@/domain/timers/timers";
import { verifySubmission } from "@/domain/verify/verify";
import { expireOverdueClaims } from "@/domain/work/work";

/**
 * The sweeper (Render Cron every minute; `npm run sweep:loop` locally). Idempotent; every step can
 * run concurrently with user actions because each one re-checks state under a row lock.
 */
export async function sweep(database: DB, now = new Date()) {
  const claimsExpired = await expireOverdueClaims(database, now);
  const bountiesExpired = await expireBounties(database, now);
  const reviewsLapsed = await lapseReviews(database, now);
  const reopened = await reopenUnappealed(database, now);

  // Submissions still verifying with no verification after 2 minutes: run (again).
  const stuck = await database
    .select({ id: submissions.id })
    .from(submissions)
    .innerJoin(bounties, eq(bounties.id, submissions.bountyId))
    .leftJoin(verifications, eq(verifications.submissionId, submissions.id))
    .where(and(eq(bounties.status, "verifying"), isNull(verifications.id), lt(submissions.createdAt, new Date(now.getTime() - 120_000))));
  let verified = 0;
  for (const s of stuck) if (await verifySubmission(database, s.id)) verified++;

  // Approved but never sent (e.g. a crash between approval and send).
  const approved = await database.select({ id: bounties.id }).from(bounties).where(eq(bounties.status, "approved"));
  for (const b of approved) await startPayout(database, b.id);

  const payouts = await pollPayouts(database);
  const callbacks = await deliverCallbacks(database, { now });
  return {
    claimsExpired,
    bountiesExpired,
    reviewsLapsed,
    reopened,
    verified,
    payoutsStarted: approved.length,
    payoutsChecked: payouts.checked,
    payoutsSettled: payouts.settled,
    callbacksDue: callbacks.due,
    callbacksDelivered: callbacks.delivered,
  };
}
