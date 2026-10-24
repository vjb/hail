/**
 * Day 8 gate, live against PayPal sandbox with DEMO_TIME_SCALE=60 (review window = 24 real minutes):
 *  1. an ignored review auto-pays the worker within the scaled window (real payout)
 *  2. an expired bounty releases its funds
 *  3. withdraw returns money to the sandbox personal account (real refund)
 * Only the AI verdict is stubbed ("uncertain"), so the bounty lands in owner review.
 */
process.env.DEMO_TIME_SCALE = "60";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { setAIProvider } from "../src/ai";
import { closeDb, db } from "../src/db/client";
import { bounties, payouts, users } from "../src/db/schema";
import { createBounty } from "../src/domain/bounty/service";
import { createApiKey } from "../src/domain/keys/keys";
import { getBalances } from "../src/domain/ledger/ledger";
import { sweep } from "../src/domain/sweep/sweep";
import { verifySubmission } from "../src/domain/verify/verify";
import { withdraw } from "../src/domain/withdrawals/withdrawals";
import { addProofPhoto, claimBounty, submitProof } from "../src/domain/work/work";

const log = (...a: unknown[]) => console.log(new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York" }), ...a);

async function main() {
  setAIProvider({
    name: "stub-uncertain",
    screenBounty: async () => ({ ok: true, model: "stub", promptVersion: "stub", value: { decision: "allow", category: "place_photo", rationale: "Stub.", confidence: 0.99 } }),
    checkPhoto: async () => ({ ok: true, model: "stub", promptVersion: "stub", value: { usable: true, problems: [], retake_hint: "" } }),
    verifyProof: async (i) => ({ ok: true, model: "stub", promptVersion: "stub", value: { summary: "Stub: unclear.", checklist: i.bounty.acceptanceChecklist.map((item) => ({ item, passed: null, reason: "Stub.", confidence: 0.5 })) } }),
  });
  const [owner] = await db().select().from(users).where(eq(users.email, process.env.DEMO_OWNER_EMAIL!.toLowerCase()));
  const [worker] = await db().select().from(users).where(eq(users.email, process.env.DEMO_WORKER2_EMAIL!.toLowerCase()));
  const key = await createApiKey(db(), { ownerId: owner.id, name: "day8-gate", dailyCapCents: 100000 });
  const ctx = { ownerId: owner.id, apiKeyId: key.id, dailyCapCents: 100000, actor: "agent:day8-gate" as const };
  const base = { instructions: "Photograph it.", deliverables: [{ type: "photo" as const, description: "Photo" }], acceptanceChecklist: ["Subject visible"], expiresInMinutes: 120, spots: 1 };

  // 3. Withdraw $5.00 (real refund).
  const w = await withdraw(db(), owner.id, 500);
  log(`3. withdraw ${w.id}: refunded ${w.refundedCents}c via ${w.parts.map((p) => `${p.refundId}:${p.status}`).join(", ")}`);

  // 2. Expiry releases funds.
  const exp = await createBounty(db(), ctx, { ...base, title: "Day 8 gate: expiry", rewardCents: 400 });
  const heldBefore = (await getBalances(db(), owner.id)).heldCents;
  await db().update(bounties).set({ expiresAt: new Date(Date.now() + 5_000) }).where(eq(bounties.id, exp.id));
  await new Promise((r) => setTimeout(r, 6_000));
  await sweep(db());
  const [expRow] = await db().select().from(bounties).where(eq(bounties.id, exp.id));
  log(`2. expiry: ${exp.id} → ${expRow.status}; held ${heldBefore} → ${(await getBalances(db(), owner.id)).heldCents}`);

  // 1. Ignored review auto-pays within the scaled window.
  const b = await createBounty(db(), ctx, { ...base, title: "Day 8 gate: ignored review", rewardCents: 300 });
  const { claimId } = await claimBounty(db(), worker.id, b.id);
  await addProofPhoto(db(), worker.id, claimId, 0, await sharp({ create: { width: 400, height: 300, channels: 3, background: "#456" } }).jpeg().toBuffer());
  const { submissionId } = await submitProof(db(), worker.id, claimId, {});
  await verifySubmission(db(), submissionId);
  const [rev] = await db().select().from(bounties).where(eq(bounties.id, b.id));
  const start = rev.updatedAt.getTime();
  log(`1. ${b.id} is ${rev.status}; the owner ignores it. Sweeping every 30 s…`);
  for (;;) {
    await new Promise((r) => setTimeout(r, 30_000));
    await sweep(db());
    const [row] = await db().select().from(bounties).where(eq(bounties.id, b.id));
    if (row.status !== "needs_owner_review") log(`   ${row.status} after ${((Date.now() - start) / 60000).toFixed(1)} min`);
    if (row.status === "paid") break;
    if (Date.now() - start > 40 * 60_000) throw new Error("not paid within 40 minutes");
  }
  const [p] = await db().select().from(payouts).where(eq(payouts.bountyId, b.id));
  log(`1. auto-paid: payout batch ${p.batchId} → ${p.receiverEmail}: ${p.status}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
