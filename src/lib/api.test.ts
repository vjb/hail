import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { DomainError } from "@/domain/bounty/service";
import { createApiKey } from "@/domain/keys/keys";
import { makeUser } from "../../tests/helpers";
import { apiJson, withIdempotency } from "./api";

afterAll(() => closeDb());

async function key() {
  const ownerId = await makeUser("owner");
  const { id } = await createApiKey(db(), { ownerId, name: "t", dailyCapCents: 10_000 });
  const [rec] = await db().select().from(apiKeys).where(eq(apiKeys.id, id));
  return rec;
}
const req = (idem: string) => new Request("http://x/api/v1/bounties", { method: "POST", headers: { "Idempotency-Key": idem } });
const body = { title: "t" };

describe("Idempotency-Key", () => {
  it("RT-051: a rate-limited attempt isn't saved, so the same retry runs again", async () => {
    const k = await key();
    await expect(withIdempotency(req("idem-1"), k, "/bounties", body, async () => { throw new DomainError("rate_limited", "Try again later."); })).rejects.toMatchObject({ code: "rate_limited" });
    const res = await withIdempotency(req("idem-1"), k, "/bounties", body, async () => apiJson({ id: "bty_1" }, 201));
    expect(res.status).toBe(201);
  });

  it("insufficient funds isn't saved either (the owner may top up)", async () => {
    const k = await key();
    await expect(withIdempotency(req("idem-2"), k, "/bounties", body, async () => { throw new DomainError("insufficient_funds", "Low balance."); })).rejects.toMatchObject({ code: "insufficient_funds" });
    expect((await withIdempotency(req("idem-2"), k, "/bounties", body, async () => apiJson({ id: "bty_2" }, 201))).status).toBe(201);
  });

  it("a success is replayed, and the handler doesn't run twice", async () => {
    const k = await key();
    let runs = 0;
    const fn = async () => { runs++; return apiJson({ id: "bty_3" }, 201); };
    await withIdempotency(req("idem-3"), k, "/bounties", body, fn);
    const again = await withIdempotency(req("idem-3"), k, "/bounties", body, fn);
    expect(runs).toBe(1);
    expect(await again.json()).toEqual({ id: "bty_3" });
  });

  it("a validation error stays final, and a different body is a conflict", async () => {
    const k = await key();
    await expect(withIdempotency(req("idem-4"), k, "/bounties", body, async () => { throw new DomainError("invalid_request", "Bad."); })).rejects.toMatchObject({ code: "invalid_request" });
    const replay = await withIdempotency(req("idem-4"), k, "/bounties", body, async () => apiJson({ id: "never" }, 201));
    expect(replay.status).toBe(400);
    await expect(withIdempotency(req("idem-4"), k, "/bounties", { title: "other" }, async () => apiJson({}, 201))).rejects.toMatchObject({ code: "idempotency_conflict" });
  });
});
