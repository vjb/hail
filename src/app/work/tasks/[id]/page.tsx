import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Clock, MapPin, NotebookPen } from "lucide-react";
import { ButtonLink, Checklist, effortSummary, Money, ScreenedBadge, SetAsideBadge, StatusPill, timeLeft } from "@/components/ui";
import { db } from "@/db/client";
import { bounties } from "@/db/schema";
import { activeClaimFor, getWorker } from "@/domain/work/work";
import { env } from "@/lib/env";
import { placeOf } from "@/lib/geo";
import { DistanceToTask } from "@/components/client";
import { requireRole } from "@/lib/auth";
import { scaled, WINDOWS } from "@/lib/time";
import { eq } from "drizzle-orm";
import { ClaimButton } from "../../forms";

export const metadata: Metadata = { title: "Task" };

export default async function WorkerTaskDetail({ params }: PageProps<"/work/tasks/[id]">) {
  const w = await requireRole("worker");
  const { id } = await params;
  const [b] = await db().select().from(bounties).where(eq(bounties.id, id));
  // Workers only see tasks that are open (or their own reserved task).
  const mine = await activeClaimFor(db(), w.id);
  if (!b || (b.status !== "open" && mine?.bounty.id !== b.id)) notFound();
  const claimMinutes = Math.round(scaled(WINDOWS.claim) / 60_000);
  const connectNeeded = env().PAYPAL_LOGIN_ENABLED && !(await getWorker(db(), w.id)).paypalConnectedAt;

  return (
    <div className="stack">
      <Link href="/work" className="btn btn-quiet" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
        <ArrowLeft aria-hidden="true" width={18} /> All tasks
      </Link>
      <div className="stack-sm">
        <h1 style={{ margin: 0 }}>{b.title}</h1>
        <div className="task-pay" style={{ fontSize: "var(--text-2xl)" }}>
          <Money cents={b.rewardCents} />
        </div>
        <div className="row" style={{ gap: "var(--s-2)" }}>
          <SetAsideBadge cents={b.rewardCents} />
          <ScreenedBadge />
          {b.status !== "open" && <StatusPill status={b.status} />}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          The pay is already set aside for this task. You&apos;re paid to your PayPal when your proof checks out.
        </p>
      </div>

      <section className="card card-tight stack-sm" aria-labelledby="before">
        <h2 id="before" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
          Before you claim
        </h2>
        <ul className="icon-list">
          <li>
            <Camera aria-hidden="true" />
            <span>You&apos;ll capture: {effortSummary(b.deliverables)}</span>
          </li>
          <li>
            <Clock aria-hidden="true" />
            <span>
              Claiming reserves it for you for {claimMinutes} minutes. Task {timeLeft(b.expiresAt).toLowerCase()}.
            </span>
          </li>
          {b.location?.address && (
            <li>
              <MapPin aria-hidden="true" />
              <span>{b.location.address}</span>
            </li>
          )}
          {placeOf(b.location) && (
            <li>
              <MapPin aria-hidden="true" />
              <span>
                On site only: you&apos;ll share your location when you submit, and need to be within {placeOf(b.location)!.radiusM} m of the task.{" "}
                <DistanceToTask lat={placeOf(b.location)!.lat} lng={placeOf(b.location)!.lng} />
              </span>
            </li>
          )}
        </ul>
      </section>

      {b.product && (
        <section className="card card-tight row" aria-labelledby="product" style={{ alignItems: "flex-start" }}>
          {b.product.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.product.image_url} alt="" width={88} height={88} style={{ borderRadius: 8, objectFit: "cover", background: "var(--paper)" }} />
          )}
          <div className="stack-sm" style={{ flex: 1 }}>
            <h2 id="product" style={{ fontSize: "var(--text-md)", margin: 0 }}>
              What you&apos;re looking for
            </h2>
            <strong>{b.product.title}</strong>
            {b.product.retailer && <span className="muted">{b.product.retailer}</span>}
          </div>
        </section>
      )}

      <section className="card card-tight stack" aria-labelledby="todo">
        <h2 id="todo" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
          What to do
        </h2>
        <p style={{ margin: 0 }}>{b.instructions}</p>
        <h3 style={{ margin: 0 }}>What to capture</h3>
        <ul className="icon-list">
          {b.deliverables.map((d, i) => (
            <li key={i}>
              {d.type === "photo" ? <Camera aria-hidden="true" /> : d.type === "text" ? <NotebookPen aria-hidden="true" /> : <MapPin aria-hidden="true" />}
              <span>{d.description}</span>
            </li>
          ))}
        </ul>
        <h3 style={{ margin: 0 }}>Your proof is accepted when</h3>
        <Checklist items={b.acceptanceChecklist} />
      </section>

      <div className="claim-bar">
        {mine?.bounty.id === b.id ? (
          <ButtonLink href="/work/my-task" className="btn-block btn-lg">
            Continue this task
          </ButtonLink>
        ) : connectNeeded ? (
          <ButtonLink href="/work/settings" className="btn-block btn-lg">
            Connect PayPal to claim
          </ButtonLink>
        ) : !w.paypalEmail ? (
          <ButtonLink href="/work/settings" className="btn-block btn-lg">
            Add your PayPal email to claim
          </ButtonLink>
        ) : mine ? (
          <p className="card card-tight">You already have a task reserved. Finish it before claiming another.</p>
        ) : (
          <ClaimButton bountyId={b.id} rewardCents={b.rewardCents} minutes={claimMinutes} />
        )}
      </div>
    </div>
  );
}
