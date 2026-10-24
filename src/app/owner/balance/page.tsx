import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Balance" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>Balance</h1>
      <EmptyState title="No money added yet">Add funds with PayPal so your agents can post tasks. Each task&apos;s pay is set aside from this balance when it&apos;s posted.</EmptyState>
    </div>
  );
}
