import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { approvePayPalPopup, expectAccessible, signInAs } from "./helpers";

// Agent → screen → owner approval, end to end through the public API and the owner UI.

const bounty = (over: Record<string, unknown> = {}) => ({
  title: "Inspect a used piano",
  instructions: "At the music store showroom, photograph the piano's serial number and the keys.",
  deliverables: [{ type: "photo", description: "Serial number" }],
  acceptance_checklist: ["Serial number is legible"],
  reward_cents: 7500,
  ...over,
});

async function createKey(page: Page, name: string) {
  await page.goto("/owner/keys");
  await page.getByLabel("Key name").fill(name);
  await page.getByLabel("Daily cap (USD)").fill("1000");
  await page.getByRole("button", { name: "Create key" }).click();
  const raw = await page.getByLabel("Your new API key").inputValue();
  expect(raw).toMatch(/^hail_sk_/);
  return raw;
}

async function ensureFunds(page: Page, request: APIRequestContext, key: string, cents: number) {
  const bal = await (await request.get("/api/v1/balance", { headers: { Authorization: `Bearer ${key}` } })).json();
  if (bal.available_cents >= cents) return;
  await page.goto("/owner/balance");
  await page.getByRole("radio", { name: "$200.00" }).click();
  const popupP = page.waitForEvent("popup");
  await page.locator("paypal-button").click();
  const r = await approvePayPalPopup(await popupP);
  test.skip(r === "challenge", "PayPal sandbox showed a challenge — H3");
  await expect(page.getByText("$200.00 added to your balance.")).toBeVisible({ timeout: 60_000 });
}

test("blocked, approved and declined tasks, from agent to owner", async ({ page, request }) => {
  test.setTimeout(240_000);
  await signInAs(page, "owner");
  const keyName = `e2e-${Date.now()}`;
  const key = await createKey(page, keyName);
  const auth = { Authorization: `Bearer ${key}` };
  await ensureFunds(page, request, key, 20000);

  // 1. An OTP request is blocked and costs nothing.
  const before = await (await request.get("/api/v1/balance", { headers: auth })).json();
  const blocked = await (await request.post("/api/v1/bounties", { headers: auth, data: bounty({ title: "Receive a verification code for me", instructions: "Text me the 6-digit code you get by SMS.", reward_cents: 1500 }) })).json();
  expect(blocked.status).toBe("blocked");
  expect(blocked.screening.category).toBe("otp_solicitation");
  const afterBlock = await (await request.get("/api/v1/balance", { headers: auth })).json();
  expect(afterBlock.available_cents).toBe(before.available_cents);

  // 2. A $75 task (over the $50 threshold) waits for approval with its pay set aside.
  const held = await (await request.post("/api/v1/bounties", { headers: auth, data: bounty() })).json();
  expect(held.status).toBe("pending_approval");
  const afterHold = await (await request.get("/api/v1/balance", { headers: auth })).json();
  expect(afterHold.held_cents - before.held_cents).toBe(7500);

  // 3. The owner approves it in the approvals queue.
  await page.goto("/owner/approvals");
  await expectAccessible(page);
  await page.getByRole("button", { name: `Approve task: Inspect a used piano` }).first().click();
  await expect(page.getByText("Approved. The task is now open to workers.")).toBeVisible();
  const approved = await (await request.get(`/api/v1/bounties/${held.id}`, { headers: auth })).json();
  expect(approved.status).toBe("open");

  // 4. Another one is declined and its pay returns to available.
  const second = await (await request.post("/api/v1/bounties", { headers: auth, data: bounty({ title: "Inspect a harp" }) })).json();
  expect(second.status).toBe("pending_approval");
  await page.goto(`/owner/tasks/${second.id}`);
  await expect(page.getByRole("heading", { name: "Your approval is needed" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Decline task: Inspect a harp" }).click();
  await expect(page.getByText("Declined.")).toBeVisible();
  const declined = await (await request.get(`/api/v1/bounties/${second.id}`, { headers: auth })).json();
  expect(declined.status).toBe("rejected_by_owner");

  // The blocked task's page explains why.
  await page.goto(`/owner/tasks/${blocked.id}`);
  await expect(page.getByText("Blocked by the safety screen")).toBeVisible();
  await expect(page.getByText("One-time code request").first()).toBeVisible();

  // Cleanup: cancel the approved task so its pay is released.
  await request.post(`/api/v1/bounties/${held.id}/cancel`, { headers: auth });
  const end = await (await request.get("/api/v1/balance", { headers: auth })).json();
  expect(end.held_cents).toBe(before.held_cents);

  // 5. A revoked key stops working.
  await page.goto("/owner/keys");
  const row = page.getByRole("row").filter({ hasText: keyName });
  await row.getByRole("button", { name: `Revoke key ${keyName}` }).click();
  await expect(row.getByText("Revoked")).toBeVisible();
  const r = await request.get("/api/v1/balance", { headers: auth });
  expect(r.status()).toBe(403);
});

test("policy page saves the approval threshold", async ({ page }) => {
  await signInAs(page, "owner");
  await page.goto("/owner/policy");
  await expectAccessible(page);
  await page.getByLabel("Approval threshold (USD)").fill("50.00");
  await page.getByRole("button", { name: "Save policy" }).click();
  await expect(page.getByText("Policy saved.")).toBeVisible();
});
