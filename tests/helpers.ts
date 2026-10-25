import { db, type DB } from "@/db/client";
import { users } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function makeUser(role: "owner" | "worker" | "admin" = "owner", extra: Partial<typeof users.$inferInsert> = {}) {
  const id = newId("usr");
  await db()
    .insert(users)
    .values({ id, role, name: `${role} ${id}`, email: `${id}@test.hail`, passwordHash: "x", ...extra });
  return id;
}

/** Takes a proof photo the way the app does: issue a challenge for the slot, then upload against it. */
export async function snapProof(database: DB, workerId: string, claimId: string, slot: number, file: Buffer, opts: { secondsAfterCode?: number } = {}) {
  const { issueChallenge, addProofPhoto } = await import("@/domain/work/work");
  const { proofChallenges } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const c = await issueChallenge(database, workerId, claimId, slot);
  // A person takes a while to write the code and take the photo; pretend this one did (D-036).
  const secs = opts.secondsAfterCode ?? 30;
  await database.update(proofChallenges).set({ issuedAt: new Date(Date.now() - secs * 1000) }).where(eq(proofChallenges.id, c.challengeId));
  return addProofPhoto(database, workerId, claimId, slot, file, { challengeId: c.challengeId, source: "camera" });
}

/** A photo no other test uses: random large color blocks, so each has its own stable fingerprint (D-033). */
export async function uniquePhoto(width = 800, height = 600) {
  const sharp = (await import("sharp")).default;
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const color = () => `rgb(${rnd(256)},${rnd(256)},${rnd(256)})`;
  const blocks = Array.from({ length: 10 }, () => {
    const w = Math.round(width * (0.15 + Math.random() * 0.35));
    const h = Math.round(height * (0.15 + Math.random() * 0.35));
    return `<rect x="${rnd(width - w)}" y="${rnd(height - h)}" width="${w}" height="${h}" fill="${color()}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color()}"/>${blocks}</svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}
