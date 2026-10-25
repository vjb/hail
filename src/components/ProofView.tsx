import type { ChecklistResult, ProofChecks } from "@/db/schema";
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
  proofChecks,
}: {
  photoIds: string[];
  labels: string[];
  notes: string | null;
  location: { lat: number; lng: number; accuracy_m?: number } | null;
  submittedAt: Date;
  checklist: string[];
  results?: ChecklistResult[];
  summary?: string | null;
  proofChecks?: ProofChecks | null;
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
              {proofChecks?.photos[i] && <PhotoChecks check={proofChecks.photos[i]} />}
            </figcaption>
          </figure>
        ))}
      </div>
      {proofChecks && (proofChecks.sameScene !== null || proofChecks.concerns.length > 0) && (
        <div className="stack-sm" style={{ fontSize: "var(--text-sm)" }}>
          {proofChecks.sameScene !== null && <span>Photos show the same item and place: {proofChecks.sameScene ? "yes" : "no"}</span>}
          {proofChecks.concerns.length > 0 && (
            <span>
              <strong>Doubts:</strong> {proofChecks.concerns.join(" ")}
            </span>
          )}
        </div>
      )}
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

const CODE_TEXT: Record<ProofChecks["photos"][number]["code"], string> = {
  matches: "Photo code: matches",
  missing: "Photo code: not visible",
  different: "Photo code: wrong code",
  unreadable: "Photo code: can't be read",
  not_requested: "Photo code: none issued",
};

/** Per-photo proof checks as words, not colors: code, screen, editing, how it was captured. */
function PhotoChecks({ check }: { check: ProofChecks["photos"][number] }) {
  const lines = [
    CODE_TEXT[check.code],
    check.screen ? "Looks like a photo of a screen" : "Not a photo of a screen",
    check.generatedOrEdited ? "Signs of generation or editing" : "No signs of editing",
    check.source === "camera" ? "Taken in Hail's camera" : check.source === "file" ? "Taken with the phone's camera app" : null,
    credentialsText(check.credentials),
  ].filter(Boolean);
  return (
    <ul style={{ margin: "var(--s-1) 0 0", paddingLeft: "var(--s-4)" }}>
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

/** Content Credentials in words. Only a valid signature that isn't AI-made reads as a positive. */
export function credentialsText(c: ProofChecks["photos"][number]["credentials"]) {
  if (!c) return null;
  if (c.aiGenerated) return "Content Credentials: made with AI";
  if (/invalid/i.test(c.validation)) return "Content Credentials: don't check out";
  return `Content Credentials: signed${c.issuer ? ` by ${c.issuer}` : ""}${/trusted/i.test(c.validation) ? " (trusted)" : ""}`;
}
