import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Control room" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>Control room</h1>
      <EmptyState title="The control room opens soon">Live numbers for money set aside, payouts, blocked attempts and more.</EmptyState>
    </div>
  );
}
