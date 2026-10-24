import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  Clock,
  Hourglass,
  Inbox,
  Lock,
  Scale,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ChecklistResult } from "@/db/schema";

// ---------- Money ----------
export function formatMoney(cents: number, opts: { sign?: boolean } = {}) {
  const abs = Math.abs(cents);
  const s = `$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
  if (cents < 0) return `−${s}`;
  return opts.sign && cents > 0 ? `+${s}` : s;
}

export function Money({ cents, sign, className }: { cents: number; sign?: boolean; className?: string }) {
  return <span className={`money ${className ?? ""}`}>{formatMoney(cents, { sign })}</span>;
}

// ---------- Button ----------
type Variant = "primary" | "secondary" | "quiet" | "danger";
const btnClass = (variant: Variant, extra?: string) => `btn btn-${variant} ${extra ?? ""}`.trim();

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={btnClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={btnClass(variant, className)} {...props} />;
}

// ---------- Status ----------
export type BountyStatus =
  | "created"
  | "screening"
  | "pending_approval"
  | "blocked"
  | "rejected_by_owner"
  | "open"
  | "claimed"
  | "verifying"
  | "needs_owner_review"
  | "rejected"
  | "appealed"
  | "approved"
  | "paying"
  | "paid"
  | "expired"
  | "cancelled";

type Tone = "paid" | "review" | "blocked" | "neutral" | "active";

// UI vocabulary: the UI says "task"; statuses are words + icon + color, never color alone.
export const STATUS_META: Record<BountyStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  created: { label: "Screening", tone: "review", icon: CircleDashed },
  screening: { label: "Screening", tone: "review", icon: CircleDashed },
  pending_approval: { label: "Needs approval", tone: "review", icon: Scale },
  blocked: { label: "Blocked", tone: "blocked", icon: Ban },
  rejected_by_owner: { label: "Declined", tone: "neutral", icon: XCircle },
  open: { label: "Open", tone: "active", icon: CircleDashed },
  claimed: { label: "Claimed", tone: "active", icon: Clock },
  verifying: { label: "Checking proof", tone: "review", icon: Hourglass },
  needs_owner_review: { label: "Needs review", tone: "review", icon: CircleHelp },
  rejected: { label: "Not accepted", tone: "blocked", icon: XCircle },
  appealed: { label: "Appealed", tone: "review", icon: Scale },
  approved: { label: "Approved", tone: "paid", icon: CheckCircle2 },
  paying: { label: "Paying", tone: "paid", icon: Hourglass },
  paid: { label: "Paid", tone: "paid", icon: CheckCircle2 },
  expired: { label: "Expired", tone: "neutral", icon: Clock },
  cancelled: { label: "Cancelled", tone: "neutral", icon: XCircle },
};

export function StatusPill({ status, label }: { status: BountyStatus; label?: string }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={`pill pill-${m.tone}`}>
      <Icon aria-hidden="true" />
      {label ?? m.label}
    </span>
  );
}

export function SetAsideBadge({ cents }: { cents?: number }) {
  return (
    <span className="badge">
      <Lock aria-hidden="true" />
      {cents === undefined ? "Pay set aside" : <>
          <Money cents={cents} /> set aside
        </>}
    </span>
  );
}

export function ScreenedBadge() {
  return (
    <span className="badge badge-quiet">
      <ShieldCheck aria-hidden="true" />
      Safety screened
    </span>
  );
}

// ---------- Balance ----------
export function BalanceCard({ availableCents, heldCents, action }: { availableCents: number; heldCents: number; action?: ReactNode }) {
  return (
    <section className="card" aria-labelledby="balance-heading">
      <div className="spread">
        <h2 id="balance-heading">Balance</h2>
        {action}
      </div>
      <div className="balance">
        <div>
          <div className="balance-label">Available</div>
          <div className="balance-figure">
            <Money cents={availableCents} />
          </div>
          <p className="muted">Ready for new tasks or to withdraw.</p>
        </div>
        <div>
          <div className="balance-label">Set aside</div>
          <div className="balance-figure">
            <Money cents={heldCents} />
          </div>
          <p className="muted">Reserved for open tasks. Paid to workers on approval.</p>
        </div>
      </div>
    </section>
  );
}

// ---------- Checklist ----------
export function Checklist({ items, results }: { items: string[]; results?: ChecklistResult[] }) {
  return (
    <ul className="checklist">
      {items.map((item, i) => {
        const r = results?.find((x) => x.item === item) ?? results?.[i];
        const state = !r ? "todo" : r.passed === true ? "pass" : r.passed === false ? "fail" : "unknown";
        const Icon = state === "pass" ? CheckCircle2 : state === "fail" ? XCircle : state === "unknown" ? CircleHelp : CircleDashed;
        const word = state === "pass" ? "Passed" : state === "fail" ? "Not met" : state === "unknown" ? "Unclear" : "To capture";
        return (
          <li key={i}>
            <Icon aria-hidden="true" className={state === "todo" ? "" : `check-${state}`} />
            <span>
              {item} <span className="visually-hidden">— {word}</span>
              {r && (
                <span className="check-reason">
                  <strong className={`check-${state}`}>{word}.</strong> {r.reason}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Timeline ----------
export type TimelineItem = { at: Date; title: string; why?: string; status?: BountyStatus };

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((it, i) => (
        <li key={i}>
          <time dateTime={it.at.toISOString()}>{formatDateTime(it.at)}</time>
          <div className="row">
            <strong>{it.title}</strong>
            {it.status && <StatusPill status={it.status} />}
          </div>
          {it.why && <div className="why">{it.why}</div>}
        </li>
      ))}
    </ol>
  );
}

export function formatDateTime(d: Date) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

// ---------- States ----------
export function EmptyState({ title, children, action, icon: Icon = Inbox }: { title: string; children?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="state card" role="status">
      <Icon aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-error card" role="alert">
      <AlertTriangle aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className="form-error" role="alert">
      <AlertTriangle aria-hidden="true" width={18} height={18} />
      <span>{children}</span>
    </p>
  );
}
