import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Tasks near you" };

export default async function WorkerTasks() {
  await requireRole("worker");
  return (
    <div className="stack">
      <div>
        <span className="role-pill">For local earners · Paid through PayPal</span>
        <h1>Tasks near you</h1>
        <p className="muted">Every task&apos;s pay is set aside before you see it. Claim one, take the photos, and get paid when your proof checks out.</p>
      </div>
      <EmptyState title="No open tasks right now">New tasks appear here as soon as they&apos;re posted. Check back soon.</EmptyState>
    </div>
  );
}
