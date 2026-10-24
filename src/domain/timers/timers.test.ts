import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { setAIProvider } from "@/ai";
import type { AIProvider } from "@/ai/provider";
import { closeDb, db } from "@/db/client";
import { bounties, callbackDeliveries, topups } from "@/db/schema";
import { createBounty } from "@/domain/bounty/service";
import { deliverCallbacks, isSafeCallbackUrl, MAX_ATTEMPTS } from "@/domain/callbacks/callbacks";
import { createApiKey } from "@/domain/keys/keys";
import { creditTopup, getBalances, ownerLedgerSum } from "@/domain/ledger/ledger";
import { pollPayouts } from "@/domain/payouts/payouts";
import { verifySubmission } from "@/domain/verify/verify";
import { withdraw } from "@/domain/withdrawals/withdrawals";
import { addProofPhoto, claimBounty, submitProof } from "@/domain/work/work";
import { setPayPalFetch } from "@/integrations/paypal/client";
import { newId } from "@/lib/ids";
import { makeUser } from "../../../tests/helpers";
import { decideAppeal, expireBounties, fileAppeal, lapseReviews, reopenUnappealed } from "./timers";

afterAll(() => closeDb());

const refunds: Array<{ capture: string; key: string; value: string }> = [];
let refundFails = new Set<string>();
beforeEach(() => {
  refunds.length = 0;
  refundFails = new Set();
  process.env.DEMO_TIME_SCALE = "60";
  setPayPalFetch(async (input, init) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "t", expires_in: 3600, scope: "" });
    if (url.includes("/refund")) {
      const capture = url.split("/captures/")[1].split("/")[0];
      if (refundFails.has(capture)) return Response.json({ name: "UNPROCESSABLE_ENTITY" }, { status: 422 });
      refunds.push({ capture, key: headers["PayPal-Request-Id"], value: JSON.parse(String(init!.body)).amount.value });
      return Response.json({ id: `REF-${refunds.length}`, status: "COMPLETED" }, { status: 201 });
    }
    if (url.endsWith("/v1/payments/payouts")) return Response.json({ batch_header: { payout_batch_id: "BATCHX", batch_status: "PENDING", sender_batch_header: { sender_batch_id: "s" } } }, { status: 201 });
    if (url.includes("/v1/payments/payouts/")) return Response.json({ batch_header: { payout_batch_id: "BATCHX", batch_status: "SUCCESS", sender_batch_header: { sender_batch_id: "s" } }, items: [{ payout_item_id: "I", transaction_status: "SUCCESS", payout_item: { receiver: "w" } }] });
    return Response.json({}, { status: 404 });
  });
});

const verifier = (passed: Array<boolean | null>): AIProvider => ({
  name: "v",
  screenBounty: async () => ({ ok: true, model: "f", promptVersion: "f", value: { decision: "allow", category: "place_photo", rationale: "ok", confidence: 0.95 } }),
  checkPhoto: async () => ({ ok: true, model: "f", promptVersion: "f", value: { usable: true, problems: [], retake_hint: "" } }),
  verifyProof: async (i) => ({ ok: true, model: "f", promptVersion: "f", value: { summary: "s", checklist: i.bounty.acceptanceChecklist.map((item, k) => ({ item, passed: passed[k] ?? null, reason: "r", confidence: 0.9 })) } }),
});

async function funded(cents = 10000) {
  const ownerId = await makeUser("owner");
  const captureId = "CAP-" + newId("top");
  await db().insert(topups).values({ id: newId("top"), ownerId, paypalOrderId: "O-" + captureId, captureId, amountCents: cents, status: "captured", capturedAt: new Date() });
  await db().transaction((t) => creditTopup(t, ownerId, cents, captureId));
  const key = await createApiKey(db(), { ownerId, name: "t", dailyCapCents: 100000 });
  return { ownerId, captureId, ctx: { ownerId, apiKeyId: key.id, dailyCapCents: 100000, actor: "agent:t" as const } };
}

const post = (ctx: Awaited<ReturnType<typeof funded>>["ctx"], over: Partial<Parameters<typeof createBounty>[2]> = {}) =>
  createBounty(db(), ctx, { title: "Photograph a sign", instructions: "Photograph it.", deliverables: [{ type: "photo", description: "Sign" }], acceptanceChecklist: ["Sign readable"], rewardCents: 2000, expiresInMinutes: 120, spots: 1, ...over });

async function submittedFor(ctx: Awaited<ReturnType<typeof funded>>["ctx"], passed: Array<boolean | null>) {
  setAIProvider(verifier(passed));
  const b = await post(ctx);
  const worker = await makeUser("worker", { paypalEmail: "w@example.com" });
  const { claimId } = await claimBounty(db(), worker, b.id);
  await addProofPhoto(db(), worker, claimId, 0, await sharp({ create: { width: 400, height: 300, channels: 3, background: "#888" } }).jpeg().toBuffer());
  const { submissionId } = await submitProof(db(), worker, claimId, {});
  await verifySubmission(db(), submissionId);
  return { bountyId: b.id, worker };
}

const status = async (id: string) => (await db().select().from(bounties).where(eq(bounties.id, id)))[0].status;
const later = (min: number) => new Date(Date.now() + min * 60_000);

describe("timers (DEMO_TIME_SCALE=60: review and appeal windows are 24 minutes)", () => {
  it("an expired bounty releases its funds", async () => {
    const { ownerId, ctx } = await funded();
    const b = await post(ctx);
    expect((await getBalances(db(), ownerId)).heldCents).toBe(2000);
    await db().update(bounties).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(bounties.id, b.id));
    expect(await expireBounties(db())).toBeGreaterThanOrEqual(1);
    expect(await status(b.id)).toBe("expired");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 10000, heldCents: 0 });
    expect(await ownerLedgerSum(db(), ownerId)).toBe(0);
  });

  it("owner silence on a review: not paid at 23 min, paid after 24 min", async () => {
    const { ownerId, ctx } = await funded();
    const { bountyId } = await submittedFor(ctx, [null]);
    expect(await status(bountyId)).toBe("needs_owner_review");
    await lapseReviews(db(), later(23));
    expect(await status(bountyId)).toBe("needs_owner_review");
    await lapseReviews(db(), later(25));
    expect(await status(bountyId)).toBe("paying");
    await pollPayouts(db(), bountyId);
    expect(await status(bountyId)).toBe("paid");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 8000, heldCents: 0 });
  });

  it("rejected without appeal reopens after the appeal window", async () => {
    const { ctx } = await funded();
    const { bountyId } = await submittedFor(ctx, [false]);
    expect(await status(bountyId)).toBe("rejected");
    await reopenUnappealed(db(), later(10));
    expect(await status(bountyId)).toBe("rejected");
    await reopenUnappealed(db(), later(25));
    expect(await status(bountyId)).toBe("open");
  });

  it("one appeal per rejection, only by the worker who submitted", async () => {
    const { ctx } = await funded();
    const { bountyId, worker } = await submittedFor(ctx, [false]);
    const other = await makeUser("worker", { paypalEmail: "x@example.com" });
    await expect(fileAppeal(db(), other, bountyId, "It was fine really")).rejects.toMatchObject({ code: "forbidden" });
    await fileAppeal(db(), worker, bountyId, "The sign is readable in the photo");
    expect(await status(bountyId)).toBe("appealed");
    await expect(fileAppeal(db(), worker, bountyId, "Again please")).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("owner accepts an appeal → paid; declines → reopened", async () => {
    const a = await funded();
    const one = await submittedFor(a.ctx, [false]);
    await fileAppeal(db(), one.worker, one.bountyId, "The sign is readable in the photo");
    await decideAppeal(db(), a.ownerId, one.bountyId, true);
    await pollPayouts(db(), one.bountyId);
    expect(await status(one.bountyId)).toBe("paid");

    const two = await submittedFor(a.ctx, [false]);
    await fileAppeal(db(), two.worker, two.bountyId, "The sign is readable in the photo");
    await decideAppeal(db(), a.ownerId, two.bountyId, false, "Photo is blurry");
    expect(await status(two.bountyId)).toBe("open");
  });

  it("an ignored appeal pays the worker after the review window", async () => {
    const { ctx } = await funded();
    const { bountyId, worker } = await submittedFor(ctx, [false]);
    await fileAppeal(db(), worker, bountyId, "The sign is readable in the photo");
    await lapseReviews(db(), later(25));
    await pollPayouts(db(), bountyId);
    expect(await status(bountyId)).toBe("paid");
  });
});

describe("callbacks", () => {
  const publicDns = async () => ["93.184.216.34"];
  it("only public https URLs are allowed", async () => {
    expect(await isSafeCallbackUrl("https://agent.example.com/hook", publicDns)).toBe(true);
    for (const bad of ["http://agent.example.com/hook", "https://localhost/x", "https://127.0.0.1/x", "https://169.254.169.254/latest", "https://10.0.0.5/x", "https://[::1]/x", "https://user:pw@agent.example.com/x", "not a url"]) {
      expect(await isSafeCallbackUrl(bad, publicDns), bad).toBe(false);
    }
    expect(await isSafeCallbackUrl("https://sneaky.example.com/x", async () => ["192.168.1.10"])).toBe(false);
  });

  it("status changes are queued and delivered; failures retry with backoff, then stop", async () => {
    const { ctx } = await funded();
    const b = await post(ctx, { callbackUrl: "https://agent.example.com/hook" });
    const sent: unknown[] = [];
    const r = await deliverCallbacks(db(), { resolve: publicDns, send: async (_u, body) => (sent.push(JSON.parse(body)), 200) });
    expect(r.delivered).toBeGreaterThanOrEqual(1);
    expect(sent).toContainEqual(expect.objectContaining({ event: "bounty.status_changed", bounty_id: b.id, status: "open" }));

    const b2 = await post(ctx, { callbackUrl: "https://agent.example.com/down" });
    let now = new Date();
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
      await deliverCallbacks(db(), { now, resolve: publicDns, send: async () => 503 });
      now = new Date(now.getTime() + 4 * 3600_000);
    }
    const [row] = await db().select().from(callbackDeliveries).where(eq(callbackDeliveries.bountyId, b2.id));
    expect(row.attempts).toBe(MAX_ATTEMPTS);
    expect(row.deliveredAt).toBeNull();
  });
});

describe("withdraw", () => {
  it("refunds newest top-ups first with idempotency keys, and never touches money set aside", async () => {
    const { ownerId, ctx } = await funded(5000);
    const older = "CAP-OLD-" + newId("top");
    await db().insert(topups).values({ id: newId("top"), ownerId, paypalOrderId: "O-" + older, captureId: older, amountCents: 3000, status: "captured", capturedAt: new Date(Date.now() - 86400_000) });
    await db().transaction((t) => creditTopup(t, ownerId, 3000, older));
    await post(ctx); // $20 set aside → $60 available of $80
    await expect(withdraw(db(), ownerId, 7000)).rejects.toMatchObject({ code: "insufficient_funds" });
    const r = await withdraw(db(), ownerId, 6000);
    expect(r.refundedCents).toBe(6000);
    expect(refunds.map((x) => x.value)).toEqual(["50.00", "10.00"]);
    expect(refunds[1].capture).toBe(older);
    expect(refunds.every((x) => x.key.startsWith(`withdraw_${r.id}_`))).toBe(true);
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 0, heldCents: 2000 });
    expect(await ownerLedgerSum(db(), ownerId)).toBe(0);
  });

  it("a refund PayPal rejects is credited back to available", async () => {
    const { ownerId, captureId } = await funded(5000);
    refundFails.add(captureId);
    const r = await withdraw(db(), ownerId, 2000);
    expect(r.refundedCents).toBe(0);
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 5000, heldCents: 0 });
    const [t] = await db().select().from(topups).where(eq(topups.captureId, captureId));
    expect(t.refundedCents).toBe(0);
  });
});
