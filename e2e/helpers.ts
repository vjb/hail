import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export type DemoRole = "owner" | "worker1" | "worker2" | "admin";

const creds: Record<DemoRole, [string, string]> = {
  owner: ["DEMO_OWNER_EMAIL", "DEMO_OWNER_PASSWORD"],
  worker1: ["DEMO_WORKER1_EMAIL", "DEMO_WORKER1_PASSWORD"],
  worker2: ["DEMO_WORKER2_EMAIL", "DEMO_WORKER2_PASSWORD"],
  admin: ["DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"],
};

export function credentials(role: DemoRole) {
  const [e, p] = creds[role];
  const email = process.env[e];
  const password = process.env[p];
  if (!email || !password) throw new Error(`${e}/${p} must be set for e2e`);
  return { email, password };
}

export async function signInAs(page: Page, role: DemoRole) {
  const { email, password } = credentials(role);
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

/** Fails on serious or critical accessibility violations. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

/**
 * Approves a PayPal sandbox checkout popup as the sandbox buyer (E2E_PAYPAL_BUYER_*).
 * If PayPal shows a captcha or extra verification, the calling test is skipped (raise H3).
 */
export async function approvePayPalPopup(popup: Page) {
  const email = process.env.E2E_PAYPAL_BUYER_EMAIL;
  const password = process.env.E2E_PAYPAL_BUYER_PASSWORD;
  if (!email || !password) throw new Error("E2E_PAYPAL_BUYER_EMAIL / _PASSWORD must be set");
  await popup.waitForLoadState("domcontentloaded");
  const emailBox = popup.locator("#email");
  await emailBox.waitFor({ timeout: 45_000 });
  await emailBox.fill(email);
  // PayPal sometimes shows email and password together, sometimes email → Next → password.
  const pw = popup.locator("#password");
  const next = popup.locator("#btnNext").or(popup.getByRole("button", { name: "Next", exact: true }));
  const login = popup.locator("#btnLogin");
  await popup.waitForTimeout(1000);
  if (await next.first().isVisible().catch(() => false)) {
    await next.first().click({ timeout: 15_000 });
  }
  await login.waitFor({ state: "visible", timeout: 30_000 });
  await pw.fill(password);
  await login.click();
  const challenge = popup.locator('iframe[title*="captcha" i], #captcha, [data-testid="challenge"]');
  const pay = popup
    .locator('#payment-submit-btn, button[data-id="payment-submit-btn"]')
    .or(popup.getByRole("button", { name: /^(Pay|Pay Now|Complete Purchase|Continue to Review Order)$/ }));
  const first = await Promise.race([
    pay.first().waitFor({ timeout: 60_000 }).then(() => "pay" as const),
    challenge.first().waitFor({ timeout: 60_000 }).then(() => "challenge" as const),
  ]);
  if (first === "challenge") return "challenge" as const;
  await pay.first().click();
  await popup.waitForEvent("close", { timeout: 60_000 });
  return "approved" as const;
}
