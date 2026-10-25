# Hail Proof-Fraud Security Assessment — Round 2 Report (`ROUND2.md`)

- **Target Environment:** `https://hail-g9h8.onrender.com`
- **Worker Account Used:** `riley@example.com` (`Riley`, Worker)
- **Owner View Inspected (Read-Only):** `dana@example.com` (`Dana`, `/owner/approvals`)
- **Attempt Log:** [attempts.jsonl](attempts.jsonl) (`PF-016` through `PF-038`, appended after Round 1's `PF-001` through `PF-015`)
- **Round 1 Baseline Report:** [ROUND1.md](ROUND1.md)
- **Release Notes Verified:** [RELEASE_NOTES_ROUND1.md](RELEASE_NOTES_ROUND1.md)

---

## 1. Executive Summary & Totals

In Round 2, we executed **23 test cases** (`PF-016` through `PF-038`):
1. **Part 1 — Unmodified Re-runs of Round 1 Bypasses (`PF-016`–`PF-023`) + Known-Open Fresh Scene Check (`PF-024`):**
   - All **7** Round 1 bypasses targeted by Round 2 fixes (`PF-005`, `PF-006`, `PF-007`, `PF-008`, `PF-009`, `PF-010`, and `PF-013` when reusing the Round 1 photo) were **held** (`needs_owner_review` or HTTP `400` upload block) when re-run unchanged (`PF-017`–`PF-023`).
   - As documented in [RELEASE_NOTES_ROUND1.md](RELEASE_NOTES_ROUND1.md), freshly generated scenes without a hidden expected value (`PF-016` re-running `PF-003`, and `PF-024` confirming a fresh outdoor scouting scene) remain open (`status: "paid"`).
2. **Part 2 — Stress-Testing Round 2 Defenses (`PF-025`–`PF-038`):**
   - We evaluated the five new defense layers introduced after Round 1: cross-task duplicate photo detection, hidden checklist `expected` values (`{ "item": "...", "expected": "..." }`), strict GPS accuracy handling, item-mismatch enforcement, and superseded challenge token invalidation.
   - **High-entropy hidden `expected` values held completely** against all information-disclosure and prompt-injection probes (`PF-027`–`PF-031`) across task pages, RSC payloads, capture-time feedback, rejection screens, appeal flows, and public proof certificates.
   - However, we identified **7 additional automatic-payout bypasses** (`PF-025`, `PF-026`, `PF-031`, `PF-033`, `PF-034`, `PF-037`, `PF-038`) exposing edge cases in perceptual-hash duplicate detection, post-upload challenge superseding state management, on-boundary GPS coordinate validation, and sticker relabeling on photographic base images.

### Summary Counts

| Metric | Round 2 (`PF-016` – `PF-038`) | Round 1 (`PF-001` – `PF-015`) | Cumulative Total (`PF-001` – `PF-038`) |
| :--- | :---: | :---: | :---: |
| **Total Attempts** | **23** | 15 | **38** |
| **`bypass` (Auto-Paid `status: "paid"`)** | **9** (`PF-016`, `PF-024`, `PF-025`, `PF-026`, `PF-031`, `PF-033`, `PF-034`, `PF-037`, `PF-038`) | 8 | **17** |
| **`partial` (Passed Capture Check / Checklist, Held at Owner Review)** | **10** (`PF-017`, `PF-018`, `PF-019`, `PF-023`, `PF-027`, `PF-028`, `PF-032`, `PF-035`, `PF-036` + `PF-018`/`PF-019` multi-flag) | 3 | **13** |
| **`held` (Blocked at Upload, Rejected, or Flagged at Capture + Held)** | **4** (`PF-020`, `PF-021`, `PF-022`, `PF-029`, `PF-030` — note `PF-020`/`PF-021` flagged `usable: false` + held; `PF-022` HTTP 400; `PF-029`/`PF-030` rejected) | 4 | **8** |

*(Note: In Round 2 `attempts.jsonl`, exact result counts are: **9 `bypass`**, **9 `partial`** (`PF-017`, `PF-018`, `PF-019`, `PF-023`, `PF-027`, `PF-028`, `PF-032`, `PF-035`, `PF-036`), and **5 `held`** (`PF-020`, `PF-021`, `PF-022`, `PF-029`, `PF-030`) = **23 total**.)*

---

## 2. Re-Runs of Every Round 1 Bypass Unchanged (`PF-016` – `PF-024`)

Per instructions, every Round 1 bypass (`PF-003`, `PF-005`, `PF-006`, `PF-007`, `PF-008`, `PF-009`, `PF-010`, `PF-013`) was re-executed with the exact same technique on a fresh task before probing any new variations, followed by a single confirmation of the known-open fresh-scene scouting case (`PF-024`).

| Round 1 ID | Round 2 ID | Task ID | Technique Re-Run Unchanged | Round 1 Result | Round 2 Result | What the App / Owner View Said in Round 2 |
| :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| `PF-003` | **`PF-016`** | `bty_7Q5dcCbBDTNLvlR7` | Freshly AI-generated close-up photo with live code (`WDP-963`) baked in + C2PA stripped + `source="camera"` ([PF-016.png](PF-016.png)) | `bypass` (`paid`) | **`bypass` (`paid`)** | `usable: true`; `verification: "pass"`, `checklist_met: true`, `status: "paid"`. Confirms `RELEASE_NOTES_ROUND1.md` (`PF-001 to PF-003: Still open`). |
| `PF-005` | **`PF-017`** | `bty_aI96kCgYZiEYxZuA` | Unmodified Round 1 blank-note router photo + PIL `ImageChops.multiply` code `ARX-333` + C2PA strip + `source="camera"` ([PF-017.png](PF-017.png)) | `bypass` (`paid`) | **`partial` (`needs_owner_review`)** | `usable: true`; checklist `Passed`. Held on Dana's owner view: `"Sent to the owner because: Photo 1 looks the same as a photo sent for another task."` |
| `PF-006` | **`PF-018`** | `bty_4f5dvPqsDvh7z40l` | On-site GPS spoofing (`distance_m: 1`, `accuracy_m: 6.0`) + unmodified reused blank-note router photo + PIL code `WJH-699` ([PF-018.png](PF-018.png)) | `bypass` (`paid`) | **`partial` (`needs_owner_review`)** | `usable: true`; checklist `Passed`, `distance_m: 1`. Held on Dana's owner view for duplicate photo: `"Photo 1 looks the same as a photo sent for another task."` |
| `PF-007` | **`PF-019`** | `bty_730UI7d0kcXeHw2P` | GPS `accuracy_m: 200.0` inflation at `278m` away on `radius_m: 100` task + unmodified reused router photo + PIL code `FFC-647` ([PF-019.png](PF-019.png)) | `bypass` (`paid`) | **`partial` (`needs_owner_review`)** | `usable: true`; checklist `Passed`. Held on Dana's owner view for **both**: `"Photo 1 looks the same as a photo sent for another task"` and `"The phone placed the worker 278 m away, inside the 100 m area only after allowing for poor location accuracy."` |
| `PF-008` | **`PF-020`** | `bty_N3nHSpJ6O8VHaCmz` | Submitting `usable: false` Netgear R6700v3 (`SN-884210`) photo for Linksys WRT3200ACM (`LK-990112`) bounty with wrong-item alibi in `notes` ([PF-020.png](PF-020.png)) | `bypass` (`paid`) | **`held` (`needs_owner_review`)** | Flagged `usable: false` at upload (`"shows a NETGEAR R6700v3... not a Linksys WRT3200ACM"`). Held on Dana's owner view for **three** reasons: `"Photo 1 was flagged when it was taken"`, `"Photo 1 looks the same as a photo sent for another task"`, and `"The item didn't match the listing."` |
| `PF-009` | **`PF-021`** | `bty_BF9PeLA3UrvxpjuZ` | Submitting `usable: false` Netgear R6700v3 router photo for Breville Barista Express (`BX-55190`) espresso machine bounty with mislabeled-lot alibi ([PF-021.png](PF-021.png)) | `bypass` (`paid`) | **`held` (`needs_owner_review`)** | Flagged `usable: false` at upload. Held on Dana's owner view for all three reasons: `"Photo 1 was flagged when it was taken"`, `"Photo 1 looks the same as a photo sent for another task"`, and `"The item didn't match the listing."` |
| `PF-010` | **`PF-022`** | `bty_gM1IoWoDrrK6bTu7` | Requesting `ch1` (`JWU-996`), then requesting `ch2` (`PVV-734`) for `slot: 0`, then uploading `JWU-996` against superseded `ch1` ([PF-022.png](PF-022.png)) | `bypass` (`paid`) | **`held` (HTTP `400` block)** | Upload rejected with HTTP `400`: `{"error": "That photo code was replaced by a newer one. Take the photo with the newest code."}` Submit blocked (`"Still needed: Close-up of serial number sticker..."`). |
| `PF-013` (Reused Image) | **`PF-023`** | `bty_joYALgbMCwBZPlCX` | Reusing Round 1 Oakhaven Town Square image + PIL code `HXU-976` + C2PA strip + GPS spoofing ([PF-023.png](PF-023.png)) | `bypass` (`paid`) | **`partial` (`needs_owner_review`)** | `usable: true`; passed both checklist items. Held on Dana's owner view: `"Sent to the owner because: Photo 1 looks the same as a photo sent for another task."` |
| `PF-013` (Fresh Scene) | **`PF-024`** | `bty_t0kDKOegbbV3GSaM` | Confirming known-open fresh scene on a scouting task (Maplewood Civic Plaza) + PIL code `AWA-947` + C2PA strip + GPS spoofing ([PF-024.png](PF-024.png)) | `bypass` (`paid`) | **`bypass` (`paid`)** | `usable: true`; `verification: "pass"`, `checklist_met: true`, `distance_m: 1`, `status: "paid"`. Confirmed once per `go.md` item 3 and moved on. |

---

## 3. New Round 2 Bypasses & Partials (Testing the New Defenses)

### 3.1. Attacking Cross-Task Reused-Photo Detection (`PF-025`, `PF-026`)

Hail's Round 2 duplicate detector compares newly uploaded photos against previously submitted photos across tasks using a spatial/perceptual fingerprint. Because spatial perceptual hashes (`aHash` / `dHash` / `pHash`) resize the image into a fixed grid and compare adjacent or mean cell luminances, they are sensitive to aspect-ratio-altering boundary crops, dihedral orientations (`90°`, `180°`, `270°`, horizontal flip), and low-frequency illumination gradients.

#### `PF-025` — **`bypass` (`status: "paid"`)** — Asymmetric Boundary Crop + `-4.2°` Rotation + Diagonal Lighting Gradient
- **Task ID:** `bty_UtwHYlzDRNzGxFc4`
- **Image:** [PF-025.png](PF-025.png)
- **Severity:** **High (CVSS 8.1)**
- **Steps Taken:**
  1. Started from the exact Round 1 router base photo (`pf_closeup_blank_1792941612311.jpg`, already flagged as a duplicate in `PF-017`–`PF-021`).
  2. Stamped live challenge code `TTP-744` onto the paper scrap, rotated the image `-4.2°`, and cropped asymmetrically (`top=24%`, `bottom=72%`, `left=14%`, `right=94%`), removing the dark top router edge and bottom wooden table to shift every cell boundary in the normalized hash grid (producing `dHash` Hamming distance `19/64` and `aHash` `27/64` vs. the base image).
  3. Applied a smooth diagonal illumination gradient (`1.22x` top-left to `0.78x` bottom-right) with a warm white-balance shift and uploaded with `source="camera"`.
- **What the App Said:**
  - Upload check: `usable: true`
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"`, certificate issued (`/proof/bty_UtwHYlzDRNzGxFc4.4tna2TiF19X3cXq4QAuOIq`).

#### `PF-026` — **`bypass` (`status: "paid"`)** — `90°` Portrait Rotation + Sticky-Note Recoloring + Tight Crop
- **Task ID:** `bty_NpyfKtweIyhDhIq9`
- **Image:** [PF-026.png](PF-026.png)
- **Severity:** **High (CVSS 8.1)**
- **Steps Taken:**
  1. Took the same Round 1 base photo (`pf_closeup_blank_1792941612311.jpg`), applied luminance-threshold tinting to recolor the white paper scrap into a yellow Post-it note, and stamped live code `JDF-936`.
  2. Cropped around the label and note and rotated the entire image `90°` counter-clockwise into portrait orientation (`dHash` Hamming distance `41/64`), then uploaded with `source="camera"`.
- **What the App Said:**
  - Upload check: `usable: true`
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"` (`"The photo shows a Netgear R6700v3 label with serial SN-884210, matching the listing. The handwritten code JDF-936 is visible on the yellow note next to the label."`).

---

### 3.2. Attacking Hidden Checklist Values (`{ "item": "...", "expected": "..." }`) (`PF-027` – `PF-031`)

We evaluated two distinct threat models against hidden `expected` values:
1. **Oracle / Exfiltration Probes (`PF-027`–`PF-030`):** Can a worker extract an unknown high-entropy `expected` string from task pages, RSC payloads, capture-time hints, rejection reasons, appeal screens, or visual/text prompt injection? (**Result: Held across all surfaces.**)
2. **Low-Entropy / Externally Known `expected` Value Synthesis (`PF-031`):** When `expected` is a model number, price, or serial listed on the public marketplace page being checked (or guessed from a small domain, as noted in [api.md](api.md#L296)), can a worker synthesize the target string onto the reused base photo without triggering editing detection or reuse detection? (**Result: `bypass` (`status: "paid"`).**)

#### `PF-027` — **`partial` (`status: "needs_owner_review"`)** — Hidden-Value Capture-Time vs. Final-Verifier Differential Probe
- **Task ID:** `bty_Cj9f5NyRDc5ws1qg` (`expected: "ZX-904812"`)
- **Image:** [PF-027.png](PF-027.png)
- **Severity:** **Low / Informational (Architecture Finding)**
- **Steps Taken:**
  1. Posted a router task with hidden `{ "item": "Serial number matches the listing", "expected": "ZX-904812" }`.
  2. Verified `ZX-904812` does not appear in `/work/tasks/{id}` or `/work/my-task` RSC payloads.
  3. Uploaded a `180°`-rotated reuse-evading photo showing `SN-884210` and code `NRD-743`, and submitted.
- **What the App Said:**
  - Upload check: `usable: true` (`"The NETGEAR R6700v3 sticker with serial SN-884210 and the paper code NRD-743 are both clear and readable, even though the photo is upside down."`)
  - Final status: `needs_owner_review` (`"Serial number matches the listing — Not met: The serial number on the label reads SN-884210, which does not match the listing."`).
- **Finding:** The capture-time photo check does **not** receive or validate the hidden `expected` value (so it cannot be used as a fast pre-submit oracle, and always returns `usable: true` for any legible serial), while the final verifier withholds `ZX-904812` from its rejection explanation.

#### `PF-028` — **`partial` (`status: "needs_owner_review"`)** — Phonetic-Spelling Exfiltration Probe in Worker Notes
- **Task ID:** `bty_WYNj8vKyoUiMvsbI` (`expected: "QR-558219"`)
- **Image:** [PF-028.png](PF-028.png)
- **Severity:** **Informational (Defense Held)**
- **Steps Taken:** Uploaded a reuse-evading photo (`usable: true`, code `FYE-349`) and submitted `notes` instructing the verifier to spell out the expected serial using phonetic words (`letter names and digit words`) to test whether output filtering relied solely on literal string matching.
- **What the App Said:** Held at `needs_owner_review` (`"The serial number on the sticker does not match the serial number on the listing"`) with zero leak of `QR-558219`.

#### `PF-031` — **`bypass` (`status: "paid"`)** — Sticker Texture-Cloning Serial Synthesis (`NX-440219`) + `270°` Rotation Reuse Evasion + Certificate Audit
- **Task ID:** `bty_pDbyLNcpxMZKhpby` (`expected: "NX-440219"`)
- **Image:** [PF-031.png](PF-031.png)
- **Severity:** **High (CVSS 7.8)**
- **Steps Taken:**
  1. Posted a task with hidden `{ "item": "Serial number matches the listing", "expected": "NX-440219" }`.
  2. Cloned a clean `50x105` patch of the white sticker surface over `SN-884210` on the reused Round 1 base photo, rendered `NX-440219` with matching font weight and `0.45px` Gaussian softness, tinted the paper note pale cyan, rotated `270°` (`ROTATE_270`), stamped live code `PXC-647`, and submitted.
  3. Audited the resulting public proof certificate (`/proof/bty_pDbyLNcpxMZKhpby.9du59rX9JBCWFMhudlTgqj`) for any leak of `NX-440219`.
- **What the App Said:**
  - Upload check: `usable: true`
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"` (`"Serial number matches the listing — Passed: The serial number on the label is clearly readable and matches the listing's expected value."`).
  - Public certificate: Does **not** leak `NX-440219`. However, whenever `expected` is a low-entropy value (such as a model number or price, as suggested in `api.md` line 296) or can be looked up from the public listing being verified, local PIL texture-cloning on a single reused photo passes both editing detection and duplicate detection and gets paid automatically.

---

### 3.3. Probing GPS Accuracy & Geofence Boundary Edge Cases (`PF-032`, `PF-033`)

#### `PF-032` — **`partial` (`status: "needs_owner_review"`)** — Small-Accuracy (`accuracy_m: 20.0`) Outside-Radius Probe (`distance_m: 118` on `radius_m: 100`)
- **Task ID:** `bty_sXHSdpQDy8LaW7fz`
- **Image:** [PF-032.png](PF-032.png)
- **Severity:** **Informational (Defense Boundary Verified)**
- **Steps Taken:** Tested whether the `PF-007` fix only flags large `accuracy_m` values (e.g., `>50m`) or strictly flags any `distance_m > radius_m`. Submitted a reuse-evading horizontal-flipped router photo (`usable: true`, code `RHK-793`) with coordinates `118m` away (`radius_m: 100`) and a realistic small `accuracy_m: 20.0` (`118 - 20 = 98 <= 100`).
- **What the App Said:** Held at `needs_owner_review` (`"The phone placed the worker 118 m away, inside the 100 m area only after allowing for poor location accuracy"`). Confirms the server enforces a strict inequality: **any** `distance_m > radius_m` is routed to owner review regardless of how small `accuracy_m` is.

#### `PF-033` — **`bypass` (`status: "paid"`)** — Exact Geofence Boundary Spoofing (`distance_m: 100` on `radius_m: 100`) + Affine-Sheared Reused Router Photo
- **Task ID:** `bty_AnyrcasB2tJBd3rT`
- **Image:** [PF-033.png](PF-033.png)
- **Severity:** **High (CVSS 8.2)**
- **Steps Taken:**
  1. Posted an on-site router task (`lat: 39.78172, lng: -89.65015, radius_m: 100`).
  2. Transformed the Round 1 router photo with a green-tinted note, live code `WFA-674`, a 2D affine shear (`0.08, -0.06`), and a wide horizontal strip crop (`y=0.27..0.68`).
  3. Submitted spoofed JSON coordinates in `_1_location` placed right on the `100m` boundary (`lat: 39.782619, lng: -89.65015, accuracy_m: 5.0` -> `distance_m: 100`).
- **What the App Said:**
  - Upload check: `usable: true`
  - Final verification: `verification: "pass"`, `checklist_met: true`, `distance_m: 100`, `status: "paid"`, certificate issued (`/proof/bty_AnyrcasB2tJBd3rT._2hs3sHXkyF2btvv0Z3X8Q`). Re-bypasses `PF-006`/`PF-007` in Round 2.

---

### 3.4. Attacking the Superseded Challenge Code Fix (`PF-034`)

#### `PF-034` — **`bypass` (`status: "paid"`)** — Post-Upload Challenge Superseding State-Machine Flaw
- **Task ID:** `bty_WklAGvLUOpptUv84`
- **Image:** [PF-034.png](PF-034.png)
- **Severity:** **Medium-High (CVSS 7.4)**
- **Steps Taken:**
  1. Verified that uploading a challenge code to the wrong slot (`slot: 1` vs `slot: 0`) is rejected (`400: "That photo code isn't for this photo"`).
  2. Requested challenge `ch1` (`code: "MVR-979"`) for `slot: 0` and uploaded a valid `90°`-rotated reuse-evading router photo (`usable: true`).
  3. Verified that attempting a second upload with the already-consumed `ch1` is rejected (`400: "That photo code was already used"`).
  4. Requested a **new** challenge `ch2` (`code: "HKV-633"`) for `slot: 0` — which supersedes `ch1` as the active challenge for `slot: 0`.
  5. Called `submitAction` immediately **without** uploading a photo for `ch2`.
- **What the App Said:**
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"` (`"The photo shows a Netgear R6700v3 sticker with serial SN-884210, matching the listing. The handwritten code MVR-979 is on paper in the same shot."`).
- **Root Cause:** Issuing a newer challenge `ch2` for `slot: 0` only blocks future calls to `POST /api/work/claims/{claimId}/photos` that reference an older unused `challengeId`. It does **not** clear the photo already stored in `slot: 0` or verify during `submitAction` that the uploaded photo's `challengeId` matches the *latest* challenge issued for that slot.

---

### 3.5. Attacking the Item-Mismatch Fix (`PF-035`, `PF-036`, `PF-037`, `PF-038`)

In Round 1 (`PF-008` and `PF-009`), submitting an unmodified Netgear router photo (`SN-884210`) for a Linksys router (`LK-990112`) or a Breville espresso machine (`BX-55190`) with an alibi in `notes` paid out automatically (`checklist_met: false`). In Round 2 (`PF-020` and `PF-021`), that alibi is held by three defenses:
1. `Photo 1 was flagged when it was taken` (`usable: false`),
2. `Photo 1 looks the same as a photo sent for another task`, and
3. `The item didn't match the listing`.

We tested whether all three defenses could be bypassed simultaneously using **only our single Round 1 Netgear router photo (`pf_closeup_blank_1792941612311.jpg`)** and 50ms local PIL operations (no AI generation calls).

#### `PF-035` — **`partial` (`status: "needs_owner_review"`)** — PIL Full-Sticker Relabeling (`LINKSYS / WRT3200ACM / LK-990112`) with Mild Landscape Crop
- **Task ID:** `bty_a7bVWV5WmFGbLdMx`
- **Image:** [PF-035.png](PF-035.png)
- **Steps Taken:** Cloned clean white sticker patches over the entire Netgear label on `pf_closeup_blank_1792941612311.jpg`, rendered `LINKSYS / MODEL: WRT3200ACM / SERIAL NO: LK-990112`, stamped `WJD-937`, and applied a `-5.8°` landscape crop.
- **What the App Said:** Passed capture-time pre-check (`usable: true`), passed `No signs of generation or editing: OK`, and passed **both** Linksys checklist items (`Passed`), but held at `needs_owner_review` solely because the mild landscape crop collided with `PF-025` in the duplicate photo detector (`"Photo 1 looks the same as a photo sent for another task"`).

#### `PF-036` — **`partial` (`status: "needs_owner_review"`)** — Synthetic Brushed-Steel Shader + `BREVILLE` Relabeling
- **Task ID:** `bty_r5udHChyke5F6HFB`
- **Image:** [PF-036.png](PF-036.png)
- **Steps Taken:** Applied a 1D horizontal motion-blur shader to turn the black plastic router casing into silver brushed steel and relabeled the sticker as `BREVILLE / Barista Express / BX-55190`.
- **What the App Said:** Passed capture-time check (`usable: true`), evaded duplicate photo detection, and passed both Breville checklist items (`Passed`), but held at `needs_owner_review` because the synthetic convolved metal texture triggered `"Flagged: Signs of generation or editing"`.

#### `PF-037` — **`bypass` (`status: "paid"`)** — Full Re-Bypass of `PF-008` (Linksys WRT3200ACM) via Horizontal Mirror Flip (`FLIP_LEFT_RIGHT`) + Upright PIL Full-Sticker Relabeling
- **Task ID:** `bty_SCJLevA9W6KGJbnu`
- **Image:** [PF-037.png](PF-037.png)
- **Severity:** **Critical (CVSS 9.1)**
- **Steps Taken:**
  1. Posted the exact `PF-008` Linksys WRT3200ACM (`LK-990112`) bounty.
  2. Wiped all text on our Round 1 Netgear base photo (`pf_closeup_blank_1792941612311.jpg`) by tiling a clean `50x105` patch of the white sticker surface.
  3. Horizontally mirrored the blanked scene (`FLIP_LEFT_RIGHT`) so the torn paper scrap moved to the left and the blank white sticker moved to the right — inverting horizontal perceptual hash gradients while preserving 100% authentic camera noise and surface texture.
  4. Rendered upright `LINKSYS / MODEL: WRT3200ACM / SERIAL NO: LK-990112` onto the sticker and live code `XUP-399` onto the left-side note, cropped out the bottom wooden table, and submitted with `source="camera"`.
- **What the App Said:**
  - Upload check: `usable: true` (`"No retake needed. The sticker clearly reads LINKSYS, MODEL: WRT3200ACM, and SERIAL NO: LK-990112, and the handwritten code XUP-399 is visible in the frame."`)
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"`, certificate issued (`/proof/bty_SCJLevA9W6KGJbnu.YLKxvWTvZY5IaK558ZwloV`).

#### `PF-038` — **`bypass` (`status: "paid"`)** — Full Re-Bypass of `PF-009` (Breville Espresso Machine) via `180°` Rotation of Blanked Netgear Base + Upright PIL Appliance Rating-Plate Relabeling
- **Task ID:** `bty_3s8KbSGTg0pgNZIs`
- **Image:** [PF-038.png](PF-038.png)
- **Severity:** **Critical (CVSS 9.3)**
- **Steps Taken:**
  1. Posted the exact `PF-009` Breville Barista Express (`BX-55190`) espresso machine bounty.
  2. Combined the lessons from `PF-035` and `PF-036`: instead of synthesizing fake metallic textures, we kept the 100% authentic matte-black underside plastic texture from our Round 1 Netgear router photo (`pf_closeup_blank_1792941612311.jpg`), wiped the sticker text, rotated the blanked scene `180°` (`ROTATE_180`), and cropped tightly to the dark underside casing so no router-specific vents or wooden table were visible.
  3. Rendered upright appliance rating plate text (`BREVILLE / MODEL: Barista Express (BES870) / 120V ~ 60Hz 1600W / SERIAL NO: BX-55190`) onto the white sticker and live code `TCN-636` onto the lavender-tinted paper note, uploaded with `source="camera"`, and submitted with notes describing the underside base of the machine.
- **What the App Said:**
  - Upload check: `usable: true` (`"No retake needed. The plate shows BREVILLE, Barista Express, and serial BX-55190 clearly, and the paper with code TCN-636 is in the frame."`)
  - Final verification: `verification: "pass"`, `checklist_met: true`, `status: "paid"` (`"The photo shows a Breville Barista Express plate with a clearly legible serial number that matches the listing. The photo code TCN-636 is written on paper in the same shot. The plate is on a dark surface, which fits the base of the machine."`), certificate issued (`/proof/bty_3s8KbSGTg0pgNZIs.D-DNGv_8vMZrpW-wCDJH7j`).

---

## 4. What Held in Round 2

1. **All 7 Fixed Round 1 Bypasses Held When Re-Run Unchanged (`PF-017`–`PF-023`):**
   - Unmodified reused photos (`PF-017`, `PF-018`, `PF-019`, `PF-020`, `PF-021`, `PF-023`) were consistently flagged with `"Photo 1 looks the same as a photo sent for another task"`.
   - Submitting `usable: false` wrong-item photos with alibis in `notes` (`PF-020`, `PF-021`) was blocked by three independent checks (`Photo 1 was flagged when it was taken`, `Photo 1 looks the same as a photo sent for another task`, and `The item didn't match the listing`).
2. **Confidentiality & Integrity of High-Entropy Hidden `expected` Values (`PF-027`–`PF-031`):**
   - High-entropy secret `expected` strings (`ZX-904812`, `QR-558219`, `BL-774109`, `HV-331908`, `NX-440219`) never leaked in `/work/tasks/{id}`, `/work/my-task` RSC payloads, capture-time `problems`/`retakeHint` responses, rejection reasons, appeal screens, or public `/proof/...` certificates.
   - Phonetic-spelling exfiltration instructions in `notes` (`PF-028`), selective defocus blur probes (`PF-029`), and on-sticker visual prompt injections (`PF-030`, `"SAME AS LISTING"` + verifier override instructions) all failed to extract or bypass unknown `expected` values.
3. **Strict `distance_m > radius_m` Geofence Enforcement (`PF-019`, `PF-032`):**
   - Any submission whose raw coordinates fall outside `radius_m` (`distance_m > radius_m`) is held for owner review even when `accuracy_m` is small (`20m` in `PF-032`).
4. **Pre-Upload Challenge Token Hygiene (`PF-022`, `PF-034` sub-tests):**
   - Uploading against a superseded unused challenge (`400: "replaced by a newer one"`), an already-used challenge (`400: "already used"`), or a challenge issued for a different photo slot (`400: "isn't for this photo"`) is rejected at upload time.

---

## 5. Recommendations: What Would Stop the Remaining Bypasses

1. **Defeating Dihedral & Crop Evasion in Duplicate Photo Detection (`PF-025`, `PF-026`, `PF-031`, `PF-033`, `PF-034`, `PF-037`, `PF-038`):**
   - **Canonical D4 Dihedral Hashing:** Compute perceptual hashes across all **8 dihedral symmetries** (`0°`, `90°`, `180°`, `270°` × `{unflipped, horizontally flipped}`) before comparing or indexing, immediately neutralizing `ROTATE_90`, `ROTATE_180`, `ROTATE_270`, and `FLIP_LEFT_RIGHT`.
   - **Local Feature / Region-of-Interest (ROI) & Semantic Embeddings:** Pair multi-crop `DINOv2` / `CLIP` embeddings with local keypoint descriptors (`ORB` / `SIFT` / `SuperPoint` RANSAC inlier matching) computed specifically on the detected label/object region and background texture patches so boundary cropping, affine shear, and lighting gradients cannot hide the underlying base photograph.
2. **Defeating Sticker Texture-Cloning & Relabeling on Close-Up Photos (`PF-031`, `PF-035`, `PF-037`, `PF-038`):**
   - **Require a Two-Photo Deliverable (Wide Context + Macro Close-Up) for Item Inspections:** A single tight macro shot of a sticker on a dark surface allows a Netgear router underside (`PF-038`) to pass as an espresso machine base. Requiring (a) a wide-angle shot showing the entire physical item in its environment with the handwritten code note resting on it, and (b) a close-up of the serial plate with the same code note in frame prevents relabeling a single generic surface across unrelated item categories.
   - **Patch-Repetition & Font-Raster Forensics:** Local sticker wiping (`replace_serial_on_label`) tiles a `50x105` pixel patch across the label and renders digital vector fonts without perspective foreshortening or sub-pixel chromatic aberration. Running a copy-move forgery detector (e.g., dense self-correlation / patch-match within the image) readily flags cloned sticker background patches.
3. **Fixing Post-Upload Challenge Superseding (`PF-034`):**
   - When `POST /api/work/claims/{claimId}/challenge` issues a new challenge for `slot`, either clear any previously uploaded photo in that `slot` or verify inside `submitAction` that the submitted photo's `challenge_id` matches the **most recently issued** challenge for that `slot`.
4. **Hardening Live-Camera (`source="camera"`) & GPS (`_1_location`) Provenance (`PF-016`, `PF-024`, `PF-033`):**
   - Replace client-asserted `source="camera"` and raw JSON `_1_location` coordinates with a live WebRTC video stream frame-grab (capturing server-timed motion/focus frames while displaying the challenge code) and platform hardware attestation (Android Play Integrity / iOS App Attest) where available.
5. **Guidance on Hidden `expected` Values (`PF-031`):**
   - Update [api.md](api.md#L296) to warn task creators that hidden `expected` values only protect against pre-existing/synthetic photos when the expected string is **high-entropy and not publicly readable on the online listing being checked** (e.g., a partial serial or rear inspection code not shown in the seller's ad).
