import type { Metadata } from "next";
import { SCREEN_CATEGORIES } from "@/ai/provider";
import { db } from "@/db/client";
import { getPolicy } from "@/domain/bounty/service";
import { categoryLabel } from "@/domain/owner/queries";
import { requireRole } from "@/lib/auth";
import { PolicyForm } from "../forms";

export const metadata: Metadata = { title: "Policy" };

export default async function PolicyPage() {
  const owner = await requireRole("owner");
  const p = await getPolicy(db(), owner.id);
  return (
    <div className="stack">
      <div>
        <h1>Policy</h1>
        <p className="muted">Limits your agents work within. Hail always blocks fraud, code requests, fake reviews, targeting private people, and anything illegal or dangerous, whatever you set here.</p>
      </div>
      <section className="card">
        <PolicyForm
          threshold={p.approvalThresholdCents}
          maxOpen={p.maxOpenBounties}
          perHour={p.maxBountiesPerHour}
          selected={p.allowedCategories}
          categories={SCREEN_CATEGORIES.allowed.map((c) => ({ id: c, label: categoryLabel(c) }))}
        />
      </section>
    </div>
  );
}
