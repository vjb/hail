import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { closeDb, db } from "@/db/client";
import { bounties, bountyEvents } from "@/db/schema";
import { createApiKey } from "@/domain/keys/keys";
import { creditTopup, getBalances, ownerLedgerSum } from "@/domain/ledger/ledger";
import * as screening from "@/domain/screening/screen";
import { makeUser } from "../../../tests/helpers";
import { cancelBounty, createBounty, DomainError, type CreateBountyInput } from "./service";

afterAll(() => closeDb());

const input = (over: Partial<CreateBountyInput> = {}): CreateBountyInput => ({
  title: "Photograph a storefront",
  instructions: "Take a photo of the open sign.",
  deliverables: [{ type: "photo", description: "Storefront" }],
  acceptanceChecklist: ["Sign is visible"],
  rewardCents: 2500,
  expiresInMinutes: 60,
  spots: 1,
  ...over,
});

async function ownerWith(cents: number, cap = 100_000) {
  const ownerId = await makeUser("owner");
  if (cents) await db().transaction((t) => creditTopup(t, ownerId, cents, "CAP-" + ownerId));
  const key = await createApiKey(db(), { ownerId, name: "t", dailyCapCents: cap });
  return { ownerId, ctx: { ownerId, apiKeyId: key.id, dailyCapCents: cap, actor: `agent:${key.id}` as const } };
}

describe("bounty service", () => {
  it("posting holds the full reward and opens the bounty, with a timeline", async () => {
    const { ownerId, ctx } = await ownerWith(10000);
    const b = await createBounty(db(), ctx, input());
    expect(b.status).toBe("open");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 7500, heldCents: 2500 });
    const events = await db().select().from(bountyEvents).where(eq(bountyEvents.bountyId, b.id));
    expect(events.map((e) => e.toStatus)).toEqual(["screening", "open"]);
  });

  it("cancel releases the hold; a second cancel is invalid_state", async () => {
    const { ownerId, ctx } = await ownerWith(10000);
    const b = await createBounty(db(), ctx, input());
    await cancelBounty(db(), ownerId, b.id, ctx.actor);
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 10000, heldCents: 0 });
    await expect(cancelBounty(db(), ownerId, b.id, ctx.actor)).rejects.toMatchObject({ code: "invalid_state" });
    expect(await ownerLedgerSum(db(), ownerId)).toBe(0);
  });

  it("another owner can't cancel or see it", async () => {
    const { ctx } = await ownerWith(10000);
    const other = await makeUser("owner");
    const b = await createBounty(db(), ctx, input());
    await expect(cancelBounty(db(), other, b.id, "owner:x")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("insufficient funds: nothing is created", async () => {
    const { ownerId, ctx } = await ownerWith(1000);
    await expect(createBounty(db(), ctx, input())).rejects.toMatchObject({ code: "insufficient_funds" });
    expect(await db().select().from(bounties).where(eq(bounties.ownerId, ownerId))).toHaveLength(0);
  });

  it("concurrent posts that together exceed the balance: one succeeds, the draft of the other is removed", async () => {
    const { ownerId, ctx } = await ownerWith(3000);
    const r = await Promise.allSettled([createBounty(db(), ctx, input()), createBounty(db(), ctx, input())]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((r.find((x) => x.status === "rejected") as PromiseRejectedResult).reason).toBeInstanceOf(DomainError);
    expect(await db().select().from(bounties).where(eq(bounties.ownerId, ownerId))).toHaveLength(1);
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 500, heldCents: 2500 });
  });

  it("the per-key daily cap is enforced", async () => {
    const { ctx } = await ownerWith(10000, 4000);
    await createBounty(db(), ctx, input());
    await expect(createBounty(db(), ctx, input())).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("a blocked bounty holds nothing", async () => {
    const { ownerId, ctx } = await ownerWith(10000);
    const spy = vi.spyOn(screening, "screenBounty").mockResolvedValueOnce({
      final: { decision: "block", category: "otp_solicitation", rationale: "Asks for a code." },
      layers: [{ layer: "rules", decision: "block", category: "otp_solicitation", rationale: "Asks for a code." }],
    });
    const b = await createBounty(db(), ctx, input({ title: "Receive a code" }));
    expect(b.status).toBe("blocked");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 10000, heldCents: 0 });
    spy.mockRestore();
  });

  it("if screening crashes, the bounty waits for owner approval (never fails open)", async () => {
    const { ownerId, ctx } = await ownerWith(10000);
    const spy = vi.spyOn(screening, "screenBounty").mockRejectedValueOnce(new Error("AI down"));
    const b = await createBounty(db(), ctx, input());
    expect(b.status).toBe("pending_approval");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 7500, heldCents: 2500 });
    spy.mockRestore();
  });
});
