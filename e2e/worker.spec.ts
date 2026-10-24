import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { makePhoto } from "./fixtures";
import { expectAccessible, signInAs } from "./helpers";

// Day 6 gate: at 390px a seeded worker claims a task and submits two photos; it shows verifying.

test.use({ viewport: { width: 390, height: 844 } });

async function ownerKey(page: Page) {
  await signInAs(page, "owner");
  await page.goto("/owner/keys");
  await page.getByLabel("Key name").fill(`worker-e2e-${Date.now()}`);
  await page.getByRole("button", { name: "Create key" }).click();
  const key = await page.getByLabel("Your new API key").inputValue();
  await page.getByRole("button", { name: "Sign out" }).click();
  return key;
}

async function postTask(request: APIRequestContext, key: string, title: string) {
  const res = await request.post("/api/v1/bounties", {
    headers: { Authorization: `Bearer ${key}` },
    data: {
      title,
      instructions: "At the appliance shop's sidewalk display, photograph the espresso machine's serial number plate and its front panel.",
      deliverables: [
        { type: "photo", description: "Serial number plate, readable" },
        { type: "photo", description: "Front panel of the machine" },
      ],
      acceptance_checklist: ["Serial number is legible", "Front panel is visible"],
      reward_cents: 1800,
      expires_in_minutes: 240,
    },
  });
  const body = await res.json();
  expect(body.status, JSON.stringify(body.screening)).toBe("open");
  return body.id as string;
}

test("a worker claims a task on a phone and submits two photos", async ({ page, request }) => {
  test.setTimeout(240_000);
  const key = await ownerKey(page);
  const title = `Inspect espresso machine ${Date.now()}`;
  const id = await postTask(request, key, title);

  await signInAs(page, "worker1");
  // Free up the worker if an earlier run left a reservation.
  await page.goto("/work/my-task");
  const giveBack = page.getByRole("button", { name: "Give this task back" });
  if (await giveBack.isVisible().catch(() => false)) {
    await giveBack.click();
    await expect(page.getByText("You gave the task back.")).toBeVisible();
  }

  await page.goto("/work");
  await expectAccessible(page);
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.getByText("Pay set aside")).toBeVisible();
  await expect(card.getByText("2 photos")).toBeVisible();
  await card.click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before you claim" })).toBeVisible();
  await expectAccessible(page);
  // Keyboard: the claim button can be reached and pressed without a mouse.
  const claim = page.getByRole("button", { name: /^Claim and reserve/ });
  await claim.focus();
  await expect(claim).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/work\/my-task$/);
  await expect(page.getByRole("timer")).toBeVisible();
  await expectAccessible(page);

  const plate = await makePhoto("plate", ["SERIAL NO. X1-004512", "MODEL EXAMPLE X1", "230V 50Hz 1450W"]);
  const panel = await makePhoto("panel", ["ESPRESSO X1", "[ POWER ON ]", "CUP 1   CUP 2   STEAM"], "#3b2f2a");
  await page.getByLabel("Photo 1: Serial number plate, readable").setInputFiles(plate);
  await page.getByLabel("Photo 2: Front panel of the machine").setInputFiles(panel);
  // Each photo gets the quick check: either "Looks good" or a specific retake prompt.
  await expect(page.getByText(/Looks good|retake this photo/).first()).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Submit proof" })).toBeEnabled({ timeout: 90_000 });
  await page.getByLabel(/Anything else the owner should know/).fill("Shop staff said it was demo stock.");
  await page.getByRole("button", { name: "Submit proof" }).click();

  await expect(page.getByRole("heading", { name: "Checking your proof" })).toBeVisible({ timeout: 30_000 });
  const now = await (await request.get(`/api/v1/bounties/${id}`, { headers: { Authorization: `Bearer ${key}` } })).json();
  expect(["verifying", "approved", "paying", "paid", "rejected", "needs_owner_review"]).toContain(now.status);
});

test("worker account page saves a PayPal email", async ({ page }) => {
  await signInAs(page, "worker2");
  await page.goto("/work/settings");
  await expectAccessible(page);
  // Re-save the current address so the test never points payouts at a non-sandbox account.
  const field = page.getByLabel("PayPal email");
  const current = await field.inputValue();
  await field.fill(current || process.env.DEMO_WORKER2_PAYPAL_EMAIL || process.env.DEMO_WORKER1_PAYPAL_EMAIL || "");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved. Payouts will go to this PayPal account.")).toBeVisible();
});
