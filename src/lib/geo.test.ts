import { describe, expect, it } from "vitest";
import { checkLocation, distanceMeters, placeOf } from "./geo";

// Times Square (Father Duffy Square) and nearby points.
const TS = { lat: 40.7587, lng: -73.9851 };

describe("on-site rule", () => {
  it("measures distance in meters", () => {
    expect(Math.round(distanceMeters(TS, { lat: 40.7596, lng: -73.9851 }))).toBe(100);
  });

  it("only tasks with coordinates are on-site; radius has a default and a floor", () => {
    expect(placeOf({ address: "1 Main St" } as never)).toBeNull();
    expect(placeOf({ ...TS })?.radiusM).toBe(150);
    expect(placeOf({ ...TS, radius_m: 20 })?.radiusM).toBe(100);
    expect(placeOf({ ...TS, radius_m: 500 })?.radiusM).toBe(500);
    expect(checkLocation({ address: "x" } as never, null)).toEqual({ required: false });
  });

  it("needs a shared location, passes inside the radius, blocks only when clearly outside", () => {
    expect(checkLocation(TS, null)).toMatchObject({ required: true, shared: false, radiusM: 150 });
    expect(checkLocation(TS, { lat: 40.7590, lng: -73.9851, accuracy_m: 10 })).toMatchObject({ ok: true });
    // ~300 m away with a precise fix: blocked.
    expect(checkLocation(TS, { lat: 40.7614, lng: -73.9851, accuracy_m: 15 })).toMatchObject({ ok: false });
    // Same spot, but the phone says ±180 m: benefit of the doubt.
    expect(checkLocation(TS, { lat: 40.7614, lng: -73.9851, accuracy_m: 180 })).toMatchObject({ ok: true });
    // A huge accuracy figure only buys 200 m.
    expect(checkLocation(TS, { lat: 40.7700, lng: -73.9851, accuracy_m: 5000 })).toMatchObject({ ok: false, allowanceM: 200 });
  });
});
