/**
 * Real-sandbox payout check: drives one bounty through claim → photo → submit → verify (AI verdict
 * stubbed to "pass") → real PayPal Payouts → poll → paid. Proves the money path without needing a real photo.
 * Usage: npm run payout:check
 */
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { setAIProvider } from "../src/ai";
import { closeDb, db } from "../src/db/client";
import { bounties, payouts, users } from "../src/db/schema";
import { createBounty } from "../src/domain/bounty/service";
import { createApiKey } from "../src/domain/keys/keys";
import { getBalances } from "../src/domain/ledger/ledger";
import { settleSoon } from "../src/domain/payouts/payouts";
import { verifySubmission } from "../src/domain/verify/verify";
import { addProofPhoto, claimBounty, submitProof } from "../src/domain/work/work";

async function main() {
  setAIProvider({
    name: "stub-pass",
    screenBounty: async () => ({ ok: true, model: "stub", promptVersion: "stub", value: { decision: "allow", category: "place_photo", rationale: "Stub.", confidence: 0.99 } }),
    checkPhoto: async () => ({ ok: true, model: "stub", promptVersion: "stub", value: { usable: true, problems: [], retake_hint: "" } }),
    verifyProof: async (i) => ({ ok: true, model: "stub", promptVersion: "stub", value: { summary: "Stubbed pass for the payout check.", checklist: i.bounty.acceptanceChecklist.map((item) => ({ item, passed: true, reason: "Stub.", confidence: 0.99 })) } }),
  });
  const [owner] = await db().select().from(users).where(eq(users.email, process.env.DEMO_OWNER_EMAIL!.toLowerCase()));
  const [worker] = await db().select().from(users).where(eq(users.email, process.env.DEMO_WORKER2_EMAIL!.toLowerCase()));
  if (!worker.paypalEmail) throw new Error("worker2 needs a PayPal email");
  const key = await createApiKey(db(), { ownerId: owner.id, name: "payout-check", dailyCapCents: 100000 });
  const before = await getBalances(db(), owner.id);
  const b = await createBounty(db(), { ownerId: owner.id, apiKeyId: key.id, dailyCapCents: 100000, actor: "agent:payout-check" }, {
    title: "Payout check: photograph a mailbox",
    instructions: "Photograph the blue mailbox on the corner.",
    deliverables: [{ type: "photo", description: "Mailbox" }],
    acceptanceChecklist: ["Mailbox visible"],
    rewardCents: 300,
    expiresInMinutes: 60,
    spots: 1,
  });
  const { claimId } = await claimBounty(db(), worker.id, b.id);
  await addProofPhoto(db(), worker.id, claimId, 0, await sharp({ create: { width: 800, height: 600, channels: 3, background: "#2050a0" } }).jpeg().toBuffer());
  const { submissionId } = await submitProof(db(), worker.id, claimId, {});
  const v = await verifySubmission(db(), submissionId);
  console.log("verified:", v?.result);
  const settled = await settleSoon(db(), b.id, 20, 3000);
  const [p] = await db().select().from(payouts).where(eq(payouts.bountyId, b.id));
  const [row] = await db().select().from(bounties).where(eq(bounties.id, b.id));
  const after = await getBalances(db(), owner.id);
  console.log(`bounty ${b.id}: ${row.status}; payout ${p.senderBatchId} batch ${p.batchId} → ${p.receiverEmail}: ${p.status}`);
  console.log(`owner balance before ${before.availableCents}/${before.heldCents}, after ${after.availableCents}/${after.heldCents}`);
  if (!settled || row.status !== "paid") process.exitCode = 1;
}

main().finally(() => closeDb());
