"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { DomainError } from "@/domain/bounty/service";
import { claimBounty, releaseClaim, setPayPalEmail, submitProof } from "@/domain/work/work";
import { requireRole } from "@/lib/auth";

export type WorkState = { ok?: string; error?: string };

const friendly = (e: unknown) => {
  if (e instanceof DomainError) return e.message;
  console.error("[work] action failed", e instanceof Error ? e.message : e);
  return "Something went wrong. Please try again.";
};

export async function claimAction(_: WorkState, form: FormData): Promise<WorkState> {
  const w = await requireRole("worker");
  try {
    await claimBounty(db(), w.id, String(form.get("bountyId")));
  } catch (e) {
    return { error: friendly(e) };
  }
  redirect("/work/my-task");
}

export async function releaseAction(_: WorkState, form: FormData): Promise<WorkState> {
  const w = await requireRole("worker");
  try {
    await releaseClaim(db(), w.id, String(form.get("claimId")));
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/work", "layout");
  return { ok: "You gave the task back. It's open for others again." };
}

const loc = z.object({ lat: z.number(), lng: z.number(), accuracy_m: z.number().optional() }).nullable();

export async function submitAction(_: WorkState, form: FormData): Promise<WorkState> {
  const w = await requireRole("worker");
  const texts: Record<number, string> = {};
  for (const [k, v] of form.entries()) {
    const m = /^text-(\d+)$/.exec(k);
    if (m) texts[Number(m[1])] = String(v);
  }
  let location: z.infer<typeof loc> = null;
  const rawLoc = form.get("location");
  if (rawLoc) {
    const parsed = loc.safeParse(JSON.parse(String(rawLoc)));
    if (parsed.success) location = parsed.data;
  }
  try {
    await submitProof(db(), w.id, String(form.get("claimId")), { notes: String(form.get("notes") ?? ""), texts, location });
  } catch (e) {
    return { error: friendly(e) };
  }
  revalidatePath("/work", "layout");
  redirect("/work/my-task?submitted=1");
}

const emailSchema = z.email({ error: "Enter the email address of your PayPal account." }).max(254);

export async function paypalEmailAction(_: WorkState, form: FormData): Promise<WorkState> {
  const w = await requireRole("worker");
  const parsed = emailSchema.safeParse(String(form.get("paypalEmail") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await setPayPalEmail(db(), w.id, parsed.data);
  revalidatePath("/work", "layout");
  return { ok: "Saved. Payouts will go to this PayPal account." };
}
