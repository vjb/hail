import { and, desc, eq, gt, inArray, isNull, lt, lte } from "drizzle-orm";
import type { DB } from "@/db/client";
import { appeals, bounties, claims, submissions, users } from "@/db/schema";
import { DomainError, transitionWithMoney } from "@/domain/bounty/service";
import { transition } from "@/domain/bounty/state";
import { startPayout } from "@/domain/payouts/payouts";
import { newId } from "@/lib/ids";
import { scaled, WINDOWS } from "@/lib/time";

// Time-based rules (all windows scaled by DEMO_TIME_SCALE):
// - open/claimed/pending_approval/rejected past expires_at → expired (reward released to the owner)
// - needs_owner_review or appealed with owner silence past the review window → approved and paid
// - rejected with no appeal within the appeal window → reopened (or expired if past expiry)

const cutoff = (ms: number, now: Date) => new Date(now.getTime() - scaled(ms));

/** Expires bounties past their expiry and releases their held reward. */
export async function expireBounties(database: DB, now = new Date()) {
  const due = await database
    .select({ id: bounties.id })
    .from(bounties)
    .where(and(inArray(bounties.status, ["open", "claimed", "pending_approval", "rejected"]), lte(bounties.expiresAt, now)));
  let n = 0;
  for (const b of due) {
    await database.transaction(async (tx) => {
      const [cur] = await tx.select().from(bounties).where(eq(bounties.id, b.id)).for("update");
      if (!cur || !["open", "claimed", "pending_approval", "rejected"].includes(cur.status) || cur.expiresAt > now) return;
      if (cur.status === "claimed") await tx.update(claims).set({ status: "expired" }).where(and(eq(claims.bountyId, cur.id), eq(claims.status, "active")));
      await transitionWithMoney(tx, cur.id, "expire", "sweeper", { rationale: "Nobody completed this task before it expired, so its pay went back to the owner's available balance." });
      n++;
    });
  }
  return n;
}

/** Owner silence past the review window pays the worker (worker protection). */
export async function lapseReviews(database: DB, now = new Date()) {
  const due = await database
    .select({ id: bounties.id, status: bounties.status })
    .from(bounties)
    .where(and(inArray(bounties.status, ["needs_owner_review", "appealed"]), lt(bounties.updatedAt, cutoff(WINDOWS.review, now))));
  let n = 0;
  for (const b of due) {
    const moved = await database.transaction(async (tx) => {
      const [cur] = await tx.select().from(bounties).where(eq(bounties.id, b.id)).for("update");
      if (!cur || cur.updatedAt >= cutoff(WINDOWS.review, now)) return false;
      if (cur.status === "needs_owner_review") {
        await transition(tx, cur.id, "review_lapse", "sweeper", { rationale: "The owner didn't review the proof in time, so the worker is paid automatically." });
        return true;
      }
      if (cur.status === "appealed") {
        await tx.update(appeals).set({ decision: "approved", decidedBy: "sweeper", decidedAt: now }).where(and(eq(appeals.bountyId, cur.id), isNull(appeals.decision)));
        await transition(tx, cur.id, "appeal_lapse", "sweeper", { rationale: "The owner didn't answer the appeal in time, so the worker is paid automatically." });
        return true;
      }
      return false;
    });
    if (moved) {
      await startPayout(database, b.id);
      n++;
    }
  }
  return n;
}

/** Rejected with no appeal in time: reopen for another worker (expiry is handled separately). */
export async function reopenUnappealed(database: DB, now = new Date()) {
  const due = await database
    .select({ id: bounties.id })
    .from(bounties)
    .where(and(eq(bounties.status, "rejected"), lt(bounties.updatedAt, cutoff(WINDOWS.appeal, now)), gt(bounties.expiresAt, now)));
  let n = 0;
  for (const b of due) {
    await database.transaction(async (tx) => {
      const [cur] = await tx.select().from(bounties).where(eq(bounties.id, b.id)).for("update");
      if (!cur || cur.status !== "rejected" || cur.updatedAt >= cutoff(WINDOWS.appeal, now)) return;
      await transition(tx, cur.id, "reopen", "sweeper", { rationale: "The rejected proof wasn't appealed, so the task reopened for another worker." });
      n++;
    });
  }
  return n;
}

/** Deadline for appealing the latest rejection, or null if the bounty isn't appealable now. */
export function appealDeadline(b: { status: string; updatedAt: Date }) {
  if (b.status !== "rejected") return null;
  return new Date(b.updatedAt.getTime() + scaled(WINDOWS.appeal));
}

/** The worker who submitted the rejected proof appeals once, with a reason. */
export async function fileAppeal(database: DB, workerId: string, bountyId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 5) throw new DomainError("invalid_request", "Tell the owner briefly why your proof should be accepted.");
  return database.transaction(async (tx) => {
    const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!b) throw new DomainError("not_found", "That task doesn't exist.");
    if (b.status !== "rejected") throw new DomainError("invalid_state", "This task can't be appealed right now.");
    if (new Date() > appealDeadline(b)!) throw new DomainError("invalid_state", "The time to appeal this decision has passed.");
    const [sub] = await tx.select().from(submissions).where(eq(submissions.bountyId, bountyId)).orderBy(desc(submissions.createdAt)).limit(1);
    if (!sub || sub.workerId !== workerId) throw new DomainError("forbidden", "Only the worker who submitted this proof can appeal.");
    const [existing] = await tx.select({ id: appeals.id }).from(appeals).where(eq(appeals.submissionId, sub.id));
    if (existing) throw new DomainError("invalid_state", "You've already appealed this decision. Each rejection can be appealed once.");
    await tx.insert(appeals).values({ id: newId("apl"), submissionId: sub.id, bountyId, reason: text.slice(0, 1000) });
    return transition(tx, bountyId, "appeal", `worker:${workerId}`, { rationale: `Worker's appeal: ${text.slice(0, 300)}` });
  });
}

/** Owner decides an appeal. Accept → paid; decline → reopened for others (or expired). */
export async function decideAppeal(database: DB, ownerId: string, bountyId: string, accept: boolean, note?: string) {
  const b = await database.transaction(async (tx) => {
    const [row] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!row) throw new DomainError("not_found", "No such task.");
    if (row.ownerId !== ownerId) throw new DomainError("forbidden", "This task belongs to another owner.");
    if (row.status !== "appealed") throw new DomainError("invalid_state", "This appeal was already decided.");
    await tx.update(appeals).set({ decision: accept ? "approved" : "declined", decidedBy: `owner:${ownerId}`, decidedAt: new Date() }).where(eq(appeals.bountyId, bountyId));
    const why = note ? { note, rationale: note } : {};
    if (accept) {
      // An accepted appeal clears a suspension that this task caused.
      await tx.update(users).set({ suspendedAt: null, suspendedReason: null, suspendedBountyId: null }).where(eq(users.suspendedBountyId, bountyId));
      return transition(tx, bountyId, "appeal_approve", `owner:${ownerId}`, why);
    }
    if (row.expiresAt <= new Date()) {
      await transition(tx, bountyId, "appeal_reject", `owner:${ownerId}`, why);
      return transitionWithMoney(tx, bountyId, "expire", "system", { rationale: "The appeal was declined after the task expired, so its pay went back to the owner." });
    }
    return transition(tx, bountyId, "appeal_reject", `owner:${ownerId}`, why);
  });
  if (b.status === "approved") await startPayout(database, bountyId);
  return b;
}

export async function latestAppeal(database: DB, bountyId: string) {
  const [a] = await database.select().from(appeals).where(eq(appeals.bountyId, bountyId)).orderBy(desc(appeals.createdAt)).limit(1);
  return a ?? null;
}
