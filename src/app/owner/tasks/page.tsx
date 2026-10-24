import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Tasks" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>Tasks</h1>
      <EmptyState title="No tasks yet">Tasks your agents post appear here, newest first.</EmptyState>
    </div>
  );
}
