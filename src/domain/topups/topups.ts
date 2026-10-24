import { and, desc, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { topups } from "@/db/schema";
import { creditTopup } from "@/domain/ledger/ledger";
import { captureOrder, createOrder, firstCapture, getOrder, PayPalError, valueToCents } from "@/integrations/paypal/client";
import { newId } from "@/lib/ids";

export const TOPUP_MIN_CENTS = 500;
export const TOPUP_MAX_CENTS = 100_000;

export class TopupError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
    this.name = "TopupError";
  }
}

/** Creates a PayPal order for an owner top-up. Idempotency key: topup_<id>. */
export async function startTopup(database: DB, ownerId: string, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < TOPUP_MIN_CENTS || amountCents > TOPUP_MAX_CENTS) {
    throw new TopupError(`bad amount ${amountCents}`, "Choose an amount between $5.00 and $1,000.00.");
  }
  const id = newId("top");
  const order = await createOrder({
    amountCents,
    customId: id,
    description: "Hail balance top-up",
    requestId: `topup_${id}`,
  });
  await database.insert(topups).values({ id, ownerId, paypalOrderId: order.id, amountCents, status: "created" });
  return { topupId: id, orderId: order.id };
}

type CaptureOutcome = { status: "captured"; amountCents: number; credited: boolean } | { status: "not_completed"; paypalStatus: string };

/**
 * Captures an approved top-up order and credits the owner's balance.
 * Safe to call repeatedly and safe to race with the webhook: the ledger is keyed on the capture ID.
 */
export async function captureTopup(database: DB, ownerId: string, orderId: string): Promise<CaptureOutcome> {
  const [t] = await database
    .select()
    .from(topups)
    .where(and(eq(topups.paypalOrderId, orderId), eq(topups.ownerId, ownerId)));
  if (!t) throw new TopupError(`unknown order ${orderId} for owner`, "We couldn't find that payment. Please try again.");
  let order;
  try {
    order = await captureOrder(orderId, `capture_${t.id}`);
  } catch (e) {
    if (e instanceof PayPalError && e.status === 422) {
      // Already captured (or not approved): read the order's current state instead.
      order = await getOrder(orderId);
    } else throw e;
  }
  const cap = firstCapture(order);
  if (order.status !== "COMPLETED" || !cap || cap.status !== "COMPLETED") {
    return { status: "not_completed", paypalStatus: cap?.status ?? order.status };
  }
  return recordCapture(database, { orderId, captureId: cap.id, amountValue: cap.amount.value, currency: cap.amount.currency_code });
}

/** Shared by the capture route and the PAYMENT.CAPTURE.COMPLETED webhook. Idempotent on capture ID. */
export async function recordCapture(
  database: DB,
  input: { orderId: string; captureId: string; amountValue: string; currency: string },
): Promise<CaptureOutcome> {
  return database.transaction(async (tx) => {
    const [t] = await tx.select().from(topups).where(eq(topups.paypalOrderId, input.orderId)).for("update");
    if (!t) throw new TopupError(`no top-up for order ${input.orderId}`, "Unknown payment.");
    const amountCents = valueToCents(input.amountValue);
    if (input.currency !== "USD" || amountCents !== t.amountCents) {
      throw new TopupError(`capture ${input.captureId} amount ${input.amountValue} ${input.currency} != ${t.amountCents}`, "The payment amount didn't match.");
    }
    if (t.captureId && t.captureId !== input.captureId) {
      throw new TopupError(`order ${input.orderId} already has capture ${t.captureId}`, "Unexpected payment state.");
    }
    if (t.status !== "captured") {
      await tx.update(topups).set({ status: "captured", captureId: input.captureId, capturedAt: new Date() }).where(eq(topups.id, t.id));
    }
    const credited = await creditTopup(tx, t.ownerId, amountCents, input.captureId);
    return { status: "captured" as const, amountCents, credited };
  });
}

export async function listTopups(database: DB, ownerId: string) {
  return database.select().from(topups).where(eq(topups.ownerId, ownerId)).orderBy(desc(topups.createdAt)).limit(50);
}
