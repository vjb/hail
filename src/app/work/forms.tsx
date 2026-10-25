"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
      {current && (
        // The full address, so a long one is never cut off at the input's edge (DL-1-07).
        <p style={{ margin: 0, overflowWrap: "anywhere" }}>
          Paying to: <strong>{current}</strong>
        </p>
      )}
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
type Challenge = { challengeId: string; code: string; expiresAt: string };

const secondsLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * One photo deliverable. "Take photo" asks the server for a fresh code, then opens the camera in the
 * page with the code on screen; the worker writes it on paper and keeps it in the shot. If the browser
 * can't open the camera, the phone's own camera (file input) is the fallback, under the same code.
 */
function PhotoSlot({ claimId, index, label, initial, onChecked }: { claimId: string; index: number; label: string; initial?: Check | null; onChecked: (s: Slot) => void }) {
  const [slot, setSlot] = useState<Slot>(initial ? { status: "checked", check: initial, preview: undefined } : { status: "empty" });
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [left, setLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [camera, setCamera] = useState<"off" | "starting" | "live" | "unavailable">("off");
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const id = `photo-${index}`;

  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }
  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (!challenge) return;
    const tick = () => {
      const s = secondsLeft(challenge.expiresAt);
      setLeft(s);
      if (s === 0) {
        stopCamera();
        setCamera("off");
      }
      return s;
    };
    tick();
    const t = setInterval(() => tick() === 0 && clearInterval(t), 1000);
    return () => clearInterval(t);
  }, [challenge]);

  // Attach the stream once the <video> is on the page.
  useEffect(() => {
    if (camera === "live" && video.current && stream.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => {});
    }
  }, [camera]);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return setCamera("unavailable");
    setCamera("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      setCamera("live");
    } catch {
      setCamera("unavailable");
    }
  }

  async function start() {
    setProblem(null);
    setStarting(true);
    try {
      const res = await fetch(`/api/work/claims/${claimId}/challenge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot: index }) });
      const body = (await res.json().catch(() => ({}))) as Partial<Challenge> & { error?: string };
      if (!res.ok || !body.challengeId) {
        setProblem(body.error ?? "Couldn't get a photo code. Try again.");
        return;
      }
      setChallenge(body as Challenge);
      await openCamera();
    } catch {
      setProblem("No connection. Move somewhere with signal and try again.");
    } finally {
      setStarting(false);
    }
  }

  function cancel() {
    stopCamera();
    setCamera("off");
    setChallenge(null);
  }

  function shoot() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && upload(b, "camera"), "image/jpeg", 0.92);
  }

  function upload(file: Blob, source: "camera" | "file") {
    if (!challenge) return;
    stopCamera();
    setCamera("off");
    const preview = URL.createObjectURL(file);
    setSlot({ status: "uploading", preview, progress: 0 });
    const fd = new FormData();
    fd.append("slot", String(index));
    fd.append("challengeId", challenge.challengeId);
    fd.append("source", source);
    fd.append("photo", file, "photo.jpg");
    setChallenge(null);
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
  const active = !!challenge && left > 0;
  const expired = !!challenge && left === 0;
  return (
    <div className="card card-tight stack-sm" style={{ borderColor: retake ? "var(--signal)" : ok ? "var(--paid)" : undefined }}>
      <div className="spread">
        <span id={`${id}-title`} style={{ fontWeight: 600 }}>
          Photo {index + 1}: {label}
        </span>
        {ok && (
          <span className="pill pill-paid">
            <CheckCircle2 aria-hidden="true" /> Looks good
          </span>
        )}
      </div>

      {active && challenge && (
        <section className="challenge stack-sm" aria-labelledby={`${id}-code-intro`}>
          <p id={`${id}-code-intro`} style={{ margin: 0 }}>
            Write this code on paper and keep it in the photo, next to what you&apos;re photographing:
          </p>
          <p className="challenge-code" aria-label={`Photo code: ${challenge.code.split("").join(" ")}`}>
            {challenge.code}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
            <span className="mono">{mmss(left)}</span> left to take this photo. A new code each time shows the photo was taken just now.
          </p>
          {camera === "live" && <video ref={video} className="camera-view" playsInline muted aria-label={`Camera preview for photo ${index + 1}`} />}
          {camera === "starting" && (
            <div role="status" className="row muted">
              <LoaderCircle aria-hidden="true" width={18} className="spin" /> Opening the camera…
            </div>
          )}
          {camera === "unavailable" && (
            <p role="status" style={{ margin: 0 }}>
              We couldn&apos;t open the camera here. Use your phone&apos;s camera instead; the same code and time limit apply.
            </p>
          )}
          {camera === "live" && (
            <button type="button" className="btn btn-primary btn-block btn-lg" onClick={shoot}>
              <Camera aria-hidden="true" width={18} /> Take photo {index + 1}
            </button>
          )}
          <button type="button" className={`btn ${camera === "live" ? "btn-quiet" : "btn-primary"} btn-block`} onClick={() => input.current?.click()}>
            {camera === "live" ? "Use my phone's camera app instead" : "Open my phone's camera"}
          </button>
          <button type="button" className="btn btn-quiet" onClick={cancel}>
            Cancel
          </button>
        </section>
      )}
      {expired && challenge && slot.status !== "uploading" && (
        <p role="alert" style={{ margin: 0 }}>
          Time&apos;s up for code {challenge.code}. Get a new code to take this photo.
        </p>
      )}

      {slot.preview && !active && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.preview} alt={`Your photo: ${label}`} style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 8, background: "var(--paper)" }} />
      )}
      {slot.status === "uploading" && (
        <div role="status" className="row muted">
          <LoaderCircle aria-hidden="true" width={18} className="spin" />
          {slot.progress !== undefined && slot.progress < 100 ? `Uploading… ${slot.progress}%` : "Checking your photo…"}
        </div>
      )}
      {retake && !active && (
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
      {slot.status === "error" && !active && <FormError>{slot.error}</FormError>}
      {problem && <FormError>{problem}</FormError>}
      <label htmlFor={id} className="visually-hidden">
        Photo {index + 1}: {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        disabled={!active}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f, "file");
          e.target.value = "";
        }}
      />
      {!active && (
        <button type="button" className={`btn ${ok ? "btn-secondary" : "btn-primary"} btn-block`} onClick={start} disabled={slot.status === "uploading" || starting} aria-describedby={`${id}-title`}>
          {starting ? (
            <>
              <LoaderCircle aria-hidden="true" width={18} className="spin" /> Getting your code…
            </>
          ) : slot.status === "empty" && !expired ? (
            <>
              <Camera aria-hidden="true" width={18} /> Take photo
            </>
          ) : slot.status === "empty" ? (
            <>
              <RotateCcw aria-hidden="true" width={18} /> Get a new code
            </>
          ) : (
            <>
              <RotateCcw aria-hidden="true" width={18} /> Retake photo
            </>
          )}
        </button>
      )}
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
