/**
 * Day 1 PayPal sandbox spike. Proves the money flows the architecture depends on:
 *   1. OAuth token   2. order → approval → capture   3. partial refund
 *   4. $1.00 payout, polled to completion   5. idempotency on every POST
 *
 * Usage: npm run spike:paypal            (approves checkout automatically with the sandbox buyer)
 *        npm run spike:paypal -- --manual (prints the approval link and waits for you)
 * Results are appended to spike-results.json (gitignored) for PROGRESS.md evidence.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import {
  approvalLink,
  captureOrder,
  createOrder,
  createPayout,
  firstCapture,
  getAccessToken,
  getOrder,
  getPayoutBatch,
  PayPalError,
  refundCapture,
} from "../src/integrations/paypal/client";

const manual = process.argv.includes("--manual");
const run = randomUUID().slice(0, 8);
const results: Array<{ step: string; ok: boolean; detail: string }> = [];

function record(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}: ${detail}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function approveWithSandboxBuyer(url: string) {
  const email = process.env.E2E_PAYPAL_BUYER_EMAIL;
  const password = process.env.E2E_PAYPAL_BUYER_PASSWORD;
  if (!email || !password) throw new Error("E2E_PAYPAL_BUYER_EMAIL / _PASSWORD not set");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "chrome", headless: process.env.HEADED ? false : true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const emailBox = page.locator("#email");
    await emailBox.waitFor({ timeout: 30_000 });
    await emailBox.fill(email);
    const next = page.locator("#btnNext");
    if (await next.isVisible().catch(() => false)) await next.click();
    const pw = page.locator("#password");
    await pw.waitFor({ timeout: 30_000 });
    await pw.fill(password);
    await page.locator("#btnLogin").click();
    const pay = page.locator('#payment-submit-btn, button[data-id="payment-submit-btn"], button:has-text("Complete Purchase"), button:has-text("Pay Now"), button:has-text("Continue to Review Order")');
    await pay.first().waitFor({ timeout: 45_000 });
    await pay.first().click();
    await page.waitForURL((u) => u.toString().startsWith("https://example.com/hail-spike"), { timeout: 45_000 });
  } catch (e) {
    const shot = `spike-approval-failure-${run}.png`;
    await browser.contexts()[0]?.pages()[0]?.screenshot({ path: shot }).catch(() => {});
    throw new Error(`Automated approval failed (${(e as Error).message.split("\n")[0]}). Screenshot: ${shot}. Retry with --manual.`);
  } finally {
    await browser.close();
  }
}

async function waitForApproved(orderId: string, timeoutMs: number) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const o = await getOrder(orderId);
    if (o.status === "APPROVED" || o.status === "COMPLETED") return o.status;
    await sleep(3000);
  }
  throw new Error("Order was not approved in time");
}

async function main() {
  // 1. Token
  const t = await getAccessToken();
  record("1 token", true, `scope includes payouts: ${t.scope.includes("payouts")}`);

  // 2. Order with idempotency
  const orderKey = `spike_topup_${run}`;
  const order = await createOrder({
    amountCents: 2000,
    customId: `spike_${run}`,
    description: "Hail spike top-up",
    requestId: orderKey,
    returnUrl: "https://example.com/hail-spike/return",
    cancelUrl: "https://example.com/hail-spike/cancel",
  });
  const orderAgain = await createOrder({
    amountCents: 2000,
    customId: `spike_${run}`,
    description: "Hail spike top-up",
    requestId: orderKey,
  });
  record("5a order idempotency", orderAgain.id === order.id, `same PayPal-Request-Id → same order (${order.id} / ${orderAgain.id})`);
  const link = approvalLink(order);
  if (!link) throw new Error("No approval link on order");
  console.log(`\nApproval link: ${link}\n`);
  if (manual) {
    console.log("Approve it with the sandbox personal account; waiting up to 10 minutes…");
  } else {
    await approveWithSandboxBuyer(link);
  }
  await waitForApproved(order.id, manual ? 600_000 : 60_000);
  record("2a approval", true, manual ? "approved manually" : "approved by automated sandbox buyer");

  const capKey = `spike_capture_${run}`;
  const captured = await captureOrder(order.id, capKey);
  const capture = firstCapture(captured);
  record("2b capture", captured.status === "COMPLETED" && !!capture, `order ${captured.status}, capture ${capture?.id} ${capture?.amount.value} ${capture?.amount.currency_code}`);
  const capturedAgain = await captureOrder(order.id, capKey);
  record("5b capture idempotency", firstCapture(capturedAgain)?.id === capture?.id, "repeat capture with same key returns the same capture, no second charge");

  // 3. Partial refund with idempotency
  const refKey = `spike_refund_${run}`;
  const refund = await refundCapture(capture!.id, 500, refKey, "Hail spike partial refund");
  const refundAgain = await refundCapture(capture!.id, 500, refKey, "Hail spike partial refund");
  record("3 partial refund", ["COMPLETED", "PENDING"].includes(refund.status), `refund ${refund.id} ${refund.status} $5.00 of $20.00`);
  record("5c refund idempotency", refundAgain.id === refund.id, `same key → same refund (${refundAgain.id})`);

  // 4. Payout with idempotency
  const receiver = process.env.DEMO_WORKER1_PAYPAL_EMAIL || process.env.E2E_PAYPAL_BUYER_EMAIL!;
  const batchId = `spike_payout_${run}`;
  const payout = await createPayout({
    senderBatchId: batchId,
    senderItemId: `spike_item_${run}`,
    receiverEmail: receiver,
    amountCents: 100,
    note: "Hail spike payout",
    subject: "You've been paid by Hail (sandbox)",
  });
  let dupOutcome = "";
  try {
    const again = await createPayout({
      senderBatchId: batchId,
      senderItemId: `spike_item_${run}`,
      receiverEmail: receiver,
      amountCents: 100,
      note: "Hail spike payout",
      subject: "You've been paid by Hail (sandbox)",
    });
    dupOutcome = again.batch_header.payout_batch_id === payout.batch_header.payout_batch_id ? "same batch returned" : `NEW batch ${again.batch_header.payout_batch_id}`;
  } catch (e) {
    dupOutcome = e instanceof PayPalError ? `rejected ${e.status} ${e.errorName}` : String(e);
  }
  record("5d payout idempotency", !dupOutcome.startsWith("NEW"), `repeat sender_batch_id → ${dupOutcome}`);

  const until = Date.now() + 180_000;
  let batch = await getPayoutBatch(payout.batch_header.payout_batch_id);
  while (Date.now() < until && !["SUCCESS", "DENIED", "CANCELED"].includes(batch.batch_header.batch_status)) {
    await sleep(5000);
    batch = await getPayoutBatch(payout.batch_header.payout_batch_id);
  }
  const item = batch.items?.[0];
  record("4 payout", batch.batch_header.batch_status === "SUCCESS" && item?.transaction_status === "SUCCESS", `batch ${batch.batch_header.payout_batch_id} ${batch.batch_header.batch_status}, item ${item?.transaction_status} → ${receiver}`);
}

main()
  .catch((e) => {
    record("spike", false, e instanceof Error ? e.message : String(e));
  })
  .finally(() => {
    appendFileSync("spike-results.json", JSON.stringify({ run, at: new Date().toISOString(), results }) + "\n");
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed (run ${run})`);
    process.exit(failed ? 1 : 0);
  });
