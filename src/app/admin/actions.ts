"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth";

/** Lifts a worker's suspension (for example after checking a disputed report). */
export async function liftSuspensionAction(form: FormData) {
  await requireRole("admin");
  await db().update(users).set({ suspendedAt: null, suspendedReason: null, suspendedBountyId: null }).where(eq(users.id, String(form.get("workerId"))));
  revalidatePath("/admin");
}
