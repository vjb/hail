import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { CopyPageLink } from "@/components/client";
import { HailLogo } from "@/components/HailLogo";
import { PhotoChecks } from "@/components/ProofView";
import { Checklist, formatDateTime } from "@/components/ui";
import { db } from "@/db/client";
import { loadCertificate, parseCertificateId } from "@/domain/proof/certificate";

export const metadata: Metadata = { title: "Proof certificate", robots: { index: false, follow: false } };


// A shareable certificate for an accepted result: what was checked, when and how, with photo
// fingerprints. No photos, no worker identity, place rounded to about 1 km.
export default async function ProofCertificate({ params }: { params: Promise<{ id: string }> }) {
  const bountyId = parseCertificateId((await params).id);
  const cert = bountyId ? await loadCertificate(db(), bountyId) : null;
  if (!cert) notFound();
  return (
    <div className="public-wrap">
      <header className="spread">
        <Link href="/" aria-label="Hail home">
          <HailLogo height={32} />
        </Link>
      </header>
      <main id="main" className="stack" style={{ paddingTop: "var(--s-5)" }}>
        <div className="stack-sm">
          <span className="role-pill">Proof certificate</span>
          <h1 style={{ margin: 0 }}>{cert.bounty.title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Task {cert.bounty.id} · proof sent {formatDateTime(cert.submittedAt)} ET · accepted {formatDateTime(cert.acceptedAt)} ET
          </p>
          <div>
            <CopyPageLink label="Copy certificate link" />
          </div>
        </div>

        <section className="card stack-sm" aria-labelledby="outcome">
          <h2 id="outcome" className="row" style={{ margin: 0 }}>
            <ShieldCheck aria-hidden="true" /> {cert.acceptedBy === "verifier" ? "Verified by Hail" : "Accepted by the task owner after review"}
          </h2>
          <p style={{ margin: 0 }}>
            {cert.checklistMet ? "Every checklist item was met." : "The work was accepted, but not every checklist item was met. See below."}{" "}
            The person who did this task was paid to a PayPal account.
          </p>
          {cert.summary && <p className="why" style={{ margin: 0 }}>{cert.summary}</p>}
        </section>

        <section className="card stack-sm" aria-labelledby="checklist">
          <h2 id="checklist" style={{ margin: 0 }}>
            Checklist
          </h2>
          <Checklist items={cert.bounty.checklist} results={cert.items} />
        </section>

        <section className="card stack-sm" aria-labelledby="photos">
          <h2 id="photos" style={{ margin: 0 }}>
            Photos
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Each fingerprint is the SHA-256 of the photo exactly as Hail&apos;s API serves it. Download the photo with the task&apos;s API key and compare.
          </p>
          <ol className="stack plain-list">
            {cert.photos.map((p, i) => (
              <li key={i} className="stack-sm">
                <strong>{p.label}</strong>
                <span className="mono" style={{ fontSize: "var(--text-sm)", wordBreak: "break-all" }}>
                  SHA-256 {p.sha256}
                </span>
                <PhotoChecks
                  check={p.checks}
                  source={p.source}
                  credentials={p.credentials}
                  extra={`Taken ${formatDateTime(p.takenAt)} ET${p.secondsAfterCode !== null ? `, ${p.secondsAfterCode} s after its photo code appeared` : ""}`}
                />
              </li>
            ))}
          </ol>
        </section>

        <section className="card stack-sm" aria-labelledby="how">
          <h2 id="how" style={{ margin: 0 }}>
            How this was checked
          </h2>
          <ul style={{ margin: 0, paddingLeft: "var(--s-4)" }}>
            <li>Each photo answered a fresh code, shown in the app for two minutes, that the person wrote on paper and kept in the shot.</li>
            <li>An AI verifier checked every checklist item and looked for signs of a screen, editing or generation. Doubtful proof goes to the task owner instead of being accepted automatically.</li>
            {cert.onSite && (
              <li>
                The task required being on site: the person was about {cert.onSite.distanceM} m from the task location when they sent the proof (allowed: within {cert.onSite.radiusM} m).
              </li>
            )}
            {cert.place ? (
              <li>
                The person shared their location: about {cert.place.lat}, {cert.place.lng} (rounded to about 1 km).
              </li>
            ) : (
              <li>The person didn&apos;t share a location.</li>
            )}
            <li>No photo is impossible to fake. These checks make faking cost more than the task pays, and payouts go to an accountable PayPal account.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
