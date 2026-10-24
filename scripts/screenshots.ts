/**
 * Captures every screen in e2e/screens.ts at 1440×900 and 390×844, light and dark, full page.
 * Output: screenshots/<date>-run<N>/<slug>__<width>__<theme>.png + index.md (user-facing names only).
 * Usage: npm run screenshots   (needs the app running at E2E_BASE_URL, default http://localhost:3000)
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import { credentials, type DemoRole } from "../e2e/helpers";
import { screens, type ScreenRole } from "../e2e/screens";

const base = process.env.E2E_BASE_URL || "http://localhost:3000";
const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;
const themes = ["light", "dark"] as const;

function outDir() {
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const root = path.resolve("screenshots");
  mkdirSync(root, { recursive: true });
  const runs = readdirSync(root).filter((d) => d.startsWith(`${date}-run`)).length;
  const dir = path.join(root, `${date}-run${runs + 1}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function contextFor(browser: Browser, role: ScreenRole, size: (typeof sizes)[number], theme: (typeof themes)[number]) {
  const ctx = await browser.newContext({ baseURL: base, viewport: size, colorScheme: theme, deviceScaleFactor: 1 });
  if (role !== "public") {
    const { email, password } = credentials(role as DemoRole);
    const page = await ctx.newPage();
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
    await page.close();
  }
  return ctx;
}

// Hide anything that could leak secrets or non-demo personal data before capture.
const MASK_CSS = `[data-secret]{filter:blur(6px)!important} nextjs-portal{display:none!important}`;

async function main() {
  const dir = outDir();
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
  const lines: string[] = [`# Hail screens — ${path.basename(dir)}`, "", "Each screen is captured on desktop (1440 wide) and phone (390 wide), in light and dark themes.", ""];
  const contexts = new Map<string, BrowserContext>();
  try {
    for (const s of screens) {
      lines.push(`## ${s.name}`, "", s.description, "", `Page: \`${s.path}\``, "");
      for (const size of sizes) {
        for (const theme of themes) {
          const key = `${s.role}|${size.width}|${theme}`;
          if (!contexts.has(key)) contexts.set(key, await contextFor(browser, s.role, size, theme));
          const page = await contexts.get(key)!.newPage();
          await page.goto(s.path, { waitUntil: "networkidle" }).catch(() => page.goto(s.path));
          if (s.prepare) await s.prepare(page);
          await page.addStyleTag({ content: MASK_CSS });
          await page.waitForTimeout(300);
          const file = `${s.slug}__${size.width}__${theme}.png`;
          await page.screenshot({ path: path.join(dir, file), fullPage: true });
          lines.push(`- ${size.width === 1440 ? "Desktop" : "Phone"}, ${theme}: \`${file}\``);
          await page.close();
        }
      }
      lines.push("");
      console.log(`captured ${s.slug}`);
    }
  } finally {
    for (const c of contexts.values()) await c.close();
    await browser.close();
  }
  writeFileSync(path.join(dir, "index.md"), lines.join("\n"));
  console.log(`\n${screens.length * 4} screenshots → ${dir}`);
  if (!existsSync(path.join(dir, "index.md"))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
