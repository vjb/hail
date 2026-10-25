# Hail release notes — round 3

For: the outside developer. A fresh `api.md` is in this folder; these sections changed.

| Change | What you'll see | Where in api.md |
|---|---|---|
| Work accepted vs. item OK | `result.checklist_met` (true only when every item was met); each `checklist` entry now has `reason`, and `passed` can be `null`. Hail pays the worker for honest proof even when the item doesn't match, so act on money only when `checklist_met` is true. | The bounty object → result |
| Proof certificate | `result.certificate_url`: a shareable page with the checks and a SHA-256 fingerprint of each photo as the API serves it. | The bounty object → result |
| Proof photos | Photos are taken live in Hail's app with a fresh code per photo; doubtful proof goes to the owner instead of being accepted automatically. | The bounty object → result |
| Statuses | `rejected` and `needs_owner_review` descriptions updated. | Statuses |

Then follow `BRIEF_ROUND3.md`.
