import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/db/client";
import { topups, webhookEvents } from "@/db/schema";
import { getBalances, ownerLedgerSum } from "@/domain/ledger/ledger";
import { recordCapture } from "@/domain/topups/topups";
import { newId } from "@/lib/ids";
import { makeUser } from "../../../tests/helpers";
import { ingestVerifiedEvent } from "./process";

afterAll(() => closeDb());

async function pendingTopup(amountCents: number) {
  const ownerId = await makeUser("owner");
  const orderId = "ORD" + newId("top");
  await db().insert(topups).values({ id: newId("top"), ownerId, paypalOrderId: orderId, amountCents });
  return { ownerId, orderId };
}

const captureEvent = (eventId: string, orderId: string, captureId: string, value: string) => ({
  id: eventId,
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  resource: { id: captureId, status: "COMPLETED", amount: { value, currency_code: "USD" }, supplementary_data: { related_ids: { order_id: orderId } } },
});

describe("PayPal webhook processing", () => {
  it("a capture-completed event credits the top-up once, even when replayed", async () => {
    const { ownerId, orderId } = await pendingTopup(20000);
    const evt = captureEvent("WH-" + orderId, orderId, "CAP-" + orderId, "200.00");
    expect(await ingestVerifiedEvent(db(), evt)).toBe("processed");
    expect(await ingestVerifiedEvent(db(), evt)).toBe("duplicate");
    // A different event ID for the same capture (PayPal resend) still can't double-credit.
    expect(await ingestVerifiedEvent(db(), { ...evt, id: "WH-2-" + orderId })).toBe("processed");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 20000, heldCents: 0 });
    expect(await ownerLedgerSum(db(), ownerId)).toBe(0);
    const [t] = await db().select().from(topups).where(eq(topups.paypalOrderId, orderId));
    expect(t.status).toBe("captured");
  });

  it("webhook and capture route racing: credited exactly once", async () => {
    const { ownerId, orderId } = await pendingTopup(5000);
    const captureId = "CAP-" + orderId;
    await Promise.all([
      ingestVerifiedEvent(db(), captureEvent("WH-r-" + orderId, orderId, captureId, "50.00")),
      recordCapture(db(), { orderId, captureId, amountValue: "50.00", currency: "USD" }),
      recordCapture(db(), { orderId, captureId, amountValue: "50.00", currency: "USD" }),
    ]);
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 5000, heldCents: 0 });
  });

  it("an amount that doesn't match the top-up is not credited and is recorded as an error", async () => {
    const { ownerId, orderId } = await pendingTopup(5000);
    const evt = captureEvent("WH-m-" + orderId, orderId, "CAP-m-" + orderId, "500.00");
    expect(await ingestVerifiedEvent(db(), evt)).toBe("failed");
    expect(await getBalances(db(), ownerId)).toEqual({ availableCents: 0, heldCents: 0 });
    const [row] = await db().select().from(webhookEvents).where(eq(webhookEvents.paypalEventId, evt.id));
    expect(row.processingError).toMatch(/amount/);
  });

  it("events for unknown orders are acknowledged and ignored", async () => {
    expect(await ingestVerifiedEvent(db(), captureEvent("WH-u-" + newId("top"), "NOPE", "CAP-x", "1.00"))).toBe("ignored");
  });

  it("unhandled event types are stored and ignored", async () => {
    expect(await ingestVerifiedEvent(db(), { id: "WH-o-" + newId("top"), event_type: "CHECKOUT.ORDER.APPROVED", resource: {} })).toBe("ignored");
  });
});
