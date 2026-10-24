import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { signOutAction } from "../../sign-in/actions";
import { PayPalEmailForm } from "../forms";

export const metadata: Metadata = { title: "Account" };

export default async function WorkerSettings() {
  const w = await requireRole("worker");
  return (
    <div className="stack">
      <div>
        <h1>Account</h1>
        <p className="muted">Signed in as {w.name}.</p>
      </div>
      <section className="card card-tight stack" aria-labelledby="paypal-heading">
        <h2 id="paypal-heading" style={{ fontSize: "var(--text-lg)", margin: 0 }}>
          Where we pay you
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Hail pays approved work straight to your PayPal account. No bank details needed. This demo pays into the PayPal sandbox; no real money moves.
        </p>
        <PayPalEmailForm current={w.paypalEmail ?? ""} />
      </section>
      <form action={signOutAction}>
        <button type="submit" className="btn btn-secondary btn-block">
          <LogOut aria-hidden="true" width={18} /> Sign out
        </button>
      </form>
    </div>
  );
}
