// Single source of truth for Hail's color tokens (docs/06-design-system.md).
// globals.css must match these values; tests/design/contrast.test.ts enforces both.

export const colorTokens = {
  light: {
    ink: "#14161A",
    "ink-2": "#4A4F57",
    paper: "#FAF8F3",
    surface: "#FFFFFF",
    line: "#E4DFD4",
    signal: "#FFC21A",
    "signal-ink": "#14161A",
    paid: "#1F7A52",
    review: "#5B47C9",
    blocked: "#B8322A",
    neutral: "#6B7079",
  },
  dark: {
    ink: "#F4F1EA",
    "ink-2": "#B9B4AA",
    paper: "#121417",
    surface: "#1B1E22",
    line: "#2C3036",
    signal: "#FFC21A",
    "signal-ink": "#14161A",
    paid: "#4CC38A",
    review: "#9C8CF0",
    blocked: "#F07167",
    neutral: "#8D929A",
  },
} as const;

export type ColorToken = keyof (typeof colorTokens)["light"];

/** Text/background pairs the UI actually uses, with the WCAG AA minimum for each. */
export const contrastPairs: Array<{ fg: ColorToken; bg: ColorToken; min: number; use: string }> = [
  { fg: "ink", bg: "paper", min: 4.5, use: "body text on page" },
  { fg: "ink", bg: "surface", min: 4.5, use: "body text on cards" },
  { fg: "ink-2", bg: "paper", min: 4.5, use: "secondary text on page" },
  { fg: "ink-2", bg: "surface", min: 4.5, use: "secondary text on cards" },
  { fg: "signal-ink", bg: "signal", min: 4.5, use: "primary button label" },
  { fg: "paid", bg: "surface", min: 4.5, use: "paid status text" },
  { fg: "paid", bg: "paper", min: 4.5, use: "paid status text on page" },
  { fg: "review", bg: "surface", min: 4.5, use: "review status text" },
  { fg: "review", bg: "paper", min: 4.5, use: "review status text on page" },
  { fg: "blocked", bg: "surface", min: 4.5, use: "error / blocked text" },
  { fg: "blocked", bg: "paper", min: 4.5, use: "error text on page" },
  { fg: "neutral", bg: "surface", min: 4.5, use: "expired / cancelled text" },
  { fg: "neutral", bg: "paper", min: 4.5, use: "expired text on page" },
  { fg: "ink-2", bg: "surface", min: 3, use: "input borders (UI component)" },
];

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
