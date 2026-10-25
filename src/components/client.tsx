"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { distanceMeters } from "@/lib/geo";
import { ClipboardCheck, ClipboardList, Gauge, Inbox, KeyRound, LayoutDashboard, ListTodo, SlidersHorizontal, Wallet } from "lucide-react";

const NAV_ICONS = { ClipboardCheck, ClipboardList, Gauge, Inbox, KeyRound, LayoutDashboard, ListTodo, SlidersHorizontal, Wallet };
export type NavIcon = keyof typeof NAV_ICONS;

// ---------- Nav links that know the current page ----------
export function NavLink({ href, icon, children, exact }: { href: string; icon: NavIcon; children: ReactNode; exact?: boolean }) {
  const path = usePathname();
  const Icon = NAV_ICONS[icon];
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

// ---------- Countdown ----------
function remaining(until: number) {
  const ms = Math.max(0, until - Date.now());
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { ms, text: h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}` };
}

export function Countdown({ until, label, onDoneRefresh = true }: { until: string; label: string; onDoneRefresh?: boolean }) {
  const target = new Date(until).getTime();
  const [now, setNow] = useState(() => remaining(target));
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      const r = remaining(target);
      setNow(r);
      if (r.ms === 0) {
        clearInterval(t);
        if (onDoneRefresh && online()) router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target, onDoneRefresh, router]);
  return (
    <span className="mono" role="timer" aria-live="off" aria-label={`${label}: ${now.text} remaining`}>
      {now.text}
    </span>
  );
}

// ---------- Live refresh (polling) ----------
// Refreshing while offline makes the router fall back to a full page load, which lands on the
// browser's offline page (DL-1-02). So refreshes are skipped offline.
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;

export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => online() && router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [everyMs, router]);
  return null;
}

/** A calm notice while the device is offline; the page stays as it is and refreshes when back. */
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineNotice() {
  const router = useRouter();
  const offline = useSyncExternalStore(subscribeOnline, () => !online(), () => false);
  useEffect(() => {
    const back = () => router.refresh();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [router]);
  if (!offline) return null;
  return (
    <p role="status" className="offline-notice">
      You&apos;re offline. Your reservation and anything you&apos;ve entered are kept here; we&apos;ll update when you&apos;re back online.
    </p>
  );
}

// ---------- Toast ----------
export function Toast({ message }: { message?: string | null }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const shown = message && message !== dismissed ? message : null;
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setDismissed(message), 5000);
    return () => clearTimeout(t);
  }, [message]);
  return (
    <div aria-live="polite" role="status">
      {shown && <div className="toast">{shown}</div>}
    </div>
  );
}

/** "How far am I?" on a task with coordinates: asks for location only when tapped. */
export function DistanceToTask({ lat, lng }: { lat: number; lng: number }) {
  const [state, setState] = useState<{ busy?: boolean; text?: string }>({});
  if (state.text) return <span role="status">{state.text}</span>;
  return (
    <button
      type="button"
      className="btn btn-quiet"
      style={{ padding: 0, minHeight: 0, textDecoration: "underline" }}
      disabled={state.busy}
      onClick={() => {
        if (!navigator.geolocation) return setState({ text: "This browser can't share location." });
        setState({ busy: true });
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const m = Math.round(distanceMeters({ lat, lng }, { lat: p.coords.latitude, lng: p.coords.longitude }));
            setState({ text: m < 1000 ? `You're about ${m} m away.` : `You're about ${(m / 1000).toFixed(1)} km away.` });
          },
          () => setState({ text: "Location wasn't shared." }),
          { enableHighAccuracy: true, timeout: 15000 },
        );
      }}
    >
      {state.busy ? "Checking…" : "How far am I?"}
    </button>
  );
}
