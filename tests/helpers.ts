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
export async function snapProof(database: DB, workerId: string, claimId: string, slot: number, file: Buffer) {
  const { issueChallenge, addProofPhoto } = await import("@/domain/work/work");
  const c = await issueChallenge(database, workerId, claimId, slot);
  return addProofPhoto(database, workerId, claimId, slot, file, { challengeId: c.challengeId, source: "camera" });
}
