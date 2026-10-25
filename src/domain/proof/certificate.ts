import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { bounties, bountyEvents, photos, proofChallenges, submissions, verifications } from "@/db/schema";
import { env } from "@/lib/env";

// Proof certificate (D-026): a shareable page for an accepted result. It shows what was checked and
// how, with a SHA-256 fingerprint of each photo (the exact bytes the API serves), never the photos,
// the worker's identity or the exact place.

const ACCEPTED = ["approved", "paying", "paid"];

function sign(bountyId: string) {
  return createHmac("sha256", env().SESSION_SECRET).update(`proof-certificate:${bountyId}`).digest("base64url").slice(0, 22);
}

/** The certificate's public ID: the bounty ID plus a signature, so links can't be guessed. */
export const certificateId = (bountyId: string) => `${bountyId}.${sign(bountyId)}`;

export const certificateUrl = (bountyId: string) => `${env().APP_BASE_URL.replace(/\/$/, "")}/proof/${certificateId(bountyId)}`;

/** Returns the bounty ID for a valid certificate ID, or null. */
export function parseCertificateId(id: string): string | null {
  const dot = id.lastIndexOf(".");
  if (dot < 1) return null;
  const bountyId = id.slice(0, dot);
  const given = Buffer.from(id.slice(dot + 1));
  const expected = Buffer.from(sign(bountyId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? bountyId : null;
}

export const fingerprint = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Rounds to about 1 km so the certificate never pins down where someone was. */
const approx = (n: number) => Math.round(n * 100) / 100;

export async function loadCertificate(database: DB, bountyId: string) {
  const [b] = await database.select().from(bounties).where(eq(bounties.id, bountyId));
  if (!b || !ACCEPTED.includes(b.status)) return null;
  const [sub] = await database.select().from(submissions).where(eq(submissions.bountyId, b.id)).orderBy(desc(submissions.createdAt)).limit(1);
  if (!sub) return null;
  const [v] = await database.select().from(verifications).where(eq(verifications.submissionId, sub.id)).orderBy(desc(verifications.id)).limit(1);
  const rows = sub.photoIds.length ? await database.select().from(photos).where(inArray(photos.id, sub.photoIds)) : [];
  const ordered = sub.photoIds.map((id) => rows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
  const chIds = ordered.map((p) => p.challengeId).filter((x): x is string => !!x);
  const challenges = chIds.length ? await database.select().from(proofChallenges).where(inArray(proofChallenges.id, chIds)) : [];
  const events = await database.select().from(bountyEvents).where(eq(bountyEvents.bountyId, b.id)).orderBy(desc(bountyEvents.createdAt));
  const accepted = events.find((e) => e.toStatus === "approved");
  const byOwner = !!accepted && accepted.actor !== "verifier";
  const items = v?.checklistResults ?? b.acceptanceChecklist.map((item) => ({ item, passed: null, reason: "" }));
  return {
    bounty: { id: b.id, title: b.title, status: b.status, checklist: b.acceptanceChecklist },
    acceptedBy: byOwner ? ("owner" as const) : ("verifier" as const),
    acceptedAt: accepted?.createdAt ?? sub.createdAt,
    submittedAt: sub.createdAt,
    checklistMet: items.length > 0 && items.every((x) => x.passed === true),
    items,
    summary: v?.rationale ?? null,
    model: v?.model ?? null,
    promptVersion: v?.promptVersion ?? null,
    photos: ordered.map((p, i) => {
      const ch = challenges.find((c) => c.id === p.challengeId);
      return {
        label: b.deliverables[p.slot ?? i]?.description ?? `Photo ${i + 1}`,
        sha256: fingerprint(p.bytes),
        takenAt: p.createdAt,
        secondsAfterCode: ch ? Math.max(0, Math.round((p.createdAt.getTime() - ch.issuedAt.getTime()) / 1000)) : null,
        source: p.captureSource,
        checks: v?.proofChecks?.photos[i] ?? null,
        credentials: p.contentCredentials ?? null,
      };
    }),
    place: sub.location ? { lat: approx(sub.location.lat), lng: approx(sub.location.lng) } : null,
  };
}
