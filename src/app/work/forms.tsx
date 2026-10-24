"use client";

import { useActionState, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, LoaderCircle, MapPin, RotateCcw } from "lucide-react";
import { FormError, formatMoney } from "@/components/ui";
import { appealAction, claimAction, paypalEmailAction, releaseAction, submitAction, type WorkState } from "./actions";

function Notice({ state }: { state: WorkState }) {
  if (state.error) return <FormError>{state.error}</FormError>;
  if (state.ok)
    return (
      <p className="badge" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function ClaimButton({ bountyId, rewardCents, minutes }: { bountyId: string; rewardCents: number; minutes: number }) {
  const [state, action, pending] = useActionState(claimAction, {});
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <Notice state={state} />
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={pending}>
        {pending ? "Claiming…" : `Claim and reserve for ${minutes} min · ${formatMoney(rewardCents)}`}
      </button>
    </form>
  );
}

export function PayPalEmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(paypalEmailAction, {});
  return (
    <form action={action} className="stack-sm">
      <div className="field">
        <label htmlFor="paypalEmail">PayPal email</label>
        <input id="paypalEmail" name="paypalEmail" type="email" autoComplete="email" defaultValue={current} required />
      </div>
      <Notice state={state} />
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        Save
      </button>
    </form>
  );
}

export function ReleaseButton({ claimId }: { claimId: string }) {
  const [state, action, pending] = useActionState(releaseAction, {});
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="claimId" value={claimId} />
      <Notice state={state} />
      {!state.ok && (
        <button type="submit" className="btn btn-quiet" disabled={pending}>
          Give this task back
        </button>
      )}
    </form>
  );
}

type Check = { usable: boolean; problems: string[]; retakeHint: string };
type Slot = { status: "empty" | "uploading" | "checked" | "error"; preview?: string; check?: Check; error?: string; progress?: number };

/** One photo deliverable: camera/file input, preview, upload progress, and the quick check. */
function PhotoSlot({ claimId, index, label, initial, onChecked }: { claimId: string; index: number; label: string; initial?: Check | null; onChecked: (s: Slot) => void }) {
  const [slot, setSlot] = useState<Slot>(initial ? { status: "checked", check: initial, preview: undefined } : { status: "empty" });
  const input = useRef<HTMLInputElement>(null);
  const id = `photo-${index}`;

  function upload(file: File) {
    const preview = URL.createObjectURL(file);
    const next: Slot = { status: "uploading", preview, progress: 0 };
    setSlot(next);
    const fd = new FormData();
    fd.append("slot", String(index));
    fd.append("photo", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/work/claims/${claimId}/photos`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setSlot((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
    xhr.onload = () => {
      let body: { check?: Check; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      const done: Slot = xhr.status < 300 && body.check ? { status: "checked", preview, check: body.check } : { status: "error", preview, error: body.error ?? "The upload didn't go through. Try again." };
      setSlot(done);
      onChecked(done);
    };
    xhr.onerror = () => {
      const err: Slot = { status: "error", preview, error: "No connection. Move somewhere with signal and try again." };
      setSlot(err);
      onChecked(err);
    };
    xhr.send(fd);
  }

  const ok = slot.status === "checked" && slot.check?.usable;
  const retake = slot.status === "checked" && slot.check && !slot.check.usable;
  return (
    <div className="card card-tight stack-sm" style={{ borderColor: retake ? "var(--signal)" : ok ? "var(--paid)" : undefined }}>
      <div className="spread">
        <label htmlFor={id} style={{ fontWeight: 600 }}>
          Photo {index + 1}: {label}
        </label>
        {ok && (
          <span className="pill pill-paid">
            <CheckCircle2 aria-hidden="true" /> Looks good
          </span>
        )}
      </div>
      {slot.preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.preview} alt={`Your photo: ${label}`} style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 8, background: "var(--paper)" }} />
      )}
      {slot.status === "uploading" && (
        <div role="status" className="row muted">
          <LoaderCircle aria-hidden="true" width={18} className="spin" />
          {slot.progress !== undefined && slot.progress < 100 ? `Uploading… ${slot.progress}%` : "Checking your photo…"}
        </div>
      )}
      {retake && (
        <div role="alert" className="stack-sm" style={{ background: "var(--tint-signal)", padding: "var(--s-3)", borderRadius: 8 }}>
          <strong className="row" style={{ gap: 6 }}>
            <AlertTriangle aria-hidden="true" width={18} /> Almost there: retake this photo
          </strong>
          {slot.check!.problems.length > 0 && <span>What we noticed: {slot.check!.problems.join("; ")}.</span>}
          {slot.check!.retakeHint && <span>{slot.check!.retakeHint}</span>}
          <span className="muted" style={{ fontSize: "var(--text-sm)" }}>
            We added a little time to your reservation.
          </span>
        </div>
      )}
      {slot.status === "error" && <FormError>{slot.error}</FormError>}
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button type="button" className={`btn ${ok ? "btn-secondary" : "btn-primary"} btn-block`} onClick={() => input.current?.click()} disabled={slot.status === "uploading"} aria-describedby={retake ? undefined : undefined}>
        {slot.status === "empty" ? (
          <>
            <Camera aria-hidden="true" width={18} /> Take photo
          </>
        ) : (
          <>
            <RotateCcw aria-hidden="true" width={18} /> Retake photo
          </>
        )}
      </button>
    </div>
  );
}

export function ProofCapture({
  claimId,
  deliverables,
  initialChecks,
}: {
  claimId: string;
  deliverables: Array<{ type: "photo" | "text" | "location"; description: string }>;
  initialChecks: Record<number, Check | null>;
}) {
  const [state, action, pending] = useActionState(submitAction, {});
  const [slots, setSlots] = useState<Record<number, Slot>>(() => Object.fromEntries(Object.entries(initialChecks).map(([k, v]) => [k, v ? { status: "checked", check: v } : { status: "empty" }])));
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy_m?: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const needsLocation = deliverables.some((d) => d.type === "location");
  const photoSlots = deliverables.map((d, i) => ({ d, i })).filter((x) => x.d.type === "photo");
  const allPhotos = photoSlots.every(({ i }) => slots[i]?.status === "checked");
  const anyRetake = photoSlots.some(({ i }) => slots[i]?.status === "checked" && !slots[i]?.check?.usable);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="claimId" value={claimId} />
      {photoSlots.map(({ d, i }) => (
        <PhotoSlot key={i} claimId={claimId} index={i} label={d.description} initial={initialChecks[i]} onChecked={(s) => setSlots((all) => ({ ...all, [i]: s }))} />
      ))}
      {deliverables.map((d, i) =>
        d.type === "text" ? (
          <div className="field" key={i}>
            <label htmlFor={`text-${i}`}>{d.description}</label>
            <textarea id={`text-${i}`} name={`text-${i}`} required maxLength={1000} />
          </div>
        ) : null,
      )}
      <div className="card card-tight stack-sm">
        <div className="row" style={{ gap: 6 }}>
          <MapPin aria-hidden="true" width={18} />
          <strong>Location {needsLocation ? "(required)" : "(optional)"}</strong>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
          Sharing where you are helps confirm you were at the right place. It&apos;s only shown to the task&apos;s owner.
        </p>
        {location ? (
          <p className="badge" role="status">
            Location added (±{Math.round(location.accuracy_m ?? 0)} m)
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setLocError(null);
              if (!navigator.geolocation) return setLocError("This browser can't share location.");
              navigator.geolocation.getCurrentPosition(
                (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy_m: p.coords.accuracy }),
                () => setLocError("Location wasn't shared. You can allow it in your browser settings."),
                { enableHighAccuracy: true, timeout: 15000 },
              );
            }}
          >
            Share my location
          </button>
        )}
        {locError && <FormError>{locError}</FormError>}
        <input type="hidden" name="location" value={location ? JSON.stringify(location) : ""} />
      </div>
      <div className="field">
        <label htmlFor="notes">Anything else the owner should know? (optional)</label>
        <textarea id="notes" name="notes" maxLength={2000} />
      </div>
      <Notice state={state} />
      {anyRetake && <p className="muted">You can still submit, but photos marked for a retake may not pass verification.</p>}
      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={pending || !allPhotos || (needsLocation && !location)}>
        {pending ? "Submitting…" : allPhotos ? "Submit proof" : "Take every photo to submit"}
      </button>
    </form>
  );
}

export function AppealForm({ bountyId, deadline }: { bountyId: string; deadline: string }) {
  const [state, action, pending] = useActionState(appealAction, {});
  if (state.ok) return <Notice state={state} />;
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="bountyId" value={bountyId} />
      <div className="field">
        <label htmlFor="appeal-reason">Think this is wrong? Tell the owner why (one appeal)</label>
        <textarea id="appeal-reason" name="reason" required minLength={5} maxLength={1000} placeholder="e.g. The serial number is readable in photo 1 if you zoom in." aria-describedby="appeal-hint" />
        <span id="appeal-hint" className="hint">
          You can appeal until {new Date(deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
        </span>
      </div>
      <Notice state={state} />
      <button type="submit" className="btn btn-secondary btn-block" disabled={pending}>
        Send appeal
      </button>
    </form>
  );
}
