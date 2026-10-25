import { beforeEach, describe, expect, it } from "vitest";
import { clear, clientIp, hit, isBlocked, resetRateLimits } from "./rate-limit";

const l = { limit: 3, windowMs: 60_000 };

describe("rate limits", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit in a window, then refuses with a retry time", () => {
    const t = 1_000_000;
    expect(hit("k", l, t).ok).toBe(true);
    expect(hit("k", l, t + 1).ok).toBe(true);
    expect(hit("k", l, t + 2).ok).toBe(true);
    const r = hit("k", l, t + 10_000);
    expect(r).toEqual({ ok: false, retryAfterSec: 50 });
  });

  it("starts a fresh window once the old one has passed", () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) hit("k", l, t);
    expect(hit("k", l, t + 60_000).ok).toBe(true);
  });

  it("keeps keys separate", () => {
    for (let i = 0; i < 3; i++) hit("a", l, 0);
    expect(hit("b", l, 0).ok).toBe(true);
  });

  it("isBlocked checks without counting, and clear forgets a key", () => {
    expect(isBlocked("k", l, 0).blocked).toBe(false);
    for (let i = 0; i < 3; i++) hit("k", l, 0);
    expect(isBlocked("k", l, 1_000)).toEqual({ blocked: true, retryAfterSec: 59 });
    clear("k");
    expect(isBlocked("k", l, 1_000).blocked).toBe(false);
  });

  it("reads the first forwarded IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
