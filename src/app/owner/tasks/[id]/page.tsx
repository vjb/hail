import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { Checklist, formatDateTime, Money, ScreenedBadge, SetAsideBadge, StatusPill, Timeline, type TimelineItem } from "@/components/ui";
import { db } from "@/db/client";
import { certificateUrl } from "@/domain/proof/certificate";
import { HOLDS_FUNDS } from "@/domain/bounty/state";
import { ProofView } from "@/components/ProofView";
import { bountyDetail, categoryLabel, latestProof } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";
import { latestAppeal } from "@/domain/timers/timers";
import { AppealButtons, ApproveButtons, CancelButton, ReviewButtons } from "../../forms";

export const metadata: Metadata = { title: "Task" };

const EVENT_TITLE: Record<string, string> = {
  screen_start: "Posted by your agent",
  screen_allow: "Passed the safety screen",
  screen_needs_approval: "Held for your approval",
  screen_block: "Blocked by the safety screen",
  owner_approve: "You approved it",
  owner_reject: "You declined it",
  cancel: "Cancelled",
  claim: "Claimed by a worker",
  claim_expire: "Claim timed out; reopened",
  submit: "Proof submitted",
  verify_pass: "Proof verified",
  verify_fail: "Proof didn't meet the checklist",
  verify_uncertain: "Needs your review",
  review_approve: "You accepted the proof",
  review_reject: "You rejected the proof",
  review_lapse: "Accepted automatically (review window passed)",
  appeal: "Worker appealed",
  appeal_approve: "Appeal accepted",
  appeal_reject: "Appeal declined; reopened",
  appeal_lapse: "Appeal accepted automatically (review window passed)",
  reopen: "Reopened for another worker",
  start_payout: "Payout sent to PayPal",
  payout_succeeded: "Paid",
  expire: "Expired",
};

export default async function TaskDetail({ params }: PageProps<"/owner/tasks/[id]">) {
  const owner = await requireRole("owner");
  const { id } = await params;
  const d = await bountyDetail(db(), owner.id, id);
  if (!d) notFound();
  const { bounty: b, events, screens } = d;
  const proof = await latestProof(db(), owner.id, b.id);
  const appeal = await latestAppeal(db(), b.id);
  const final = [...screens].reverse().find((s) => s.layer === "final");
  const timeline: TimelineItem[] = events.map((e) => {
    const detail = e.detail as { event?: string; rationale?: string; note?: string };
    return { at: e.createdAt, title: EVENT_TITLE[detail.event ?? ""] ?? e.toStatus, status: e.toStatus, why: detail.rationale ?? detail.note };
  });

  return (
    <div className="stack">
      <Link href="/owner/tasks" className="btn btn-quiet" style={{ alignSelf: "flex-start" }}>
        <ArrowLeft aria-hidden="true" width={18} /> All tasks
      </Link>
      <div className="spread">
        <div>
          <h1>{b.title}</h1>
          <div className="row">
            <StatusPill status={b.status} />
            {HOLDS_FUNDS.includes(b.status) && <SetAsideBadge cents={b.rewardCents} />}
            {b.status !== "blocked" && final && <ScreenedBadge />}
          </div>
        </div>
        <div className="task-pay" aria-label="Pay">
          <Money cents={b.rewardCents} />
        </div>
      </div>

      {b.status === "pending_approval" && (
        <section className="card stack" aria-labelledby="decide" style={{ borderColor: "var(--review)" }}>
          <h2 id="decide">Your approval is needed</h2>
          {final && <p>{final.rationale}</p>}
          <ApproveButtons bountyId={b.id} title={b.title} />
        </section>
      )}

      {proof && (
        <section className="card stack" aria-labelledby="proof" style={b.status === "needs_owner_review" ? { borderColor: "var(--review)" } : undefined}>
          <div className="spread">
            <h2 id="proof" style={{ margin: 0 }}>
              {b.status === "needs_owner_review" ? "Proof to review" : "Proof"}
            </h2>
            {proof.verification &&
              (proof.verification.result !== "pass" && ["approved", "paying", "paid"].includes(b.status) ? (
                // Accepted after review or appeal: the verifier's doubt is history, not the outcome (DL-2-02).
                <span className="pill pill-paid">Accepted after review</span>
              ) : (
                <span className={`pill pill-${proof.verification.result === "pass" ? "paid" : proof.verification.result === "fail" ? "blocked" : "review"}`}>
                  {proof.verification.result === "pass" ? "Verified" : proof.verification.result === "fail" ? "Not met" : "Unclear"}
                </span>
              ))}
          </div>
          <ProofView
            photoIds={proof.submission.photoIds}
            labels={b.deliverables.filter((x) => x.type === "photo").map((x) => x.description)}
            notes={proof.submission.notes}
            location={proof.submission.location ?? null}
            submittedAt={proof.submission.createdAt}
            checklist={b.acceptanceChecklist}
            results={proof.verification?.checklistResults}
            summary={proof.verification?.rationale}
            proofChecks={proof.verification?.proofChecks}
          />
          {proof.payout && (
            <p className="muted" style={{ margin: 0 }}>
              Payout <Money cents={proof.payout.amountCents} /> to the worker&apos;s PayPal: {proof.payout.status === "succeeded" ? "delivered" : proof.payout.status === "sent" ? "sent, waiting for PayPal" : proof.payout.status}.
            </p>
          )}
          {["approved", "paying", "paid"].includes(b.status) && (
            <p style={{ margin: 0 }}>
              <a href={certificateUrl(b.id)} target="_blank" rel="noreferrer">
                Open the proof certificate
              </a>{" "}
              <span className="muted">(shareable: fingerprints and checks, no photos)</span>
            </p>
          )}
          {b.status === "needs_owner_review" && <ReviewButtons bountyId={b.id} title={b.title} />}
          {appeal && (
            <div className="stack-sm" style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-3)" }}>
              <h3 style={{ margin: 0 }}>Appeal</h3>
              <p style={{ margin: 0 }}>
                <strong>Worker says:</strong> {appeal.reason}
              </p>
              {appeal.decision && <p className="muted" style={{ margin: 0 }}>Decision: {appeal.decision === "approved" ? "accepted" : "declined"}{appeal.decidedBy === "sweeper" ? " automatically (review window passed)" : ""}.</p>}
              {b.status === "appealed" && <AppealButtons bountyId={b.id} title={b.title} />}
            </div>
          )}
        </section>
      )}

      <div className="split">
        <section className="card stack" aria-labelledby="what">
          <h2 id="what">What the worker is asked to do</h2>
          <p>{b.instructions}</p>
          {b.location?.address && (
            <p className="row">
              <MapPin aria-hidden="true" width={18} /> {b.location.address}
            </p>
          )}
          {b.product && (
            <div className="row" style={{ alignItems: "flex-start", background: "var(--paper)", borderRadius: 8, padding: "var(--s-3)" }}>
              {b.product.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.product.image_url} alt={`Product photo: ${b.product.title}`} width={72} height={72} style={{ borderRadius: 8, objectFit: "cover", background: "var(--surface)" }} />
              )}
              <div className="stack-sm" style={{ flex: 1 }}>
                <span className="balance-label">Product reference (from Channel3)</span>
                <strong>{b.product.title}</strong>
                <span className="muted">
                  {[b.product.retailer, b.product.price_cents !== undefined ? `$${(b.product.price_cents / 100).toFixed(2)}` : null].filter(Boolean).join(" · ")}
                </span>
              </div>
            </div>
          )}
          <h3>What to capture</h3>
          <ul>
            {b.deliverables.map((x, i) => (
              <li key={i}>
                {x.type === "photo" ? "Photo" : x.type === "text" ? "Note" : "Location"}: {x.description}
              </li>
            ))}
          </ul>
          <h3>Accepted when</h3>
          <Checklist items={b.acceptanceChecklist} />
          <p className="muted">Expires {formatDateTime(b.expiresAt)}.</p>
          {(b.status === "open" || b.status === "pending_approval") && <CancelButton bountyId={b.id} />}
        </section>

        <section className="card stack" aria-labelledby="screen">
          <h2 id="screen">Safety screen</h2>
          {final ? (
            <>
              <p>
                <strong>{final.decision === "allow" ? "Allowed" : final.decision === "block" ? "Blocked" : "Needs your approval"}</strong> · {categoryLabel(final.category)}
              </p>
              <p>{final.rationale}</p>
              <details>
                <summary>How it was checked</summary>
                <ul>
                  {screens
                    .filter((s) => s.layer !== "final")
                    .map((s) => (
                      <li key={s.id}>
                        {s.layer === "rules" ? "Rule check" : "AI check"}: {s.decision.replace(/_/g, " ")} ({categoryLabel(s.category)}
                        {s.confidence != null ? `, ${Math.round(s.confidence * 100)}% confident` : ""}). {s.rationale}
                      </li>
                    ))}
                </ul>
              </details>
            </>
          ) : (
            <p className="muted">Not screened yet.</p>
          )}
          <h2>History</h2>
          <Timeline items={timeline} />
        </section>
      </div>
    </div>
  );
}
