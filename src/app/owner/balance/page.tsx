import type { Metadata } from "next";
import { BalanceCard, EmptyState, formatDateTime, Money } from "@/components/ui";
import { db } from "@/db/client";
import { getBalances, listOwnerEntries } from "@/domain/ledger/ledger";
import { requireRole } from "@/lib/auth";
import { listWithdrawals } from "@/domain/withdrawals/withdrawals";
import { WithdrawForm } from "../forms";
import { TopUp } from "./TopUp";

export const metadata: Metadata = { title: "Balance" };

const DESCRIBE: Record<string, (account: string, cents: number) => string> = {
  topup: () => "Added with PayPal",
  hold: (a) => (a === "held" ? "Set aside for a task" : "Moved to set aside"),
  release: (a) => (a === "available" ? "Returned from a task" : "Released from set aside"),
  payout: () => "Paid to a worker",
  withdraw: (_a, cents) => (cents > 0 ? "Refund didn't go through; returned" : "Withdrawn to PayPal"),
};

export default async function BalancePage() {
  const owner = await requireRole("owner");
  const [bal, entries, wds] = await Promise.all([getBalances(db(), owner.id), listOwnerEntries(db(), owner.id), listWithdrawals(db(), owner.id)]);
  return (
    <div className="stack">
      <div>
        <h1>Balance</h1>
        <p className="muted">Available money can fund new tasks. Money set aside is reserved for tasks already posted and can&apos;t be withdrawn.</p>
      </div>
      <BalanceCard availableCents={bal.availableCents} heldCents={bal.heldCents} />
      <TopUp clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""} />
      <section className="card stack" aria-labelledby="withdraw-heading">
        <h2 id="withdraw-heading">Withdraw</h2>
        <WithdrawForm availableCents={bal.availableCents} />
        {wds.length > 0 && (
          <ul className="stack-sm" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="Recent withdrawals">
            {wds.map((w) => (
              <li key={w.id} className="spread" style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-2)" }}>
                <span>{formatDateTime(w.createdAt)}</span>
                <span className={`pill pill-${w.status === "completed" ? "paid" : w.status === "failed" ? "blocked" : "review"}`}>{w.status === "completed" ? "Refunded to PayPal" : w.status === "failed" ? "Failed" : "In progress"}</span>
                <Money cents={w.amountCents} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card stack" aria-labelledby="ledger-heading">
        <h2 id="ledger-heading">History</h2>
        {entries.length === 0 ? (
          <EmptyState title="No activity yet">Top-ups, money set aside for tasks, and payouts will be listed here.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <caption className="visually-hidden">Balance history, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">What happened</th>
                  <th scope="col">Account</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.createdAt)}</td>
                    <td>{DESCRIBE[e.kind]?.(e.account, e.amountCents) ?? e.kind}</td>
                    <td>{e.account === "available" ? "Available" : "Set aside"}</td>
                    <td className="num">
                      <Money cents={e.amountCents} sign />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
