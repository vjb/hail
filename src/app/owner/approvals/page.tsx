import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Approvals" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>Approvals</h1>
      <EmptyState title="Nothing needs you right now">Tasks the safety screen flags, proof Hail couldn&apos;t confirm, and appeals will wait here for your decision.</EmptyState>
    </div>
  );
}
