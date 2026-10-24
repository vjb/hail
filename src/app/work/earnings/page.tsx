import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Earnings" };

export default async function Page() {
  await requireRole("worker");
  return (
    <div className="stack">
      <h1>Earnings</h1>
      <EmptyState title="No earnings yet">Payouts to your PayPal account appear here with their status.</EmptyState>
    </div>
  );
}
