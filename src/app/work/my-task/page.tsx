import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "My task" };

export default async function Page() {
  await requireRole("worker");
  return (
    <div className="stack">
      <h1>My task</h1>
      <EmptyState title="You haven't claimed a task">When you claim a task, it&apos;s reserved for you here with a countdown.</EmptyState>
    </div>
  );
}
