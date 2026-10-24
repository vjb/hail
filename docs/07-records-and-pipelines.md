# 07 — Records and Pipelines

Five things Claude Code keeps running for the whole build. They cost little, help the human between runs, feed the outside testers without breaking the firewall, and produce numbers for the pitch.

## 1. Human-hail log (`HAIL-LOG.md`, repo root) — from Day 1
Every time you stop for a human step (H1–H8 in `05-autonomy-protocol.md`), log it. This is the build's own version of Hail: the agent hit a wall and hailed a human. The final count opens the demo video.

```
| ID | Type | Requested (ET) | Resolved (ET) | Wait | What you asked for | Why an agent couldn't do it |
|----|------|----------------|---------------|------|--------------------|-----------------------------|
| HH-001 | H1 | 2026-10-25 09:14 | 2026-10-25 09:20 | 6m | PayPal sandbox client ID and secret | Account creation needs a human identity |
```

- Also tag the request in `PROGRESS.md` as `[HH-001 · H1]`.
- At the end of each run, append a summary line: total hails, by type, total and median wait.
- Be honest: log every request, including ones that turned out to be unnecessary (mark them "avoidable" and note how to avoid next time).

## 2. Screenshot pipeline (`npm run screenshots`) — from Day 3, every run after
Playwright captures every screen in a known state so the human can hand pictures, not code, to the outside design reviewer.

- Screen manifest `e2e/screens.ts`: each entry has a user-facing name ("Worker — task detail with product"), the role to sign in as, the setup state (seeded scenario), and the URL path.
- Captures each screen at **1440×900** and **390×844**, in **light and dark**, full-page.
- Output: `screenshots/<YYYY-MM-DD>-run<N>/<screen-slug>__<width>__<theme>.png` plus `index.md` listing each file with its user-facing name and a one-line description of what the user is doing there. No code, routes beyond the visible URL, or internal names in `index.md`.
- Mask secrets (API keys, emails other than demo ones) before capture.
- `screenshots/` is gitignored. At the end of each run, zip the latest folder and tell the human its path.
- Covers at least: owner balance, API keys, approvals, task detail timeline, control room, worker task list, task detail, claim with countdown, photo submit, verifying, approved/paid, rejected with appeal, earnings, empty states, an error state.

## 3. Findings intake and tester release notes — from Day 10
Outside testers' reports arrive as files. Handle them without leaking implementation back.

- The human drops reports into `qa/inbox/` (UAT reports, red-team rounds, friction log, design-lab reports, first-impressions reports). Commit them; they contain nothing internal.
- For each finding, create a tracker entry. Use GitHub issues via `gh` if it's authenticated (title starts with the finding ID, e.g. `UAT-1-07: rejection reason unclear`; labels `source:uat|redteam|outsider|design|firstlook`, `severity:*`). If `gh` isn't available, use `qa/TRACKER.md` with the same fields.
- Reference finding IDs in commit messages (`fix(worker): list unmet checklist items (UAT-1-07)`).
- Move processed reports to `qa/processed/`.
- **Tester release notes** (`qa/release-notes/round-<N>.md`), written after fixes, for the human to pass to testers. Strict rules:
  - List only finding IDs and the **observable** behavior now expected ("UAT-1-07: rejected tasks now list each unmet checklist item with a reason").
  - Mention public API changes plainly (they're also in `docs/public/api.md`).
  - Never mention files, components, libraries, database, prompts, models, or how something was fixed.
  - Include "not fixed yet" IDs with a one-line user-facing reason ("deferred to post-hackathon").

## 4. Decision log (`DECISIONS.md`, repo root) — from Day 1
One entry per meaningful decision, assumption, or deviation from the docs:

```
## D-007 — Prepaid balance instead of per-bounty checkout (2026-10-25)
Context: PayPal checkout needs buyer approval per order; agents can't approve.
Decision: Owner approves once via top-up; bounties draw from a ledger balance.
Alternatives considered: Vaulted payment method; authorize-per-bounty.
Consequences: Need a withdraw flow; funds sit in the platform account.
Devpost: challenge — yes
```

- Tag entries useful for the submission with `Devpost: challenge | learned | built-with`.
- When a decision changes a doc, update the doc in the same commit and link the entry.
- At the end of Day 18, compile `docs/devpost-notes.md` from the tagged entries: challenges, what we learned, built with.

## 5. AI cost and quality telemetry — from Day 5
- Every `AIProvider` call writes an `ai_calls` row: purpose (screen | verify | ops), provider, model, input/output tokens, latency ms, estimated cost (from a small price table in config, checked against the provider's current pricing page), outcome, prompt version, and the related bounty/submission ID.
- `npm run eval:screening` appends a row to `qa/eval-history.csv`: date, prompt version, model, cases, accuracy overall and by category, false-allow count, average cost per screen.
- Add a control-room widget: **AI cost per task** and **screening accuracy over time**.
- Report in `PROGRESS.md` at the end of each run: average cost per screened task, per verification, total AI spend to date.
- Gate on Days 5 and 12 uses the eval; any increase in **false-allow** (a blocked-category case coming out `allow`) fails the gate regardless of overall accuracy.

These numbers go in the pitch: cost per task, accuracy on N cases, red-team block rate, and the HAIL-LOG count.
