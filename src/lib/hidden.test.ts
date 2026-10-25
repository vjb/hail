import { describe, expect, it } from "vitest";
import { redactHidden, redactResults } from "./hidden";

describe("hidden values never reach the worker (D-034)", () => {
  it("masks the value however it's spelled", () => {
    const exp = [null, "X1-009871"];
    expect(redactHidden("Plate reads X1-004512, but the listing says X1-009871.", exp)).toBe("Plate reads X1-004512, but the listing says [the listing's value].");
    expect(redactHidden("expected x1 009871", exp)).toBe("expected [the listing's value]");
    expect(redactHidden("Matches the listing.", exp)).toBe("Matches the listing.");
  });
  it("leaves text alone without hidden values, and skips values too short to mask safely", () => {
    expect(redactHidden("Reads X1.", null)).toBe("Reads X1.");
    expect(redactHidden("on", ["on"])).toBe("on");
  });
  it("masks checklist reasons", () => {
    expect(redactResults([{ item: "Serial", passed: false, reason: "Not X1-009871.", confidence: 0.9 }], ["X1-009871"])[0].reason).toBe("Not [the listing's value].");
  });
});
