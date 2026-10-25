import { describe, expect, it } from "vitest";
import { createBountySchema, LIMITS, toCreateInput } from "./validation";

// The MCP tool schemas advertise LIMITS; these checks keep REST validation and LIMITS in step.
const base = {
  title: "Photograph a storefront",
  instructions: "Take a clear daytime photo of the storefront.",
  deliverables: [{ type: "photo", description: "Storefront with sign" }],
  acceptance_checklist: ["Store sign is visible"],
  reward_cents: 700,
};
const ok = (patch: Record<string, unknown>) => createBountySchema.safeParse({ ...base, ...patch }).success;
const n = (count: number, make: (i: number) => unknown) => Array.from({ length: count }, (_, i) => make(i));

describe("bounty limits match validation", () => {
  it("reward", () => {
    expect(ok({ reward_cents: LIMITS.reward.min })).toBe(true);
    expect(ok({ reward_cents: LIMITS.reward.max })).toBe(true);
    expect(ok({ reward_cents: LIMITS.reward.min - 1 })).toBe(false);
    expect(ok({ reward_cents: LIMITS.reward.max + 1 })).toBe(false);
  });

  it("expiry, with its default", () => {
    expect(ok({ expires_in_minutes: LIMITS.expires.min })).toBe(true);
    expect(ok({ expires_in_minutes: LIMITS.expires.max })).toBe(true);
    expect(ok({ expires_in_minutes: LIMITS.expires.min - 1 })).toBe(false);
    expect(ok({ expires_in_minutes: LIMITS.expires.max + 1 })).toBe(false);
    expect(createBountySchema.parse(base).expires_in_minutes).toBe(LIMITS.expires.default);
  });

  it("deliverables and checklist counts", () => {
    const d = (i: number) => ({ type: "photo", description: `Photo ${i}` });
    expect(ok({ deliverables: n(LIMITS.deliverables.max, d) })).toBe(true);
    expect(ok({ deliverables: n(LIMITS.deliverables.max + 1, d) })).toBe(false);
    expect(ok({ deliverables: [] })).toBe(false);
    expect(ok({ acceptance_checklist: n(LIMITS.checklist.max, (i) => `Item ${i}`) })).toBe(true);
    expect(ok({ acceptance_checklist: n(LIMITS.checklist.max + 1, (i) => `Item ${i}`) })).toBe(false);
  });

  it("text lengths", () => {
    expect(ok({ title: "x".repeat(LIMITS.title) })).toBe(true);
    expect(ok({ title: "x".repeat(LIMITS.title + 1) })).toBe(false);
    expect(ok({ instructions: "x".repeat(LIMITS.instructions + 1) })).toBe(false);
    expect(ok({ product_query: "x".repeat(LIMITS.productQuery + 1) })).toBe(false);
  });

  it("radius", () => {
    const loc = (radius_m: number) => ({ location: { address: "1 Example Lane", lat: 40.7587, lng: -73.9851, radius_m } });
    expect(ok(loc(LIMITS.radius.min))).toBe(true);
    expect(ok(loc(LIMITS.radius.max))).toBe(true);
    expect(ok(loc(LIMITS.radius.max + 1))).toBe(false);
    // RT-2-147: the documented 100 m floor is enforced, not silently stored lower.
    expect(ok(loc(1))).toBe(false);
    expect(ok(loc(99))).toBe(false);
  });

  it("location shape (RT-2-149, RT-2-150)", () => {
    expect(ok({ location: { address: "210 Market St", lat: 39.78 } })).toBe(false);
    expect(ok({ location: { address: "210 Market St", lng: -89.65 } })).toBe(false);
    expect(ok({ location: { address: "210 Market St", radius_m: 200 } })).toBe(false);
    expect(ok({ location: { address: "210 Market St" } })).toBe(true);
    expect(ok({ location: { lat: 39.78, lng: -89.65 } })).toBe(true);
  });
});

describe("hidden values (D-034)", () => {
  it("checklist items can carry an expected value, mixed with plain strings", () => {
    expect(ok({ acceptance_checklist: ["Machine powers on", { item: "Serial matches the listing", expected: "X1-009871" }] })).toBe(true);
    // FL-13: an object without `expected` is refused, not silently treated as a plain item.
    expect(ok({ acceptance_checklist: [{ item: "Serial matches the listing" }] })).toBe(false);
    expect(ok({ acceptance_checklist: [{ item: "Serial matches the listing", value: "X1" }] })).toBe(false);
    expect(ok({ acceptance_checklist: [{ item: "Serial", expected: "x".repeat(LIMITS.expected + 1) }] })).toBe(false);
    expect(ok({ acceptance_checklist: [{ item: "", expected: "X1" }] })).toBe(false);
    expect(ok({ acceptance_checklist: [{ expected: "X1" }] })).toBe(false);
  });

  it("splits items from hidden values for storage", () => {
    const parsed = createBountySchema.parse({ ...base, acceptance_checklist: ["Powers on", { item: "Serial matches", expected: "X1-009871" }] });
    const input = toCreateInput(parsed);
    expect(input.acceptanceChecklist).toEqual(["Powers on", "Serial matches"]);
    expect(input.checklistExpected).toEqual([null, "X1-009871"]);
    expect(toCreateInput(createBountySchema.parse(base)).checklistExpected).toBeNull();
  });
});
