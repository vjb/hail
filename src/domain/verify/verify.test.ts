import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { setAIProvider } from "@/ai";
import type { AIProvider } from "@/ai/provider";
import { closeDb, db } from "@/db/client";
import { bounties, ledgerEntries, payouts } from "@/db/schema";
import { createBounty, decideReview } from "@/domain/bounty/service";
import { createApiKey } from "@/domain/keys/keys";
import { creditTopup, getBalances, ownerLedgerSum } from "@/domain/ledger/ledger";
import { pollPayouts, recordPayoutStatus } from "@/domain/payouts/payouts";
import { claimBounty, submitProof } from "@/domain/work/work";
import { setPayPalFetch } from "@/integrations/paypal/client";
import { makeUser, snapProof } from "../../../tests/helpers";
import { decide, verifySubmission } from "./verify";

afterAll(() => closeDb());

// PayPal faked at the HTTP boundary.
const sent: string[] = [];
let itemStatus = "SUCCESS";
beforeEach(() => {
  sent.length = 0;
  itemStatus = "SUCCESS";
  setPayPalFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "t", expires_in: 3600, scope: "payouts" });
    if (url.endsWith("/v1/payments/payouts") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      const id = body.sender_batch_header.sender_batch_id as string;
      if (sent.includes(id)) return Response.json({ name: "USER_BUSINESS_ERROR", message: "dup", links: [{ href: `https://api-m.sandbox.paypal.com/v1/payments/payouts/BATCH${sent.indexOf(id)}` }] }, { status: 400 });
      sent.push(id);
      return Response.json({ batch_header: { payout_batch_id: `BATCH${sent.length - 1}`, batch_status: "PENDING", sender_batch_header: { sender_batch_id: id } } }, { status: 201 });
    }
    if (url.includes("/v1/payments/payouts/BATCH")) {
      return Response.json({ batch_header: { payout_batch_id: "B", batch_status: "SUCCESS", sender_batch_header: { sender_batch_id: "x" } }, items: [{ payout_item_id: "ITEM1", transaction_status: itemStatus, payout_item: { sender_item_id: url.split("/").pop(), receiver: "w" } }] });
    }
    return Response.json({}, { status: 404 });
  });
});

const fakeVerifier = (passed: Array<boolean | null>, confidence = 0.95): AIProvider => ({
  name: "v",
  screenBounty: async () => ({ ok: true, model: "f", promptVersion: "f", value: { decision: "allow", category: "place_photo", rationale: "ok", confidence: 0.95 } }),
  checkPhoto: async () => ({ ok: true, model: "f", promptVersion: "f", value: { usable: true, problems: [], retake_hint: "" } }),
  verifyProof: async (input) => ({ ok: true, model: "f", promptVersion: "f", value: { summary: "Checked.", checklist: input.bounty.acceptanceChecklist.map((item, i) => ({ item, passed: passed[i] ?? null, reason: "r", confidence })) } }),
});

async function submitted() {
  const ownerId = await makeUser("owner");
  await db().transaction((t) => creditTopup(t, ownerId, 10000, "CAP-" + ownerId));
  const key = await createApiKey(db(), { ownerId, name: "t", dailyCapCents: 100000 });
  const b = await createBounty(db(), { ownerId, apiKeyId: key.id, dailyCapCents: 100000, actor: "agent:t" }, {
    title: "Photograph a sign",
    instructions: "Photograph the sign.",
    deliverables: [{ type: "photo", description: "Sign" }],
    acceptanceChecklist: ["Sign readable", "Store name visible"],
    rewardCents: 2000,
    expiresInMinutes: 120,
    spots: 1,
  });
  const worker = await makeUser("worker", { paypalEmail: "w@example.com" });
  const { claimId } = await claimBounty(db(), worker, b.id);
  await snapProof(db(), worker, claimId, 0, await sharp({ create: { width: 800, height: 600, channels: 3, background: "#777" } }).jpeg().toBuffer());
  const { submissionId } = await submitProof(db(), worker, claimId, {});
  return { ownerId, bountyId: b.id, submissionId };
}

const status = async (id: string) => (await db().select().from(bounties).where(eq(bounties.id, id)))[0].status;

describe("verification decision", () => {
  const items = (p: Array<boolean | null>, c = 0.9) => p.map((passed, i) => ({ item: `i${i}`, passed, reason: "", confidence: c }));
  it("passes only when every item passes confidently", () => {
    expect(decide(items([true, true]), ["a", "b"])).toBe("pass");
    expect(decide(items([true, true], 0.6), ["a", "b"])).toBe("uncertain");
    expect(decide(items([true, null]), ["a", "b"])).toBe("uncertain");
  });
  it("fails on any confident failure", () => {
    expect(decide(items([true, false]), ["a", "b"])).toBe("fail");
    expect(decide(items([true, false], 0.5), ["a", "b"])).toBe("uncertain");
  });
  it("a missing item is uncertain", () => {
    expect(decide(items([true]), ["a", "b"])).toBe("uncertain");
  });
});

describe("verify → pay", () => {
  it("pass → approved → payout sent → SUCCESS → paid, held moves to payouts_sent", async () => {
    setAIProvider(fakeVerifier([true, true]));
    const { ownerId, bountyId, submissionId } = await submitted();
    const r = await verifySubmission(db(), submissionId);
    expect(r?.result).toBe("pass");
    expect(await status(bountyId)).toBe("paying");
    expect(sent).toEqual([`payout_${bountyId}`]);
    await pollPayouts(db(), bountyId);
    expect(await status(bountyId)).toBe("paid");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 8000, heldCents: 0 });
    expect(await ownerLedgerSum(db(), ownerId)).toBe(0);
    // A duplicate SUCCESS (webhook + poll) changes nothing.
    const [p] = await db().select().from(payouts).where(eq(payouts.bountyId, bountyId));
    await recordPayoutStatus(db(), p.id, "SUCCESS");
    const paid = await db().select().from(ledgerEntries).where(eq(ledgerEntries.txnKey, `payout:${bountyId}`));
    expect(paid).toHaveLength(2);
    // Verifying again is a no-op.
    expect(await verifySubmission(db(), submissionId)).toBeNull();
  });

  it("a confident failure → rejected, no payout, funds stay held", async () => {
    setAIProvider(fakeVerifier([true, false]));
    const { ownerId, bountyId, submissionId } = await submitted();
    expect((await verifySubmission(db(), submissionId))?.result).toBe("fail");
    expect(await status(bountyId)).toBe("rejected");
    expect(sent).toEqual([]);
    expect((await getBalances(db(), ownerId)).heldCents).toBe(2000);
  });

  it("unclear → owner review; owner accepts → paid", async () => {
    setAIProvider(fakeVerifier([true, null]));
    const { ownerId, bountyId, submissionId } = await submitted();
    expect((await verifySubmission(db(), submissionId))?.result).toBe("uncertain");
    expect(await status(bountyId)).toBe("needs_owner_review");
    await decideReview(db(), ownerId, bountyId, true);
    expect(await status(bountyId)).toBe("paying");
    await pollPayouts(db(), bountyId);
    expect(await status(bountyId)).toBe("paid");
  });

  it("an AI failure never fails the worker: it goes to owner review", async () => {
    setAIProvider({ ...fakeVerifier([]), verifyProof: async () => ({ ok: false, error: "down", model: "f", promptVersion: "f" }) });
    const { bountyId, submissionId } = await submitted();
    expect((await verifySubmission(db(), submissionId))?.result).toBe("uncertain");
    expect(await status(bountyId)).toBe("needs_owner_review");
  });

  it("a payout send replayed after a crash is recovered from PayPal's duplicate error", async () => {
    setAIProvider(fakeVerifier([true, true]));
    const { bountyId, submissionId } = await submitted();
    await verifySubmission(db(), submissionId);
    // Simulate losing the batch ID (crash after PayPal accepted the send).
    await db().update(payouts).set({ status: "pending", batchId: null }).where(eq(payouts.bountyId, bountyId));
    await pollPayouts(db(), bountyId);
    const [p] = await db().select().from(payouts).where(eq(payouts.bountyId, bountyId));
    expect(p.status).toBe("sent");
    expect(p.batchId).toMatch(/^BATCH/);
    expect(sent.filter((s) => s === `payout_${bountyId}`)).toHaveLength(1);
  });

  it("an unclaimed payout keeps funds held and is not marked paid", async () => {
    setAIProvider(fakeVerifier([true, true]));
    itemStatus = "UNCLAIMED";
    const { ownerId, bountyId, submissionId } = await submitted();
    await verifySubmission(db(), submissionId);
    await pollPayouts(db(), bountyId);
    expect(await status(bountyId)).toBe("paying");
    expect((await getBalances(db(), ownerId)).heldCents).toBe(2000);
  });
});
