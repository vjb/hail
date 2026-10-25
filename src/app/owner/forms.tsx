"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { FormError } from "@/components/ui";
import { appealDecisionAction, approveAction, cancelAction, createKeyAction, reviewAction, revokeKeyAction, savePolicyAction, withdrawAction, type FormState } from "./actions";

function Notice({ state }: { state: FormState }) {
  if (state.error) return <FormError>{state.error}</FormError>;
  if (state.ok)
    return (
      <p className="badge" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function ApproveButtons({ bountyId, title }: { bountyId: string; title: string }) {
  const [state, action, pending] = useActionState(approveAction, {});
  const router = useRouter();
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(t);
  }, [state.ok, router]);
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <Notice state={state} />
      <div className="row">
        <button type="submit" name="decision" value="approve" className="btn btn-primary" disabled={pending} aria-label={`Approve task: ${title}`}>
          Approve
        </button>
        <button type="submit" name="decision" value="reject" className="btn btn-danger" disabled={pending} aria-label={`Decline task: ${title}`}>
          Decline
        </button>
      </div>
    </form>
  );
}

export function ReviewButtons({ bountyId, title }: { bountyId: string; title: string }) {
  const [state, action, pending] = useActionState(reviewAction, {});
  const router = useRouter();
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(t);
  }, [state.ok, router]);
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <div className="field">
        <label htmlFor={`note-${bountyId}`}>Note for the worker (optional)</label>
        <input id={`note-${bountyId}`} name="note" maxLength={500} placeholder="e.g. The serial plate is cut off" />
      </div>
      <Notice state={state} />
      <div className="row">
        <button type="submit" name="decision" value="approve" className="btn btn-primary" disabled={pending} aria-label={`Accept proof and pay: ${title}`}>
          Accept and pay
        </button>
        <button type="submit" name="decision" value="reject" className="btn btn-danger" disabled={pending} aria-label={`Reject proof: ${title}`}>
          Reject proof
        </button>
        <button type="submit" name="decision" value="fake" className="btn btn-quiet" disabled={pending} aria-label={`Report proof as not genuine: ${title}`}>
          Report as not genuine
        </button>
      </div>
    </form>
  );
}

export function CancelButton({ bountyId }: { bountyId: string }) {
  const [state, action, pending] = useActionState(cancelAction, {});
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <Notice state={state} />
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        Cancel task
      </button>
    </form>
  );
}

export function CreateKeyForm() {
  const [state, action, pending] = useActionState(createKeyAction, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "2 1 200px" }}>
          <label htmlFor="key-name">Key name</label>
          <input id="key-name" name="name" placeholder="e.g. purchasing-agent" required maxLength={60} />
        </div>
        <div className="field" style={{ flex: "1 1 140px" }}>
          <label htmlFor="key-cap">Daily cap (USD)</label>
          <input id="key-cap" name="cap" inputMode="decimal" defaultValue="100" required aria-describedby="cap-hint" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Create key
        </button>
      </div>
      <span id="cap-hint" className="hint muted" style={{ fontSize: "var(--text-sm)" }}>
        The most this key can set aside for tasks in one day.
      </span>
      <Notice state={state} />
      {state.rawKey && (
        <div className="card card-tight stack-sm" style={{ background: "var(--tint-signal)" }}>
          <label htmlFor="new-key" className="balance-label">
            Your new API key
          </label>
          <div className="row">
            <input id="new-key" className="input mono" readOnly value={state.rawKey} data-secret style={{ flex: 1, minWidth: 0 }} onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.rawKey!).catch(() => {});
                setCopied(true);
              }}
            >
              <Copy aria-hidden="true" width={16} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export function RevokeKeyButton({ keyId, name }: { keyId: string; name: string }) {
  const [state, action, pending] = useActionState(revokeKeyAction, {});
  if (state.ok) return <span className="muted">Revoked</span>;
  return (
    <form action={action}>
      <input type="hidden" name="keyId" value={keyId} />
      <button type="submit" className="btn btn-quiet" disabled={pending} aria-label={`Revoke key ${name}`}>
        Revoke
      </button>
    </form>
  );
}

export function PolicyForm({ threshold, maxOpen, perHour, categories, selected }: { threshold: number; maxOpen: number; perHour: number; categories: Array<{ id: string; label: string }>; selected: string[] }) {
  const [state, action, pending] = useActionState(savePolicyAction, {});
  const all = selected.length === 0;
  return (
    <form action={action} className="stack">
      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="threshold">Approval threshold (USD)</label>
        <input id="threshold" name="threshold" inputMode="decimal" defaultValue={(threshold / 100).toFixed(2)} aria-describedby="threshold-hint" />
        <span id="threshold-hint" className="hint">
          Tasks paying this much or more wait for your approval.
        </span>
      </div>
      <div className="row">
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor="maxOpen">Most open tasks at once</label>
          <input id="maxOpen" name="maxOpen" inputMode="numeric" defaultValue={maxOpen} />
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor="perHour">Most new tasks per key per hour</label>
          <input id="perHour" name="perHour" inputMode="numeric" defaultValue={perHour} />
        </div>
      </div>
      <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="balance-label" style={{ marginBottom: "var(--s-2)" }}>
          Kinds of task your agents may post without asking you
        </legend>
        {categories.map((c) => (
          <label key={c.id} className="row" style={{ gap: "var(--s-2)", minHeight: 32 }}>
            <input type="checkbox" name="categories" value={c.id} defaultChecked={all || selected.includes(c.id)} style={{ width: 20, height: 20 }} />
            {c.label}
          </label>
        ))}
        <span className="hint muted" style={{ fontSize: "var(--text-sm)" }}>
          Anything unchecked waits for your approval. Blocked kinds of task are never allowed.
        </span>
      </fieldset>
      <Notice state={state} />
      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Save policy
        </button>
      </div>
    </form>
  );
}

export function AppealButtons({ bountyId, title }: { bountyId: string; title: string }) {
  const [state, action, pending] = useActionState(appealDecisionAction, {});
  const router = useRouter();
  useEffect(() => {
    if (!state.ok) return;
    const t = setTimeout(() => router.refresh(), 2500);
    return () => clearTimeout(t);
  }, [state.ok, router]);
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <div className="field">
        <label htmlFor={`appeal-note-${bountyId}`}>Note for the worker (optional)</label>
        <input id={`appeal-note-${bountyId}`} name="note" maxLength={500} />
      </div>
      <Notice state={state} />
      <div className="row">
        <button type="submit" name="decision" value="approve" className="btn btn-primary" disabled={pending} aria-label={`Accept appeal and pay: ${title}`}>
          Accept appeal and pay
        </button>
        <button type="submit" name="decision" value="reject" className="btn btn-danger" disabled={pending} aria-label={`Decline appeal: ${title}`}>
          Decline appeal
        </button>
      </div>
    </form>
  );
}

export function WithdrawForm({ availableCents }: { availableCents: number }) {
  const [state, action, pending] = useActionState(withdrawAction, {});
  return (
    <form action={action} className="stack-sm">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="withdraw-amount">Withdraw amount (USD)</label>
          <input id="withdraw-amount" name="amount" inputMode="decimal" placeholder={(availableCents / 100).toFixed(2)} aria-describedby="withdraw-hint" required />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={pending || availableCents < 100}>
          {pending ? "Withdrawing…" : "Withdraw to PayPal"}
        </button>
      </div>
      <span id="withdraw-hint" className="hint muted" style={{ fontSize: "var(--text-sm)" }}>
        Up to your available balance. Money set aside for tasks stays put. Refunds go back to the PayPal account you paid with.
      </span>
      <Notice state={state} />
    </form>
  );
}
