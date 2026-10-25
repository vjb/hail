import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

// Design lab round 1 regressions: phone layouts and going offline (DL-1-01, -02, -03, -08).

const phone = { width: 390, height: 844 };

async function noSidewaysScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, "page is wider than the screen").toBeLessThanOrEqual(client + 1);
}

test("owner pages fit a phone screen; wide tables scroll inside their card", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: phone })).newPage();
  await signInAs(page, "owner");
  for (const path of ["/owner", "/owner/tasks", "/owner/keys", "/owner/balance", "/owner/approvals", "/owner/policy"]) {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await noSidewaysScroll(page);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeInViewport();
  }
});

test("worker account fits a small phone, long PayPal email included (DL-2-01)", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  await signInAs(page, "worker1");
  await page.goto("/work/settings");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await noSidewaysScroll(page);
});

test("on a phone, the claim button never sits on top of the task details", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: phone })).newPage();
  await signInAs(page, "worker1");
  await page.goto("/work");
  await page.locator(".task-card").first().click();
  await page.getByRole("heading", { name: "Before you claim" }).waitFor();
  await noSidewaysScroll(page);
  // The bar is opaque, so text scrolled under it is hidden, not overlapped.
  const bg = await page.locator(".claim-bar").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  // Scrolled to the end, the last checklist item is fully above the bar.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const lastItem = page.locator(".checklist li").last();
  const [item, bar] = await Promise.all([lastItem.boundingBox(), page.locator(".claim-bar").boundingBox()]);
  expect(item!.y + item!.height).toBeLessThanOrEqual(bar!.y + 1);
});

test("worker task cards: the pay sits top-right on every card", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: phone })).newPage();
  await signInAs(page, "worker1");
  await page.goto("/work");
  const cards = page.locator(".task-card");
  await cards.first().waitFor();
  const n = Math.min(await cards.count(), 4);
  for (let i = 0; i < n; i++) {
    const [card, pay, title] = await Promise.all([cards.nth(i).boundingBox(), cards.nth(i).locator(".task-pay").boundingBox(), cards.nth(i).locator("h2").boundingBox()]);
    expect(pay!.y).toBeLessThanOrEqual(title!.y + 4);
    expect(pay!.x + pay!.width).toBeGreaterThan(card!.x + card!.width - 40);
  }
});

test("going offline keeps the worker on the page with a notice", async ({ browser }) => {
  const context = await browser.newContext({ viewport: phone });
  const page = await context.newPage();
  await signInAs(page, "worker1");
  await page.goto("/work"); // polls in the background
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await context.setOffline(true);
  await expect(page.getByText("You're offline.")).toBeVisible();
  await page.waitForTimeout(16_000); // longer than the page's 15 s background refresh
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/work");
  // DL-2-06: a form sent while offline is held on the page instead of opening the browser's error page.
  await page.evaluate(() => {
    const f = document.createElement("form");
    f.method = "post";
    f.action = "/work";
    document.body.appendChild(f);
    f.requestSubmit();
  });
  await page.waitForTimeout(1000);
  expect(new URL(page.url()).pathname).toBe("/work");
  await expect(page.getByText("You're offline.")).toBeFocused();
  await context.setOffline(false);
  await expect(page.getByText("You're offline.")).toBeHidden();
});
