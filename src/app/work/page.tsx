import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/client";
import { ButtonLink, EmptyState, TaskCard } from "@/components/ui";
import { db } from "@/db/client";
import { activeClaimFor, listOpenBounties } from "@/domain/work/work";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Tasks near you" };

export default async function WorkerTasks() {
  const w = await requireRole("worker");
  const [mine, open] = await Promise.all([activeClaimFor(db(), w.id), listOpenBounties(db())]);
  return (
    <div className="stack">
      <AutoRefresh everyMs={15000} />
      <div>
        <span className="role-pill">For local earners · Paid through PayPal</span>
        <h1>Tasks near you</h1>
        <p className="muted">Every task&apos;s pay is set aside before you see it. Claim one, take the photos, and get paid when your proof checks out.</p>
      </div>
      {!w.paypalEmail && (
        <div className="card card-tight spread" style={{ borderColor: "var(--signal)" }}>
          <span>Add your PayPal email so we can pay you.</span>
          <ButtonLink href="/work/settings" variant="secondary">
            Add PayPal email
          </ButtonLink>
        </div>
      )}
      {mine && (
        <div className="card card-tight spread" style={{ borderColor: "var(--signal)" }}>
          <span>
            You&apos;re working on <strong>{mine.bounty.title}</strong>.
          </span>
          <ButtonLink href="/work/my-task">Continue</ButtonLink>
        </div>
      )}
      {open.length === 0 ? (
        <EmptyState title="No open tasks right now">New tasks appear here as soon as they&apos;re posted. Check back soon.</EmptyState>
      ) : (
        <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Open tasks">
          {open.map((b) => (
            <li key={b.id}>
              <TaskCard href={`/work/tasks/${b.id}`} title={b.title} rewardCents={b.rewardCents} deliverables={b.deliverables} expiresAt={b.expiresAt} place={b.location?.address} />
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
        Questions about how you get paid? See <Link href="/work/earnings">Earnings</Link>.
      </p>
    </div>
  );
}
