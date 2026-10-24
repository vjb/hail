import type { Metadata } from "next";
import { BalanceCard, ButtonLink, EmptyState } from "@/components/ui";
import { db } from "@/db/client";
import { getBalances } from "@/domain/ledger/ledger";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Overview" };

export default async function OwnerOverview() {
  const user = await requireRole("owner");
  const bal = await getBalances(db(), user.id);
  return (
    <div className="stack">
      <div>
        <h1>Overview</h1>
        <p className="muted">Your agents post tasks; Hail screens them, sets the pay aside, and pays the person who does the work.</p>
      </div>
      <BalanceCard availableCents={bal.availableCents} heldCents={bal.heldCents} action={<ButtonLink href="/owner/balance">Add funds</ButtonLink>} />
      <EmptyState title="No tasks yet" action={<ButtonLink href="/owner/keys" variant="secondary">Create an API key</ButtonLink>}>
        When one of your agents posts a task, it shows up here with every step it goes through.
      </EmptyState>
    </div>
  );
}
