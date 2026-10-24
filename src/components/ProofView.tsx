import type { ChecklistResult } from "@/db/schema";
import { Checklist, formatDateTime } from "./ui";

/** Owner-side view of a worker's proof: photos, notes, location and the verifier's per-item results. */
export function ProofView({
  photoIds,
  labels,
  notes,
  location,
  submittedAt,
  checklist,
  results,
  summary,
}: {
  photoIds: string[];
  labels: string[];
  notes: string | null;
  location: { lat: number; lng: number; accuracy_m?: number } | null;
  submittedAt: Date;
  checklist: string[];
  results?: ChecklistResult[];
  summary?: string | null;
}) {
  return (
    <div className="stack-sm">
      <p className="muted" style={{ margin: 0 }}>
        Submitted {formatDateTime(submittedAt)}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--s-3)" }}>
        {photoIds.map((id, i) => (
          <figure key={id} style={{ margin: 0 }}>
            <a href={`/api/photos/${id}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${id}`} alt={`Proof photo ${i + 1}: ${labels[i] ?? ""}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "var(--paper)" }} />
            </a>
            <figcaption className="muted" style={{ fontSize: "var(--text-sm)" }}>
              {labels[i]}
            </figcaption>
          </figure>
        ))}
      </div>
      {notes && (
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          <strong>Worker&apos;s notes:</strong> {notes}
        </p>
      )}
      {location && (
        <p className="muted" style={{ margin: 0 }}>
          Shared location: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          {location.accuracy_m ? ` (±${Math.round(location.accuracy_m)} m)` : ""}
        </p>
      )}
      {summary && (
        <p className="why" style={{ borderLeft: "3px solid var(--signal)", paddingLeft: "var(--s-3)", margin: 0 }}>
          {summary}
        </p>
      )}
      <Checklist items={checklist} results={results} />
    </div>
  );
}
