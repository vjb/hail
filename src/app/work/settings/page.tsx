import type { Metadata } from "next";
import { BadgeCheck, LogOut } from "lucide-react";
import { FormError } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/db/client";
import { getWorker, SUSPENDED_MESSAGE } from "@/domain/work/work";
import { signOutAction } from "../../sign-in/actions";
import { PayPalEmailForm } from "../forms";

export const metadata: Metadata = { title: "Account" };

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "PayPal connected. Your pay goes to this account." },
  "connected-unverified": { ok: true, text: "PayPal connected. PayPal says this account isn't verified yet, so the task owner checks your proof before you're paid." },
  cancelled: { ok: false, text: "You didn't finish connecting PayPal. Nothing changed." },
  expired: { ok: false, text: "That connection attempt timed out. Try again." },
  taken: { ok: false, text: "This PayPal account is already connected to another Hail worker. Each worker needs their own PayPal account." },
  failed: { ok: false, text: "PayPal didn't connect. Try again in a minute." },
  unavailable: { ok: false, text: "Connecting PayPal isn't available yet." },
};

export default async function WorkerSettings({ searchParams }: { searchParams: Promise<{ paypal?: string }> }) {
  const w = await getWorker(db(), (await requireRole("worker")).id);
  const result = RESULT[(await searchParams).paypal ?? ""];
  const connect = env().PAYPAL_LOGIN_ENABLED;
  return (
    <div className="stack">
      <div>
        <h1>Account</h1>
        <p className="muted">Signed in as {w.name}.</p>
      </div>
      {w.suspendedAt && (
        <p role="alert" className="card card-tight" style={{ borderColor: "var(--blocked)", margin: 0 }}>
          {SUSPENDED_MESSAGE}
        </p>
      )}
      <section className="card card-tight stack" aria-labelledby="paypal-heading">
        <h2 id="paypal-heading" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
          Where we pay you
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Hail pays approved work straight to your PayPal account. No bank details needed. This demo pays into the PayPal sandbox; no real money moves.
        </p>
        {result && (result.ok ? <p className="badge" role="status">{result.text}</p> : <FormError>{result.text}</FormError>)}
        {connect ? (
          <>
            {w.paypalConnectedAt ? (
              <div className="stack-sm">
                <p style={{ margin: 0 }}>
                  Connected: <strong>{w.paypalEmail}</strong>
                </p>
                {w.paypalVerified ? (
                  <span className="pill pill-paid">
                    <BadgeCheck aria-hidden="true" /> Verified PayPal account
                  </span>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    Not verified by PayPal yet. Until it is, the task owner checks your proof before you&apos;re paid.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ margin: 0 }}>Connect your PayPal account to start claiming tasks. You sign in on PayPal; Hail never sees your password.</p>
            )}
            <a className={`btn ${w.paypalConnectedAt ? "btn-secondary" : "btn-primary"} btn-block`} href="/work/paypal/connect">
              {w.paypalConnectedAt ? "Connect a different PayPal account" : "Connect PayPal"}
            </a>
          </>
        ) : (
          <PayPalEmailForm current={w.paypalEmail ?? ""} />
        )}
      </section>
      <form action={signOutAction}>
        <button type="submit" className="btn btn-secondary btn-block">
          <LogOut aria-hidden="true" width={18} /> Sign out
        </button>
      </form>
    </div>
  );
}
