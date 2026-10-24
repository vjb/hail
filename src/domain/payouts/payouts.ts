import { and, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { bounties, payouts, submissions, users } from "@/db/schema";
import { transition } from "@/domain/bounty/state";
import { payBounty } from "@/domain/ledger/ledger";
import { createPayout, getPayoutBatch, PayPalError } from "@/integrations/paypal/client";
import { newId } from "@/lib/ids";

// Worker payouts through PayPal Payouts. Exactly one payout per bounty (unique constraint).
// sender_batch_id = payout_<bounty_id>; PayPal rejects a reused ID (D-004), which we treat as
// "already sent" and recover the batch from the error's link.

type PayoutRow = typeof payouts.$inferSelect;

/** approved → paying: records the payout and sends it. Safe to call again (retries a stuck send). */
export async function startPayout(database: DB, bountyId: string) {
  const row = await database.transaction(async (tx) => {
    const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!b) return null;
    const [existing] = await tx.select().from(payouts).where(eq(payouts.bountyId, bountyId));
    if (existing) return existing;
    if (b.status !== "approved") return null;
    const [sub] = await tx.select().from(submissions).where(eq(submissions.bountyId, bountyId)).orderBy(desc(submissions.createdAt)).limit(1);
    if (!sub) throw new Error(`approved bounty ${bountyId} has no submission`);
    const [w] = await tx.select().from(users).where(eq(users.id, sub.workerId));
    if (!w?.paypalEmail) throw new Error(`worker ${sub.workerId} has no PayPal email`);
    const [p] = await tx
      .insert(payouts)
      .values({ id: newId("pay"), bountyId, workerId: w.id, receiverEmail: w.paypalEmail, senderBatchId: `payout_${bountyId}`, amountCents: b.rewardCents * b.spots, status: "pending" })
      .returning();
    await transition(tx, bountyId, "start_payout", "system", { payoutId: p.id });
    return p;
  });
  if (!row || row.status !== "pending") return row;
  return sendPayout(database, row);
}

async function sendPayout(database: DB, p: PayoutRow) {
  const [b] = await database.select({ title: bounties.title }).from(bounties).where(eq(bounties.id, p.bountyId));
  try {
    const batch = await createPayout({
      senderBatchId: p.senderBatchId,
      senderItemId: p.bountyId,
      receiverEmail: p.receiverEmail,
      amountCents: p.amountCents,
      note: `Hail: thanks for completing "${b?.title ?? "a task"}".`.slice(0, 900),
      subject: "You've been paid by Hail (PayPal sandbox)",
    });
    const [u] = await database
      .update(payouts)
      .set({ status: "sent", batchId: batch.batch_header.payout_batch_id, itemId: batch.items?.[0]?.payout_item_id ?? null, updatedAt: new Date(), lastError: null })
      .where(eq(payouts.id, p.id))
      .returning();
    return u;
  } catch (e) {
    if (e instanceof PayPalError && e.errorName === "USER_BUSINESS_ERROR") {
      // Already sent with this sender_batch_id: recover the batch ID from the error's link if present.
      const links = (e.body as { links?: Array<{ href: string }> } | undefined)?.links ?? [];
      const batchId = links.map((l) => /\/v1\/payments\/payouts\/([A-Z0-9]+)/.exec(l.href)?.[1]).find(Boolean) ?? p.batchId;
      const [u] = await database.update(payouts).set({ status: "sent", batchId: batchId ?? null, updatedAt: new Date(), lastError: batchId ? null : "duplicate send; batch unknown" }).where(eq(payouts.id, p.id)).returning();
      return u;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[payout] send failed", p.id, msg);
    const [u] = await database.update(payouts).set({ lastError: msg.slice(0, 500), updatedAt: new Date() }).where(eq(payouts.id, p.id)).returning();
    return u;
  }
}

const ITEM_STATUS: Record<string, PayoutRow["status"]> = {
  SUCCESS: "succeeded",
  FAILED: "failed",
  UNCLAIMED: "unclaimed",
  RETURNED: "returned",
  BLOCKED: "blocked",
  REFUNDED: "returned",
  REVERSED: "returned",
  ONHOLD: "sent",
  PENDING: "sent",
};

/** paying → paid once PayPal reports the item SUCCESS: moves held funds to payouts_sent. Idempotent. */
export async function recordPayoutStatus(database: DB, payoutId: string, itemStatus: string, itemId?: string) {
  const status = ITEM_STATUS[itemStatus] ?? "sent";
  return database.transaction(async (tx) => {
    const [p] = await tx.select().from(payouts).where(eq(payouts.id, payoutId)).for("update");
    if (!p || p.status === "succeeded") return p;
    await tx.update(payouts).set({ status, itemId: itemId ?? p.itemId, updatedAt: new Date() }).where(eq(payouts.id, p.id));
    if (status === "succeeded") {
      const [b] = await tx.select().from(bounties).where(eq(bounties.id, p.bountyId)).for("update");
      await payBounty(tx, b.ownerId, b.id, p.amountCents, p.batchId ?? p.senderBatchId);
      if (b.status === "paying") await transition(tx, b.id, "payout_succeeded", "system", { payoutId: p.id, batchId: p.batchId });
    }
    return { ...p, status };
  });
}

/** Polls PayPal for payouts still in flight (and retries sends that never reached PayPal). */
export async function pollPayouts(database: DB, onlyBountyId?: string) {
  const conds = [inArray(payouts.status, ["pending", "sent"])];
  if (onlyBountyId) conds.push(eq(payouts.bountyId, onlyBountyId));
  const open = await database.select().from(payouts).where(and(...conds));
  let settled = 0;
  for (const p of open) {
    if (p.status === "pending" || !p.batchId) {
      await sendPayout(database, p);
      continue;
    }
    try {
      const batch = await getPayoutBatch(p.batchId);
      const item = batch.items?.find((i) => i.payout_item.sender_item_id === p.bountyId) ?? batch.items?.[0];
      if (item?.transaction_status) {
        const r = await recordPayoutStatus(database, p.id, item.transaction_status, item.payout_item_id);
        if (r?.status === "succeeded") settled++;
      }
    } catch (e) {
      console.error("[payout] poll failed", p.id, e instanceof Error ? e.message : e);
    }
  }
  return { checked: open.length, settled };
}

/** After sending, PayPal sandbox usually settles in seconds: poll briefly so the worker sees "Paid" fast. */
export async function settleSoon(database: DB, bountyId: string, attempts = 8, delayMs = 3000) {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const { settled } = await pollPayouts(database, bountyId);
    if (settled) return true;
    const [p] = await database.select({ status: payouts.status }).from(payouts).where(eq(payouts.bountyId, bountyId));
    if (!p || !["pending", "sent"].includes(p.status)) return false;
  }
  return false;
}

export async function payoutForBounty(database: DB, bountyId: string) {
  const [p] = await database.select().from(payouts).where(eq(payouts.bountyId, bountyId));
  return p ?? null;
}

