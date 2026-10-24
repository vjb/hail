import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { EmptyState, formatDateTime, Money, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { bounties, payouts } from "@/db/schema";
import { workerHistory } from "@/domain/work/work";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Earnings" };

const PAYOUT_LABEL: Record<string, string> = {
  pending: "Preparing",
  sent: "Sent to PayPal",
  succeeded: "In your PayPal",
  failed: "Failed, we're retrying",
  unclaimed: "Waiting for you to claim in PayPal",
  returned: "Returned by PayPal",
  blocked: "Held by PayPal",
};

export default async function Earnings() {
  const w = await requireRole("worker");
  const [rows, history] = await Promise.all([
    db()
      .select({ p: payouts, title: bounties.title })
      .from(payouts)
      .innerJoin(bounties, eq(bounties.id, payouts.bountyId))
      .where(eq(payouts.workerId, w.id))
      .orderBy(desc(payouts.createdAt)),
    workerHistory(db(), w.id),
  ]);
  const paid = rows.filter((r) => r.p.status === "succeeded").reduce((s, r) => s + r.p.amountCents, 0);
  const pending = rows.filter((r) => r.p.status !== "succeeded").reduce((s, r) => s + r.p.amountCents, 0);
  const unpaidWork = history.filter((h) => !rows.some((r) => r.p.bountyId === h.bounty.id));

  return (
    <div className="stack">
      <h1>Earnings</h1>
      <section className="card card-tight balance" aria-label="Earnings totals">
        <div>
          <div className="balance-label">Paid to your PayPal</div>
          <div className="balance-figure">
            <Money cents={paid} />
          </div>
        </div>
        <div>
          <div className="balance-label">On the way</div>
          <div className="balance-figure">
            <Money cents={pending} />
          </div>
        </div>
      </section>
      {rows.length === 0 && unpaidWork.length === 0 ? (
        <EmptyState title="No earnings yet">Payouts to your PayPal account appear here with their status.</EmptyState>
      ) : (
        <>
          {rows.length > 0 && (
            <section className="stack-sm" aria-labelledby="payouts">
              <h2 id="payouts">Payouts</h2>
              <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {rows.map(({ p, title }) => (
                  <li key={p.id} className="card card-tight spread">
                    <div>
                      <strong>{title}</strong>
                      <div className="muted" style={{ fontSize: "var(--text-sm)" }}>
                        {formatDateTime(p.createdAt)} · {PAYOUT_LABEL[p.status] ?? p.status}
                      </div>
                    </div>
                    <span className="task-pay">
                      <Money cents={p.amountCents} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {unpaidWork.length > 0 && (
            <section className="stack-sm" aria-labelledby="submitted">
              <h2 id="submitted">Submitted work</h2>
              <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {unpaidWork.map(({ submission, bounty }) => (
                  <li key={submission.id} className="card card-tight spread">
                    <div>
                      <strong>{bounty.title}</strong>
                      <div className="muted" style={{ fontSize: "var(--text-sm)" }}>
                        Submitted {formatDateTime(submission.createdAt)}
                      </div>
                    </div>
                    <StatusPill status={bounty.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
