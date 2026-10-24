import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorTokens, contrastPairs, contrastRatio } from "@/design/tokens";

const css = readFileSync("src/app/globals.css", "utf8");

describe("design tokens", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const p of contrastPairs) {
      it(`${theme}: ${p.fg} on ${p.bg} meets ${p.min}:1 (${p.use})`, () => {
        const ratio = contrastRatio(colorTokens[theme][p.fg], colorTokens[theme][p.bg]);
        expect(ratio).toBeGreaterThanOrEqual(p.min);
      });
    }
  }

  it("globals.css declares every token with the documented value in both themes", () => {
    const light = css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)"));
    const darkMedia = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"), css.indexOf(':root[data-theme="dark"]'));
    const darkAttr = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("/* ---------- Base"));
    for (const [name, value] of Object.entries(colorTokens.light)) expect(light).toContain(`--${name}: ${value};`);
    for (const [name, value] of Object.entries(colorTokens.dark)) {
      expect(darkMedia).toContain(`--${name}: ${value};`);
      expect(darkAttr).toContain(`--${name}: ${value};`);
    }
  });

  it("no hard-coded hex colors outside the token blocks", () => {
    const rest = css.slice(css.indexOf("/* ---------- Base"));
    expect(rest.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
  });
});
