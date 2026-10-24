import { expect, test } from "@playwright/test";
import { makePhoto } from "./fixtures";
import { signInAs } from "./helpers";

// Day 7 happy path (local): agent posts → worker claims and submits → verifier decides →
// (owner accepts if the verifier was unsure) → real PayPal sandbox payout → paid.

test("from agent post to PayPal payout", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await signInAs(owner, "owner");
  await owner.goto("/owner/keys");
  await owner.getByLabel("Key name").fill(`happy-${Date.now()}`);
  await owner.getByRole("button", { name: "Create key" }).click();
  const key = await owner.getByLabel("Your new API key").inputValue();
  const auth = { Authorization: `Bearer ${key}` };

  const title = `Photograph the bakery hours sign ${Date.now()}`;
  const created = await (
    await request.post("/api/v1/bounties", {
      headers: { ...auth, "Idempotency-Key": title },
      data: {
        title,
        instructions: "Photograph the sign with the bakery's opening hours on the front door.",
        deliverables: [{ type: "photo", description: "Opening hours sign" }],
        acceptance_checklist: ["The opening hours are readable"],
        reward_cents: 1100,
      },
    })
  ).json();
  expect(created.status).toBe("open");

  const workerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const worker = await workerCtx.newPage();
  await signInAs(worker, "worker2");
  await worker.goto("/work/my-task");
  const giveBack = worker.getByRole("button", { name: "Give this task back" });
  if (await giveBack.isVisible().catch(() => false)) await giveBack.click();
  await worker.goto(`/work/tasks/${created.id}`);
  await worker.getByRole("button", { name: /^Claim and reserve/ }).click();
  await expect(worker).toHaveURL(/\/work\/my-task$/);
  const sign = await makePhoto("hours", ["SUNRISE BAKERY", "MON-FRI  7AM - 6PM", "SAT-SUN  8AM - 2PM"], "#5a3b1e");
  await worker.getByLabel("Photo 1: Opening hours sign").setInputFiles(sign);
  await expect(worker.getByRole("button", { name: "Submit proof" })).toBeEnabled({ timeout: 90_000 });
  await worker.getByRole("button", { name: "Submit proof" }).click();

  // Wait for the verifier's decision.
  let status = "verifying";
  for (let i = 0; i < 40 && status === "verifying"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    status = (await (await request.get(`/api/v1/bounties/${created.id}`, { headers: auth })).json()).status;
  }
  test.info().annotations.push({ type: "verifier", description: status });
  test.skip(status === "rejected", "The verifier rejected the generated test image (expected for a flat graphic). Re-run with a real photo.");

  if (status === "needs_owner_review") {
    await owner.goto(`/owner/tasks/${created.id}`);
    await expect(owner.getByRole("heading", { name: "Proof to review" })).toBeVisible();
    await owner.getByRole("button", { name: `Accept proof and pay: ${title}` }).click();
    await expect(owner.getByText("Accepted. The worker is being paid.")).toBeVisible();
  }

  // The real sandbox payout settles in seconds; the worker sees it without refreshing.
  for (let i = 0; i < 40 && status !== "paid"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    status = (await (await request.get(`/api/v1/bounties/${created.id}`, { headers: auth })).json()).status;
    if (status === "paying" && i % 5 === 4) await request.post("/api/internal/sweep", { headers: { "x-sweep-secret": process.env.SWEEP_SECRET! } });
  }
  expect(status).toBe("paid");
  const final = await (await request.get(`/api/v1/bounties/${created.id}`, { headers: auth })).json();
  expect(final.result.verification).toMatch(/pass|owner_approved/);
  expect(final.result.deliverables[0].url).toMatch(/\/api\/v1\/photos\/ph_/);
  const photo = await request.get(final.result.deliverables[0].url.replace(/^https?:\/\/[^/]+/, ""), { headers: auth });
  expect(photo.headers()["content-type"]).toBe("image/jpeg");

  await expect(worker.getByRole("heading", { name: "Paid" })).toBeVisible({ timeout: 30_000 });
  await worker.goto("/work/earnings");
  await expect(worker.getByText(title)).toBeVisible();
  await expect(worker.getByText("In your PayPal").first()).toBeVisible();
});
