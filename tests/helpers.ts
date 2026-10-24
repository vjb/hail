import { db } from "@/db/client";
import { users } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function makeUser(role: "owner" | "worker" | "admin" = "owner", extra: Partial<typeof users.$inferInsert> = {}) {
  const id = newId("usr");
  await db()
    .insert(users)
    .values({ id, role, name: `${role} ${id}`, email: `${id}@test.hail`, passwordHash: "x", ...extra });
  return id;
}
