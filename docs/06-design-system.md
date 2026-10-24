# 06 — Design System

Set this up on **Day 2**, before any real UI. Every screen, the AG Studio theme and the logo use these tokens. The goal: Hail should look like a deliberate product, not a default component library, and AG Grid's judges explicitly reward custom theming.

## Idea
**Hailing a cab.** A raised hand, a signal light, a car that stops. Hail's look borrows from street signals: deep ink, a confident signal amber, warm paper. Calm and trustworthy for money (the owner), quick and legible outdoors on a phone (the worker).

Voice: plain, short, warm. Say what happened and what to do next. Never cute about money.

## Logo
Wordmark **hail**, lowercase, with the **ai** emphasized:
- `h` and `l`: display font, regular weight, ink color.
- `ai`: display font, extra-bold, set on a small rounded amber "signal" block (or in amber on dark backgrounds).
- Build it as an inline SVG component (`<HailLogo variant="full | mark" />`) with an accessible title "Hail".
- Mark (app icon / favicon): the `ai` signal block alone.
- Tagline lockup: "When your agent hits a wall, it hails a human."

## Color tokens
Define as CSS custom properties; light and dark themes. Check every text/background pair for WCAG AA contrast (4.5:1 body, 3:1 large text and UI). Adjust values if a check fails and note it in `DECISIONS.md`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#14161A` | `#F4F1EA` | primary text |
| `--ink-2` | `#4A4F57` | `#B9B4AA` | secondary text |
| `--paper` | `#FAF8F3` | `#121417` | page background |
| `--surface` | `#FFFFFF` | `#1B1E22` | cards, panels |
| `--line` | `#E4DFD4` | `#2C3036` | borders, dividers |
| `--signal` | `#FFC21A` | `#FFC21A` | brand accent, primary button fill (with ink text) |
| `--signal-ink` | `#14161A` | `#14161A` | text on signal |
| `--paid` | `#1F7A52` | `#4CC38A` | paid, approved, funded |
| `--review` | `#5B47C9` | `#9C8CF0` | needs review, pending approval, appealed |
| `--blocked` | `#B8322A` | `#F07167` | blocked, rejected, errors |
| `--neutral` | `#6B7079` | `#8D929A` | expired, cancelled |

Statuses always pair color with a **word and an icon**. Never color alone.

## Type
- Display: **Bricolage Grotesque** (logo, page titles, big numbers)
- Body/UI: **Geist**
- Numbers and money: **Geist Mono** with tabular figures, so amounts line up
- Scale (rem): 0.75, 0.875, 1, 1.125, 1.5, 2, 3. Body 1rem on desktop, 1.0625rem on phone. Line height 1.5 body, 1.15 display.
- Load via `next/font`; confirm licenses (both are open-source fonts on Google Fonts).

## Space, shape, motion
- 4px base; spacing steps 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 8 (inputs, chips), 14 (cards), 999 (pills, the logo block).
- Shadows: subtle, one level for cards, one for overlays.
- Motion: 150–200 ms ease-out for state changes; respect `prefers-reduced-motion`.
- Touch targets ≥ 44×44 px on the worker app.

## Core components
Build these once and reuse them: `Button` (primary signal, secondary, quiet, danger), `Money` (formats cents, mono, optional sign), `StatusPill` (status → color + icon + word), `BalanceCard` (Available / Set aside), `TaskCard` (worker list item: title, pay, distance, time left, "Pay set aside" badge), `Checklist` (what to capture / verification results with per-item pass/fail and reason), `Timeline` (task history with AI explanations), `PhotoCapture` (camera/file, previews, progress), `Countdown`, `EmptyState`, `ErrorState`, `Toast`, `AppShell` (owner sidebar; worker bottom nav).

## Owner vs. worker
- **Owner (desktop first):** sidebar nav, dense but calm; balance always visible in the header.
- **Worker (phone first):** bottom nav (Tasks, My task, Earnings), one primary action per screen, big pay figure on every task, high contrast for outdoor use.

## AG Studio theme
Map the tokens into AG Studio's theming API (read its theming docs): fonts, `--signal` for highlights and selected states, status colors for series and conditional formatting, `--surface`/`--line` for panels and grid lines. Custom widgets use the same components where possible (e.g., `Money`, `StatusPill`). The control room should look like part of Hail, not an embedded third-party tool.

## Brand intent for outside reviewers
`gemini/5-design-lab/brand-intent.md` (outside the repo) gives Gemini a plain-language summary of this page's goals: the feel, the palette in words and hex, the type, the logo. Keep that summary in sync if you change anything here (tell the human).
