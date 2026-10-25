import { CheckCircle2, CircleHelp, Info, XCircle } from "lucide-react";
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

type Check = ProofChecks["photos"][number];
type Line = { text: string; state: "pass" | "fail" | "unknown" | "info" };

const CODE_LINE: Record<Check["code"], Line> = {
  matches: { text: "Photo code matches", state: "pass" },
  missing: { text: "Photo code not visible", state: "unknown" },
  different: { text: "A different photo code is visible", state: "fail" },
  unreadable: { text: "Photo code can't be read", state: "unknown" },
  not_requested: { text: "No photo code issued", state: "info" },
};
const WORD = { pass: "OK", fail: "Flagged", unknown: "Check", info: "Note" } as const;
const ICON = { pass: CheckCircle2, fail: XCircle, unknown: CircleHelp, info: Info } as const;

/**
 * Per-photo proof checks with the checklist's icon and status word, so a red flag never looks like
 * a passing check: code, screen, editing, how it was captured, Content Credentials.
 */
export function PhotoChecks({ check, source, credentials, extra }: { check: Check | null; source?: Check["source"] | null; credentials?: Check["credentials"] | null; extra?: string }) {
  const src = source ?? check?.source ?? null;
  const creds = credentials ?? check?.credentials ?? null;
  const lines: Line[] = [];
  if (extra) lines.push({ text: extra, state: "info" });
  if (check) {
    lines.push(CODE_LINE[check.code]);
    lines.push(check.screen ? { text: "Looks like a photo of a screen", state: "fail" } : { text: "Not a photo of a screen", state: "pass" });
    lines.push(check.generatedOrEdited ? { text: "Signs of generation or editing", state: "fail" } : { text: "No signs of generation or editing", state: "pass" });
  }
  if (src === "camera") lines.push({ text: "Taken in Hail's in-app camera", state: "pass" });
  if (src === "file") lines.push({ text: "Taken with the phone's camera app, so the owner checks it", state: "unknown" });
  const ct = credentialsText(creds);
  if (ct && creds) lines.push({ text: ct, state: creds.aiGenerated || /invalid/i.test(creds.validation) ? "fail" : "pass" });
  return (
    <ul className="checklist photo-checks">
      {lines.map((l) => {
        const Icon = ICON[l.state];
        return (
          <li key={l.text}>
            <Icon aria-hidden="true" className={`check-${l.state}`} />
            <span>
              {l.state !== "info" && <strong className={`check-${l.state}`}>{WORD[l.state]}: </strong>}
              {l.text}
            </span>
          </li>
        );
      })}
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
