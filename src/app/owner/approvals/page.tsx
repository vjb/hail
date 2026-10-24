import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Money, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { ProofView } from "@/components/ProofView";
import { categoryLabel, latestProof, latestScreenings, listOwnerBounties } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";
import { latestAppeal } from "@/domain/timers/timers";
import { AppealButtons, ApproveButtons, ReviewButtons } from "../forms";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const owner = await requireRole("owner");
  const pending = await listOwnerBounties(db(), owner.id, ["pending_approval"]);
  const reviews = await listOwnerBounties(db(), owner.id, ["needs_owner_review"]);
  const proofs = await Promise.all(reviews.map((b) => latestProof(db(), owner.id, b.id)));
  const appealed = await listOwnerBounties(db(), owner.id, ["appealed"]);
  const appealInfo = await Promise.all(appealed.map(async (b) => ({ appeal: await latestAppeal(db(), b.id), proof: await latestProof(db(), owner.id, b.id) })));
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
      {reviews.length > 0 && (
        <section className="stack" aria-labelledby="review-heading">
          <h2 id="review-heading">Proof to review</h2>
          <p className="muted" style={{ margin: 0 }}>
            Hail couldn&apos;t confidently confirm this proof. If you don&apos;t decide within the review window, the worker is paid automatically.
          </p>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Proof waiting for your review">
            {reviews.map((b, i) => {
              const pr = proofs[i];
              return (
                <li key={b.id} className="card stack-sm" style={{ borderColor: "var(--review)" }}>
                  <div className="spread">
                    <h3 style={{ margin: 0 }}>
                      <Link href={`/owner/tasks/${b.id}`}>{b.title}</Link>
                    </h3>
                    <span className="task-pay">
                      <Money cents={b.rewardCents} />
                    </span>
                  </div>
                  {pr && (
                    <ProofView
                      photoIds={pr.submission.photoIds}
                      labels={b.deliverables.filter((d) => d.type === "photo").map((d) => d.description)}
                      notes={pr.submission.notes}
                      location={pr.submission.location ?? null}
                      submittedAt={pr.submission.createdAt}
                      checklist={b.acceptanceChecklist}
                      results={pr.verification?.checklistResults}
                      summary={pr.verification?.rationale}
                    />
                  )}
                  <ReviewButtons bountyId={b.id} title={b.title} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {appealed.length > 0 && (
        <section className="stack" aria-labelledby="appeals-heading">
          <h2 id="appeals-heading">Appeals</h2>
          <p className="muted" style={{ margin: 0 }}>
            A worker disagrees with a rejection. If you don&apos;t decide within the review window, the worker is paid automatically.
          </p>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Appeals waiting for you">
            {appealed.map((b, i) => {
              const { appeal, proof } = appealInfo[i];
              return (
                <li key={b.id} className="card stack-sm" style={{ borderColor: "var(--review)" }}>
                  <div className="spread">
                    <h3 style={{ margin: 0 }}>
                      <Link href={`/owner/tasks/${b.id}`}>{b.title}</Link>
                    </h3>
                    <span className="task-pay">
                      <Money cents={b.rewardCents} />
                    </span>
                  </div>
                  {appeal && (
                    <p style={{ margin: 0 }}>
                      <strong>Worker says:</strong> {appeal.reason}
                    </p>
                  )}
                  {proof && (
                    <ProofView
                      photoIds={proof.submission.photoIds}
                      labels={b.deliverables.filter((d) => d.type === "photo").map((d) => d.description)}
                      notes={proof.submission.notes}
                      location={proof.submission.location ?? null}
                      submittedAt={proof.submission.createdAt}
                      checklist={b.acceptanceChecklist}
                      results={proof.verification?.checklistResults}
                      summary={proof.verification?.rationale}
                    />
                  )}
                  <AppealButtons bountyId={b.id} title={b.title} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {pending.length > 0 && <h2>Tasks waiting for approval</h2>}
      {pending.length === 0 && reviews.length === 0 && appealed.length === 0 ? (
        <EmptyState title="Nothing needs you right now">Tasks the safety screen flags, proof Hail couldn&apos;t confirm, and appeals will wait here for your decision.</EmptyState>
      ) : pending.length === 0 ? null : (
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
