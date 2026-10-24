import type { Metadata } from "next";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { AutoRefresh, Countdown } from "@/components/client";
import { ButtonLink, Checklist, EmptyState, Money, SetAsideBadge, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { activeClaimFor, workerHistory } from "@/domain/work/work";
import { requireRole } from "@/lib/auth";
import { ProofCapture, ReleaseButton } from "../forms";

export const metadata: Metadata = { title: "My task" };

export default async function MyTask() {
  const w = await requireRole("worker");
  const active = await activeClaimFor(db(), w.id);

  if (active) {
    const { claim, bounty: b, photos } = active;
    const initialChecks: Record<number, { usable: boolean; problems: string[]; retakeHint: string } | null> = {};
    b.deliverables.forEach((d, i) => {
      if (d.type !== "photo") return;
      const latest = [...photos].reverse().find((p) => p.slot === i);
      initialChecks[i] = latest?.check ? { usable: latest.check.usable, problems: latest.check.problems, retakeHint: latest.check.retakeHint } : null;
    });
    return (
      <div className="stack">
        <div className="stack-sm">
          <span className="role-pill">Reserved for you</span>
          <h1 style={{ margin: 0 }}>{b.title}</h1>
          <div className="spread">
            <span className="task-pay">
              <Money cents={b.rewardCents} />
            </span>
            <span className="pill pill-active">
              <Hourglass aria-hidden="true" /> <Countdown until={claim.expiresAt.toISOString()} label="Time left on your reservation" /> left
            </span>
          </div>
          <SetAsideBadge cents={b.rewardCents} />
        </div>
        <section className="card card-tight stack-sm" aria-labelledby="todo">
          <h2 id="todo" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
            What to do
          </h2>
          <p style={{ margin: 0 }}>{b.instructions}</p>
          {b.location?.address && <p style={{ margin: 0 }}>Where: {b.location.address}</p>}
          <h3 style={{ margin: 0 }}>Accepted when</h3>
          <Checklist items={b.acceptanceChecklist} />
        </section>
        <ProofCapture claimId={claim.id} deliverables={b.deliverables} initialChecks={initialChecks} />
        <ReleaseButton claimId={claim.id} />
      </div>
    );
  }

  const [latest] = await workerHistory(db(), w.id);
  if (!latest) {
    return (
      <div className="stack">
        <h1>My task</h1>
        <EmptyState title="You haven't claimed a task" action={<ButtonLink href="/work">Find a task</ButtonLink>}>
          When you claim a task, it&apos;s reserved for you here with a countdown.
        </EmptyState>
      </div>
    );
  }

  const { bounty: b, verification: v } = latest;
  const waiting = ["verifying", "approved", "paying", "needs_owner_review", "appealed"].includes(b.status);
  return (
    <div className="stack">
      {waiting && <AutoRefresh everyMs={4000} />}
      <div className="stack-sm">
        <span className="role-pill">Your latest task</span>
        <h1 style={{ margin: 0 }}>{b.title}</h1>
        <div className="row">
          <StatusPill status={b.status} />
          <span className="task-pay">
            <Money cents={b.rewardCents} />
          </span>
        </div>
      </div>
      {b.status === "verifying" && (
        <section className="card stack-sm" role="status">
          <h2 className="row" style={{ margin: 0 }}>
            <Hourglass aria-hidden="true" /> Checking your proof
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            This usually takes under a minute. You can leave this page; we&apos;ll keep your place.
          </p>
        </section>
      )}
      {(b.status === "approved" || b.status === "paying") && (
        <section className="card stack-sm" role="status">
          <h2 className="row" style={{ margin: 0, color: "var(--paid-text)" }}>
            <CheckCircle2 aria-hidden="true" /> Approved, sending your pay
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            <Money cents={b.rewardCents} /> is on its way to your PayPal.
          </p>
        </section>
      )}
      {b.status === "paid" && (
        <section className="card stack-sm" role="status">
          <h2 className="row" style={{ margin: 0, color: "var(--paid-text)" }}>
            <CheckCircle2 aria-hidden="true" /> Paid
          </h2>
          <p style={{ margin: 0 }}>
            <Money cents={b.rewardCents} /> was sent to your PayPal account.
          </p>
          <ButtonLink href="/work">Find another task</ButtonLink>
        </section>
      )}
      {(b.status === "needs_owner_review" || b.status === "appealed") && (
        <section className="card stack-sm" role="status">
          <h2 className="row" style={{ margin: 0 }}>
            <Hourglass aria-hidden="true" /> The owner is reviewing your proof
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            If they don&apos;t respond in time, you&apos;re paid automatically.
          </p>
        </section>
      )}
      {b.status === "rejected" && (
        <section className="card stack-sm" role="alert" style={{ borderColor: "var(--blocked)" }}>
          <h2 className="row" style={{ margin: 0, color: "var(--blocked-text)" }}>
            <XCircle aria-hidden="true" /> Your proof didn&apos;t meet the checklist
          </h2>
          {v && <p style={{ margin: 0 }}>{v.rationale}</p>}
        </section>
      )}
      {v && (
        <section className="card card-tight stack-sm" aria-labelledby="results">
          <h2 id="results" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
            Checklist results
          </h2>
          <Checklist items={b.acceptanceChecklist} results={v.checklistResults} />
        </section>
      )}
    </div>
  );
}
