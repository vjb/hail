# Hail Design Lab — Master AI Engineering Handoff & Action Plan

> **For Master AI / Engineering Agents:**  
> This directory contains the complete Round 1 visual design, mobile responsiveness, and resilience audit for **Hail** ([DESIGN_LAB_ROUND1.md](DESIGN_LAB_ROUND1.md)), along with 10 visual evidence screenshots (`DL-1-01.png` through `DL-1-10.png`).  
> 
> Use this document as your primary implementation specification. After executing these changes, the Design Lab will re-verify the live site and produce `DESIGN_LAB_ROUND2.md`.

---

## 1. Brand Identity, Voice & Copy Dictionary

* **Core Archetype:** Utilitarian infrastructure and physical dispatch (like an airport flight board, port crane, municipal transit dispatch, or CB radio). Clean, tactile, durable, and honest. Not a corporate SaaS dashboard, not a casino, and not a gig-economy grind platform.
* **Tone:** Calm, clear, respectful, direct, and unpretentious. High signal-to-noise ratio.
* **Strict Vocabulary Dictionary:**
  * ❌ **PROHIBITED TERMS (Never use anywhere in UI, code comments, URLs, or docs):**  
    `bounty`, `bounties`, `gig`, `side hustle`, `microtask`, `turk`, `turker`, `crypto`, `token`, `AI overlord`, `robot boss`, `slave`, `meatbag`.
  * ✅ **APPROVED TERMS (Always use):**  
    `task`, `assignment`, `dispatch`, `operator` / `worker`, `requester` / `agent`, `verification`, `payout`, `evidence`, `protocol`.
* **Visual Tenets:**
  * High contrast visible in direct sunlight and on scratched/degraded mobile screens.
  * Generous touch targets ($\ge 44 \times 44\text{px}$).
  * Monetary rewards must be prominently displayed as primary visual anchors.
  * Zero horizontal scrolling on viewports down to $360\text{px}$.

---

## 2. Prioritized Engineering Action Plan

### Priority 1: Resilient Offline & Network Drop Handling [DL-1-02]
* **Severity:** Critical
* **Visual Evidence:** [DL-1-02.png](DL-1-02.png)
* **Affected Routes:** `/work/tasks/:id`, `/work`, and all worker auto-polling routes.
* **Problem:** When an operator loses cell connectivity in the field (subways, basements, elevators), background auto-polling triggers unhandled fetch errors, causing Next.js to navigate to Chrome's `ERR_INTERNET_DISCONNECTED` dinosaur screen and destroying active worker state.
* **Required Implementation:**
  1. Wrap all polling queries, fetch calls, and WebSocket/SSE handlers in `try/catch` or robust SWR/React Query error handlers.
  2. Implement an offline listener (`window.addEventListener('offline')`) that holds the current view state intact without throwing unhandled rejections.
  3. Render a non-intrusive, sticky offline status banner:
     *"Offline — Reconnecting when signal is restored. Your current inputs are safe."*
  4. Automatically resume polling and data synchronization as soon as `online` fires.

---

### Priority 2: Fix Mobile Sticky Action Bar Occlusion [DL-1-01]
* **Severity:** Critical
* **Visual Evidence:** [DL-1-01.png](DL-1-01.png)
* **Affected Routes:** `/work/tasks/:id`
* **Problem:** On mobile viewports ($360\text{px}$ and $390\text{px}$) and mobile landscape ($844 \times 390\text{px}$), the floating "Claim and reserve" action bar and bottom navigation overlap each other, masking the final task instructions, address/location, and checklist criteria at the bottom of the scroll area.
* **Required Implementation:**
  1. Add substantial bottom scroll padding (`padding-bottom: 7.5rem` / `pb-30`) to the main content container.
  2. In mobile landscape orientation (`@media (max-height: 500px)`), compact the sticky action bar and bottom nav height, or hide the redundant bottom nav tab bar while actively viewing a task.
  3. Ensure all task content can be scrolled fully clear of any sticky overlay.

---

### Priority 3: Responsive Owner Portal Tables [DL-1-03]
* **Severity:** High
* **Visual Evidence:** [DL-1-03.png](DL-1-03.png)
* **Affected Routes:** `/owner/tasks`, `/owner/keys`, `/owner/balance`
* **Problem:** Rigid 5–6 column HTML tables fail to adapt to mobile screens, blowing container width out to $408\text{px}$ – $627\text{px}$. This pushes table columns, account balances, and the `Sign out` button completely off-screen on $360\text{px}$ and $390\text{px}$ devices.
* **Required Implementation:**
  1. On viewports below the `md` breakpoint ($< 768\text{px}$), replace `<table>` elements with responsive stacked cards showing key attributes (ID, Title/Key, Status, Amount/Date, Action buttons).
  2. Enforce `max-w-full overflow-x-hidden` on the main page wrapper to eliminate horizontal scrollbars.
  3. Ensure the mobile header and navigation controls (including `Sign out`) remain pinned and accessible within the $360\text{px}$ viewport.

---

### Priority 4: Brand Vocabulary Sweep in Public Docs [DL-1-06]
* **Severity:** Medium
* **Visual Evidence:** [DL-1-06.png](DL-1-06.png)
* **Affected Routes:** `/docs/api`, `/docs/*`
* **Problem:** The API documentation repeatedly refers to tasks as `"bounty"` and `"bounties"`, contradicting core brand rules.
* **Required Implementation:**
  1. Perform a global codebase/content sweep for `bounty` and `bounties` (case-insensitive).
  2. Replace with `task`, `tasks`, or `dispatch`.
  3. Update endpoint names, parameter docs, and code snippets to reflect protocol terms (`POST /api/v1/tasks`, `task_id`, etc.).

---

### Priority 5: Hide Next.js DevTools Overlay in Mobile Layout [DL-1-05]
* **Severity:** High
* **Visual Evidence:** [DL-1-05.png](DL-1-05.png)
* **Affected Routes:** Global mobile navigation layout.
* **Problem:** A floating Next.js `"N"` development indicator rests in the bottom-left corner, physically overlapping the `"Tasks"` tab on the mobile navigation bar and impeding touch targets.
* **Required Implementation:**
  1. Disable or hide the Next.js dev overlay indicator in preview/production layouts (e.g., via `next.config.js` `devIndicators: false` or scoped CSS).
  2. Ensure all navigation tabs have an unobstructed $48 \times 48\text{px}$ touch target.

---

### Priority 6: 1-Click Demo Credentials & README Alignment [DL-1-09]
* **Severity:** Medium
* **Visual Evidence:** [DL-1-09.png](DL-1-09.png)
* **Affected Routes:** `/auth/signin`, root `README.md`
* **Problem:** The helper text directs evaluators to demo credentials in the repository `README.md`, but the current README has a placeholder saying credentials will be added prior to submission.
* **Required Implementation:**
  1. Add 1-click demo persona quick-fill buttons directly on `/auth/signin` for:
     * **Owner:** `owner@hail-demo.test` / `[redacted]`
     * **Worker 1:** `worker1@hail-demo.test` / `[redacted]`
     * **Worker 2:** `worker2@hail-demo.test` / `[redacted]`
     * **Admin:** `admin@hail-demo.test` / `[redacted]`
  2. Document these exact credentials in the root `README.md`.

---

### Priority 7: Task Card Payout Hierarchy & Alignment [DL-1-08]
* **Severity:** Medium
* **Visual Evidence:** [DL-1-08.png](DL-1-08.png)
* **Affected Routes:** `/work` (Task Feed)
* **Problem:** Payout badges render inconsistently across cards (some inline right, some wrapping left). On compact screens, the reward amount lacks primary visual dominance over task title text.
* **Required Implementation:**
  1. Standardize task card header layout using a consistent flex structure: `flex items-start justify-between gap-3`.
  2. Style the pay amount as a prominent, high-contrast badge with a tabular monospace font (`font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400`).
  3. Ensure the pay badge never wraps below the title text on viewports $\ge 360\text{px}$.

---

### Priority 8: Payout Email Input Truncation [DL-1-07]
* **Severity:** Medium
* **Visual Evidence:** [DL-1-07.png](DL-1-07.png)
* **Affected Routes:** `/work/settings`
* **Problem:** The PayPal payout email input field visually truncates standard $35+$ character email addresses on $390\text{px}$ screens without horizontal text scroll or elastic expansion.
* **Required Implementation:**
  1. Ensure the `<input type="email">` has `w-full` with standard internal padding (`px-3 py-2`).
  2. Set appropriate text sizing (`text-base` / $16\text{px}$ to prevent iOS auto-zoom) and enable smooth horizontal scrolling when the input string exceeds the box width.

---

### Priority 9: Accessibility & String Interpolation Fixes [DL-1-10]
* **Severity:** Low / Accessibility
* **Visual Evidence:** [DL-1-10.png](DL-1-10.png)
* **Affected Routes:** `/owner` (Overview), `/admin`
* **Required Implementation:**
  1. Fix string interpolation in `/owner` so screen readers parse `"2 tasks need your decision"` instead of `"2tasks need your decision"`.
  2. Adjust disabled button styling on `/admin` to meet WCAG AA contrast ($4.5:1$ for text or provide an explicit `aria-disabled="true"` with legible muted foreground).

---

### Priority 10: Special Directives & Notes

* **Finding DL-1-04 (`/owner/control-room`):**  
  > ⚠️ **USER DIRECTIVE:** The Control Room is coming via AG Studio setup. **Leave `/owner/control-room` alone for now.** Acknowledge this note and move on to the other priorities.
* **Environmental Polish (Slow 3G & Zoom 200%):**  
  * When submitting task verification photos, display an active percentage progress bar or optimistic uploading spinner with the copy: *"Compressing and uploading dispatch evidence..."*.
  * On $200\%$ zoom ($720 \times 450\text{px}$), ensure top sticky headers do not exceed $40\%$ of vertical screen space.

---

## 3. Master AI Verification Checklist

Before signaling completion for Round 2 review:

- [ ] Simulating offline mode in browser DevTools (`Network -> Offline`) on an active task shows the reconnection banner without crashing or losing inputs.
- [ ] No horizontal scrollbars or element clipping on $360\text{px}$ (Galaxy S8) or $390\text{px}$ (iPhone 14) viewports.
- [ ] Multi-column tables on `/owner/tasks`, `/owner/keys`, and `/owner/balance` collapse into stacked card lists on mobile viewports.
- [ ] Mobile bottom navigation and sticky action bars do not occlude any content or checklist items on `/work/tasks/:id`.
- [ ] The Next.js dev overlay indicator is hidden in mobile navigation.
- [ ] Zero occurrences of the forbidden word `"bounty"` or `"bounties"` remain across the codebase and `/docs/api`.
- [ ] 1-click quick-fill buttons work properly on `/auth/signin` and match the credentials in `README.md`.
- [ ] All interactive buttons and links maintain touch targets of at least $44 \times 44\text{px}$.
- [ ] Dark Mode retains crisp contrast and readable card borders across all screens.
