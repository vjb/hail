import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Money, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { categoryLabel, latestScreenings, listOwnerBounties } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";
import { ApproveButtons } from "../forms";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const owner = await requireRole("owner");
  const pending = await listOwnerBounties(db(), owner.id, ["pending_approval"]);
  const screens = await latestScreenings(
    db(),
    pending.map((b) => b.id),
  );
  return (
    <div className="stack">
      <div>
        <h1>Approvals</h1>
        <p className="muted">Tasks the safety screen held for you. The pay is already set aside; declining returns it to your available balance.</p>
      </div>
      {pending.length === 0 ? (
        <EmptyState title="Nothing needs you right now">Tasks the safety screen flags, proof Hail couldn&apos;t confirm, and appeals will wait here for your decision.</EmptyState>
      ) : (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Tasks waiting for approval">
          {pending.map((b) => {
            const s = screens.get(b.id);
            return (
              <li key={b.id} className="card stack-sm">
                <div className="spread">
                  <h2 style={{ margin: 0 }}>
                    <Link href={`/owner/tasks/${b.id}`}>{b.title}</Link>
                  </h2>
                  <span className="task-pay">
                    <Money cents={b.rewardCents} />
                  </span>
                </div>
                <div className="row">
                  <StatusPill status={b.status} />
                  <span className="muted">{categoryLabel(s?.category)}</span>
                </div>
                {s && <p className="why" style={{ borderLeft: "3px solid var(--review)", paddingLeft: "var(--s-3)" }}>{s.rationale}</p>}
                <p className="muted" style={{ margin: 0 }}>
                  {b.instructions.length > 240 ? b.instructions.slice(0, 240) + "…" : b.instructions}
                </p>
                <ApproveButtons bountyId={b.id} title={b.title} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
