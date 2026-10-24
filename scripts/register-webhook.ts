/**
 * Registers (or reuses) the PayPal sandbox webhook for <base-url>/api/webhooks/paypal
 * and writes its ID to .env as PAYPAL_WEBHOOK_ID.
 * Usage: npm run webhook:register -- https://your-tunnel-or-render-host [--print-only]
 * --print-only registers without touching .env (for the hosted app; set the ID in Render instead).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createWebhook, listWebhooks, WEBHOOK_EVENT_TYPES } from "../src/integrations/paypal/client";

async function main() {
  const base = process.argv[2]?.replace(/\/$/, "");
  if (!base?.startsWith("https://")) throw new Error("Pass the public https base URL");
  const url = `${base}/api/webhooks/paypal`;
  const { webhooks } = await listWebhooks();
  const existing = webhooks.find((w) => w.url === url);
  const hook = existing ?? (await createWebhook(url, WEBHOOK_EVENT_TYPES));
  console.log(`${existing ? "Reusing" : "Created"} webhook ${hook.id} → ${url}`);
  console.log(`Events: ${hook.event_types.map((e) => e.name).join(", ")}`);
  const others = webhooks.filter((w) => w.url !== url);
  if (others.length) console.log(`Other webhooks on this app: ${others.map((w) => w.url).join(", ")}`);
  if (process.argv.includes("--print-only")) {
    console.log(`Set PAYPAL_WEBHOOK_ID=${hook.id} on the server that serves ${base}`);
    return;
  }
  const envText = readFileSync(".env", "utf8");
  writeFileSync(".env", envText.replace(/^PAYPAL_WEBHOOK_ID=.*$/m, `PAYPAL_WEBHOOK_ID=${hook.id}`));
  console.log("PAYPAL_WEBHOOK_ID written to .env");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
