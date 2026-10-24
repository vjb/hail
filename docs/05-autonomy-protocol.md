# 05 — Autonomy Protocol (how Claude Code works through long runs)

The human starts a run with a kickoff prompt naming a range of build-plan days. Within that range, work without waiting for confirmation, except at the human steps listed below.

## The loop, per build-plan day
1. Re-read that day in `03-build-plan.md` and any doc sections it touches.
2. Write a short plan for the day at the top of today's entry in `PROGRESS.md`.
3. Build in small commits. Run `typecheck` and `test` before each commit.
4. Check the day's **acceptance gate** with real evidence: test output, e2e runs, curl transcripts, screenshots from the e2e suite. Paste the evidence summary into `PROGRESS.md`.
5. Gate passed → mark the day done and continue to the next day in the run.
6. Gate failed → try to fix it (up to three focused attempts). Still failing → **stop the run** and report.

## PROGRESS.md (repo root, keep it current)
One section per day:

```
## Day N — <focus> — <status: in progress | done | blocked>
Plan: ...
Done: ...
Gate evidence: ...
Deviations from docs (and which doc was updated): ...
Open issues / risks: ...
Human needed: ...
```

The human reads this file to catch up. Keep it factual and short.

## Human steps — stop and ask, then wait
Stop and tell the human exactly what to do (with links and values to paste) when you need any of these:

- **H1** A new secret or account: PayPal client ID/secret, webhook ID, Anthropic key, Channel3 key, AG Studio license, Render settings. Never invent placeholder values that look real.
- **H2** Registering or changing the PayPal sandbox webhook URL in the PayPal developer dashboard.
- **H3** A first-time manual PayPal sandbox approval, if the automated e2e approval (below) is blocked by a captcha or extra verification.
- **H4** Connecting Render to the GitHub repo, or anything in the Render dashboard the blueprint can't do.
- **H5** Testing on a real phone (Day 7 gate and later).
- **H6** Any decision that changes scope, the public API contract beyond what the docs specify, or the money model.
- **H7** Anything that would touch PayPal **live** mode, real money, or real personal data. Refuse and ask.
- **H8** The end of the run's day range.

While waiting on a human step, continue with any other work in the run that doesn't depend on it, and say so in `PROGRESS.md`.

**Log every human step** in `HAIL-LOG.md` with an `HH-` number and tag it in `PROGRESS.md` (format in `07-records-and-pipelines.md`). When the human answers, record the resolved time.

## End of every run
1. Run `npm run screenshots`; zip the folder; give the human its path.
2. Update `PROGRESS.md` with: days completed, gate evidence, the run's HAIL-LOG summary, AI cost summary, open risks.
3. Make sure `DECISIONS.md` has an entry for every deviation from the docs during the run.
4. If findings were fixed this run, write the tester release notes (`qa/release-notes/round-<N>.md`).
5. Tell the human, in five lines or fewer: what's done, what's next, and anything they need to do before the next run.

## Testing so you can verify without the human

### Unit and integration (Vitest)
Ledger, state machine, policy, screening rules, idempotency, webhook processing. PayPal calls are faked at the HTTP boundary in unit tests, never in e2e.

### End to end (Playwright) — add on Day 3, extend every day after
- Runs against a local server or the Render URL (`E2E_BASE_URL`).
- **Automates PayPal sandbox checkout approval**: opens the PayPal popup, signs in with the sandbox personal account (`E2E_PAYPAL_BUYER_EMAIL` / `E2E_PAYPAL_BUYER_PASSWORD`), approves. If PayPal shows a captcha or extra verification, mark the test as skipped with a clear message and raise H3 instead of trying to bypass it.
- Covers, as they're built: sign-in per role, top-up, agent posts bounty via REST and MCP, screen blocks a bad bounty, approval flow, worker claim at 390px, photo submit, verification, payout reaching `paid` (polling the sandbox), timers with `DEMO_TIME_SCALE`, withdraw, control-room numbers, reset-demo.
- Includes an accessibility check on every main page (axe via Playwright); serious violations fail the test.
- `npm run e2e` runs the suite; screenshots on failure go to `e2e/artifacts/` (gitignored).

### Screening eval
`npm run eval:screening` runs the labeled set in `tests/screening/` through the real screen and prints accuracy by category. Gates on Days 5 and 12 use it.

## Deploy (Render Blueprint)
Add `render.yaml` on Day 7 defining the web service, Postgres database and cron job (sweeper), with env vars declared (values set in the Render dashboard, never in the file). The human connects the repo once (H4); after that, pushes to `main` deploy automatically. Document the steps in the README.

## Guardrails during autonomous runs
- Never weaken a test or a gate to make it pass. If a gate seems wrong, raise H6.
- Never push secrets. Check `git diff --cached` for keys before each commit.
- Don't add dependencies casually; prefer well-known, maintained packages and note each new one in `PROGRESS.md`.
- Don't rewrite large working areas to suit a new idea mid-run; log it as an open issue.
