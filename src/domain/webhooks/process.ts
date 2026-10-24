import { eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { webhookEvents } from "@/db/schema";
import { recordCapture, TopupError } from "@/domain/topups/topups";

export type PayPalEvent = { id: string; event_type: string; resource?: Record<string, unknown> };

type Outcome = "processed" | "duplicate" | "ignored" | "failed";

/**
 * Stores a verified PayPal event once (unique on PayPal's event ID) and applies it.
 * Replays of the same event are acknowledged without reprocessing.
 */
export async function ingestVerifiedEvent(database: DB, event: PayPalEvent): Promise<Outcome> {
  const inserted = await database
    .insert(webhookEvents)
    .values({ paypalEventId: event.id, type: event.event_type, payload: event, verified: true })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) {
    const [row] = await database.select().from(webhookEvents).where(eq(webhookEvents.paypalEventId, event.id));
    if (row?.processedAt) return "duplicate";
  }
  try {
    const handled = await apply(database, event);
    await database.update(webhookEvents).set({ processedAt: new Date(), processingError: null }).where(eq(webhookEvents.paypalEventId, event.id));
    return handled ? "processed" : "ignored";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await database.update(webhookEvents).set({ processingError: msg.slice(0, 500) }).where(eq(webhookEvents.paypalEventId, event.id));
    return "failed";
  }
}

async function apply(database: DB, event: PayPalEvent): Promise<boolean> {
  const r = event.resource ?? {};
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      const captureId = r.id as string | undefined;
      const orderId = (r.supplementary_data as { related_ids?: { order_id?: string } } | undefined)?.related_ids?.order_id;
      const amount = r.amount as { value?: string; currency_code?: string } | undefined;
      if (!captureId || !orderId || !amount?.value || !amount.currency_code) return false;
      try {
        await recordCapture(database, { orderId, captureId, amountValue: amount.value, currency: amount.currency_code });
      } catch (e) {
        // Events for orders Hail didn't create (e.g. the dashboard simulator) are acknowledged and ignored.
        if (e instanceof TopupError && e.message.startsWith("no top-up")) return false;
        throw e;
      }
      return true;
    }
    default:
      // Payout and refund events are handled from Day 7/8.
      return false;
  }
}
