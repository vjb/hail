import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import type { DB, Tx } from "@/db/client";
import { bounties, ledgerEntries, ownerPolicies, screenings, type BountyLocation, type Deliverable } from "@/db/schema";
import { getBalances, holdForBounty, InsufficientFundsError, releaseBounty } from "@/domain/ledger/ledger";
import { screenBounty, type ScreenResult } from "@/domain/screening/screen";
import { newId } from "@/lib/ids";
import { transition, type Actor, type BountyStatus } from "./state";

export type CreateBountyInput = {
  title: string;
  instructions: string;
  deliverables: Deliverable[];
  acceptanceChecklist: string[];
  rewardCents: number;
  expiresInMinutes: number;
  spots: number;
  location?: BountyLocation | null;
  productQuery?: string | null;
  callbackUrl?: string | null;
  agentContext?: string | null;
};

export class DomainError extends Error {
  constructor(
    readonly code: "insufficient_funds" | "rate_limited" | "invalid_state" | "not_found" | "forbidden" | "invalid_request",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

export async function getPolicy(database: DB | Tx, ownerId: string) {
  const [p] = await database.select().from(ownerPolicies).where(eq(ownerPolicies.ownerId, ownerId));
  return p ?? { ownerId, approvalThresholdCents: 5000, maxOpenBounties: 20, maxBountiesPerHour: 30, allowedCategories: [] as string[], updatedAt: new Date() };
}

/** Money set aside today (UTC) for bounties posted with this API key, excluding released ones. */
export async function spentTodayCents(database: DB | Tx, apiKeyId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [r] = await database
    .select({ total: sql<string>`coalesce(sum(${bounties.rewardCents} * ${bounties.spots}), 0)` })
    .from(bounties)
    .where(
      and(
        eq(bounties.apiKeyId, apiKeyId),
        gte(bounties.createdAt, start),
        inArray(bounties.status, ["pending_approval", "open", "claimed", "verifying", "needs_owner_review", "rejected", "appealed", "approved", "paying", "paid"]),
      ),
    );
  return Number(r.total);
}

/**
 * Posts a bounty: pre-checks funds and caps, screens it (outside any transaction, since the AI
 * call is slow), then in one transaction holds the full reward and moves it to open or
 * pending_approval. Blocked bounties are stored with no hold. If funds ran out meanwhile,
 * the unpublished draft is removed and insufficient_funds is returned.
 */
export async function createBounty(database: DB, ctx: { ownerId: string; apiKeyId: string; dailyCapCents: number; actor: Actor }, input: CreateBountyInput) {
  const totalCents = input.rewardCents * input.spots;
  const bal = await getBalances(database, ctx.ownerId);
  if (bal.availableCents < totalCents) {
    throw new DomainError("insufficient_funds", `Your available balance (${fmt(bal.availableCents)}) is less than the reward (${fmt(totalCents)}).`);
  }
  const spent = await spentTodayCents(database, ctx.apiKeyId);
  if (spent + totalCents > ctx.dailyCapCents) {
    throw new DomainError("rate_limited", `This key's daily cap is ${fmt(ctx.dailyCapCents)} and ${fmt(spent)} has been set aside today.`);
  }

  const policy = await getPolicy(database, ctx.ownerId);
  const hourAgo = new Date(Date.now() - 3600_000);
  const [{ lastHour }] = await database
    .select({ lastHour: sql<string>`count(*)` })
    .from(bounties)
    .where(and(eq(bounties.apiKeyId, ctx.apiKeyId), gte(bounties.createdAt, hourAgo)));
  if (Number(lastHour) >= policy.maxBountiesPerHour) {
    throw new DomainError("rate_limited", `This key can post ${policy.maxBountiesPerHour} bounties per hour. Try again later.`);
  }
  const [{ open }] = await database
    .select({ open: sql<string>`count(*)` })
    .from(bounties)
    .where(and(eq(bounties.ownerId, ctx.ownerId), inArray(bounties.status, ["pending_approval", "open", "claimed", "verifying", "needs_owner_review", "rejected", "appealed"])));
  if (Number(open) >= policy.maxOpenBounties) {
    throw new DomainError("rate_limited", `The owner allows at most ${policy.maxOpenBounties} open bounties at a time.`);
  }
  const id = newId("bty");
  const now = new Date();
  await database.insert(bounties).values({
    id,
    ownerId: ctx.ownerId,
    apiKeyId: ctx.apiKeyId,
    title: input.title,
    instructions: input.instructions,
    deliverables: input.deliverables,
    acceptanceChecklist: input.acceptanceChecklist,
    rewardCents: input.rewardCents,
    spots: input.spots,
    location: input.location ?? null,
    productQuery: input.productQuery ?? null,
    agentContext: input.agentContext ?? null,
    callbackUrl: input.callbackUrl ?? null,
    expiresAt: new Date(now.getTime() + input.expiresInMinutes * 60_000),
    status: "created",
  });
  await database.transaction((tx) => transition(tx, id, "screen_start", ctx.actor));

  let screen: ScreenResult;
  try {
    screen = await screenBounty({ ...input, location: input.location ?? null, policy, bountyId: id });
  } catch {
    // Never fail open: if screening itself breaks, the owner decides.
    screen = { final: { decision: "needs_owner_approval", category: "unscreened", rationale: "Automatic screening was unavailable, so the owner must approve this task." }, layers: [] };
  }

  try {
    return await database.transaction(async (tx) => {
      for (const l of screen.layers) {
        await tx.insert(screenings).values({ bountyId: id, layer: l.layer, decision: l.decision, category: l.category, rationale: l.rationale, confidence: l.confidence, model: l.model, promptVersion: l.promptVersion });
      }
      await tx.insert(screenings).values({ bountyId: id, layer: "final", decision: screen.final.decision, category: screen.final.category, rationale: screen.final.rationale, confidence: screen.final.confidence });
      await tx.update(bounties).set({ category: screen.final.category }).where(eq(bounties.id, id));
      const why = { decision: screen.final.decision, category: screen.final.category, rationale: screen.final.rationale };
      if (screen.final.decision === "block") {
        return transition(tx, id, "screen_block", "screening", why);
      }
      await holdForBounty(tx, ctx.ownerId, id, totalCents);
      return transition(tx, id, screen.final.decision === "allow" ? "screen_allow" : "screen_needs_approval", "screening", why);
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      await discardDraft(database, id);
      throw new DomainError("insufficient_funds", `Your available balance (${fmt(e.availableCents)}) is less than the reward (${fmt(e.requiredCents)}).`);
    }
    throw e;
  }
}

async function discardDraft(database: DB, id: string) {
  await database.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM callback_deliveries WHERE bounty_id = ${id}`);
    await tx.execute(sql`DELETE FROM bounty_events WHERE bounty_id = ${id}`);
    await tx.execute(sql`DELETE FROM screenings WHERE bounty_id = ${id}`);
    await tx.execute(sql`DELETE FROM bounties WHERE id = ${id} AND status IN ('created','screening')`);
  });
}

/** Statuses from which moving out releases the hold. */
const RELEASE_ON: Partial<Record<BountyStatus, string>> = { cancelled: "cancelled", rejected_by_owner: "declined by owner", expired: "expired" };

/** Applies a transition and the matching ledger release, in one transaction. */
export async function transitionWithMoney(tx: Tx, bountyId: string, event: Parameters<typeof transition>[2], actor: Actor, detail: Record<string, unknown> = {}) {
  const b = await transition(tx, bountyId, event, actor, detail);
  const memo = RELEASE_ON[b.status];
  if (memo && b.previousStatus !== "screening" && b.previousStatus !== "created") {
    await releaseBounty(tx, b.ownerId, b.id, b.rewardCents * b.spots, memo);
  }
  return b;
}

export async function cancelBounty(database: DB, ownerId: string, bountyId: string, actor: Actor) {
  return database.transaction(async (tx) => {
    const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!b) throw new DomainError("not_found", "No such bounty.");
    if (b.ownerId !== ownerId) throw new DomainError("forbidden", "This bounty belongs to another owner.");
    if (b.status !== "open" && b.status !== "pending_approval") {
      throw new DomainError("invalid_state", b.status === "cancelled" ? "This bounty is already cancelled." : `A bounty that is ${b.status.replace(/_/g, " ")} can't be cancelled.`);
    }
    return transitionWithMoney(tx, bountyId, "cancel", actor);
  });
}

/** Owner decision on a bounty the screen held for approval. Funds are already held; reject releases them. */
export async function decideApproval(database: DB, ownerId: string, bountyId: string, approve: boolean, note?: string) {
  return database.transaction(async (tx) => {
    const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
    if (!b) throw new DomainError("not_found", "No such task.");
    if (b.ownerId !== ownerId) throw new DomainError("forbidden", "This task belongs to another owner.");
    if (b.status !== "pending_approval") throw new DomainError("invalid_state", "This task no longer needs approval.");
    return transitionWithMoney(tx, bountyId, approve ? "owner_approve" : "owner_reject", `owner:${ownerId}`, note ? { note } : {});
  });
}

export async function getBountyForOwner(database: DB, ownerId: string, bountyId: string) {
  const [b] = await database.select().from(bounties).where(eq(bounties.id, bountyId));
  if (!b) throw new DomainError("not_found", "No such bounty.");
  if (b.ownerId !== ownerId) throw new DomainError("forbidden", "This bounty belongs to another owner.");
  return b;
}

export async function listBountiesForOwner(database: DB, ownerId: string, opts: { status?: BountyStatus; limit: number; cursor?: { createdAt: Date; id: string } }) {
  const conds = [eq(bounties.ownerId, ownerId)];
  if (opts.status) conds.push(eq(bounties.status, opts.status));
  if (opts.cursor) {
    conds.push(or(lt(bounties.createdAt, opts.cursor.createdAt), and(eq(bounties.createdAt, opts.cursor.createdAt), lt(bounties.id, opts.cursor.id)))!);
  }
  const rows = await database
    .select()
    .from(bounties)
    .where(and(...conds))
    .orderBy(desc(bounties.createdAt), desc(bounties.id))
    .limit(opts.limit + 1);
  const more = rows.length > opts.limit;
  return { rows: rows.slice(0, opts.limit), more };
}

export async function finalScreening(database: DB, bountyId: string) {
  const [s] = await database
    .select()
    .from(screenings)
    .where(and(eq(screenings.bountyId, bountyId), eq(screenings.layer, "final")))
    .orderBy(desc(screenings.id))
    .limit(1);
  return s ?? null;
}

export async function heldForBounty(database: DB, bountyId: string) {
  const [r] = await database
    .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amountCents}), 0)` })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.bountyId, bountyId), eq(ledgerEntries.account, "held")));
  return Number(r.total);
}
