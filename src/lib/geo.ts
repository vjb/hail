// Location rule for tasks with coordinates (D-028). Pure, so the server enforces it and the worker's
// phone shows the same answer before they submit.

export type Point = { lat: number; lng: number };
export type TaskPlace = { lat?: number; lng?: number; radius_m?: number } | null | undefined;

/** Radius used when the task gives none, and the smallest radius we enforce (phone GPS in a city is rough). */
export const DEFAULT_RADIUS_M = 150;
export const MIN_RADIUS_M = 100;
/** At most this much of the phone's own accuracy estimate is given as benefit of the doubt. */
export const MAX_ACCURACY_ALLOWANCE_M = 200;

export function distanceMeters(a: Point, b: Point) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** A task needs the worker on site only when it has coordinates. */
export function placeOf(loc: TaskPlace): (Point & { radiusM: number }) | null {
  if (!loc || loc.lat === undefined || loc.lng === undefined) return null;
  return { lat: loc.lat, lng: loc.lng, radiusM: Math.max(loc.radius_m ?? DEFAULT_RADIUS_M, MIN_RADIUS_M) };
}

export type LocationCheck =
  | { required: false }
  | { required: true; shared: false; radiusM: number }
  | { required: true; shared: true; radiusM: number; distanceM: number; allowanceM: number; ok: boolean };

/**
 * Is the worker at the task? Blocks only when they're clearly outside: the distance minus the phone's
 * stated accuracy (capped) is beyond the radius.
 */
export function checkLocation(task: TaskPlace, worker: (Point & { accuracy_m?: number }) | null | undefined): LocationCheck {
  const place = placeOf(task);
  if (!place) return { required: false };
  if (!worker) return { required: true, shared: false, radiusM: place.radiusM };
  const distanceM = Math.round(distanceMeters(place, worker));
  const allowanceM = Math.round(Math.min(Math.max(worker.accuracy_m ?? 0, 0), MAX_ACCURACY_ALLOWANCE_M));
  return { required: true, shared: true, radiusM: place.radiusM, distanceM, allowanceM, ok: distanceM - allowanceM <= place.radiusM };
}
