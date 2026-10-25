import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { samplePhoto, takePhoto } from "./fixtures";
import { signInAs } from "./helpers";

// Day 7 happy path (local): agent posts → worker claims and submits → verifier decides →
// owner accepts (the sample photos have no photo code) → real PayPal sandbox payout → paid.

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

  const title = `Inspect a used espresso machine ${Date.now()}`;
  const created = await (
    await request.post("/api/v1/bounties", {
      headers: { ...auth, "Idempotency-Key": title },
      data: {
        title,
        instructions: "At the appliance store's used-equipment counter, photograph the serial number plate and the front panel of the Brevo EX-200 while it is powered on.",
        deliverables: [
          { type: "photo", description: "Serial number plate" },
          { type: "photo", description: "Front panel with power light on" },
        ],
        acceptance_checklist: ["The serial number is legible", "The machine is visibly powered on"],
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
  await takePhoto(worker, "Photo 1: Serial number plate", samplePhoto("good-1"));
  await takePhoto(worker, "Photo 2: Front panel with power light on", samplePhoto("good-2"));
  await expect(worker.getByRole("button", { name: "Submit proof" })).toBeEnabled({ timeout: 90_000 });
  await worker.getByRole("button", { name: "Submit proof" }).click();

  // Wait for the verifier's decision.
  let status = "verifying";
  for (let i = 0; i < 40 && status === "verifying"; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    status = (await (await request.get(`/api/v1/bounties/${created.id}`, { headers: auth })).json()).status;
  }
  test.info().annotations.push({ type: "verifier", description: status });

  // The sample photos are AI-generated and carry no photo code, so they must never be paid
  // automatically: Hail sends them to the owner, and says why.
  expect(status).toBe("needs_owner_review");
  {
    await owner.goto(`/owner/tasks/${created.id}`);
    await expect(owner.getByRole("heading", { name: "Proof to review" })).toBeVisible();
    await expect(owner.getByText("Photo code not visible").first()).toBeVisible();
    // DL-2-04: reporting proof as fake takes an explained second step, and can be backed out of.
    await owner.getByRole("button", { name: `Report proof as not genuine: ${title}` }).click();
    await expect(owner.getByText("Report this proof as not genuine?")).toBeVisible();
    await owner.getByRole("button", { name: "Keep reviewing" }).click();
    await expect(owner.getByText("Report this proof as not genuine?")).toBeHidden();
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
  // The shareable certificate fingerprints exactly the bytes the API served.
  expect(final.result.checklist_met).toBeDefined();
  const sha = createHash("sha256").update(await photo.body()).digest("hex");
  await owner.goto(final.result.certificate_url.replace(/^https?:\/\/[^/]+/, ""));
  await expect(owner.getByRole("heading", { name: title })).toBeVisible();
  await expect(owner.getByText(`SHA-256 ${sha}`)).toBeVisible();
  await expect(owner.getByText("Accepted by the task owner after review")).toBeVisible();
  await expect(owner.getByRole("button", { name: "Copy certificate link" })).toBeVisible();
  // DL-2-02: once accepted, the owner's task page doesn't contradict the payout.
  await owner.goto(`/owner/tasks/${created.id}`);
  await expect(owner.getByText("Accepted after review")).toBeVisible();

  await expect(worker.getByRole("heading", { name: "Paid" })).toBeVisible({ timeout: 30_000 });
  await worker.goto("/work/earnings");
  await expect(worker.getByText(title)).toBeVisible();
  await expect(worker.getByText("In your PayPal").first()).toBeVisible();
});
