import { desc, eq, inArray } from "drizzle-orm";
import { ai } from "@/ai";
import type { DB } from "@/db/client";
import { bounties, photos, submissions, verifications, type ChecklistResult } from "@/db/schema";
import { transition } from "@/domain/bounty/state";
import { startPayout } from "@/domain/payouts/payouts";

// Verification: AI checks the proof against the bounty's own checklist. Overall pass requires every
// item to pass with confidence ≥ 0.7; a confident failure on any item fails; anything else goes to
// the owner. Any AI problem also goes to the owner (never fails open, never fails the worker).

export const MIN_ITEM_CONFIDENCE = 0.7;

export type Outcome = "pass" | "fail" | "uncertain";

export function decide(items: ChecklistResult[], expected: string[]): Outcome {
  if (items.length !== expected.length) return "uncertain";
  const confident = (x: ChecklistResult) => (x.confidence ?? 0) >= MIN_ITEM_CONFIDENCE;
  if (items.some((x) => x.passed === false && confident(x))) return "fail";
  if (items.every((x) => x.passed === true && confident(x))) return "pass";
  return "uncertain";
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat?: number; lng?: number } | null | undefined) {
  if (!b || b.lat === undefined || b.lng === undefined) return null;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Verifies a submission whose bounty is `verifying`. Idempotent: does nothing if already decided. */
export async function verifySubmission(database: DB, submissionId: string) {
  const [s] = await database.select().from(submissions).where(eq(submissions.id, submissionId));
  if (!s) return null;
  const [b] = await database.select().from(bounties).where(eq(bounties.id, s.bountyId));
  if (!b || b.status !== "verifying") return null;
  const prior = await database.select({ id: verifications.id }).from(verifications).where(eq(verifications.submissionId, submissionId)).limit(1);
  if (prior.length) return null;

  const rows = s.photoIds.length ? await database.select().from(photos).where(inArray(photos.id, s.photoIds)) : [];
  const ordered = s.photoIds.map((id) => rows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
  const r = await ai().verifyProof(
    {
      bounty: { title: b.title, instructions: b.instructions, acceptanceChecklist: b.acceptanceChecklist, product: b.product ?? null },
      photos: ordered.map((p) => ({ label: b.deliverables[p.slot ?? 0]?.description ?? "Proof photo", base64: p.bytes.toString("base64") })),
      notes: s.notes,
      distanceMeters: s.location ? distanceMeters(s.location, b.location) : null,
    },
    { bountyId: b.id, submissionId },
  );

  let items: ChecklistResult[];
  let rationale: string;
  let result: Outcome;
  if (r.ok) {
    // Align the model's answers to the bounty's checklist by position; text must match the item.
    items = b.acceptanceChecklist.map((item, i) => {
      const x = r.value.checklist[i];
      return x ? { item, passed: x.passed, reason: x.reason, confidence: x.confidence } : { item, passed: null, reason: "Not assessed.", confidence: 0 };
    });
    result = decide(items, b.acceptanceChecklist);
    rationale = r.value.summary;
  } else {
    items = b.acceptanceChecklist.map((item) => ({ item, passed: null, reason: "Automatic check unavailable.", confidence: 0 }));
    result = "uncertain";
    rationale = "Hail couldn't check this proof automatically, so the owner will review it. If they don't respond in time, the worker is paid.";
  }
  const confidence = items.length ? Math.min(...items.map((x) => x.confidence ?? 0)) : 0;

  const after = await database.transaction(async (tx) => {
    const [cur] = await tx.select().from(bounties).where(eq(bounties.id, b.id)).for("update");
    if (cur.status !== "verifying") return null;
    await tx.insert(verifications).values({ submissionId, result, checklistResults: items, rationale, confidence, model: r.model, promptVersion: r.promptVersion });
    const event = result === "pass" ? "verify_pass" : result === "fail" ? "verify_fail" : "verify_uncertain";
    return transition(tx, b.id, event, "verifier", { submissionId, result, rationale });
  });
  if (after?.status === "approved") await startPayout(database, b.id);
  return { result, items, rationale };
}

export async function latestVerification(database: DB, submissionId: string) {
  const [v] = await database.select().from(verifications).where(eq(verifications.submissionId, submissionId)).orderBy(desc(verifications.id)).limit(1);
  return v ?? null;
}
