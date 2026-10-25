# UAT Report — Hail — Round 2

- Date: October 25, 2026
- App URL tested: https://hail-g9h8.onrender.com
- Screens tested: desktop (1280px) / phone (390px)

## Release notes verification (`RELEASE_NOTES_ROUND1.md`)

| Item | Expected behavior in Round 2 | Status | Evidence & Notes | Screenshot |
|---|---|---|---|---|
| **UAT-1-01** (`AC-20`) | The product photo under "What you're looking for" now has a text description (`"Product photo: …"`). The photo itself was already shown. | **Confirmed** | On `/work/tasks/bty_dr7ziOxALJqZWtNi` (*"Inspect used espresso machine (Barista Express Espresso Machine)"*), the `"What you're looking for"` card renders the 88×88 product image (`naturalWidth: 2048`) with `alt="Product photo: Barista Express Espresso Machine"` alongside `"Barista Express Espresso Machine"` and `"macys.com"`. | `uat-r2-relnote-product-photo.png` |
| **UAT-1-02** (`AC-15`–`AC-18`) | Known: the control room isn't built yet. Skip `AC-15` to `AC-18` until told otherwise. | **Confirmed (Skipped)** | `/owner/control-room` displays `"The control room opens soon. Live numbers for money set aside, payouts, blocked attempts and more."` `AC-15` to `AC-18` remain marked `Blocked: not yet available`. | `uat-r2-relnote-control-room.png` |
| **UAT-1-03** (`AC-22`, `AC-28`) | By design: the live site runs real-length timers. Mark `AC-22` and `AC-28` as `"Blocked: timer"` again. | **Confirmed (By design)** | Task claim reservation countdown runs for 60 minutes (`59:52 left`) and rejection appeal windows run for 24 hours (`until Oct 26, 12:49 PM`). Marked `Blocked: timer`. | `uat-r2-hidden-value-worker-claimed.png` |
| **UAT-1-04** (`AC-24`, `AC-42`) | The camera and report-as-not-genuine checks are done by a person on a real phone. Skip them. | **Confirmed** | Live camera hardware was blocked/dismissed and tested via `"Open my phone's camera"` file fallback. For `"Report as not genuine…"`, verified the inline confirmation message and tapped `"Keep reviewing"` without confirming. | `uat-r2-report-not-genuine-confirm.png` |
| **Give-back** (`AC-21`) | After `"Give this task back"`, the task list shows `"You gave the task back. It's open for others again."` | **Confirmed** | Tapping `"Give this task back"` on `/work/my-task` redirects to `/work?returned=1` and displays the polite status banner `"You gave the task back. It's open for others again."` | `uat-r2-give-back-confirmation-mobile.png` |

---

## Round 2 focused checks

### 1. Hidden values (`"Check a used road bike before purchase"`, task `bty_jZElcQEgr56MMLGH`)
- **As Sam (Worker, 390px & 1280px):**
  - **Before claiming (`/work/tasks/bty_jZElcQEgr56MMLGH`):** Confirmed the expected serial number (`WTU5582107`) appears **nowhere** in the task instructions, `"What to capture"`, `"Your proof is accepted when"` checklist (`"The frame serial matches the listing — To capture"`), visible page text, or full DOM HTML (`containsInText: false`, `containsInHtml: false`). (`uat-r2-hidden-value-worker-detail.png`)
  - **After claiming (`/work/my-task`):** Confirmed `WTU5582107` remains completely absent from the reserved task view and photo capture cards (`containsInText: false`, `containsInHtml: false`). (`uat-r2-hidden-value-worker-claimed.png`)
  - **After submitting `sample-photos/bike-frame.jpg` and `sample-photos/bike-tires.jpg`:** Confirmed `WTU5582107` does **not** leak in the per-photo retake notices, the overall verification summary, or the checklist result text (`"The frame serial matches the listing — Unclear. No serial number is visible in either photo, so it can't be compared with the listing."`). (`uat-r2-hidden-value-worker-result.png`)
- **As Dana (Owner, 1280px):**
  - Opened `/owner/tasks/bty_jZElcQEgr56MMLGH`. Confirmed that under both the `"Accepted when"` section and the submitted `"Proof"` checklist, the item `"The frame serial matches the listing"` explicitly displays `"Expected, hidden from the worker: WTU5582107"`. (`uat-r2-hidden-value-owner-detail.png`)
  - Accepted the review/appeal as Dana (`"Accept appeal and pay"`), confirming the `$12.00` payout was triggered and that even the resulting public proof certificate (`/proof/bty_jZElcQEgr56MMLGH.299-ykGSy9c6SxZa2gruq4`) omits `WTU5582107`. (`uat-r2-hidden-value-owner-accepted.png`)

### 2. Report as not genuine (`AC-42`)
- **As Dana (Owner, 1280px):**
  - On `/owner/approvals`, tapped `"Report as not genuine…"` on a task waiting for proof review.
  - Confirmed the inline confirmation box explains clearly what happens: *"Report this proof as not genuine? Use this only if you believe the photos were faked, not because they're unclear. The proof is rejected and the worker's account is paused until they appeal this task."* alongside `"Report and pause this worker"` and `"Keep reviewing"`.
  - Chose `"Keep reviewing"` (never confirmed the report) and verified the confirmation closed cleanly. (`uat-r2-report-not-genuine-confirm.png`)

### 3. Proof certificate (`AC-41`)
- **As Dana (Owner, 1280px):**
  - Opened a paid task's certificate from `/owner/tasks/bty_izU2yrabE7blhlhI` (`/proof/bty_izU2yrabE7blhlhI.Jsxpk1JBqwo9YB_a8bmoAl`).
  - Tapped `"Copy certificate link"` and confirmed the button updates to `"Link copied"`.
  - Confirmed the certificate page (including `"How this was checked"`: *"An AI verifier checked every checklist item and looked for signs of a screen, editing or generation..."*) names **no AI model** and **no prompt version**. Also verified the owner task detail page's `"How it was checked"` disclosure names no AI model or prompt version. (`uat-r2-proof-certificate-copied.png`)

### 4. Offline form submission and focus (`AC-44`, `AC-34`)
- **As Sam (Worker, 390px phone screen):**
  - Claimed a task on `/work/my-task`, switched the browser to **Offline**, and observed the polite offline banner: *"You're offline. Your reservation and anything you've entered are kept here; we'll update when you're back online."*
  - Tapped `"Give this task back"` (which submits a form) while offline.
  - Confirmed Sam **stays on the `/work/my-task` page** (preventing a broken browser offline navigation) and the offline notice banner immediately receives keyboard focus (`focused` with visible focus ring).
  - Switched back **Online** and confirmed the offline banner automatically dismissed. (`uat-r2-offline-submit-focus-mobile.png`)

### 5. Give-back confirmation message (`AC-21`)
- **As Sam (Worker, 390px phone screen):**
  - Tapped `"Give this task back"` while online.
  - Confirmed the app redirects to `/work?returned=1`, displays the confirmation message *"You gave the task back. It's open for others again."*, and restores the task to the open task list. (`uat-r2-give-back-confirmation-mobile.png`)

---

## Findings

### UAT-2-01: Owner task history timeline labels a voluntary worker give-back as "Claim timed out; reopened"
- **Severity:** Low
- **Type:** Wording
- **Persona:** Dana
- **Related criteria:** AC-13, AC-21, AC-37
- **Steps to reproduce:**
  1. Sign in as Worker 1 (Sam) and claim an open task (`"Check a used road bike before purchase"`).
  2. Within 2 minutes of claiming (with ~58 minutes still remaining on the reservation clock), tap `"Give this task back"`.
  3. Sign in as Owner (Dana), open `/owner/tasks/bty_jZElcQEgr56MMLGH`, and scroll to the **History** section.
- **Expected:** The timeline event heading should reflect that the worker voluntarily returned the task (e.g., `"Task given back; reopened"` or `"Returned by worker; reopened"`), consistent with its description text.
- **Actual:** The timeline event heading says **"Claim timed out; reopened"** even though the subtext directly below it states *"The worker gave the task back, so it reopened."*
- **Screenshot:** uat-r2-hidden-value-owner-accepted.png
- **Suggestion (optional):** Change the timeline event title when a reservation is voluntarily returned by the worker so Dana doesn't think the worker let the 60-minute timer expire.

---

## Acceptance criteria results

| ID | Result (Pass / Fail / Blocked) | Finding ID(s) | Note |
|---|---|---|---|
| AC-01 | Pass | | Verified in Round 1 & Round 2 sign-ins (`/owner`, `/work`). |
| AC-02 | Pass | | Verified in Round 1. |
| AC-03 | Pass | | Verified in Round 1. |
| AC-04 | Pass | | Verified in Round 1 & Round 2 header/overview (`Available` and `Set aside`). |
| AC-05 | Pass | | Verified in Round 1. |
| AC-06 | Pass | | Verified in Round 1. |
| AC-07 | Pass | | Verified in Round 1. |
| AC-08 | Pass | | Verified in Round 1. |
| AC-09 | Pass | | Verified in Round 1. |
| AC-10 | Pass | | Verified in Round 1 & Round 2 (`/owner/approvals`). |
| AC-11 | Pass | | Verified in Round 1. |
| AC-12 | Pass | | Verified in Round 1. |
| AC-13 | Pass | UAT-2-01 | Full timeline and plain-English explanations present (minor wording mismatch on give-back heading noted in `UAT-2-01`). |
| AC-14 | Pass | | Verified in Round 1 & Round 2 (`bty_jZElcQEgr56MMLGH` owner review and acceptance). |
| AC-15 | Blocked: not yet available | UAT-1-02 | Skipped per `RELEASE_NOTES_ROUND1.md` (`"The control room opens soon..."`). |
| AC-16 | Blocked: not yet available | UAT-1-02 | Skipped per `RELEASE_NOTES_ROUND1.md`. |
| AC-17 | Blocked: not yet available | UAT-1-02 | Skipped per `RELEASE_NOTES_ROUND1.md`. |
| AC-18 | Blocked: not yet available | UAT-1-02 | Skipped per `RELEASE_NOTES_ROUND1.md`. |
| AC-19 | Pass | | Verified in Round 1 & Round 2 (`/work`). |
| AC-20 | Pass | | **Fixed in Round 2 (`UAT-1-01`):** Product image and `"Product photo: Barista Express Espresso Machine"` text description confirmed under `"What you're looking for"` on `/work/tasks/bty_dr7ziOxALJqZWtNi`. Hidden checklist expected values (`WTU5582107`) are properly concealed from workers and shown to the owner with `"Expected, hidden from the worker"`. |
| AC-21 | Pass | | Claiming reserves task for 60 min; giving task back shows `"You gave the task back. It's open for others again."` |
| AC-22 | Blocked: timer | UAT-1-03 | Real-length 60-minute reservation timer runs by design per `RELEASE_NOTES_ROUND1.md`. |
| AC-23 | Pass | | `"Pay set aside"` badge shown before claiming. |
| AC-24 | Pass | | Verified at 390px phone width using `"Open my phone's camera"` fallback with `sample-photos/` (`bike-frame.jpg`, `bike-tires.jpg`). |
| AC-25 | Pass | | Automatic status transition from `"Submitting…"` to `"Checking proof"` to result without manual reload. |
| AC-26 | Pass | | Confirmed payout status (`"$12.00 was sent to your PayPal account"`). |
| AC-27 | Pass | | Rejection checklist reasons clearly shown without leaking hidden expected values; one-shot appeal works cleanly. |
| AC-28 | Blocked: timer | UAT-1-03 | Real-length 24-hour review/appeal window runs by design per `RELEASE_NOTES_ROUND1.md`. |
| AC-29 | Pass | | Verified in Round 1. |
| AC-30 | Pass | | Verified in Round 1. |
| AC-31 | Pass | | Clear progress states (`"Claiming…"`, `"Checking your photo…"`, `"Submitting…"`). |
| AC-32 | Pass | | Plain, helpful language throughout; no AI model or prompt version names exposed. |
| AC-33 | Pass | | Verified in Round 1 & Round 2 (`"You haven't claimed a task"`). |
| AC-34 | Pass | | Keyboard navigation and focus management verified, including automatic focus on the offline banner when submitting a form while offline. |
| AC-35 | Pass | | Product image now includes descriptive `alt="Product photo: Barista Express Espresso Machine"`. |
| AC-36 | Pass | | Tested at 390px phone width and 1280px desktop width. |
| AC-37 | Pass | UAT-2-01 | Consistent terminology across worker and owner views (minor timeline title note in `UAT-2-01`). |
| AC-38 | Pass | | 2-minute photo code timer verified (`MNM-467`, `KCM-777`). |
| AC-39 | Pass | | Missing photo code prompts retake with plain explanation and routes to owner review if needed. |
| AC-40 | Pass | | Owner proof review cards clearly summarize code check, screen/editing check, and capture method. |
| AC-41 | Pass | | Proof certificate verified (`/proof/bty_izU2yrabE7blhlhI...` and `/proof/bty_jZElcQEgr56MMLGH...`), `"Copy certificate link"` -> `"Link copied"`, no AI model or prompt version named, and hidden expected values remain omitted. |
| AC-42 | Pass (confirmation) / Skipped (pause) | UAT-1-04 | Verified `"Report as not genuine…"` confirmation text and `"Keep reviewing"` dismissal on `/owner/approvals`; full pause skipped per instructions so test worker accounts remain active. |
| AC-43 | Pass | | One-tap demo sign-in verified; no passwords exposed. |
| AC-44 | Pass | | Going offline displays the polite offline banner; tapping a form submit button (`"Give this task back"`) while offline keeps the worker on the page and moves focus to the offline banner. |

---

## Round summary
- **Totals:** 1 new finding — Critical 0, High 0, Medium 0, Low 1 (`UAT-2-01`)
- **Top 5 issues to fix first:**
  1. **Distinguish voluntary give-back from timeout in owner history timeline (`UAT-2-01` / `AC-13`):** When a worker gives a task back early, label the timeline heading `"Task given back; reopened"` instead of `"Claim timed out; reopened"`.
  2. **Control Room dashboard (`UAT-1-02` / `AC-15`–`AC-18`):** Currently deferred (`"The control room opens soon"`).
- **What works well (keep it):**
  - **Hidden expected values:** The expected serial number (`WTU5582107`) on `"Check a used road bike before purchase"` is completely concealed from workers across the task detail page, claimed view, AI pre-check feedback, final rejection checklist, and public proof certificate, while clearly labeled for Dana as `"Expected, hidden from the worker: WTU5582107"`.
  - **Offline resilience & accessibility:** Submitting a form while offline (`"Give this task back"`) gracefully intercepts the submission, keeps the worker on the current page, and shifts keyboard focus directly to the offline notice banner.
  - **Give-back confirmation & "Report as not genuine" safeguard:** Returning a task now provides clear confirmation on the task list (`"You gave the task back. It's open for others again."`), and reporting proof as not genuine requires an explicit confirmation that clearly explains the account pause before acting.
  - **Clean proof certificates:** `"Copy certificate link"` gives immediate `"Link copied"` feedback, and certificates explain the verification process in plain English without exposing internal AI model names or prompt versions.
- **Would Dana trust this with her money?** Yes — Dana can now require secret expected values (such as a serial number on a listing) without tipping off workers, sees clear authenticity checks, has a well-guarded confirmation before pausing a worker for fake proof, and can share clean proof certificates.
- **Would Priya use this again?** Yes — Product photos and descriptions are clear before claiming, giving a task back confirms immediately that it was released, and losing cell reception mid-task keeps her on the page and focuses the offline notice rather than losing her work.
- **Could Kai complete a task unaided?** Yes — Product photos now include descriptive `alt` text (`"Product photo: Barista Express Espresso Machine"`), and attempting to submit a form while offline moves focus directly to the status banner with a high-contrast focus indicator.
- **(Round 2 only) Previously failed criteria now passing:** `AC-20` (`UAT-1-01`)
