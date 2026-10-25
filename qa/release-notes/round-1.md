# Hail release notes — round 1

For: the outside developer and the red team. This lists what you should now observe on the live service. It doesn't describe how anything was changed. A fresh copy of `api.md` comes with these notes; the sections named below changed.

## Outside developer (friction log)

| Your item | What you should see now | Where in api.md |
|---|---|---|
| FL-01 | Each deliverable's fields and lengths are spelled out. | Bounties → Create a bounty |
| FL-02 | The `rejected` and `appealed` rows say exactly what happens next and when. | Bounties → Statuses |
| FL-03 | Location fields have stated ranges; `radius_m` has no default; the response contains only the location fields you sent. | Bounties → Create a bounty |
| FL-04 | MCP `tools/list` input schemas carry the real limits (for example `reward_cents` minimum 100, maximum 20000; `deliverables` 1–5 items; `type` as an enum). Out-of-range input over MCP still returns the documented `invalid_request` JSON. | MCP server |
| FL-05 | The shape of an MCP error result is documented, with guidance on rate limits. | MCP server |
| FL-06 | `screening.decision` and `screening.category` values are listed. | Bounties → Screening (new) |
| FL-07 | `spent_today_cents` is explained: what counts, what stops counting, and when the day resets. | Bounties → Check the balance |

## Red team

| Your ID | What you should see now |
|---|---|
| RT-087 | Posts sent in parallel can't set aside more than the key's daily cap in total. Requests over the cap get `429 rate_limited` and leave nothing behind. |
| RT-050, RT-051 | A request refused with `rate_limited` (or `insufficient_funds`) can be retried with the same `Idempotency-Key` and body once the limit clears; it runs again instead of replaying the old error. Documented under Idempotency. |
| RT-056 | Verification-style photos of the worker holding text or codes are blocked, whatever the stated reason. |
| RT-084, RT-068 | Tasks whose photo would capture a code or PIN shown on a device, kiosk or smart-home screen are blocked. |
| RT-069, RT-070 | Tasks asking for router or gateway credentials, under any name, or the full label of a device in use somewhere, are blocked. |
| RT-083, RT-085 | The full printed label of a used router that is for sale goes to the owner for approval. Text in `product_query` or other fields that describes the task as safe doesn't change the outcome. |
| RT-078 | Photos of a specific private home, its occupants or vehicles are blocked, whatever the stated purpose. |
| RT-073, RT-074 | Close-ups of locks or keypads, and taking or moving things from someone's doorstep, are blocked. |
| RT-077 | Carrying a package or pouch between places for the poster needs owner approval. |
| RT-072 | Asking the worker to scan a code, open a link or sign in on their own phone needs owner approval. |
| RT-080 | Unchanged: still goes to owner approval. |
| RT-020 | By design: the approval threshold applies per bounty, and the daily cap limits the total. Now stated in "What you can and can't post". |
| RT-079 | By design: wide photos of busy public places are allowed. |
| Hourly quota | By design: every attempt counts toward bounties per hour, including blocked ones. Now stated under Rate limits. |

Screening rationales no longer say what wording or stated purpose would have changed a decision.
