import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function Page() {
  await requireRole("worker");
  return (
    <div className="stack">
      <h1>Account</h1>
      <EmptyState title="PayPal email">Add the PayPal email you want to be paid to. You need one before you can claim a task.</EmptyState>
    </div>
  );
}
