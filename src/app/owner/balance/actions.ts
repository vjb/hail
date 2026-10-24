"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { captureTopup, startTopup, TopupError } from "@/domain/topups/topups";
import { requireRole } from "@/lib/auth";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createTopupOrderAction(amountCents: number): Promise<ActionResult<{ orderId: string }>> {
  const owner = await requireRole("owner");
  try {
    const { orderId } = await startTopup(db(), owner.id, amountCents);
    return { ok: true, data: { orderId } };
  } catch (e) {
    if (e instanceof TopupError) return { ok: false, error: e.userMessage };
    console.error("[topup] create failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "PayPal is not responding right now. Nothing was charged. Please try again." };
  }
}

export async function captureTopupOrderAction(orderId: string): Promise<ActionResult<{ amountCents: number }>> {
  const owner = await requireRole("owner");
  try {
    const r = await captureTopup(db(), owner.id, orderId);
    revalidatePath("/owner", "layout");
    if (r.status !== "captured") return { ok: false, error: "PayPal didn't complete the payment, so nothing was added." };
    return { ok: true, data: { amountCents: r.amountCents } };
  } catch (e) {
    if (e instanceof TopupError) return { ok: false, error: e.userMessage };
    console.error("[topup] capture failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "We couldn't confirm the payment with PayPal. If you were charged, it will appear here shortly." };
  }
}
