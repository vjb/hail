# Design Lab Report — Hail — Round 3

- **Date:** October 25, 2026
- **Screenshot folder reviewed:** Live site inspection + Round 3 verification & finding screenshots (`screenshots/DL-3-*.png`)
- **Live URL tested:** `https://hail-g9h8.onrender.com` (tested exclusively on the live URL using **Jordan** for worker screens and **Dana** for owner screens; no camera hardware was accessed; no owner approvals/rejections/reports were submitted; all claimed tasks were immediately given back)

---

## Summary

- **Overall visual score (across the 5 re-scored screens + 1 new hidden-value screen):** Desktop **4.9** / Phone **4.8** (Light **4.9**, Dark on specified screens **4.9**)
- **Change since last round (across the 5 re-scored screens):** **+0.9** overall (`4.0 → 4.9`; Desktop `4.3 → 4.9` `[+0.6]`, Phone `3.9 → 4.8` `[+0.9]`). Both Round 2 regressions (Owner Task Detail `3.8 → 4.9` and Owner Approvals `3.8 → 4.9`) are completely resolved.
- **Release-note verification (`DL-2-01` – `DL-2-08`):** **7 Fixed**, **1 Partly fixed** (`DL-2-08` shows the right-edge scroll shadow on mobile tables, with a minor left/right background tint seam noted in `DL-3-01`), **0 Still failing**
- **New feature — Hidden values on the owner side (`"Check a used road bike before purchase"`):** **4.8 / 5.0.** On the owner task page (`/owner/tasks/bty_jZElcQEgr56MMLGH`), the second checklist criterion clearly displays `Expected, hidden from the worker: WTU5582107` with the serial number highlighted in a warm amber-tinted pill. Opening the same task as worker **Jordan** (`/work/tasks/bty_jZElcQEgr56MMLGH`) confirms the expected serial number (`WTU5582107`) never appears anywhere on the worker's view.
- **Device matrix (targeted Round 3 conditions):** **5 works**, **1 works with minor visual issue** (`DL-3-01`), **0 broken**
- **Top 5 issues to fix first (all Low-severity polish items):**
  1. **DL-3-01 (Minor visual seam on `DL-2-08`):** On Owner table cards (`/owner/tasks`, `/owner/balance`, `/owner/keys`), the new scroll-shadow treatment leaves the central table area slightly darker/warmer than the `32px` left and right edges, creating a faint vertical tint seam along the left side of the first column even before scrolling (and on desktop where no horizontal scroll is needed).
  2. **DL-3-02 (Hidden-value visual cue on Owner Task Detail):** On `/owner/tasks/bty_jZElcQEgr56MMLGH` (*"Check a used road bike before purchase"*), `Expected, hidden from the worker: WTU5582107` is unambiguous in wording, but sits inside a card titled **"What the worker is asked to do"** without an eye-off/lock icon next to the label to visually reinforce at a glance that this line is owner-only.
  3. **DL-3-03 (Mid-word email break on narrow phones):** On Worker Account (`/work/settings`), `DL-2-01` is fixed—the long PayPal address stays completely inside the card at `360px` and `390px`—but because it wraps only at the right margin after `sb-`, the domain splits mid-word as `...personal.examp` / `le.com` at `360px` and `...personal.example.c` / `om` at `390px`. Placing the entire email on its own line below `Connected:` would avoid awkward single-letter/two-letter orphan tails.
  4. **DL-3-04 (Proof Certificate back-navigation for owners):** Opening the Proof Certificate (`/proof/:token`) from Owner Task Detail navigates in the same tab, and the certificate header only links the Hail logo to `/`, offering no `"Back to task"` link when viewed by a signed-in owner.
  5. **DL-3-05 (Repeated action buttons while confirmation is open on Owner Approvals):** On `/owner/approvals`, when `"Report as not genuine…"` is tapped and the red-bordered confirmation box (`"Report this proof as not genuine?"`) opens, the primary `"Accept and pay"` and `"Reject proof"` buttons remain active directly above the confirmation box rather than dimming or hiding until the owner taps `"Keep reviewing"`.

- **Keep these (what works well):**
  - **Semantic per-photo authenticity checks & `"Accepted after review"` badge (`DL-2-02`):** Every photo check on both Owner Task Detail and the Proof Certificate now pairs an icon with a colored status word (`✓ OK` in green, `? Check` in violet, `✕ Flagged` in red), and tasks accepted after owner review or appeal display a green `"Accepted after review"` pill instead of a contradictory `"Not met"` badge.
  - **Self-contained `"Report as not genuine…"` confirmation card (`DL-2-04`):** Tapping `"Report as not genuine…"` on `/owner/approvals` no longer pauses a worker's account immediately; instead it opens a clear, red-outlined confirmation card explaining the exact consequence (*"The proof is rejected and the worker's account is paused until they appeal this task"*) with explicit `"Report and pause this worker"` and `"Keep reviewing"` actions.
  - **Camera-unavailable fallback on Worker My Task (`DL-2-07`):** When camera access is not granted within a few seconds after tapping `"Take photo"`, the `"Opening the camera…"` spinner is replaced by plain, reassuring guidance (*"Allow camera access if your phone asks. If nothing happens, use your phone's camera below; the same code and time limit apply"*) above a primary amber `"Open my phone's camera"` button.
  - **Offline form-submission protection with focus management (`DL-2-06`):** Tapping a form submit button (such as `"Give this task back"`) while offline keeps the worker on `/work/my-task` instead of crashing to the browser's offline error screen, and moves focus directly to the high-contrast violet offline notice at the top of the page.
  - **Clean, shareable Proof Certificate (`DL-2-03`):** Raw model/prompt version identifiers are gone, the `Photos` list aligns flush left with the card headings, and a one-tap `"Copy certificate link"` pill button confirms `"Link copied"` when tapped.

---

## Release Notes Round 3 — Verification Matrix

Each item in `RELEASE_NOTES_ROUND3.md` (`DL-2-01` through `DL-2-08`) was verified on the live URL (`https://hail-g9h8.onrender.com`) in the exact device and condition where it failed in Round 2:

| Item | Round 2 Failure Condition Tested | Verdict | What You See Now on Live Site | Screenshot |
|---|---|---|---|---|
| **DL-2-01** | Worker Account (`/work/settings` as Jordan) on Small phone (`360×640`) & Standard phone (`390×844`) | **Fixed** | The long PayPal sandbox email (`sb-b63ke53532480@personal.example.com`) now wraps cleanly inside the `"Where we pay you"` card at both widths with zero horizontal page overflow: at `360×640`, page scroll width is `360px` and the email right edge (`323.8px`) sits `20.2px` inside the card border (`344px`); at `390×844`, page scroll width is `390px` and the email right edge (`353.3px`) sits `20.7px` inside the card border (`374px`). | `screenshots/DL-3-verify-DL-2-01.png`, `screenshots/DL-3-verify-DL-2-01-360.png` |
| **DL-2-02** | Owner Task Detail (`/owner/tasks/bty_izU2yrabE7blhlhI`) & Proof Certificate (`/proof/:token`) at `1440×900` and `390×844` (Light & Dark) | **Fixed** | Every per-photo check on both the owner task page and the certificate now shows an icon and a bold colored status word matching the checklist: `✓ OK` (green), `? Check` (violet), and `✕ Flagged` (red)—e.g., `? Check: Photo code not visible`, `✓ OK: Not a photo of a screen`, `✕ Flagged: Signs of generation or editing`. Furthermore, the `Proof` card header on a task accepted on appeal now displays a green `"Accepted after review"` pill instead of `"Not met"`. | `screenshots/DL-3-verify-DL-2-02.png` |
| **DL-2-03** | Proof Certificate (`/proof/bty_izU2yrabE7blhlhI...`) at `1440×900` and `390×844` (Light & Dark) | **Fixed** | 1. `"How this was checked"` now reads *"An AI verifier checked every checklist item and looked for signs of a screen, editing or generation..."* with no model or prompt version named.<br>2. Inside `"Photos"`, the photo titles (`Serial number plate, readable`) and `SHA-256` lines align to the exact pixel (`left: 213.5px` on 1440px, `0px` offset) with the `"Photos"` heading.<br>3. A `"Copy certificate link"` pill button (`44px` tall) sits directly below the task metadata and updates to `"Link copied"` when tapped. | `screenshots/DL-3-verify-DL-2-03.png` |
| **DL-2-04** | Owner Approvals (`/owner/approvals`) at `1440×900` and `390×844` (Light) | **Fixed** | The third action button is now labeled `"Report as not genuine…"` (styled as an outlined pill button). Tapping it does not submit immediately; it opens a red-bordered confirmation box: *"Report this proof as not genuine? Use this only if you believe the photos were faked, not because they're unclear. The proof is rejected and the worker's account is paused until they appeal this task."* with `"Report and pause this worker"` and `"Keep reviewing"`. Tapping `"Keep reviewing"` cleanly closes the confirmation without reporting. | `screenshots/DL-3-verify-DL-2-04.png` |
| **DL-2-05** | Worker Task Detail (`/work/tasks/bty_jZElcQEgr56MMLGH`) on Standard phone (`390×844`) | **Fixed** | The sticky claim bar (`bottom: 779px`) now sits completely flush against the top of the `65px` bottom navigation bar (`top: 779px`), eliminating the `7px` transparent gap (`0px` gap) while keeping all checklist items readable above the bar when scrolled to the bottom. | `screenshots/DL-3-verify-DL-2-05.png` |
| **DL-2-06** | Worker My Task (`/work/my-task` as Jordan) on Standard phone (`390×844`) with network set to `Offline`, tapping `"Give this task back"` | **Fixed** | Submitting a form while offline no longer navigates to the browser's `ERR_INTERNET_DISCONNECTED` page. The worker remains on `/work/my-task`, the page scrolls to the top, and keyboard focus moves directly to the violet offline status banner (`"You're offline. Your reservation and anything you've entered are kept here; we'll update when you're back online."`) with a visible focus ring. | `screenshots/DL-3-verify-DL-2-06.png` |
| **DL-2-07** | Worker My Task (`/work/my-task` as Jordan) at `390×844` and `1440×900` after tapping `"Take photo"` without granting camera access | **Fixed** | After ~4 seconds without camera access, the `"Opening the camera…"` spinner disappears and is replaced by a clear note: *"Allow camera access if your phone asks. If nothing happens, use your phone's camera below; the same code and time limit apply."* pointing directly to the primary amber `"Open my phone's camera"` button below it. | `screenshots/DL-3-verify-DL-2-07.png` |
| **DL-2-08** | Owner Tasks (`/owner/tasks`) on Standard phone (`390×844`) | **Partly fixed** *(minor seam in `DL-3-01`)* | On `390×844`, the right inner edge of the horizontally scrollable table card displays a soft vertical shadow (`12px` wide) where additional columns (`Kind`, `Pay`, `Posted`) continue off-screen. *(Minor visual side effect: the table card's central background is transparent warm paper rather than white card surface, leaving a faint vertical tint seam `32px` inside the left edge of the card; see `DL-3-01`.)* | `screenshots/DL-3-verify-DL-2-08.png` |

---

## Part 1 — Re-Scored Screens & New Hidden-Value Review (Round 3)

*(Per Round 3 instructions, only the 5 specified screens plus the new hidden-value task view are scored below at desktop `1440px` and phone `390px` in light theme, plus dark theme where noted.)*

### 1. Owner — task detail with proof (`/owner/tasks/bty_izU2yrabE7blhlhI`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Task title, `$25.00` pay, green `Paid` and `Accepted after review` badges, side-by-side proof photos, per-photo checks, and checklist results scan in under 2 seconds. |
| Layout and spacing | 5 | Balanced full-width `Proof` card above the two-column details/history grid on 1440px, and a clean vertical stack with zero horizontal overflow on 390px. |
| Typography | 5 | Crisp Bricolage Grotesque headings, Geist Mono `$25.00` pay and timestamps, and bold status prefixes (`Check:`, `OK:`, `Flagged:`) on every per-photo check. |
| Color and contrast | 5 | Semantic colors (`✓ OK` in green, `? Check` in violet, `✕ Flagged` in red) have strong contrast on both `#FFFFFF` light cards and `#1B1E22` dark cards. |
| Consistency | 5 | Per-photo authenticity checks and checklist criteria now share an identical icon + bold colored word + explanation pattern (`DL-2-02` fixed). |
| Brand fit | 5 | Directly fulfills `brand-intent.md`: *"Statuses should always show a word (and ideally an icon), never color alone."* |
| Trust and clarity | 5 | Replacing the stale `"Not met"` badge with a green `"Accepted after review"` badge eliminates the contradiction with `"Paid"` when an appeal or owner review succeeds. |
| Touch and accessibility | 4 | Full-width photo links, `"Open the proof certificate"` link, and `"How it was checked"` disclosure triangle are easy to tap on 390px. |
| **Overall** | **4.9** | **Desktop: 4.9 / Phone: 4.9 (Light: 4.9, Dark: 4.9).** Complete recovery from Round 2's regression; every automated and human verification step is transparent at a glance. |

- **Issues:** None (`DL-2-02` fixed).
- **Previous round:** **3.8 → 4.9 (`+1.1`)**
- **Screenshots:** `screenshots/DL-3-verify-DL-2-02.png` (1440 light), `screenshots/DL-3-owner-task-proof-1440-dark.png` (1440 dark), `screenshots/DL-3-owner-task-proof-390-light.png` (390 light), `screenshots/DL-3-owner-task-proof-390-dark.png` (390 dark)

---

### 2. Owner — approvals, with "Report as not genuine…" confirmation open (`/owner/approvals`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | The opened red-bordered confirmation box (`"Report this proof as not genuine?"`) immediately commands attention below the review controls before any irreversible action occurs. |
| Layout and spacing | 5 | Well-padded confirmation card inside the approval form, with inline buttons on 1440px and a clean full-width button + `"Keep reviewing"` stack on 390px. |
| Typography | 5 | Bold confirmation question followed by plain, readable explanation of when to use it and what happens next. |
| Color and contrast | 5 | Red border and red-outlined `"Report and pause this worker"` button signal danger clearly without competing with the amber `"Accept and pay"` primary button. |
| Consistency | 4 | The initial trigger (`"Report as not genuine…"`) now uses an outlined pill button with an ellipsis (`…`); minor: `"Accept and pay"` and `"Reject proof"` stay visible above the open confirmation box (`DL-3-05`). |
| Brand fit | 5 | Warm, fair, plain-spoken copy (*"Use this only if you believe the photos were faked, not because they're unclear. The proof is rejected and the worker's account is paused until they appeal this task."*). |
| Trust and clarity | 5 | Completely eliminates Round 2's accidental-suspension trap (`DL-2-04` fixed) while also displaying the newly styled `OK` / `Check` / `Flagged` per-photo checks on every approval card. |
| Touch and accessibility | 5 | Both `"Report and pause this worker"` and `"Keep reviewing"` have generous tap targets and spacing on 390px phone. |
| **Overall** | **4.9** | **Desktop: 4.9 / Phone: 4.9 (Light: 4.9).** A textbook high-consequence confirmation pattern that protects both owners and workers from accidental account suspension. |

- **Issues:** `DL-3-05` (minor: `"Accept and pay"` and `"Reject proof"` remain active above the confirmation box while it is open).
- **Previous round:** **3.8 → 4.9 (`+1.1`)**
- **Screenshots:** `screenshots/DL-3-verify-DL-2-04.png` (390 light), `screenshots/DL-3-owner-approvals-confirm-1440-light.png` (1440 light)

---

### 3. Proof certificate (`/proof/:token`) — 1440 & 390 — Light & Dark
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Clear `PROOF CERTIFICATE` eyebrow, task title, `"Copy certificate link"` CTA, `"Accepted by the task owner after review"` summary, `Checklist`, `Photos`, and `How this was checked`. |
| Layout and spacing | 5 | `Photos` items now align flush left (`0px` offset) with the card headings (`DL-2-03` fixed); zero horizontal overflow on 390px (`docScrollWidth: 390px`). |
| Typography | 5 | Monospace `SHA-256` fingerprints wrap cleanly inside mobile cards, and all internal model/prompt version strings are removed (`DL-2-03` fixed). |
| Color and contrast | 5 | Both `Checklist` and `Photos` now use matching green (`OK` / `Passed`), violet (`Check`), and red (`Flagged` / `Not met`) status indicators across light and dark modes (`DL-2-02` fixed). |
| Consistency | 5 | Visual and semantic parity between the Owner Task Detail page and the public Proof Certificate across light and dark themes. |
| Brand fit | 5 | Plain, candid, accountable prose (*"An AI verifier checked every checklist item and looked for signs of a screen, editing or generation..."*). |
| Trust and clarity | 5 | One-tap `"Copy certificate link"` button with instant `"Link copied"` feedback makes sharing effortless. |
| Touch and accessibility | 4 | The `"Copy certificate link"` button is `44px` tall with a polite live region; minor: no `"Back to task"` link when opened by a signed-in owner in the same tab (`DL-3-04`). |
| **Overall** | **4.9** | **Desktop: 4.9 / Phone: 4.9 (Light: 4.9, Dark: 4.9).** Polished, trustworthy, shareable verification record in both themes. |

- **Issues:** `DL-3-04` (minor: lacks a `"Back to task"` link when navigated to from Owner Task Detail in the same tab).
- **Previous round:** **3.9 → 4.9 (`+1.0`)**
- **Screenshots:** `screenshots/DL-3-verify-DL-2-03.png` (1440 light), `screenshots/DL-3-proof-cert-1440-dark.png` (1440 dark), `screenshots/DL-3-proof-cert-390-light.png` (390 light), `screenshots/DL-3-proof-cert-390-dark.png` (390 dark)

---

### 4. Worker — account (`/work/settings`, as Jordan) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Immediately answers who is signed in (`Jordan (demo worker)`), where payouts go (`Connected: sb-b63ke53532480@personal.example.com`), and that the PayPal account is verified. |
| Layout and spacing | 5 | Long PayPal email now stays completely inside the `"Where we pay you"` card at both `390px` and `360px` (`DL-2-01` fixed), with zero horizontal page scroll. |
| Typography | 4 | Crisp on 1440px; on `390px` and `360px`, wrapping inline after `Connected: sb-` breaks the domain mid-word (`...personal.example.c` / `om` at 390px; `...personal.examp` / `le.com` at 360px, `DL-3-03`). |
| Color and contrast | 5 | Green `"Verified PayPal account"` badge with checkmark icon and high-contrast action buttons read clearly outdoors. |
| Consistency | 5 | Matches card radii, borders, and button treatments across the worker experience. |
| Brand fit | 5 | Reassuring, plain copy (*"Hail pays approved work straight to your PayPal account. No bank details needed."*). |
| Trust and clarity | 5 | Full visibility of the connected PayPal email plus the `"Verified PayPal account"` badge gives workers complete payout confidence. |
| Touch and accessibility | 4 | Full-width `"Connect a different PayPal account"` and `"Sign out"` buttons exceed 44px height with comfortable vertical spacing. |
| **Overall** | **4.8** | **Desktop: 4.9 / Phone: 4.6 (Light: 4.8).** `DL-2-01` is resolved; long PayPal addresses never overflow the card or screen on any phone width. |

- **Issues:** `DL-3-03` (minor typographic polish: mid-word line break on `.com` / `le.com` at 390px/360px).
- **Previous round:** **3.8 → 4.8 (`+1.0`)**
- **Screenshots:** `screenshots/DL-3-verify-DL-2-01.png` (390 light), `screenshots/DL-3-verify-DL-2-01-360.png` (360 light), `screenshots/DL-3-worker-account-1440-light.png` (1440 light)

---

### 5. Worker — my task, while adding a photo (`/work/my-task`, code card & camera-unavailable state, as Jordan) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | The dashed high-contrast code card (`UUJ-479` / `XUA-799`), `2:00` countdown, camera-fallback explanation, and primary amber `"Open my phone's camera"` CTA form an unmistakable sequence. |
| Layout and spacing | 5 | Generous padding inside the amber-tinted verification card on both 390px and 1440px. |
| Typography | 5 | Giant tracked-out Geist Mono verification code is effortless to copy onto paper; countdown and fallback instructions are crisp. |
| Color and contrast | 5 | Warm amber card tint (`#FFF6D6`), pure white dashed code ticket, and high-contrast dark text on the amber `"Open my phone's camera"` button. |
| Consistency | 5 | Seamless progression from `"Opening the camera…"` to the static fallback note after ~4 seconds (`DL-2-07` fixed), plus offline form-submit protection (`DL-2-06` fixed). |
| Brand fit | 5 | Calm, helpful, zero-jargon guidance when camera access is blocked or unavailable. |
| Trust and clarity | 5 | Explicitly reassures the worker that *"the same code and time limit apply"* when switching to `"Open my phone's camera"`. |
| Touch and accessibility | 4 | Full-width `48px` amber `"Open my phone's camera"` button, polite ARIA status updates, and automatic focus move to the offline banner if submitted offline. |
| **Overall** | **4.9** | **Desktop: 4.9 / Phone: 4.9 (Light: 4.9).** Both `DL-2-06` and `DL-2-07` are resolved; the photo-capture flow handles blocked cameras and offline clicks gracefully. |

- **Issues:** None (`DL-2-06` and `DL-2-07` fixed).
- **Previous round:** **4.8 → 4.9 (`+0.1`)**
- **Screenshots:** `screenshots/DL-3-verify-DL-2-07.png` (390 light), `screenshots/DL-3-worker-my-task-camera-1440-light.png` (1440 light), `screenshots/DL-3-verify-DL-2-06.png` (390 offline form submit)

---

### 6. New Feature Review — Hidden values on the owner side (`"Check a used road bike before purchase"`, `/owner/tasks/bty_jZElcQEgr56MMLGH` vs. `/work/tasks/bty_jZElcQEgr56MMLGH`) — 1440 & 390 — Light
| Dimension | Score | Reason |
|---|---|---|
| Hierarchy | 5 | Under `"Accepted when"`, the checklist item `"The frame serial matches the listing"` clearly surfaces `Expected, hidden from the worker: WTU5582107` on a dedicated sub-line. |
| Layout and spacing | 5 | Clean indentation aligned with the checklist item text on both 1440px and 390px, with zero horizontal overflow. |
| Typography | 5 | The expected value `WTU5582107` is set in a warm amber-tinted pill (`rgb(255, 242, 205)`) that distinguishes the literal value from the descriptive label. |
| Color and contrast | 5 | High-contrast text inside the soft amber value pill is easy to scan without overpowering the primary task status badges. |
| Consistency | 5 | Matches the checklist structure across Owner Task Detail and Worker Task Detail while cleanly omitting the secret value from the worker's page. |
| Brand fit | 5 | Plain, self-explanatory wording (`"Expected, hidden from the worker: WTU5582107"`) that requires zero documentation to understand. |
| Trust and clarity | 4 | Wording is very clear and worker-side verification confirms `WTU5582107` never appears on `/work/tasks/bty_jZElcQEgr56MMLGH`; minor: because it sits inside a card titled **"What the worker is asked to do"**, adding an eye-off/lock icon would reinforce visually that this line is hidden from the worker (`DL-3-02`). |
| Touch and accessibility | 4 | Clean, readable static text on 390px phone (`screenshots/DL-3-hidden-value-owner-390.png` and `screenshots/DL-3-hidden-value-worker-390.png`). |
| **Overall** | **4.8** | **Desktop: 4.9 / Phone: 4.8 (Light: 4.8).** Clear, trustworthy anti-spoofing design: the owner sees the exact expected serial number (`WTU5582107`) while the worker (`Jordan`) only sees `"The frame serial matches the listing"`. |

- **Worker-view confirmation (as Jordan on `/work/tasks/bty_jZElcQEgr56MMLGH`):** Verified that under `"Your proof is accepted when"`, Jordan sees only:
  1. `The frame serial number is legible`
  2. `The frame serial matches the listing`
  3. `The whole bike is visible`
  The expected value `WTU5582107` is **never** shown anywhere on the worker's screen (`screenshots/DL-3-hidden-value-worker-390.png`).
- **Issues:** `DL-3-02` (minor: sits inside the card headed `"What the worker is asked to do"` without a lock/eye-off icon).
- **Previous round:** **New feature → 4.8**
- **Screenshots:** `screenshots/DL-3-02.png` (1440 owner light), `screenshots/DL-3-hidden-value-owner-390.png` (390 owner light), `screenshots/DL-3-hidden-value-worker-390.png` (390 worker light)

---

### Cross-Screen Consistency (Round 3 Rollup)

- **Average across Round 3 scored screens:**
  - **Desktop (1440px):** **4.9** (up from **4.3** on the 5 re-scored screens in Round 2)
  - **Phone (390px):** **4.8** (up from **3.9** on the 5 re-scored screens in Round 2)
  - **Light theme:** **4.9** | **Dark theme (on Owner Task Detail & Proof Certificate):** **4.9**
- **The three weakest screens in Round 3 (all scoring 4.8–4.9):**
  1. **Worker — account (`/work/settings`) — 4.8** (Phone **4.6** only due to mid-word domain wrapping `...personal.example.c` / `om` on 390px, `DL-3-03`)
  2. **Owner — task detail with hidden value (`/owner/tasks/bty_jZElcQEgr56MMLGH`) — 4.8** (minor card-heading context `"What the worker is asked to do"` vs. `"Expected, hidden from the worker"`, `DL-3-02`)
  3. **Owner — approvals (`/owner/approvals`) — 4.9** (minor: primary approve/reject buttons remain active above the open `"Report this proof as not genuine?"` confirmation card, `DL-3-05`)
- **Cross-screen consistency highlights:**
  1. **Checklist Criteria & Per-Photo Authenticity Checks (`DL-2-02` resolved):** Owner Task Detail, Owner Approvals, and the Proof Certificate now use a unified semantic icon + status word system (`✓ OK` / `Passed`, `? Check` / `Unclear`, `✕ Flagged` / `Not met`) in both light and dark modes.
  2. **High-Consequence Action Safeguards (`DL-2-04` resolved):** Destructive or high-stakes actions across Hail now consistently explain their consequences before acting, most notably the new `"Report as not genuine…"` confirmation card on Owner Approvals.
  3. **Scrollable Table Card Background vs. Standard Cards (`DL-3-01`):** Standard cards use a solid white surface (`#FFFFFF` in light mode, `#1B1E22` in dark mode), whereas `.table-wrap` cards on `/owner/tasks`, `/owner/balance`, and `/owner/keys` show the page's warm paper background across the center of the table with `32px` white/surface bands on the left and right edges.

---

## Part 2 — Targeted Device & Condition Matrix (Round 3)

*(Per `go.md`, the full device matrix and Part 3 health audit were skipped in this short round; below is the summary of the exact devices and conditions tested for Round 3 verification.)*

| Config | Result | Finding IDs | Notes |
|---|---|---|---|
| **Small phone (`360×640`, touch)** | **Works** | `DL-3-03` *(minor)* | `DL-2-01` verified fixed on `/work/settings`: PayPal email wraps inside card (`323.8px` vs. `344px` card right edge; `docScrollWidth: 360px`). |
| **Standard phone (`390×844`, touch, light)** | **Works with minor issue** | `DL-3-01` | `DL-2-01` (email wrap), `DL-2-02` (photo checks), `DL-2-03` (certificate alignment & copy button), `DL-2-04` (report confirmation), `DL-2-05` (claim bar `0px` gap), and `DL-2-07` (camera fallback note) all pass cleanly. `/owner/tasks` shows the right-edge scroll shadow (`DL-2-08`) with a faint left-edge background tint seam (`DL-3-01`). |
| **Standard phone (`390×844`, touch, dark)** | **Works** | — | Owner Task Detail with proof (`/owner/tasks/bty_izU2yrabE7blhlhI`) and Proof Certificate (`/proof/:token`) render with crisp contrast and matching semantic status colors in dark mode. |
| **Laptop (`1440×900`, light & dark)** | **Works** | `DL-3-01` *(minor)* | All 5 re-scored screens and the new hidden-value owner task screen render cleanly at `1440×900`. |
| **Offline form submit (`390×844`, `Offline`)** | **Works** | — | `DL-2-06` verified fixed: clicking `"Give this task back"` while offline keeps the user on `/work/my-task` and moves focus to the `"You're offline..."` status banner. |
| **Camera unavailable (`390×844` & `1440×900`)** | **Works** | — | `DL-2-07` verified fixed: after ~4 seconds without camera access, the spinner is replaced by the static note pointing to `"Open my phone's camera"`. |

---

## Findings (Round 3)

### DL-3-01: Scrollable table cards show a faint vertical background tint seam along the left and right edges (minor residual on `DL-2-08`)
- **Severity:** Low
- **Type:** Visual
- **Where:** Owner Tasks (`/owner/tasks`), Owner Balance (`/owner/balance`), and Owner API Keys (`/owner/keys`) on Phone (`390×844`) and Desktop (`1440×900`), Light & Dark themes
- **What you see:** On `390×844`, horizontally scrollable tables now display the intended `12px` soft shadow at the right edge when more columns exist off-screen (`DL-2-08`). However, the central area of the table card shows the page's warm paper background (`#FAF8F3` in light mode, `#121417` in dark mode) while the outer `32px` left and right edges are painted with the card surface color (`#FFFFFF` in light mode, `#1B1E22` in dark mode). This creates a faint vertical color seam `32px` inside the left edge of the card (right next to the `Task` column) even when the table is at `scrollLeft = 0`, as well as on `1440×900` desktop where the table does not scroll.
- **Why it matters to the user:** The vertical transition from pure white (`#FFFFFF`) to warm paper (`#FAF8F3`) `32px` inside the left border of the card looks like a permanent left-edge shadow even before the user has scrolled horizontally.
- **Suggestion:** Keep the solid card surface color (`#FFFFFF` in light mode / `#1B1E22` in dark mode) behind the scroll-shadow gradients on table cards so the `32px` edge cover blends invisibly into the rest of the card when not scrolled.
- **Screenshot:** `screenshots/DL-3-01.png`

---

### DL-3-02: "Expected, hidden from the worker" value on Owner Task Detail sits under "What the worker is asked to do" without an icon badge
- **Severity:** Low
- **Type:** Visual / Trust & clarity
- **Where:** Owner Task Detail (`/owner/tasks/bty_jZElcQEgr56MMLGH`, *"Check a used road bike before purchase"*) at `1440×900` and `390×844`
- **What you see:** Under the `"Accepted when"` checklist inside the card titled **"What the worker is asked to do"**, the second item (`"The frame serial matches the listing"`) displays a sub-line reading `Expected, hidden from the worker: WTU5582107`, with `WTU5582107` highlighted in a warm amber pill. The wording itself is unambiguous, and checking the worker's view (`/work/tasks/bty_jZElcQEgr56MMLGH` as Jordan) confirms `WTU5582107` is completely hidden from the worker. However, because the parent card heading says **"What the worker is asked to do"** and the `Expected, hidden from the worker:` prefix is plain muted text without an icon, an owner scanning quickly has to read the fine print to realize that this specific line is an exception to the card's title.
- **Why it matters to the user:** Pairing `"hidden from the worker"` with a small lock or eye-off icon would reinforce at a glance that the worker cannot see the expected value, matching `brand-intent.md`'s preference for pairing statuses/states with icons.
- **Suggestion:** Add a small eye-off or lock icon immediately before `"Expected, hidden from the worker:"` (or style `"Hidden from worker"` as a small subtle pill tag next to `WTU5582107`).
- **Screenshot:** `screenshots/DL-3-02.png`

---

### DL-3-03: Connected PayPal email on Worker Account breaks mid-domain (`.c` / `om`) on 390px and 360px phones
- **Severity:** Low
- **Type:** Visual / Typography
- **Where:** Worker Account (`/work/settings` as Jordan) on Standard phone (`390×844`) and Small phone (`360×640`)
- **What you see:** `DL-2-01` is functionally fixed—the connected PayPal email (`sb-b63ke53532480@personal.example.com`) stays completely inside the `"Where we pay you"` card at both `390px` and `360px`. Because `Connected: sb-` sits on the first line and the remaining 34 characters wrap onto the second line and break strictly at the right margin, the domain splits mid-word as `b63ke53532480@personal.example.c` / `om` at `390px` and `b63ke53532480@personal.examp` / `le.com` at `360px`.
- **Why it matters to the user:** Leaving a 2-letter orphan (`om`) on a third line is slightly harder to scan than keeping the email address together or breaking cleanly at `@`.
- **Suggestion:** Place the email address on its own block line below the `"Connected"` label (or insert a zero-width break opportunity after `@`) so the domain `.example.com` stays intact on one line.
- **Screenshot:** `screenshots/DL-3-03.png`

---

### DL-3-04: Proof Certificate has no "Back to task" link when opened from Owner Task Detail in the same tab
- **Severity:** Low
- **Type:** Usability / Consistency
- **Where:** Proof Certificate (`/proof/:token`) when navigated to from Owner Task Detail (`/owner/tasks/:id`) at `1440×900` and `390×844`
- **What you see:** Clicking `"Open the proof certificate"` on `/owner/tasks/bty_izU2yrabE7blhlhI` navigates in the current tab to `/proof/bty_izU2yrabE7blhlhI...`. While the certificate now has a great `"Copy certificate link"` button (`DL-2-03`), its header only contains the Hail logo (linking to `/`), with no `"← Back to task"` link like the `"← All tasks"` link on Owner Task Detail.
- **Why it matters to the user:** Signed-in owners who open the certificate to inspect or copy its link must use the browser's Back button to return to the task page.
- **Suggestion:** Either open `"Open the proof certificate"` in a new tab or render a subtle `"← Back to task"` link in the certificate header when viewed by a signed-in owner.
- **Screenshot:** `screenshots/DL-3-04.png`

---

### DL-3-05: Primary "Accept and pay" and "Reject proof" buttons remain active above the open "Report as not genuine…" confirmation box
- **Severity:** Low
- **Type:** Visual / Hierarchy
- **Where:** Owner Approvals (`/owner/approvals`) at `1440×900` and `390×844` when the `"Report this proof as not genuine?"` confirmation box is open
- **What you see:** When the owner taps `"Report as not genuine…"`, that button is replaced by the red-outlined confirmation card containing `"Report and pause this worker"` and `"Keep reviewing"` (`DL-2-04`). Directly above the confirmation card, however, the amber `"Accept and pay"` button and red-outlined `"Reject proof"` button remain visible and active at the same time.
- **Why it matters to the user:** Showing two red-outlined buttons stacked on top of each other (`"Reject proof"` above `"Report and pause this worker"`) while the confirmation is open creates slight visual competition on mobile (`390×844`).
- **Suggestion:** Hide or dim `"Accept and pay"` and `"Reject proof"` while the `"Report this proof as not genuine?"` confirmation box is open, restoring all three buttons when `"Keep reviewing"` is tapped.
- **Screenshot:** `screenshots/DL-3-05.png`
