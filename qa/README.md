# QA intake

- `inbox/`: drop tester reports here as they arrive (UAT, red-team rounds, outside-developer friction log, design lab, first impressions).
- Each finding becomes a GitHub issue titled with its ID (e.g. `UAT-1-07: rejection reason unclear`) and labeled `source:uat|redteam|outsider|design|firstlook` plus `severity:critical|high|medium|low`.
- Fix commits reference the finding ID. Processed reports move to `processed/`.
- `release-notes/round-<N>.md`: tester-facing notes that list only finding IDs and the observable behavior now expected. No implementation details.
- `eval-history.csv`: one row per `npm run eval:screening` run.
