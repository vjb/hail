import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/db/client";
import { makeUser } from "../../../tests/helpers";
import {
  creditTopup,
  debitWithdrawal,
  getBalances,
  holdForBounty,
  InsufficientFundsError,
  LedgerInvariantError,
  ownerLedgerSum,
  payBounty,
  releaseBounty,
} from "./ledger";

afterAll(() => closeDb());

const tx = <T>(fn: Parameters<ReturnType<typeof db>["transaction"]>[0] extends (tx: infer X) => unknown ? (t: X) => Promise<T> : never) =>
  db().transaction(fn);

async function funded(cents: number) {
  const owner = await makeUser("owner");
  await tx((t) => creditTopup(t, owner, cents, `CAP-${owner}`));
  return owner;
}

describe("ledger events (architecture table)", () => {
  it("top-up credits available and is idempotent on capture id", async () => {
    const owner = await makeUser("owner");
    expect(await tx((t) => creditTopup(t, owner, 20000, "CAP-1-" + owner))).toBe(true);
    expect(await tx((t) => creditTopup(t, owner, 20000, "CAP-1-" + owner))).toBe(false);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 20000, heldCents: 0 });
    expect(await ownerLedgerSum(db(), owner)).toBe(0);
  });

  it("hold moves available to held; replay is a no-op", async () => {
    const owner = await funded(10000);
    await tx((t) => holdForBounty(t, owner, "bty_a" + owner, 2500));
    expect(await tx((t) => holdForBounty(t, owner, "bty_a" + owner, 2500))).toBe(false);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 7500, heldCents: 2500 });
  });

  it("hold fails with insufficient funds and writes nothing", async () => {
    const owner = await funded(1000);
    await expect(tx((t) => holdForBounty(t, owner, "bty_b" + owner, 2500))).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 1000, heldCents: 0 });
  });

  it("payout moves held to payouts_sent", async () => {
    const owner = await funded(10000);
    const b = "bty_c" + owner;
    await tx((t) => holdForBounty(t, owner, b, 2500));
    await tx((t) => payBounty(t, owner, b, 2500, "BATCH1"));
    expect(await tx((t) => payBounty(t, owner, b, 2500, "BATCH1"))).toBe(false);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 7500, heldCents: 0 });
    expect(await ownerLedgerSum(db(), owner)).toBe(0);
  });

  it("release returns held to available", async () => {
    const owner = await funded(10000);
    const b = "bty_d" + owner;
    await tx((t) => holdForBounty(t, owner, b, 4000));
    await tx((t) => releaseBounty(t, owner, b, 4000, "cancelled"));
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 10000, heldCents: 0 });
  });

  it("held money leaves exactly once: no pay after release, no release after pay", async () => {
    const owner = await funded(10000);
    const b1 = "bty_e" + owner;
    await tx((t) => holdForBounty(t, owner, b1, 1000));
    await tx((t) => releaseBounty(t, owner, b1, 1000));
    await expect(tx((t) => payBounty(t, owner, b1, 1000, "B"))).rejects.toBeInstanceOf(LedgerInvariantError);
    const b2 = "bty_f" + owner;
    await tx((t) => holdForBounty(t, owner, b2, 1000));
    await tx((t) => payBounty(t, owner, b2, 1000, "B2"));
    await expect(tx((t) => releaseBounty(t, owner, b2, 1000))).rejects.toBeInstanceOf(LedgerInvariantError);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 9000, heldCents: 0 });
  });

  it("cannot pay or release a bounty that was never held", async () => {
    const owner = await funded(10000);
    await expect(tx((t) => payBounty(t, owner, "bty_none" + owner, 1000, "B"))).rejects.toBeInstanceOf(LedgerInvariantError);
    await expect(tx((t) => releaseBounty(t, owner, "bty_none" + owner, 1000))).rejects.toBeInstanceOf(LedgerInvariantError);
  });

  it("withdraw debits available only, never held", async () => {
    const owner = await funded(10000);
    await tx((t) => holdForBounty(t, owner, "bty_g" + owner, 6000));
    await expect(tx((t) => debitWithdrawal(t, owner, "wdr_1" + owner, 5000))).rejects.toBeInstanceOf(InsufficientFundsError);
    await tx((t) => debitWithdrawal(t, owner, "wdr_2" + owner, 4000));
    expect(await tx((t) => debitWithdrawal(t, owner, "wdr_2" + owner, 4000))).toBe(false);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 0, heldCents: 6000 });
    expect(await ownerLedgerSum(db(), owner)).toBe(0);
  });

  it("rejects non-integer, zero and negative amounts", async () => {
    const owner = await funded(10000);
    await expect(tx((t) => holdForBounty(t, owner, "bty_h" + owner, 10.5))).rejects.toBeInstanceOf(LedgerInvariantError);
    await expect(tx((t) => holdForBounty(t, owner, "bty_h" + owner, 0))).rejects.toBeInstanceOf(LedgerInvariantError);
    await expect(tx((t) => creditTopup(t, owner, -5, "CAP-neg" + owner))).rejects.toBeInstanceOf(LedgerInvariantError);
  });

  it("a reused key with different amounts is rejected", async () => {
    const owner = await makeUser("owner");
    await tx((t) => creditTopup(t, owner, 5000, "CAP-X" + owner));
    await expect(tx((t) => creditTopup(t, owner, 6000, "CAP-X" + owner))).rejects.toBeInstanceOf(LedgerInvariantError);
  });
});

describe("concurrency", () => {
  it("two concurrent holds exceeding the balance: exactly one succeeds", async () => {
    const owner = await funded(3000);
    const results = await Promise.allSettled([
      tx((t) => holdForBounty(t, owner, "bty_r1" + owner, 2000)),
      tx((t) => holdForBounty(t, owner, "bty_r2" + owner, 2000)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(InsufficientFundsError);
    expect(await getBalances(db(), owner)).toEqual({ availableCents: 1000, heldCents: 2000 });
  });

  it("many concurrent holds never overdraw", async () => {
    const owner = await funded(10000);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => tx((t) => holdForBounty(t, owner, `bty_m${i}` + owner, 3000))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const b = await getBalances(db(), owner);
    expect(b).toEqual({ availableCents: 1000, heldCents: 9000 });
  });
});
