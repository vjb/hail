import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, formatDateTime, Money } from "@/components/ui";
import { db } from "@/db/client";
import { listKeys } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";
import { CreateKeyForm, RevokeKeyButton } from "../forms";

export const metadata: Metadata = { title: "API keys" };

export default async function KeysPage() {
  const owner = await requireRole("owner");
  const keys = await listKeys(db(), owner.id);
  return (
    <div className="stack">
      <div>
        <h1>API keys</h1>
        <p className="muted">
          Give each agent its own key. Agents send it as <code className="mono">Authorization: Bearer …</code>; see the <Link href="/docs/api">API guide</Link>.
        </p>
      </div>
      <section className="card stack" aria-labelledby="new-key-heading">
        <h2 id="new-key-heading">Create a key</h2>
        <CreateKeyForm />
      </section>
      {keys.length === 0 ? (
        <EmptyState title="No API keys yet">Create a key for each agent. Every key has its own daily spending cap.</EmptyState>
      ) : (
        <section className="card table-wrap" aria-labelledby="keys-heading">
          <h2 id="keys-heading">Your keys</h2>
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Key</th>
                <th scope="col" className="num">
                  Daily cap
                </th>
                <th scope="col">Created</th>
                <th scope="col">Last used</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="mono">{k.prefix}…</td>
                  <td className="num">
                    <Money cents={k.dailyCapCents} />
                  </td>
                  <td>{formatDateTime(k.createdAt)}</td>
                  <td>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "Never"}</td>
                  <td>{k.revokedAt ? <span className="pill pill-neutral">Revoked</span> : <RevokeKeyButton keyId={k.id} name={k.name} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
