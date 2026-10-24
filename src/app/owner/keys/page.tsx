import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "API keys" };

export default async function Page() {
  await requireRole("owner");
  return (
    <div className="stack">
      <h1>API keys</h1>
      <EmptyState title="No API keys yet">Create a key for each agent. Every key has its own daily spending cap.</EmptyState>
    </div>
  );
}
