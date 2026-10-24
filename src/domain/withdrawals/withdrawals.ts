import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { ledgerEntries, topups, withdrawals } from "@/db/schema";
import { DomainError } from "@/domain/bounty/service";
import { debitWithdrawal, getBalances, lockOwner } from "@/domain/ledger/ledger";
import { PayPalError, refundCapture } from "@/integrations/paypal/client";
import { newId } from "@/lib/ids";

// Withdraw: return unused available balance to the owner as partial refunds of earlier top-ups,
// newest capture first. The full amount is debited from Available first (so it can't be spent
// twice); any part PayPal doesn't refund is credited back. Money set aside for tasks can't be withdrawn.

export const MIN_WITHDRAW_CENTS = 100;

export async function withdraw(database: DB, ownerId: string, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < MIN_WITHDRAW_CENTS) throw new DomainError("invalid_request", "Withdraw at least $1.00.");
  const id = newId("wdr");

  // 1. Reserve: debit Available and allocate across refundable captures, newest first.
  const plan = await database.transaction(async (tx) => {
    await lockOwner(tx, ownerId);
    const { availableCents } = await getBalances(tx, ownerId);
    if (availableCents < amountCents) throw new DomainError("insufficient_funds", `You can withdraw up to $${(availableCents / 100).toFixed(2)}. Money set aside for tasks can't be withdrawn.`);
    const caps = await tx
      .select()
      .from(topups)
      .where(and(eq(topups.ownerId, ownerId), eq(topups.status, "captured"), gt(sql`${topups.amountCents} - ${topups.refundedCents}`, 0)))
      .orderBy(desc(topups.capturedAt))
      .for("update");
    const refundable = caps.reduce((s, t) => s + (t.amountCents - t.refundedCents), 0);
    if (refundable < amountCents) throw new DomainError("invalid_state", `Only $${(refundable / 100).toFixed(2)} of your top-ups can still be refunded to PayPal.`);
    let left = amountCents;
    const parts: Array<{ topupId: string; captureId: string; amountCents: number }> = [];
    for (const t of caps) {
      if (!left) break;
      const take = Math.min(left, t.amountCents - t.refundedCents);
      parts.push({ topupId: t.id, captureId: t.captureId!, amountCents: take });
      left -= take;
    }
    await tx.insert(withdrawals).values({ id, ownerId, amountCents, status: "pending", refunds: parts });
    await debitWithdrawal(tx, ownerId, id, amountCents);
    // Mark the allocation as refunded up front so two withdrawals can't use the same capture amount.
    for (const p of parts) await tx.update(topups).set({ refundedCents: sql`${topups.refundedCents} + ${p.amountCents}` }).where(eq(topups.id, p.topupId));
    return parts;
  });

  // 2. Refund each part (idempotent on withdraw_<id>_<topup>).
  const done: Array<{ topupId: string; captureId: string; amountCents: number; refundId?: string; status?: string }> = [];
  let failedCents = 0;
  let error: string | null = null;
  for (const p of plan) {
    try {
      const r = await refundCapture(p.captureId, p.amountCents, `withdraw_${id}_${p.topupId}`, "Hail balance withdrawal");
      done.push({ ...p, refundId: r.id, status: r.status });
      if (r.status !== "COMPLETED" && r.status !== "PENDING") failedCents += p.amountCents;
    } catch (e) {
      failedCents += p.amountCents;
      error = e instanceof PayPalError ? `${e.status} ${e.errorName ?? ""}`.trim() : e instanceof Error ? e.message : String(e);
      done.push({ ...p, status: "FAILED" });
    }
  }

  // 3. Settle: credit back anything PayPal didn't refund.
  await database.transaction(async (tx) => {
    await lockOwner(tx, ownerId);
    for (const p of done) {
      if (p.status === "FAILED") await tx.update(topups).set({ refundedCents: sql`${topups.refundedCents} - ${p.amountCents}` }).where(eq(topups.id, p.topupId));
    }
    if (failedCents > 0) {
      await tx.insert(ledgerEntries).values([
        { ownerId, txnKey: `withdraw-reversal:${id}`, account: "paypal_clearing", amountCents: -failedCents, kind: "withdraw", memo: "refund failed; returned to available" },
        { ownerId, txnKey: `withdraw-reversal:${id}`, account: "available", amountCents: failedCents, kind: "withdraw", memo: "refund failed; returned to available" },
      ]);
    }
    await tx
      .update(withdrawals)
      .set({ refunds: done, status: failedCents === 0 ? "completed" : failedCents === amountCents ? "failed" : "completed", error })
      .where(eq(withdrawals.id, id));
  });
  return { id, amountCents, refundedCents: amountCents - failedCents, parts: done };
}

export async function listWithdrawals(database: DB, ownerId: string) {
  return database.select().from(withdrawals).where(eq(withdrawals.ownerId, ownerId)).orderBy(desc(withdrawals.createdAt)).limit(20);
}
