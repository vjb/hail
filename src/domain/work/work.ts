import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import sharp from "sharp";
import { ai } from "@/ai";
import type { DB } from "@/db/client";
import { bounties, claims, photos, submissions, users, verifications, type PhotoCheck } from "@/db/schema";
import { DomainError } from "@/domain/bounty/service";
import { transition } from "@/domain/bounty/state";
import { newId } from "@/lib/ids";
import { fromNow, scaled, WINDOWS } from "@/lib/time";

// The worker side: browse, claim (with a countdown), capture proof (per-photo quick check with
// retake), submit. Verification and payout continue from `verifying` (Day 7).

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1600;

/** Open bounties a worker can claim: open, not expired, newest first. */
export async function listOpenBounties(database: DB) {
  return database
    .select()
    .from(bounties)
    .where(and(eq(bounties.status, "open"), gt(bounties.expiresAt, new Date())))
    .orderBy(desc(bounties.createdAt))
    .limit(50);
}

export async function getWorker(database: DB, workerId: string) {
  const [u] = await database.select().from(users).where(and(eq(users.id, workerId), eq(users.role, "worker")));
  if (!u) throw new DomainError("forbidden", "Only workers can do that.");
  return u;
}

/** Expires overdue active claims and reopens their bounties. Idempotent; also run by the sweeper. */
export async function expireOverdueClaims(database: DB, now = new Date()) {
  const overdue = await database
    .select({ id: claims.id, bountyId: claims.bountyId })
    .from(claims)
    .where(and(eq(claims.status, "active"), lte(claims.expiresAt, now)));
  for (const c of overdue) {
    await database.transaction(async (tx) => {
      const [row] = await tx.select().from(claims).where(eq(claims.id, c.id)).for("update");
      if (!row || row.status !== "active" || row.expiresAt > now) return;
      await tx.update(claims).set({ status: "expired" }).where(eq(claims.id, c.id));
      const [b] = await tx.select({ status: bounties.status }).from(bounties).where(eq(bounties.id, c.bountyId));
      if (b?.status === "claimed") await transition(tx, c.bountyId, "claim_expire", "sweeper", { rationale: "The worker's reservation ran out before they submitted, so the task reopened." });
    });
  }
  return overdue.length;
}

export async function activeClaimFor(database: DB, workerId: string) {
  await expireOverdueClaims(database);
  const [c] = await database
    .select()
    .from(claims)
    .where(and(eq(claims.workerId, workerId), eq(claims.status, "active")))
    .limit(1);
  if (!c) return null;
  const [b] = await database.select().from(bounties).where(eq(bounties.id, c.bountyId));
  const shots = await database
    .select({ id: photos.id, slot: photos.slot, check: photos.check, createdAt: photos.createdAt })
    .from(photos)
    .where(eq(photos.claimId, c.id))
    .orderBy(asc(photos.createdAt));
  return { claim: c, bounty: b, photos: shots };
}

/** Reserves an open bounty for one worker. A worker holds at most one active claim. */
export async function claimBounty(database: DB, workerId: string, bountyId: string) {
  const worker = await getWorker(database, workerId);
  if (!worker.paypalEmail) throw new DomainError("invalid_state", "Add your PayPal email before claiming a task, so we know where to pay you.");
  await expireOverdueClaims(database);
  return database.transaction(async (tx) => {
    const [mine] = await tx.select({ id: claims.id }).from(claims).where(and(eq(claims.workerId, workerId), eq(claims.status, "active")));
    if (mine) throw new DomainError("invalid_state", "You already have a task reserved. Finish or release it first.");
    const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!b) throw new DomainError("not_found", "That task doesn't exist.");
    if (b.status !== "open") throw new DomainError("invalid_state", "Someone else just claimed this task, or it's no longer open.");
    if (b.expiresAt <= new Date()) throw new DomainError("invalid_state", "This task has expired.");
    const id = newId("clm");
    const expiresAt = new Date(Math.min(fromNow(WINDOWS.claim).getTime(), b.expiresAt.getTime()));
    await tx.insert(claims).values({ id, bountyId, workerId, expiresAt });
    await transition(tx, bountyId, "claim", `worker:${workerId}`, { claimId: id });
    return { claimId: id, expiresAt };
  });
}

/** The worker gives a task back before submitting; it reopens immediately. */
export async function releaseClaim(database: DB, workerId: string, claimId: string) {
  return database.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, claimId)).for("update");
    if (!c || c.workerId !== workerId) throw new DomainError("not_found", "That reservation doesn't exist.");
    if (c.status !== "active") throw new DomainError("invalid_state", "That reservation already ended.");
    await tx.update(claims).set({ status: "released" }).where(eq(claims.id, claimId));
    await transition(tx, c.bountyId, "claim_expire", `worker:${workerId}`, { rationale: "The worker gave the task back, so it reopened." });
  });
}

async function ownActiveClaim(database: DB, workerId: string, claimId: string) {
  const [c] = await database.select().from(claims).where(eq(claims.id, claimId));
  if (!c || c.workerId !== workerId) throw new DomainError("not_found", "That reservation doesn't exist.");
  if (c.status !== "active" || c.expiresAt <= new Date()) throw new DomainError("invalid_state", "Your reservation has ended, so this task can't take new proof.");
  const [b] = await database.select().from(bounties).where(eq(bounties.id, c.bountyId));
  return { claim: c, bounty: b };
}

/** Resizes to ≤1600px JPEG, strips metadata (location is collected separately, with consent). */
export async function normalizePhoto(input: Buffer) {
  if (input.length > MAX_PHOTO_BYTES) throw new DomainError("invalid_request", "That photo is too large. Photos can be up to 12 MB.");
  try {
    const img = sharp(input, { failOn: "error" }).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
    const { data, info } = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    return { bytes: data, width: info.width, height: info.height };
  } catch {
    throw new DomainError("invalid_request", "That file isn't a photo we can read. Try taking it again.");
  }
}

/**
 * Stores a proof photo for one deliverable slot and runs the quick check. If the check finds a
 * problem, the worker gets a retake prompt and the reservation is extended (up to 3 times).
 */
export async function addProofPhoto(database: DB, workerId: string, claimId: string, slot: number, file: Buffer) {
  const { claim, bounty } = await ownActiveClaim(database, workerId, claimId);
  const deliverable = bounty.deliverables[slot];
  if (!deliverable || deliverable.type !== "photo") throw new DomainError("invalid_request", "That photo slot doesn't exist for this task.");
  const norm = await normalizePhoto(file);
  const id = newId("ph");
  await database.insert(photos).values({ id, ownerUserId: workerId, claimId, slot, mime: "image/jpeg", width: norm.width, height: norm.height, bytes: norm.bytes });

  const r = await ai().checkPhoto(
    {
      bounty: { title: bounty.title, instructions: bounty.instructions, acceptanceChecklist: bounty.acceptanceChecklist, product: bounty.product ?? null },
      item: deliverable.description,
      image: { mime: "image/jpeg", base64: norm.bytes.toString("base64") },
    },
    { bountyId: bounty.id },
  );
  // If the quick check is unavailable, don't block the worker: the full verification still runs on submit.
  const check: PhotoCheck = r.ok
    ? { usable: r.value.usable, problems: r.value.problems.slice(0, 4), retakeHint: r.value.retake_hint, model: r.model }
    : { usable: true, problems: [], retakeHint: "", model: "unavailable" };
  await database.update(photos).set({ check }).where(eq(photos.id, id));

  let extendedTo: Date | null = null;
  if (!check.usable && claim.extensions < 3) {
    extendedTo = new Date(Math.min(claim.expiresAt.getTime() + scaled(WINDOWS.claimRetakeExtension), bounty.expiresAt.getTime()));
    await database.update(claims).set({ expiresAt: extendedTo, extensions: sql`${claims.extensions} + 1` }).where(eq(claims.id, claimId));
  }
  return { photoId: id, check, extendedTo };
}

export type SubmitInput = { notes?: string; texts?: Record<number, string>; location?: { lat: number; lng: number; accuracy_m?: number } | null };

/** Final submit: the latest photo per photo slot, text answers, optional location → verifying. */
export async function submitProof(database: DB, workerId: string, claimId: string, input: SubmitInput) {
  const { bounty } = await ownActiveClaim(database, workerId, claimId);
  const shots = await database.select({ id: photos.id, slot: photos.slot, createdAt: photos.createdAt }).from(photos).where(eq(photos.claimId, claimId)).orderBy(desc(photos.createdAt));
  const latest = new Map<number, string>();
  for (const s of shots) if (s.slot !== null && !latest.has(s.slot)) latest.set(s.slot, s.id);

  const missing: string[] = [];
  const textParts: string[] = [];
  bounty.deliverables.forEach((d, i) => {
    if (d.type === "photo" && !latest.has(i)) missing.push(d.description);
    if (d.type === "text") {
      const v = input.texts?.[i]?.trim();
      if (!v) missing.push(d.description);
      else textParts.push(`${d.description}: ${v}`);
    }
    if (d.type === "location" && !input.location) missing.push(d.description);
  });
  if (missing.length) throw new DomainError("invalid_request", `Still needed: ${missing.join("; ")}.`);

  const notes = [textParts.join("\n"), input.notes?.trim()].filter(Boolean).join("\n\n").slice(0, 4000) || null;
  return database.transaction(async (tx) => {
    const [c] = await tx.select().from(claims).where(eq(claims.id, claimId)).for("update");
    if (!c || c.status !== "active") throw new DomainError("invalid_state", "Your reservation has ended.");
    const id = newId("sub");
    const photoIds = bounty.deliverables.map((_, i) => latest.get(i)).filter((x): x is string => !!x);
    await tx.insert(submissions).values({ id, claimId, bountyId: bounty.id, workerId, photoIds, notes, location: input.location ?? null });
    await tx.update(claims).set({ status: "submitted" }).where(eq(claims.id, claimId));
    await transition(tx, bounty.id, "submit", `worker:${workerId}`, { submissionId: id, photos: photoIds.length });
    return { submissionId: id };
  });
}

/** Everything a worker has submitted, newest first, with the bounty and its latest verification. */
export async function workerHistory(database: DB, workerId: string) {
  const subs = await database.select().from(submissions).where(eq(submissions.workerId, workerId)).orderBy(desc(submissions.createdAt)).limit(50);
  if (!subs.length) return [];
  const bs = await database.select().from(bounties).where(inArray(bounties.id, subs.map((s) => s.bountyId)));
  const vs = await database.select().from(verifications).where(inArray(verifications.submissionId, subs.map((s) => s.id))).orderBy(desc(verifications.id));
  return subs.map((s) => ({ submission: s, bounty: bs.find((b) => b.id === s.bountyId)!, verification: vs.find((v) => v.submissionId === s.id) ?? null }));
}

export async function setPayPalEmail(database: DB, workerId: string, email: string) {
  await getWorker(database, workerId);
  await database.update(users).set({ paypalEmail: email }).where(eq(users.id, workerId));
}

export async function readPhoto(database: DB, photoId: string) {
  const [p] = await database.select().from(photos).where(eq(photos.id, photoId));
  return p ?? null;
}

