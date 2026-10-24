import { and, eq, inArray, sql } from "drizzle-orm";
import type { DB, Executor, Tx } from "@/db/client";
import { ledgerEntries, users } from "@/db/schema";

// Double-entry, append-only ledger. Balances are always derived from entries.
//
// | Event              | Entries                                  |
// | top-up captured    | paypal_clearing −X, available +X         |
// | bounty posted      | available −R, held +R                    |
// | bounty paid        | held −R, payouts_sent +R                 |
// | released           | held −R, available +R                    |
// | withdraw           | available −W, paypal_clearing +W         |

export type Account = (typeof ledgerEntries.$inferInsert)["account"];
export type Kind = (typeof ledgerEntries.$inferInsert)["kind"];

export class InsufficientFundsError extends Error {
  constructor(
    readonly availableCents: number,
    readonly requiredCents: number,
  ) {
    super(`Available ${availableCents} < required ${requiredCents}`);
    this.name = "InsufficientFundsError";
  }
}

export class LedgerInvariantError extends Error {
  name = "LedgerInvariantError";
}

export type Balances = { availableCents: number; heldCents: number };

export async function getBalances(ex: Executor, ownerId: string): Promise<Balances> {
  const rows = await ex
    .select({ account: ledgerEntries.account, total: sql<string>`coalesce(sum(${ledgerEntries.amountCents}), 0)` })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.ownerId, ownerId), inArray(ledgerEntries.account, ["available", "held"])))
    .groupBy(ledgerEntries.account);
  const get = (a: Account) => Number(rows.find((r) => r.account === a)?.total ?? 0);
  return { availableCents: get("available"), heldCents: get("held") };
}

/** Serializes all balance-changing work for one owner. Must be called inside a transaction. */
export async function lockOwner(tx: Tx, ownerId: string): Promise<void> {
  const rows = await tx.select({ id: users.id }).from(users).where(eq(users.id, ownerId)).for("update");
  if (rows.length === 0) throw new LedgerInvariantError(`Unknown owner ${ownerId}`);
}

type Leg = { account: Account; amountCents: number };

/**
 * Writes one balanced transaction. Idempotent on txnKey: replaying the same key is a no-op
 * and returns false. Throws if legs don't sum to zero or a replay has different legs.
 */
async function post(
  tx: Tx,
  input: { ownerId: string; txnKey: string; kind: Kind; legs: Leg[]; bountyId?: string; paypalRef?: string; memo?: string },
): Promise<boolean> {
  const sum = input.legs.reduce((s, l) => s + l.amountCents, 0);
  if (sum !== 0) throw new LedgerInvariantError(`Unbalanced transaction ${input.txnKey}: ${sum}`);
  for (const l of input.legs) {
    if (!Number.isInteger(l.amountCents) || l.amountCents === 0) throw new LedgerInvariantError(`Bad amount in ${input.txnKey}`);
  }
  const existing = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.txnKey, input.txnKey));
  if (existing.length > 0) {
    const same =
      existing.length === input.legs.length &&
      input.legs.every((l) => existing.some((e) => e.account === l.account && e.amountCents === l.amountCents && e.ownerId === input.ownerId));
    if (!same) throw new LedgerInvariantError(`Ledger key ${input.txnKey} reused with different entries`);
    return false;
  }
  await tx.insert(ledgerEntries).values(
    input.legs.map((l) => ({
      ownerId: input.ownerId,
      txnKey: input.txnKey,
      account: l.account,
      amountCents: l.amountCents,
      kind: input.kind,
      bountyId: input.bountyId,
      paypalRef: input.paypalRef,
      memo: input.memo,
    })),
  );
  return true;
}

const positive = (cents: number) => {
  if (!Number.isInteger(cents) || cents <= 0) throw new LedgerInvariantError(`Amount must be a positive integer of cents: ${cents}`);
  return cents;
};

/** Owner top-up captured by PayPal. Key: the capture ID, so webhook + capture route can't double-credit. */
export async function creditTopup(tx: Tx, ownerId: string, amountCents: number, captureId: string) {
  positive(amountCents);
  await lockOwner(tx, ownerId);
  return post(tx, {
    ownerId,
    txnKey: `topup:${captureId}`,
    kind: "topup",
    paypalRef: captureId,
    legs: [
      { account: "paypal_clearing", amountCents: -amountCents },
      { account: "available", amountCents },
    ],
  });
}

/** Moves a bounty's full reward from available to held. Fails with InsufficientFundsError. */
export async function holdForBounty(tx: Tx, ownerId: string, bountyId: string, amountCents: number) {
  positive(amountCents);
  await lockOwner(tx, ownerId);
  if (await isPosted(tx, `hold:${bountyId}`)) return false;
  const { availableCents } = await getBalances(tx, ownerId);
  if (availableCents < amountCents) throw new InsufficientFundsError(availableCents, amountCents);
  return post(tx, {
    ownerId,
    txnKey: `hold:${bountyId}`,
    kind: "hold",
    bountyId,
    legs: [
      { account: "available", amountCents: -amountCents },
      { account: "held", amountCents },
    ],
  });
}

/** Returns a bounty's held reward to available (cancelled, expired, rejected by owner, blocked after hold). */
export async function releaseBounty(tx: Tx, ownerId: string, bountyId: string, amountCents: number, memo?: string) {
  positive(amountCents);
  await lockOwner(tx, ownerId);
  await assertHeldFor(tx, bountyId, amountCents, `release:${bountyId}`);
  return post(tx, {
    ownerId,
    txnKey: `release:${bountyId}`,
    kind: "release",
    bountyId,
    memo,
    legs: [
      { account: "held", amountCents: -amountCents },
      { account: "available", amountCents },
    ],
  });
}

/** Records a worker payout for a bounty out of held funds. */
export async function payBounty(tx: Tx, ownerId: string, bountyId: string, amountCents: number, payoutRef: string) {
  positive(amountCents);
  await lockOwner(tx, ownerId);
  await assertHeldFor(tx, bountyId, amountCents, `payout:${bountyId}`);
  return post(tx, {
    ownerId,
    txnKey: `payout:${bountyId}`,
    kind: "payout",
    bountyId,
    paypalRef: payoutRef,
    legs: [
      { account: "held", amountCents: -amountCents },
      { account: "payouts_sent", amountCents },
    ],
  });
}

/** Owner withdraws available funds (refund of earlier top-ups). */
export async function debitWithdrawal(tx: Tx, ownerId: string, withdrawalId: string, amountCents: number) {
  positive(amountCents);
  await lockOwner(tx, ownerId);
  if (await isPosted(tx, `withdraw:${withdrawalId}`)) return false;
  const { availableCents } = await getBalances(tx, ownerId);
  if (availableCents < amountCents) throw new InsufficientFundsError(availableCents, amountCents);
  return post(tx, {
    ownerId,
    txnKey: `withdraw:${withdrawalId}`,
    kind: "withdraw",
    legs: [
      { account: "available", amountCents: -amountCents },
      { account: "paypal_clearing", amountCents },
    ],
  });
}

async function isPosted(tx: Tx, txnKey: string) {
  const r = await tx.select({ id: ledgerEntries.id }).from(ledgerEntries).where(eq(ledgerEntries.txnKey, txnKey)).limit(1);
  return r.length > 0;
}

/**
 * A bounty's money can leave `held` exactly once (paid or released), and only if it was held.
 * Replaying the same exit key is allowed (post() no-ops); a different exit is rejected.
 */
async function assertHeldFor(tx: Tx, bountyId: string, amountCents: number, exitKey: string) {
  const rows = await tx
    .select({ txnKey: ledgerEntries.txnKey, amount: ledgerEntries.amountCents })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.bountyId, bountyId), eq(ledgerEntries.account, "held")));
  const hold = rows.find((r) => r.txnKey === `hold:${bountyId}`);
  if (!hold || hold.amount !== amountCents) throw new LedgerInvariantError(`No hold of ${amountCents} for bounty ${bountyId}`);
  const exits = rows.filter((r) => r.txnKey !== `hold:${bountyId}`);
  if (exits.some((r) => r.txnKey !== exitKey)) {
    throw new LedgerInvariantError(`Held funds for ${bountyId} already left via ${exits[0].txnKey}`);
  }
}

/** Sum of every entry for an owner must be zero (double-entry invariant). */
export async function ownerLedgerSum(ex: Executor, ownerId: string): Promise<number> {
  const [r] = await ex
    .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amountCents}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.ownerId, ownerId));
  return Number(r.total);
}

export function withTx<T>(database: DB, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return database.transaction(fn);
}
