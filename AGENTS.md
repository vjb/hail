# AGENTS.md

This repo's working rules for any coding agent are in **`CLAUDE.md`**. Read it first, then the docs it lists in `docs/`.

Summary for agents that don't load `CLAUDE.md` automatically:
- TypeScript, Next.js, Postgres (Drizzle), Render.
- PayPal **sandbox only**; money in integer cents; every balance change is a ledger entry; idempotency keys on every PayPal POST.
- All AI calls go through `src/ai/` (`AIProvider`); never fail open.
- `docs/public/api.md` is a public contract — update it with any API change.
- Never commit secrets; the repo is public.

Note: external QA and red-team agents test this product **blind** from the live URL and `docs/public/api.md` only. They do not have repo access and should not be given it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
