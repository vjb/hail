import { expect, test } from "@playwright/test";
import { approvePayPalPopup, expectAccessible, signInAs } from "./helpers";

const money = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, "")) * 100);

async function availableCents(page: import("@playwright/test").Page) {
  const text = await page.getByRole("banner").locator("dd").first().innerText();
  return money(text);
}

test.describe("owner top-up", () => {
  test("balance page is accessible and explains both amounts", async ({ page }) => {
    await signInAs(page, "owner");
    await page.goto("/owner/balance");
    await expect(page.getByRole("heading", { name: "Balance", level: 1 })).toBeVisible();
    await expect(page.getByText("Ready for new tasks or to withdraw.")).toBeVisible();
    await expect(page.locator("paypal-button")).toBeVisible({ timeout: 20_000 });
    await expectAccessible(page);
  });

  test("closing the PayPal popup adds nothing and says so", async ({ page }) => {
    await signInAs(page, "owner");
    await page.goto("/owner/balance");
    const before = await availableCents(page);
    await page.getByRole("radio", { name: "$25.00" }).click();
    const popupP = page.waitForEvent("popup");
    await page.locator("paypal-button").click();
    const popup = await popupP;
    await popup.waitForLoadState("domcontentloaded");
    await popup.close();
    await expect(page.getByText("You closed PayPal without paying. Nothing was added.")).toBeVisible({ timeout: 20_000 });
    await page.reload();
    expect(await availableCents(page)).toBe(before);
  });

  test("owner tops up $200 with the sandbox buyer and sees it available", async ({ page }) => {
    test.setTimeout(180_000);
    await signInAs(page, "owner");
    await page.goto("/owner/balance");
    const before = await availableCents(page);
    await page.getByRole("radio", { name: "$200.00" }).click();
    const popupP = page.waitForEvent("popup");
    await page.locator("paypal-button").click();
    const result = await approvePayPalPopup(await popupP);
    test.skip(result === "challenge", "PayPal sandbox showed a captcha/verification — raise H3 for a manual approval");
    await expect(page.getByText("$200.00 added to your balance.")).toBeVisible({ timeout: 60_000 });
    await page.reload();
    expect(await availableCents(page)).toBe(before + 20000);
    await expect(page.getByRole("table").getByText("Added with PayPal").first()).toBeVisible();
  });
});
