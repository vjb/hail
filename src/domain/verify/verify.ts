import { desc, eq, inArray } from "drizzle-orm";
import { ai } from "@/ai";
import type { DB } from "@/db/client";
import { bounties, photos, proofChallenges, submissions, users, verifications, type ChecklistResult, type ContentCredentials, type ProofChecks } from "@/db/schema";
import type { VerifyOutput } from "@/ai/provider";
import { transition } from "@/domain/bounty/state";
import { startPayout } from "@/domain/payouts/payouts";

// Verification (verify-v2): AI checks the proof against the bounty's own checklist and runs proof
// checks on every photo. The outcome decides the worker's pay, and Hail pays for the truth, not for a
// yes: an item that honestly fails because of the item itself (cause "item") still counts as done.
//   fail      a confident failure caused by the proof (blurry, missing, wrong subject)
//   uncertain any doubt about the proof (code missing or wrong, screen, generated, mismatched photos,
//             incomplete checks), or any item not decided confidently → the owner decides
//   pass      every item decided confidently and no doubts → the worker is paid automatically
// Any AI problem also goes to the owner (never fails open, never fails the worker).

export const MIN_ITEM_CONFIDENCE = 0.7;

export type Outcome = "pass" | "fail" | "uncertain";

const CODE_DOUBT: Record<string, string> = {
  missing: "the photo code isn't visible",
  different: "a different photo code is visible",
  unreadable: "the photo code can't be read",
  not_requested: "the photo code isn't visible",
};

/** Plain reasons to doubt the proof; empty when the proof checks are clean. */
export function proofDoubts(proof: ProofChecks | null, photoCount: number, codeIssued: boolean[]): string[] {
  if (photoCount === 0) return [];
  if (!proof || proof.photos.length !== photoCount) return ["The proof checks didn't come back complete."];
  const out: string[] = [];
  proof.photos.forEach((p, i) => {
    const n = `Photo ${i + 1}`;
    // Every proof photo must answer a fresh code: the verifier can't reliably tell a generated photo
    // from a real one without it (proof eval G2), so a photo without one is never auto-accepted.
    if (!codeIssued[i]) out.push(`${n} was taken without a photo code.`);
    else if (p.code !== "matches") out.push(`${n}: ${CODE_DOUBT[p.code]}.`);
    if (p.screen) out.push(`${n} looks like a picture of a screen.`);
    if (p.generatedOrEdited) out.push(`${n} shows signs of being generated or edited.`);
  });
  if (proof.sameScene === false) out.push("The photos don't look like the same item or place.");
  out.push(...proof.concerns);
  return out;
}

/** Content Credentials can only add doubt: AI-made by their own account, or changed after signing. */
export function credentialDoubts(creds: Array<ContentCredentials | null>): string[] {
  return creds.flatMap((c, i) => {
    if (!c) return [];
    if (c.aiGenerated) return [`Photo ${i + 1}'s Content Credentials say it was made with AI.`];
    if (/invalid/i.test(c.validation)) return [`Photo ${i + 1}'s Content Credentials don't check out: it may have been changed after it was signed.`];
    return [];
  });
}

export function decide(items: ChecklistResult[], expected: string[], doubts: string[] = []): Outcome {
  if (items.length !== expected.length) return "uncertain";
  const confident = (x: ChecklistResult) => (x.confidence ?? 0) >= MIN_ITEM_CONFIDENCE;
  // A failure without a stated cause is treated as the proof's (the stricter reading).
  if (items.some((x) => x.passed === false && x.cause !== "item" && confident(x))) return "fail";
  if (doubts.length) return "uncertain";
  if (items.every((x) => x.passed !== null && confident(x))) return "pass";
  return "uncertain";
}

/** Turns the verifier's answer into the decision: item results, proof checks, outcome and rationale. */
export function interpret(
  value: VerifyOutput,
  checklist: string[],
  photos: Array<{ code: string | null; source: "camera" | "file" | null; credentials?: ContentCredentials | null }>,
  accountDoubts: string[] = [],
) {
  // Align the model's answers to the bounty's checklist by position; text must match the item.
  const items: ChecklistResult[] = checklist.map((item, i) => {
    const x = value.checklist[i];
    return x
      ? { item, passed: x.passed, reason: x.reason, confidence: x.confidence, cause: x.passed === false ? (x.cause ?? "proof") : null }
      : { item, passed: null, reason: "Not assessed.", confidence: 0 };
  });
  const proofChecks: ProofChecks | null = value.photos
    ? {
        photos: value.photos
          .slice(0, photos.length)
          .map((p, i) => ({ code: p.code, screen: p.screen, generatedOrEdited: p.generated_or_edited, source: photos[i]?.source ?? null, credentials: photos[i]?.credentials ?? null })),
        sameScene: value.same_scene ?? null,
        concerns: (value.concerns ?? []).slice(0, 5),
      }
    : null;
  const doubts = [...proofDoubts(proofChecks, photos.length, photos.map((p) => !!p.code)), ...credentialDoubts(photos.map((p) => p.credentials ?? null)), ...accountDoubts];
  const result = decide(items, checklist, doubts);
  const rationale = result === "uncertain" && doubts.length ? `${value.summary} Sent to the owner because: ${doubts.join(" ")}` : value.summary;
  return { items, proofChecks, result, rationale, doubts };
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
  const challengeIds = ordered.map((p) => p.challengeId).filter((x): x is string => !!x);
  const challenges = challengeIds.length ? await database.select().from(proofChallenges).where(inArray(proofChallenges.id, challengeIds)) : [];
  const codeFor = (p: (typeof ordered)[number]) => challenges.find((c) => c.id === p.challengeId)?.code ?? null;
  const r = await ai().verifyProof(
    {
      bounty: { title: b.title, instructions: b.instructions, acceptanceChecklist: b.acceptanceChecklist, product: b.product ?? null },
      photos: ordered.map((p) => ({ label: b.deliverables[p.slot ?? 0]?.description ?? "Proof photo", base64: p.bytes.toString("base64"), challengeCode: codeFor(p) })),
      notes: s.notes,
      distanceMeters: s.location ? distanceMeters(s.location, b.location) : null,
    },
    { bountyId: b.id, submissionId },
  );

  let items: ChecklistResult[];
  let rationale: string;
  let result: Outcome;
  let proofChecks: ProofChecks | null = null;
  if (r.ok) {
    const [w] = await database.select({ verified: users.paypalVerified }).from(users).where(eq(users.id, s.workerId));
    const accountDoubts = w?.verified === false ? ["The worker's PayPal account isn't verified yet, so their pay waits for your review."] : [];
    ({ items, proofChecks, result, rationale } = interpret(r.value, b.acceptanceChecklist, ordered.map((p) => ({ code: codeFor(p), source: p.captureSource ?? null, credentials: p.contentCredentials ?? null })), accountDoubts));
  } else {
    items = b.acceptanceChecklist.map((item) => ({ item, passed: null, reason: "Automatic check unavailable.", confidence: 0 }));
    result = "uncertain";
    rationale = "Hail couldn't check this proof automatically, so the owner will review it. If they don't respond in time, the worker is paid.";
  }
  const confidence = items.length ? Math.min(...items.map((x) => x.confidence ?? 0)) : 0;

  const after = await database.transaction(async (tx) => {
    const [cur] = await tx.select().from(bounties).where(eq(bounties.id, b.id)).for("update");
    if (cur.status !== "verifying") return null;
    await tx.insert(verifications).values({ submissionId, result, checklistResults: items, proofChecks, rationale, confidence, model: r.model, promptVersion: r.promptVersion });
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
