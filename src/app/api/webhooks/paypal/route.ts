import { env } from "@/lib/env";
import { verifyWebhookSignature } from "@/integrations/paypal/client";

// PayPal webhook receiver. Every event is signature-verified with PayPal before use.
// Day 1: verify and log. Day 3 adds idempotent storage in webhook_events and processing.
export async function POST(req: Request) {
  const raw = await req.text();
  let verified = false;
  try {
    verified = await verifyWebhookSignature(req.headers, raw, env().PAYPAL_WEBHOOK_ID);
  } catch (e) {
    console.error("[webhook] verification call failed", e instanceof Error ? e.message : e);
    return new Response(null, { status: 500 });
  }
  let event: { id?: string; event_type?: string } = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!verified) {
    console.warn("[webhook] rejected unverified event", event.id, event.event_type);
    return new Response(null, { status: 401 });
  }
  console.info("[webhook] verified", event.id, event.event_type);
  return new Response(null, { status: 200 });
}
