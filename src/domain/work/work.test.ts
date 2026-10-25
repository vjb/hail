import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { setAIProvider } from "@/ai";
import { closeDb, db } from "@/db/client";
import { bounties, claims, photos, proofChallenges } from "@/db/schema";
import { createBounty } from "@/domain/bounty/service";
import { createApiKey } from "@/domain/keys/keys";
import { creditTopup } from "@/domain/ledger/ledger";
import { makeUser, snapProof } from "../../../tests/helpers";
import { addProofPhoto, claimBounty, expireOverdueClaims, issueChallenge, newChallengeCode, releaseClaim, submitProof } from "./work";

afterAll(() => closeDb());

const jpeg = () => sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#c0a060" } }).jpeg().toBuffer();

async function openBounty() {
  const ownerId = await makeUser("owner");
  await db().transaction((t) => creditTopup(t, ownerId, 10000, "CAP-" + ownerId));
  const key = await createApiKey(db(), { ownerId, name: "t", dailyCapCents: 100000 });
  const b = await createBounty(db(), { ownerId, apiKeyId: key.id, dailyCapCents: 100000, actor: "agent:t" }, {
    title: "Photograph a sign",
    instructions: "Photograph the sign and the door.",
    deliverables: [{ type: "photo", description: "Sign" }, { type: "photo", description: "Door" }, { type: "text", description: "Opening hours" }],
    acceptanceChecklist: ["Sign readable"],
    rewardCents: 1500,
    expiresInMinutes: 120,
    spots: 1,
  });
  return b.id;
}

const worker = (email: string | null = "w@example.com") => makeUser("worker", { paypalEmail: email });

describe("worker flow", () => {
  it("can't claim without a PayPal email", async () => {
    const id = await openBounty();
    const w = await worker(null);
    await expect(claimBounty(db(), w, id)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("claim reserves the task for one worker; a second worker can't take it", async () => {
    const id = await openBounty();
    const [a, b] = await Promise.all([worker(), worker()]);
    const r = await Promise.allSettled([claimBounty(db(), a, id), claimBounty(db(), b, id)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const [row] = await db().select().from(bounties).where(eq(bounties.id, id));
    expect(row.status).toBe("claimed");
  });

  it("a worker holds one task at a time", async () => {
    const [x, y] = [await openBounty(), await openBounty()];
    const w = await worker();
    await claimBounty(db(), w, x);
    await expect(claimBounty(db(), w, y)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("an expired claim reopens the task", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    await db().update(claims).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(claims.id, claimId));
    await expireOverdueClaims(db());
    const [row] = await db().select().from(bounties).where(eq(bounties.id, id));
    expect(row.status).toBe("open");
    await expect(snapProof(db(), w, claimId, 0, await jpeg())).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("releasing gives the task back", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    await releaseClaim(db(), w, claimId);
    const [row] = await db().select().from(bounties).where(eq(bounties.id, id));
    expect(row.status).toBe("open");
  });

  it("photos are resized to at most 1600px JPEG and checked", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    const r = await snapProof(db(), w, claimId, 0, await jpeg());
    expect(r.check.usable).toBe(true);
    const meta = await sharp((await db().query.photos.findFirst({ where: (p, { eq: e }) => e(p.id, r.photoId) }))!.bytes).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);
    expect(meta.format).toBe("jpeg");
  });

  it("a photo that needs a retake extends the reservation", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId, expiresAt } = await claimBounty(db(), w, id);
    setAIProvider({
      name: "retake",
      screenBounty: async () => ({ ok: true, model: "f", promptVersion: "f", value: { decision: "allow", category: "place_photo", rationale: "ok", confidence: 0.95 } }),
      checkPhoto: async () => ({ ok: true, model: "f", promptVersion: "f", value: { usable: false, problems: ["sign is blurry"], retake_hint: "Hold still and tap to focus." } }),
      verifyProof: async () => ({ ok: false, error: "n/a", model: "f", promptVersion: "f" }),
    });
    const r = await snapProof(db(), w, claimId, 0, await jpeg());
    expect(r.check.usable).toBe(false);
    expect(r.extendedTo!.getTime()).toBeGreaterThan(expiresAt.getTime());
  });

  it("submit needs every photo and text, then the task is verifying", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    await snapProof(db(), w, claimId, 0, await jpeg());
    await expect(submitProof(db(), w, claimId, { texts: { 2: "9-5" } })).rejects.toThrow(/Door/);
    await snapProof(db(), w, claimId, 1, await jpeg());
    await expect(submitProof(db(), w, claimId, {})).rejects.toThrow(/Opening hours/);
    await submitProof(db(), w, claimId, { texts: { 2: "9am to 5pm" } });
    const [row] = await db().select().from(bounties).where(eq(bounties.id, id));
    expect(row.status).toBe("verifying");
  });

  it("only photo slots can take photos, and only the claimant can add them", async () => {
    const id = await openBounty();
    const w = await worker();
    const other = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    await expect(snapProof(db(), w, claimId, 2, await jpeg())).rejects.toMatchObject({ code: "invalid_request" });
    await expect(snapProof(db(), other, claimId, 0, await jpeg())).rejects.toMatchObject({ code: "not_found" });
    await expect(snapProof(db(), w, claimId, 0, Buffer.from("not an image"))).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("challenge codes are short and easy to write by hand", () => {
    for (let i = 0; i < 50; i++) expect(newChallengeCode()).toMatch(/^[ACDEFHJKMNPRTUVWXY]{3}-[34679]{3}$/);
  });

  it("a photo must answer a fresh, unused challenge for its own slot", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    const c = await issueChallenge(db(), w, claimId, 0);
    expect(c.expiresAt.getTime() - Date.now()).toBeGreaterThan(100_000);
    await expect(addProofPhoto(db(), w, claimId, 1, await jpeg(), { challengeId: c.challengeId, source: "camera" })).rejects.toThrow(/isn't for this photo/);
    const r = await addProofPhoto(db(), w, claimId, 0, await jpeg(), { challengeId: c.challengeId, source: "file" });
    const [p] = await db().select().from(photos).where(eq(photos.id, r.photoId));
    expect(p.challengeId).toBe(c.challengeId);
    expect(p.captureSource).toBe("file");
    await expect(addProofPhoto(db(), w, claimId, 0, await jpeg(), { challengeId: c.challengeId, source: "camera" })).rejects.toThrow(/already used/);
    await expect(addProofPhoto(db(), w, claimId, 0, await jpeg(), { challengeId: "chl_nope", source: "camera" })).rejects.toThrow(/isn't for this photo/);
  });

  it("a photo uploaded after the challenge window is refused", async () => {
    const id = await openBounty();
    const w = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    const c = await issueChallenge(db(), w, claimId, 0);
    await db().update(proofChallenges).set({ expiresAt: new Date(Date.now() - 5 * 60_000) }).where(eq(proofChallenges.id, c.challengeId));
    await expect(addProofPhoto(db(), w, claimId, 0, await jpeg(), { challengeId: c.challengeId, source: "camera" })).rejects.toThrow(/ran out of time/);
  });

  it("only the claimant can get a challenge, and only for a photo slot", async () => {
    const id = await openBounty();
    const w = await worker();
    const other = await worker();
    const { claimId } = await claimBounty(db(), w, id);
    await expect(issueChallenge(db(), other, claimId, 0)).rejects.toMatchObject({ code: "not_found" });
    await expect(issueChallenge(db(), w, claimId, 2)).rejects.toMatchObject({ code: "invalid_request" });
  });
});
