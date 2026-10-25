/**
 * Venmo payouts sandbox spike (D-020). Does a $1.00 Venmo payout settle in sandbox?
 * Tries a phone recipient and a handle recipient, polls each batch, and records the item status.
 *
 * Usage: npm run spike:venmo [-- --phone +15555550123] [-- --handle @someone]
 * Results are appended to spike-results.json (gitignored) for PROGRESS.md evidence.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import {
  createPayout,
  getPayoutBatch,
  PayPalError,
  type PayoutRecipient,
} from "../src/integrations/paypal/client";

if (process.env.PAYPAL_ENV !== "sandbox")
  throw new Error("PAYPAL_ENV must be sandbox");

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const run = randomUUID().slice(0, 8);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const results: Array<{ step: string; ok: boolean; detail: string }> = [];

const cases: Array<{ name: string; recipient: PayoutRecipient }> = [
  {
    name: "venmo phone",
    recipient: {
      wallet: "VENMO",
      type: "PHONE",
      receiver: arg("--phone") ?? "+15555550123",
    },
  },
  {
    name: "venmo handle",
    recipient: {
      wallet: "VENMO",
      type: "USER_HANDLE",
      receiver: arg("--handle") ?? "@hail-sandbox-worker",
    },
  },
];

async function main() {
  for (const [i, c] of cases.entries()) {
    const id = `spike_venmo_${run}_${i}`;
    try {
      const batch = await createPayout({
        senderBatchId: id,
        senderItemId: id,
        receiverEmail: "",
        amountCents: 100,
        note: "Hail sandbox spike",
        subject: "Hail sandbox spike",
        recipient: c.recipient,
      });
      const batchId = batch.batch_header.payout_batch_id;
      let item = "";
      let status = batch.batch_header.batch_status;
      for (let t = 0; t < 20; t++) {
        await sleep(3000);
        const b = await getPayoutBatch(batchId);
        status = b.batch_header.batch_status;
        item = b.items?.[0]?.transaction_status ?? "";
        if (
          !["PENDING", "PROCESSING"].includes(status) &&
          item &&
          !["PENDING", "ONHOLD"].includes(item)
        )
          break;
      }
      const ok = item === "SUCCESS" || item === "UNCLAIMED";
      results.push({
        step: c.name,
        ok,
        detail: `batch ${batchId} ${status}, item ${item || "none"}`,
      });
    } catch (e) {
      const detail =
        e instanceof PayPalError
          ? `${e.message} ${JSON.stringify(e.body)}`
          : String(e);
      results.push({ step: c.name, ok: false, detail });
    }
    const r = results.at(-1)!;
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.step}: ${r.detail}`);
  }
}

main().then(() => {
  appendFileSync(
    "spike-results.json",
    JSON.stringify({
      spike: "venmo",
      run,
      at: new Date().toISOString(),
      results,
    }) + "\n",
  );
  process.exit(results.every((r) => r.ok) ? 0 : 1);
});
