import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Policy" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>Policy</h1>
      <EmptyState title="Default policy">Tasks paying $50.00 or more need your approval. You can change this soon.</EmptyState>
    </div>
  );
}
