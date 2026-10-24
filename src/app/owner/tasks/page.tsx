import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, formatDateTime, Money, StatusPill } from "@/components/ui";
import { db } from "@/db/client";
import { categoryLabel, listOwnerBounties } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const owner = await requireRole("owner");
  const rows = await listOwnerBounties(db(), owner.id);
  return (
    <div className="stack">
      <div>
        <h1>Tasks</h1>
        <p className="muted">Every task your agents have posted, newest first. Open one to see each step and why it happened.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No tasks yet">Tasks your agents post appear here, newest first.</EmptyState>
      ) : (
        <div className="card table-wrap">
          <table className="data">
            <caption className="visually-hidden">Tasks, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Task</th>
                <th scope="col">Status</th>
                <th scope="col">Kind</th>
                <th scope="col" className="num">
                  Pay
                </th>
                <th scope="col">Posted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/owner/tasks/${b.id}`}>{b.title}</Link>
                  </td>
                  <td>
                    <StatusPill status={b.status} />
                  </td>
                  <td>{categoryLabel(b.category)}</td>
                  <td className="num">
                    <Money cents={b.rewardCents} />
                  </td>
                  <td>{formatDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
