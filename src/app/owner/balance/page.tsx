import type { Metadata } from "next";
import { BalanceCard, EmptyState, formatDateTime, Money } from "@/components/ui";
import { db } from "@/db/client";
import { getBalances, listOwnerEntries } from "@/domain/ledger/ledger";
import { requireRole } from "@/lib/auth";
import { TopUp } from "./TopUp";

export const metadata: Metadata = { title: "Balance" };

const DESCRIBE: Record<string, (account: string) => string> = {
  topup: () => "Added with PayPal",
  hold: (a) => (a === "held" ? "Set aside for a task" : "Moved to set aside"),
  release: (a) => (a === "available" ? "Returned from a task" : "Released from set aside"),
  payout: () => "Paid to a worker",
  withdraw: () => "Withdrawn to PayPal",
};

export default async function BalancePage() {
  const owner = await requireRole("owner");
  const [bal, entries] = await Promise.all([getBalances(db(), owner.id), listOwnerEntries(db(), owner.id)]);
  return (
    <div className="stack">
      <div>
        <h1>Balance</h1>
        <p className="muted">Available money can fund new tasks. Money set aside is reserved for tasks already posted and can&apos;t be withdrawn.</p>
      </div>
      <BalanceCard availableCents={bal.availableCents} heldCents={bal.heldCents} />
      <TopUp clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""} />
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
                    <td>{DESCRIBE[e.kind]?.(e.account) ?? e.kind}</td>
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
