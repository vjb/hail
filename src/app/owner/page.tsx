import type { Metadata } from "next";
import Link from "next/link";
import { BalanceCard, ButtonLink, EmptyState, formatDateTime, Money, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { getBalances } from "@/domain/ledger/ledger";
import { approvalCount, listOwnerBounties } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Overview" };

export default async function OwnerOverview() {
  const user = await requireRole("owner");
  const [bal, recent, waiting] = await Promise.all([getBalances(db(), user.id), listOwnerBounties(db(), user.id, undefined, 6), approvalCount(db(), user.id)]);
  return (
    <div className="stack">
      <div>
        <h1>Overview</h1>
        <p className="muted">Your agents post tasks; Hail screens them, sets the pay aside, and pays the person who does the work.</p>
      </div>
      <BalanceCard availableCents={bal.availableCents} heldCents={bal.heldCents} action={<ButtonLink href="/owner/balance">Add funds</ButtonLink>} />
      {waiting > 0 && (
        <section className="card spread" aria-labelledby="waiting-heading" style={{ borderColor: "var(--review)" }}>
          <div>
            <h2 id="waiting-heading" style={{ margin: 0 }}>
              {waiting} {waiting === 1 ? "task needs" : "tasks need"} your decision
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Review them so your agents and workers aren&apos;t kept waiting.
            </p>
          </div>
          <ButtonLink href="/owner/approvals">Open approvals</ButtonLink>
        </section>
      )}
      {recent.length === 0 ? (
        <EmptyState title="No tasks yet" action={<ButtonLink href="/owner/keys" variant="secondary">Create an API key</ButtonLink>}>
          When one of your agents posts a task, it shows up here with every step it goes through.
        </EmptyState>
      ) : (
        <section className="card stack" aria-labelledby="recent-heading">
          <div className="spread">
            <h2 id="recent-heading" style={{ margin: 0 }}>
              Recent tasks
            </h2>
            <Link href="/owner/tasks">See all</Link>
          </div>
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recent.map((b) => (
              <li key={b.id} className="spread" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "var(--s-2)" }}>
                <div>
                  <Link href={`/owner/tasks/${b.id}`}>{b.title}</Link>
                  <div className="muted" style={{ fontSize: "var(--text-sm)" }}>
                    {formatDateTime(b.createdAt)}
                  </div>
                </div>
                <div className="row">
                  <StatusPill status={b.status} />
                  <Money cents={b.rewardCents} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
