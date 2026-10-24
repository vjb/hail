import { db } from "@/db/client";
import { ingestVerifiedEvent, type PayPalEvent } from "@/domain/webhooks/process";
import { verifyWebhookSignature } from "@/integrations/paypal/client";
import { env } from "@/lib/env";

// PayPal webhook receiver. Every event is signature-verified with PayPal before it is stored or used.
export async function POST(req: Request) {
  const raw = await req.text();
  let event: PayPalEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  let verified = false;
  try {
    verified = await verifyWebhookSignature(req.headers, raw, env().PAYPAL_WEBHOOK_ID);
  } catch (e) {
    console.error("[webhook] verification call failed", e instanceof Error ? e.message : e);
    return new Response(null, { status: 503 });
  }
  if (!verified || !event.id || !event.event_type) {
    console.warn("[webhook] rejected unverified event", event.id, event.event_type);
    return new Response(null, { status: 401 });
  }
  const outcome = await ingestVerifiedEvent(db(), event);
  console.info("[webhook]", outcome, event.id, event.event_type);
  // 500 on failure makes PayPal retry; everything else is acknowledged.
  return new Response(null, { status: outcome === "failed" ? 500 : 200 });
}
