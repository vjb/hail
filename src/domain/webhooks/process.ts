import { eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { webhookEvents } from "@/db/schema";
import { payouts } from "@/db/schema";
import { recordPayoutStatus } from "@/domain/payouts/payouts";
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
    case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
    case "PAYMENT.PAYOUTS-ITEM.FAILED":
    case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
    case "PAYMENT.PAYOUTS-ITEM.RETURNED":
    case "PAYMENT.PAYOUTS-ITEM.BLOCKED": {
      const itemId = r.payout_item_id as string | undefined;
      const senderItemId = (r.payout_item as { sender_item_id?: string } | undefined)?.sender_item_id;
      const status = (r.transaction_status as string | undefined) ?? event.event_type.split(".").pop()!.replace("SUCCEEDED", "SUCCESS");
      const [p] = senderItemId
        ? await database.select().from(payouts).where(eq(payouts.bountyId, senderItemId))
        : itemId
          ? await database.select().from(payouts).where(eq(payouts.itemId, itemId))
          : [];
      if (!p) return false;
      await recordPayoutStatus(database, p.id, status, itemId);
      return true;
    }
    default:
      // Refund events are handled with withdrawals (Day 8).
      return false;
  }
}
