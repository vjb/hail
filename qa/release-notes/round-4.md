# Hail release notes — round 4

These notes cover findings from red team round 2, outside developer round 3 and UAT round 1. They describe what you should now see on the live site, not how it was done.

## Red team (next round)

| Finding | What you'll see now |
|---|---|
| RT-135 | A close-up of the digits on any small screen (monitor, hub, display) is blocked, whatever the numbers are said to be. Large public signs such as gas prices or departure boards are still allowed. |
| RT-121 | A task whose checklist needs a door's lock, latch or lever hardware sharp is blocked, whatever else is said to be the subject. A whole storefront or entrance is still fine. |
| RT-124 | Picking something up at one place and dropping it off at another for the poster needs owner approval, however ordinary the item is said to be. |
| RT-127 | Moving or arranging products, books or displays inside a business needs owner approval, whatever the reason given. |
| RT-149 | `location.lat` and `location.lng` must be sent together: one without the other is `400 invalid_request`. |
| RT-150 | `location.radius_m` without `lat` and `lng` is `400 invalid_request`. |
| RT-147 | `location.radius_m` is 100–50,000; lower values are `400 invalid_request` (REST and MCP). |
| RT-142 | Certificates no longer name the verifier. Demo history certificates show the photo taken and the proof sent before the acceptance. |
| RT-119, RT-120 | By design: wide photos of a public street or public parking bays stay allowed. |
| RT-139 | By design: override text inside a checklist sends the bounty to the owner. The proof check treats checklist text as data. |
| RT-094, RT-103, RT-114, RT-116, RT-117, RT-126, RT-132, RT-133 | By design: these go to owner approval, not a block. The owner sees the reason. |

## Outside developer (round 4)

| Finding | What changed |
|---|---|
| FL-10 | api.md says to branch on `checklist_met` itself: an item with `passed: null` is not met. |
| FL-11 | api.md states that `certificate_url` is a public page and needs no `Authorization` header. |
| FL-12 | Not reproduced: the MCP `create_bounty` schema already has `spots` minimum 1 and maximum 1. |
| — | `location` rules tightened. `lat` and `lng` go together, and `radius_m` (100–50,000) only with both. See Bounties → Create a bounty. |

## UAT (round 2)

| Finding | What you'll see now |
|---|---|
| UAT-1-01 | The product photo under "What you're looking for" now has a text description ("Product photo: …"). The photo itself was already shown. |
| UAT-1-02 | Known: the control room isn't built yet. Skip AC-15 to AC-18 until told otherwise. |
| UAT-1-03 | By design: the live site runs real-length timers. Mark AC-22 and AC-28 as "Blocked: timer" again. |
| UAT-1-04 | The camera and report-as-not-genuine checks are done by a person on a real phone. Skip them. |
| Give-back | After "Give this task back", the task list shows "You gave the task back. It's open for others again." |
