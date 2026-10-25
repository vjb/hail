import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import type { DB, Tx } from "@/db/client";
import { bounties, bountyEvents, claims, payouts, photos, screenings, submissions, topups, verifications, type BountyProduct, type ChecklistResult, type Deliverable } from "@/db/schema";
import { transition, type BountyEvent } from "@/domain/bounty/state";
import { creditTopup, holdForBounty, payBounty } from "@/domain/ledger/ledger";
import { newId } from "@/lib/ids";

// Realistic, deterministic demo history for the reset button: no PayPal or AI calls, so a reset
// takes seconds. Money still flows through the real ledger and statuses through the state machine.
// Demo-only references are prefixed DEMO- so they're never mistaken for sandbox records.

const ESPRESSO: BountyProduct = {
  title: "Barista Express Espresso Machine",
  image_url: "https://cdn.trychannel3.com/c826996e-ca63-4f38-9f74-3d7c25ee2a17?aid=01M5R217253Z2K824K275CGW8Z&mid=K6RA",
  price_cents: 49995,
  retailer: "macys.com",
  attributes: { brand: "Breville", "feature 1": "15-bar Italian pump and 1600 W thermocoil heating system" },
};

type Spec = {
  title: string;
  instructions: string;
  deliverables: Deliverable[];
  checklist: string[];
  rewardCents: number;
  category: string;
  screen: { decision: "allow" | "needs_owner_approval" | "block"; rationale: string };
  address?: string;
  product?: BountyProduct;
  hoursAgo: number;
};

// Sample proof photos for the demo story (src/db/demo-photos), one per photo deliverable.
async function proofPhoto(name: string) {
  const bytes = await readFile(path.join(process.cwd(), "src/db/demo-photos", `${name}.jpg`));
  const { width = 0, height = 0 } = await sharp(bytes).metadata();
  return { bytes, width, height };
}

async function backdate(tx: Tx, bountyId: string, hoursAgo: number) {
  const shift = sql.raw(`interval '${Math.round(hoursAgo * 60)} minutes'`);
  await tx.execute(sql`update bounty_events set created_at = created_at - ${shift} where bounty_id = ${bountyId}`);
  await tx.execute(sql`update screenings set created_at = created_at - ${shift} where bounty_id = ${bountyId}`);
  await tx.execute(sql`update ledger_entries set created_at = created_at - ${shift} where bounty_id = ${bountyId}`);
  await tx.execute(sql`update bounties set created_at = created_at - ${shift}, updated_at = updated_at - ${shift} where id = ${bountyId}`);
  // The work itself moves too, so certificates and timelines never show proof after its acceptance.
  await tx.execute(sql`update claims set claimed_at = claimed_at - ${shift}, expires_at = expires_at - ${shift} where bounty_id = ${bountyId}`);
  await tx.execute(sql`update photos set created_at = created_at - ${shift} where claim_id in (select id from claims where bounty_id = ${bountyId})`);
  await tx.execute(sql`update verifications set created_at = created_at - ${shift} where submission_id in (select id from submissions where bounty_id = ${bountyId})`);
  await tx.execute(sql`update submissions set created_at = created_at - ${shift} where bounty_id = ${bountyId}`);
  await tx.execute(sql`update payouts set created_at = created_at - ${shift}, updated_at = updated_at - ${shift} where bounty_id = ${bountyId}`);
}

/** Adds the demo story to a freshly seeded database. */
export async function seedHistory(database: DB, ids: { ownerId: string; worker1Id: string; worker2Id: string; apiKeyId: string | null }) {
  const { ownerId } = ids;
  await database.transaction(async (tx) => {
    const captureId = "DEMO-CAP-0001";
    await tx.insert(topups).values({ id: newId("top"), ownerId, paypalOrderId: "DEMO-ORDER-0001", captureId, amountCents: 30000, status: "captured", capturedAt: new Date(Date.now() - 4 * 86400_000) });
    await creditTopup(tx, ownerId, 30000, captureId);
    await tx.execute(sql`update ledger_entries set created_at = now() - interval '4 days' where txn_key = ${"topup:" + captureId}`);
  });

  async function post(s: Spec) {
    const id = newId("bty");
    await database.transaction(async (tx) => {
      await tx.insert(bounties).values({
        id,
        ownerId,
        apiKeyId: ids.apiKeyId,
        title: s.title,
        instructions: s.instructions,
        deliverables: s.deliverables,
        acceptanceChecklist: s.checklist,
        rewardCents: s.rewardCents,
        location: s.address ? { address: s.address } : null,
        product: s.product ?? null,
        category: s.category,
        expiresAt: new Date(Date.now() + 2 * 86400_000),
        status: "created",
      });
      await transition(tx, id, "screen_start", "agent:demo-agent");
      await tx.insert(screenings).values({ bountyId: id, layer: "final", decision: s.screen.decision, category: s.category, rationale: s.screen.rationale, confidence: 0.94, model: "demo" });
      const why = { ...s.screen, category: s.category };
      if (s.screen.decision === "block") return transition(tx, id, "screen_block", "screening", why);
      await holdForBounty(tx, ownerId, id, s.rewardCents);
      return transition(tx, id, s.screen.decision === "allow" ? "screen_allow" : "screen_needs_approval", "screening", why);
    });
    return id;
  }

  async function work(bountyId: string, workerId: string, results: ChecklistResult[], outcome: "pass" | "uncertain", photoFiles: string[]) {
    const [b] = await database.select().from(bounties).where(eq(bounties.id, bountyId));
    await database.transaction(async (tx) => {
      const claimId = newId("clm");
      await tx.insert(claims).values({ id: claimId, bountyId, workerId, expiresAt: new Date(Date.now() + 3600_000), status: "submitted" });
      await transition(tx, bountyId, "claim", `worker:${workerId}`, { claimId });
      const photoIds: string[] = [];
      for (const [i, d] of b.deliverables.entries()) {
        if (d.type !== "photo") continue;
        const pid = newId("ph");
        const p = await proofPhoto(photoFiles[i % photoFiles.length]);
        await tx.insert(photos).values({ id: pid, ownerUserId: workerId, claimId, slot: i, mime: "image/jpeg", width: p.width, height: p.height, bytes: p.bytes, check: { usable: true, problems: [], retakeHint: "" } });
        photoIds.push(pid);
      }
      const subId = newId("sub");
      await tx.insert(submissions).values({ id: subId, claimId, bountyId, workerId, photoIds, notes: null });
      await transition(tx, bountyId, "submit", `worker:${workerId}`, { submissionId: subId });
      const rationale = outcome === "pass" ? "Every checklist item is clearly shown in the photos." : "One item couldn't be confirmed from the photos, so the owner should take a look.";
      await tx.insert(verifications).values({ submissionId: subId, result: outcome, checklistResults: results, rationale, confidence: Math.min(...results.map((r) => r.confidence ?? 0)), model: "demo" });
      await transition(tx, bountyId, outcome === "pass" ? "verify_pass" : "verify_uncertain", "verifier", { submissionId: subId, rationale });
    });
  }

  async function pay(bountyId: string, workerId: string, viaOwner = false) {
    const [b] = await database.select().from(bounties).where(eq(bounties.id, bountyId));
    await database.transaction(async (tx) => {
      if (viaOwner) await transition(tx, bountyId, "review_approve" as BountyEvent, `owner:${ownerId}`, { rationale: "Looks right to me." });
      const pid = newId("pay");
      await tx.insert(payouts).values({ id: pid, bountyId, workerId, receiverEmail: "demo-payout@personal.example.com", senderBatchId: `payout_${bountyId}`, batchId: `DEMO-BATCH-${bountyId.slice(-6)}`, itemId: `DEMO-ITEM-${bountyId.slice(-6)}`, amountCents: b.rewardCents, status: "succeeded" });
      await transition(tx, bountyId, "start_payout", "system", { payoutId: pid });
      await payBounty(tx, ownerId, bountyId, b.rewardCents, `DEMO-BATCH-${bountyId.slice(-6)}`);
      await transition(tx, bountyId, "payout_succeeded", "system", { payoutId: pid });
    });
  }

  const ok = (item: string, reason: string): ChecklistResult => ({ item, passed: true, reason, confidence: 0.93 });
  const photo = (description: string): Deliverable => ({ type: "photo", description });

  // Paid, verified automatically.
  const bakery = await post({ title: "Confirm a bakery's opening hours", instructions: "Walk past Sunrise Bakery on 5th Street and photograph the opening hours posted on the door.", deliverables: [photo("Opening hours sign")], checklist: ["Opening hours are readable"], rewardCents: 800, category: "business_check", screen: { decision: "allow", rationale: "Photographing posted opening hours from the street is a safe public task." }, address: "5th Street, Springfield", hoursAgo: 52 });
  await work(bakery, ids.worker1Id, [ok("Opening hours are readable", "The door sign reads Mon–Fri 7am–6pm.")], "pass", ["bakery-hours"]);
  await pay(bakery, ids.worker1Id);

  const oat = await post({ title: "Check the shelf price of oat milk", instructions: "In the dairy aisle of the Main St grocery store, photograph the shelf price tag for Oatly Barista 1L.", deliverables: [photo("Shelf price tag")], checklist: ["Price is legible", "Product name visible"], rewardCents: 600, category: "stock_or_price_check", screen: { decision: "allow", rationale: "Checking a shelf price in a public store is allowed." }, address: "Main St Grocery", hoursAgo: 30 });
  await work(oat, ids.worker2Id, [ok("Price is legible", "Tag shows $4.99."), ok("Product name visible", "Oatly Barista 1L is on the tag.")], "pass", ["oat-price"]);
  await pay(oat, ids.worker2Id);

  // Paid after the owner reviewed unclear proof.
  const parking = await post({ title: "Photograph the parking signs on Oak Ave", instructions: "Photograph the street parking signs on both sides of the 300 block of Oak Ave.", deliverables: [photo("North side sign"), photo("South side sign")], checklist: ["North sign readable", "South sign readable"], rewardCents: 900, category: "place_photo", screen: { decision: "allow", rationale: "Photographing public street signs is allowed." }, address: "300 block of Oak Ave", hoursAgo: 20 });
  await work(parking, ids.worker1Id, [ok("North sign readable", "Reads 2-hour parking 8am–6pm."), { item: "South sign readable", passed: null, reason: "Glare covers the bottom line.", confidence: 0.55 }], "uncertain", ["parking-north", "parking-south"]);
  await pay(parking, ids.worker1Id, true);

  // Blocked by the safety screen; nothing was held.
  await post({ title: "Receive a verification code for me", instructions: "I'll send a code to your phone by SMS. Reply with the 6-digit code as soon as it arrives.", deliverables: [{ type: "text", description: "The code" }], checklist: ["Code sent back"], rewardCents: 1500, category: "otp_solicitation", screen: { decision: "block", rationale: "Blocked: this task asks someone to receive or pass on a one-time or verification code." }, hoursAgo: 6 });

  // Waiting on the owner: approval, and unclear proof.
  await post({ title: "Inspect a used piano", instructions: "At the music store showroom, photograph the piano's serial number and its keys.", deliverables: [photo("Serial number"), photo("Keys")], checklist: ["Serial number is legible"], rewardCents: 7500, category: "item_inspection", screen: { decision: "needs_owner_approval", rationale: "Needs your approval: the reward is at or above your $50.00 approval threshold." }, address: "Harmony Music, 88 Elm Rd", hoursAgo: 3 });
  const bike = await post({ title: "Check a bike's condition", instructions: "At the bike shop's sidewalk sale, photograph the frame and both tires of the blue Trek road bike tagged #14.", deliverables: [photo("Frame"), photo("Tires")], checklist: ["Frame visible", "Both tires visible"], rewardCents: 1500, category: "item_inspection", screen: { decision: "allow", rationale: "Inspecting an item for sale on a public sidewalk is allowed." }, address: "Spokes Bike Shop, 12 Pine St", hoursAgo: 2 });
  await work(bike, ids.worker2Id, [ok("Frame visible", "Whole frame in view, no cracks visible."), { item: "Both tires visible", passed: null, reason: "Only the front tire is clearly in frame.", confidence: 0.5 }], "uncertain", ["bike-frame", "bike-tires"]);

  // Open for workers: the demo's espresso machine, plus a quick one.
  await post({ title: "Inspect a used espresso machine", instructions: "Visit the seller at the listed address in their driveway. Photograph the serial number plate and the front panel while the machine is powered on.", deliverables: [photo("Serial number plate, readable"), photo("Front panel with power light on")], checklist: ["Serial number is legible", "Machine is visibly powered on", "Model matches the listing"], rewardCents: 2500, category: "item_inspection", screen: { decision: "allow", rationale: "Inspecting an item listed for sale, with the seller present, is an allowed task." }, address: "123 Main St, Springfield", product: ESPRESSO, hoursAgo: 0.2 });
  await post({ title: "Photograph a storefront", instructions: "Take a clear daytime photo of the storefront at 210 Market Street from across the street, showing the sign.", deliverables: [photo("Storefront with sign")], checklist: ["Store sign is visible"], rewardCents: 700, category: "place_photo", screen: { decision: "allow", rationale: "Photographing a storefront from a public street is allowed." }, address: "210 Market Street", hoursAgo: 0.5 });

  // Spread the story over the past few days so timelines and dashboards look real.
  await database.transaction(async (tx) => {
    for (const [id, h] of [
      [bakery, 52],
      [oat, 30],
      [parking, 20],
      [bike, 2],
    ] as const)
      await backdate(tx, id, h);
  });
  void bountyEvents;
}
