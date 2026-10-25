import { expect, test } from "@playwright/test";
import { samplePhoto, takePhoto } from "./fixtures";
import { expectAccessible, signInAs } from "./helpers";

// D-028: a task with coordinates can only be submitted from within its radius.
const SQUARE = { latitude: 40.7587, longitude: -73.9851 };

test("on-site task: blocked from across town, accepted on site", async ({ browser, request }) => {
  test.setTimeout(240_000);
  const ownerPage = await (await browser.newContext()).newPage();
  await signInAs(ownerPage, "owner");
  await ownerPage.goto("/owner/keys");
  await ownerPage.getByLabel("Key name").fill(`onsite-${Date.now()}`);
  await ownerPage.getByRole("button", { name: "Create key" }).click();
  const key = await ownerPage.getByLabel("Your new API key").inputValue();

  const title = `How busy is the square ${Date.now()}`;
  const created = await (
    await request.post("/api/v1/bounties", {
      headers: { Authorization: `Bearer ${key}` },
      data: {
        title,
        instructions: "From the red steps, take one wide photo of the square showing how crowded it is.",
        deliverables: [{ type: "photo", description: "Wide photo of the square" }],
        acceptance_checklist: ["The square is visible"],
        reward_cents: 1000,
        location: { address: "Father Duffy Square, New York", lat: SQUARE.latitude, lng: SQUARE.longitude, radius_m: 150 },
      },
    })
  ).json();
  expect(created.status, JSON.stringify(created.screening)).toBe("open");

  // The worker starts about 2.5 km away (Union Square).
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["geolocation"], geolocation: { latitude: 40.7359, longitude: -73.9911, accuracy: 20 } });
  const page = await ctx.newPage();
  const role = process.env.DEMO_WORKER3_EMAIL ? "worker3" : "worker1";
  await signInAs(page, role);
  await page.goto("/work/my-task");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const giveBack = page.getByRole("button", { name: "Give this task back" });
  if (await giveBack.isVisible().catch(() => false)) {
    await giveBack.click();
    await expect(giveBack).toBeHidden({ timeout: 15_000 });
  }
  await page.goto(`/work/tasks/${created.id}`);
  await expect(page.getByText(/On site only: .* within 150 m/)).toBeVisible();
  await page.getByRole("button", { name: "How far am I?" }).click();
  await expect(page.getByText(/You're about 2\.\d km away\./)).toBeVisible();
  await page.getByRole("button", { name: /^Claim and reserve/ }).click();
  await expect(page).toHaveURL(/\/work\/my-task$/);

  await takePhoto(page, "Photo 1: Wide photo of the square", samplePhoto("good-3"));
  await page.getByRole("button", { name: "Share my location" }).click();
  await expect(page.getByText(/You're about \d+ m from the task location\. Move within 150 m/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Submit proof|Take every photo/ })).toBeDisabled();
  await expectAccessible(page);

  // Walk to the square and share again.
  await ctx.setGeolocation({ latitude: 40.7589, longitude: -73.9853, accuracy: 25 });
  await page.getByRole("button", { name: "Share my location again" }).click();
  await page.getByRole("button", { name: "Share my location" }).click();
  await expect(page.getByText(/You're about \d+ m from the task\. That's close enough\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit proof" })).toBeEnabled({ timeout: 90_000 });
  await page.getByRole("button", { name: "Submit proof" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(/Checking your proof|reviewing your proof/)).toBeVisible({ timeout: 30_000 });
});
