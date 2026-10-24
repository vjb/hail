/** Writes docs/assets/hail-wave.svg: the landing illustration with light-theme colors baked in (for the README). */
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroArt } from "../src/components/HeroArt";
import { colorTokens } from "../src/design/tokens";

const t = colorTokens.light;
const mix = (a: string, b: string, p: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [h(a), h(b)];
  return "#" + x.map((v, i) => Math.round(v * p + y[i] * (1 - p)).toString(16).padStart(2, "0")).join("");
};
const vars: Record<string, string> = {
  "--ink": t.ink,
  "--paper": t.paper,
  "--signal": t.signal,
  "--signal-ink": t["signal-ink"],
  "--hero-halo": mix(t.signal, t.paper, 0.22),
  "--hero-glow": mix(t.signal, t.paper, 0.45),
  "--hero-cheek": mix(t.blocked, t.signal, 0.45),
};
let svg = renderToStaticMarkup(<HeroArt />);
for (const [k, v] of Object.entries(vars)) svg = svg.replaceAll(`var(${k})`, v);
svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="536" ');
writeFileSync("docs/assets/hail-wave.svg", svg + "\n");
console.log(`hail-wave.svg ${Math.round(svg.length / 1024)} KB`);
