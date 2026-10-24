import { describe, expect, it } from "vitest";
import { bountyStatusEnum } from "@/db/schema";
import { HOLDS_FUNDS, IllegalTransitionError, nextStatus, TERMINAL, TRANSITIONS, type BountyEvent, type BountyStatus } from "./state";

const ALL_STATUSES = bountyStatusEnum.enumValues as readonly BountyStatus[];
const ALL_EVENTS = Object.keys(TRANSITIONS) as BountyEvent[];

// The architecture diagram, written out independently of the implementation table.
const EXPECTED: Array<[BountyStatus, BountyEvent, BountyStatus]> = [
  ["created", "screen_start", "screening"],
  ["screening", "screen_allow", "open"],
  ["screening", "screen_needs_approval", "pending_approval"],
  ["screening", "screen_block", "blocked"],
  ["pending_approval", "owner_approve", "open"],
  ["pending_approval", "owner_reject", "rejected_by_owner"],
  ["open", "cancel", "cancelled"],
  ["pending_approval", "cancel", "cancelled"],
  ["open", "claim", "claimed"],
  ["claimed", "claim_expire", "open"],
  ["claimed", "submit", "verifying"],
  ["verifying", "verify_pass", "approved"],
  ["verifying", "verify_fail", "rejected"],
  ["verifying", "verify_uncertain", "needs_owner_review"],
  ["needs_owner_review", "review_approve", "approved"],
  ["needs_owner_review", "review_reject", "rejected"],
  ["needs_owner_review", "review_lapse", "approved"],
  ["rejected", "appeal", "appealed"],
  ["appealed", "appeal_approve", "approved"],
  ["appealed", "appeal_reject", "open"],
  ["appealed", "appeal_lapse", "approved"],
  ["rejected", "reopen", "open"],
  ["approved", "start_payout", "paying"],
  ["paying", "payout_succeeded", "paid"],
  ["open", "expire", "expired"],
  ["claimed", "expire", "expired"],
  ["rejected", "expire", "expired"],
  ["pending_approval", "expire", "expired"],
];

describe("bounty state machine", () => {
  it.each(EXPECTED)("%s --%s--> %s", (from, event, to) => {
    expect(nextStatus(from, event)).toBe(to);
  });

  it("every other (status, event) pair is rejected", () => {
    const legal = new Set(EXPECTED.map(([f, e]) => `${f}|${e}`));
    let rejected = 0;
    for (const s of ALL_STATUSES) {
      for (const e of ALL_EVENTS) {
        if (legal.has(`${s}|${e}`)) continue;
        expect(() => nextStatus(s, e), `${s} --${e}-->`).toThrow(IllegalTransitionError);
        rejected++;
      }
    }
    expect(rejected).toBe(ALL_STATUSES.length * ALL_EVENTS.length - EXPECTED.length);
  });

  it("terminal statuses have no way out", () => {
    for (const s of TERMINAL) for (const e of ALL_EVENTS) expect(() => nextStatus(s, e)).toThrow(IllegalTransitionError);
  });

  it("the implementation table has exactly the documented transitions", () => {
    const impl = ALL_EVENTS.flatMap((e) => TRANSITIONS[e].from.map((f) => `${f}|${e}|${TRANSITIONS[e].to}`)).sort();
    expect(impl).toEqual(EXPECTED.map((t) => t.join("|")).sort());
  });

  it("a claimed bounty can't be cancelled (worker protection)", () => {
    expect(() => nextStatus("claimed", "cancel")).toThrow(IllegalTransitionError);
    expect(() => nextStatus("verifying", "cancel")).toThrow(IllegalTransitionError);
  });

  it("funds are held exactly in the non-terminal post-screening statuses", () => {
    for (const s of ALL_STATUSES) {
      const expectedHeld = !TERMINAL.includes(s) && s !== "created" && s !== "screening";
      expect(HOLDS_FUNDS.includes(s), s).toBe(expectedHeld);
    }
  });
});
