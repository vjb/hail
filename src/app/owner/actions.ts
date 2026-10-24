"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { ownerPolicies } from "@/db/schema";
import { cancelBounty, decideApproval, decideReview, DomainError } from "@/domain/bounty/service";
import { createApiKey, revokeApiKey } from "@/domain/keys/keys";
import { SCREEN_CATEGORIES } from "@/ai/provider";
import { requireRole } from "@/lib/auth";
import { decideAppeal } from "@/domain/timers/timers";
import { withdraw } from "@/domain/withdrawals/withdrawals";

export type FormState = { ok?: string; error?: string; rawKey?: string };

const friendly = (e: unknown) => (e instanceof DomainError ? e.message : "Something went wrong. Please try again.");

export async function approveAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const id = String(form.get("bountyId"));
  const approve = form.get("decision") === "approve";
  try {
    await decideApproval(db(), owner.id, id, approve);
  } catch (e) {
    return { error: friendly(e) };
  }
  // No revalidate here: the client shows the confirmation, then refreshes the queue.
  return { ok: approve ? "Approved. The task is now open to workers." : "Declined. The money set aside is back in your available balance." };
}

export async function reviewAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || undefined;
  try {
    await decideReview(db(), owner.id, String(form.get("bountyId")), approve, note);
  } catch (e) {
    return { error: friendly(e) };
  }
  return { ok: approve ? "Accepted. The worker is being paid." : "Rejected. The worker can appeal once." };
}

export async function cancelAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  try {
    await cancelBounty(db(), owner.id, String(form.get("bountyId")), `owner:${owner.id}`);
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/owner", "layout");
  return { ok: "Cancelled. The money set aside is back in your available balance." };
}

const keySchema = z.object({
  name: z.string().trim().min(1, "Give the key a name.").max(60, "Use 60 characters or fewer."),
  cap: z.coerce.number({ error: "Enter a daily cap in dollars." }).min(1, "The daily cap must be at least $1.").max(10_000, "The daily cap can be at most $10,000."),
});

export async function createKeyAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const parsed = keySchema.safeParse({ name: form.get("name"), cap: form.get("cap") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const k = await createApiKey(db(), { ownerId: owner.id, name: parsed.data.name, dailyCapCents: Math.round(parsed.data.cap * 100) });
  revalidatePath("/owner/keys");
  return { ok: `Key "${parsed.data.name}" created. Copy it now; it won't be shown again.`, rawKey: k.raw };
}

export async function revokeKeyAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  await revokeApiKey(db(), owner.id, String(form.get("keyId")));
  revalidatePath("/owner/keys");
  return { ok: "Key revoked. Agents using it can no longer post." };
}

const policySchema = z.object({
  threshold: z.coerce.number().min(1, "The approval threshold must be at least $1.").max(200, "The approval threshold can be at most $200."),
  maxOpen: z.coerce.number().int().min(1, "Allow at least 1 open task.").max(500),
  perHour: z.coerce.number().int().min(1, "Allow at least 1 task per hour.").max(1000),
});

export async function savePolicyAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const parsed = policySchema.safeParse({ threshold: form.get("threshold"), maxOpen: form.get("maxOpen"), perHour: form.get("perHour") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const allowed = form.getAll("categories").map(String).filter((c) => (SCREEN_CATEGORIES.allowed as readonly string[]).includes(c));
  const values = {
    approvalThresholdCents: Math.round(parsed.data.threshold * 100),
    maxOpenBounties: parsed.data.maxOpen,
    maxBountiesPerHour: parsed.data.perHour,
    allowedCategories: allowed.length === SCREEN_CATEGORIES.allowed.length ? [] : allowed,
    updatedAt: new Date(),
  };
  await db().insert(ownerPolicies).values({ ownerId: owner.id, ...values }).onConflictDoUpdate({ target: ownerPolicies.ownerId, set: values });
  void eq;
  revalidatePath("/owner/policy");
  return { ok: "Policy saved." };
}

export async function appealDecisionAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const accept = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || undefined;
  try {
    await decideAppeal(db(), owner.id, String(form.get("bountyId")), accept, note);
  } catch (e) {
    return { error: friendly(e) };
  }
  return { ok: accept ? "Appeal accepted. The worker is being paid." : "Appeal declined. The task reopens for another worker." };
}

export async function withdrawAction(_: FormState, form: FormData): Promise<FormState> {
  const owner = await requireRole("owner");
  const dollars = Number(String(form.get("amount") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(dollars) || dollars <= 0) return { error: "Enter an amount to withdraw." };
  try {
    const r = await withdraw(db(), owner.id, Math.round(dollars * 100));
    revalidatePath("/owner", "layout");
    if (r.refundedCents === r.amountCents) return { ok: `$${(r.refundedCents / 100).toFixed(2)} is on its way back to your PayPal account.` };
    if (r.refundedCents > 0) return { error: `Only $${(r.refundedCents / 100).toFixed(2)} could be refunded. The rest is back in your available balance.` };
    return { error: "PayPal couldn't process the refund. Nothing was withdrawn; please try again later." };
  } catch (e) {
    return { error: friendly(e) };
  }
}
