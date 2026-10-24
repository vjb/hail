import { eq } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { bounties, bountyEvents, callbackDeliveries } from "@/db/schema";

// The bounty state machine (docs/02-architecture.md). This table is the only place
// legal transitions are defined; every status change goes through `transition()`.

export type BountyStatus = (typeof bounties.$inferSelect)["status"];

export const TRANSITIONS = {
  screen_start: { from: ["created"], to: "screening" },
  screen_allow: { from: ["screening"], to: "open" },
  screen_needs_approval: { from: ["screening"], to: "pending_approval" },
  screen_block: { from: ["screening"], to: "blocked" },
  owner_approve: { from: ["pending_approval"], to: "open" },
  owner_reject: { from: ["pending_approval"], to: "rejected_by_owner" },
  cancel: { from: ["open", "pending_approval"], to: "cancelled" },
  claim: { from: ["open"], to: "claimed" },
  claim_expire: { from: ["claimed"], to: "open" },
  submit: { from: ["claimed"], to: "verifying" },
  verify_pass: { from: ["verifying"], to: "approved" },
  verify_fail: { from: ["verifying"], to: "rejected" },
  verify_uncertain: { from: ["verifying"], to: "needs_owner_review" },
  review_approve: { from: ["needs_owner_review"], to: "approved" },
  review_reject: { from: ["needs_owner_review"], to: "rejected" },
  review_lapse: { from: ["needs_owner_review"], to: "approved" },
  appeal: { from: ["rejected"], to: "appealed" },
  appeal_approve: { from: ["appealed"], to: "approved" },
  appeal_reject: { from: ["appealed"], to: "open" },
  appeal_lapse: { from: ["appealed"], to: "approved" },
  reopen: { from: ["rejected"], to: "open" },
  start_payout: { from: ["approved"], to: "paying" },
  payout_succeeded: { from: ["paying"], to: "paid" },
  expire: { from: ["open", "claimed", "rejected", "pending_approval"], to: "expired" },
} as const satisfies Record<string, { from: readonly BountyStatus[]; to: BountyStatus }>;

export type BountyEvent = keyof typeof TRANSITIONS;

export const TERMINAL: readonly BountyStatus[] = ["paid", "blocked", "rejected_by_owner", "expired", "cancelled"];

/** Statuses whose reward is currently held in the ledger. */
export const HOLDS_FUNDS: readonly BountyStatus[] = [
  "pending_approval",
  "open",
  "claimed",
  "verifying",
  "needs_owner_review",
  "rejected",
  "appealed",
  "approved",
  "paying",
];

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: BountyStatus,
    readonly event: BountyEvent,
  ) {
    super(`Illegal transition: ${event} from ${from}`);
    this.name = "IllegalTransitionError";
  }
}

export function nextStatus(from: BountyStatus, event: BountyEvent): BountyStatus {
  const t = TRANSITIONS[event];
  if (!(t.from as readonly BountyStatus[]).includes(from)) throw new IllegalTransitionError(from, event);
  return t.to;
}

export type Actor = `owner:${string}` | `worker:${string}` | `agent:${string}` | "system" | "screening" | "verifier" | "sweeper" | "admin";

/**
 * Applies one event to a bounty inside a transaction: locks the row, validates the move,
 * updates the status, writes the timeline row, and queues a callback if the bounty has one.
 * Side effects on money (ledger) are the caller's job, in the same transaction.
 */
export async function transition(tx: Tx, bountyId: string, event: BountyEvent, actor: Actor, detail: Record<string, unknown> = {}) {
  const [b] = await tx.select().from(bounties).where(eq(bounties.id, bountyId)).for("update");
  if (!b) throw new Error(`Unknown bounty ${bountyId}`);
  const to = nextStatus(b.status, event);
  const now = new Date();
  await tx.update(bounties).set({ status: to, updatedAt: now }).where(eq(bounties.id, bountyId));
  await tx.insert(bountyEvents).values({ bountyId, fromStatus: b.status, toStatus: to, actor, detail: { event, ...detail }, createdAt: now });
  if (b.callbackUrl && to !== "screening") {
    const payload = { event: "bounty.status_changed", bounty_id: bountyId, status: to, occurred_at: now.toISOString() };
    await tx.insert(callbackDeliveries).values({ bountyId, event: "bounty.status_changed", status: to, url: b.callbackUrl, payload });
  }
  return { ...b, status: to, updatedAt: now, previousStatus: b.status };
}
