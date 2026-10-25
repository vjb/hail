import { expect, test } from "@playwright/test";
import { samplePhoto } from "./fixtures";
import { expectAccessible, signInAs } from "./helpers";

// Rejected proof → the worker appeals once → the owner accepts → real sandbox payout.
// The blurry sample photo (bad-1) is reliably rejected by the real verifier, which makes this path reproducible.

test("worker appeals a rejection and the owner accepts it", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const owner = await (await browser.newContext()).newPage();
  await signInAs(owner, "owner");
  await owner.goto("/owner/keys");
  await owner.getByLabel("Key name").fill(`appeal-${Date.now()}`);
  await owner.getByRole("button", { name: "Create key" }).click();
  const key = await owner.getByLabel("Your new API key").inputValue();
  const auth = { Authorization: `Bearer ${key}` };

  const title = `Photograph an espresso machine serial plate ${Date.now()}`;
  const b = await (
    await request.post("/api/v1/bounties", {
      headers: auth,
      data: { title, instructions: "Photograph the serial number plate on the back of the espresso machine.", deliverables: [{ type: "photo", description: "Serial number plate" }], acceptance_checklist: ["The serial number is legible"], reward_cents: 700 },
    })
  ).json();
  expect(b.status).toBe("open");

  const worker = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signInAs(worker, "worker2");
  await worker.goto("/work/my-task");
  const giveBack = worker.getByRole("button", { name: "Give this task back" });
  if (await giveBack.isVisible().catch(() => false)) await giveBack.click();
  await worker.goto(`/work/tasks/${b.id}`);
  await worker.getByRole("button", { name: /^Claim and reserve/ }).click();
  await worker.getByLabel("Photo 1: Serial number plate").setInputFiles(samplePhoto("bad-1"));
  await expect(worker.getByRole("button", { name: "Submit proof" })).toBeEnabled({ timeout: 90_000 });
  await worker.getByRole("button", { name: "Submit proof" }).click();

  // The verifier rejects the blurry photo; the worker sees why and can appeal.
  await expect(worker.getByRole("heading", { name: /didn.t meet the checklist/ })).toBeVisible({ timeout: 120_000 });
  expect((await (await request.get(`/api/v1/bounties/${b.id}`, { headers: auth })).json()).status).toBe("rejected");
  await expectAccessible(worker);
  await worker.getByLabel(/Tell the owner why/).fill("The plate reads S/N BX2041187; the seller confirmed it in person.");
  await worker.getByRole("button", { name: "Send appeal" }).click();
  await expect(worker.getByRole("heading", { name: "The owner is reviewing your proof" })).toBeVisible();
  await expect(worker.getByText("Appealed").first()).toBeVisible();

  await owner.goto("/owner/approvals");
  await expect(owner.getByRole("heading", { name: "Appeals" })).toBeVisible();
  const item = owner.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByText("The plate reads S/N BX2041187")).toBeVisible();
  await expectAccessible(owner);
  await owner.getByRole("button", { name: `Accept appeal and pay: ${title}` }).click();
  await expect(owner.getByText("Appeal accepted. The worker is being paid.")).toBeVisible();

  let status = "";
  for (let i = 0; i < 30 && status !== "paid"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    if (i % 4 === 3) await request.post("/api/internal/sweep", { headers: { "x-sweep-secret": process.env.SWEEP_SECRET! } });
    status = (await (await request.get(`/api/v1/bounties/${b.id}`, { headers: auth })).json()).status;
  }
  expect(status).toBe("paid");
  const final = await (await request.get(`/api/v1/bounties/${b.id}`, { headers: auth })).json();
  expect(final.result.verification).toBe("owner_approved");
});

test("owner withdraws part of the available balance to PayPal", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAs(page, "owner");
  await page.goto("/owner/balance");
  await expectAccessible(page);
  await page.getByLabel("Withdraw amount (USD)").fill("2.00");
  await page.getByRole("button", { name: "Withdraw to PayPal" }).click();
  await expect(page.getByText("$2.00 is on its way back to your PayPal account.")).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(page.getByRole("list", { name: "Recent withdrawals" }).getByText("Refunded to PayPal").first()).toBeVisible();
  // Asking for more than is available explains the limit.
  await page.getByLabel("Withdraw amount (USD)").fill("999999");
  await page.getByRole("button", { name: "Withdraw to PayPal" }).click();
  await expect(page.getByText(/You can withdraw up to/)).toBeVisible();
});
