---
name: nextcore-design
description: "Design-first for AI agents: draw the screen as a canvas/artifact BEFORE writing UI code — locked design tokens, all 5 states (empty, loading, data, error, success), real sample data, then build 1:1 from the drawing and verify by measuring in a real browser. Use when building a new page/component, redesigning a screen, when the user shares a reference image, or says the UI looks generic / like a template / flat / AI-made."
---

# nextcore-design — draw first, code second

> Building a layout from zero in code and patching it turn by turn (colour, spacing, breakpoints…) is the
> slowest way to reach a good UI. Draw it first, agree on the drawing, then copy the drawing into code.

## §1 When drawing first is mandatory

| Draw first | No drawing needed |
|---|---|
| A NEW page or component | Changing one string or one token |
| Re-laying out an existing page | Fixing a measured bug (overflow, tap target) |
| The user shares a reference image / link | Changing content inside an existing layout |
| The user says "looks like a template / bland / flat" | Adding one row to an existing table |

## §2 Read the brief BEFORE drawing — stops "a different style every time" and LLM defaults

1. **One reading line** at the top of the artboard (also for redesigns):
   `Reading as: <screen kind> for <who uses it>, <feel>, layout type <named skeleton>.`
2. **Three dials, 1–10**, written right below: `variance` (symmetric ↔ experimental) · `motion`
   (static ↔ animated) · `density` (airy ↔ packed). Suggested defaults: dashboard/CRM `3/2/8` ·
   public marketing page `6/4/4`. Two drawings of the same product area must use the same dials —
   mismatched dials are the #1 source of "every redesign looks like a different product".
3. **New screens add 5 form questions** (skip for redesigns): role of the screen (entry / transition /
   data) · viewing distance (phone in hand / laptop) · temperature (calm / urgent / authoritative) ·
   capacity (what is understood in a 5-second glance) · **one motif taken from the content itself**
   that no other area of the product has.
4. **Two passes.** Write the plan (skeleton + dials + answers) → **self-review: does this plan look like
   the default layout any model would produce for a similar brief?** If yes, revise the plan, then draw.
5. **Vague brief or no reference ⇒ draw 3 directions that differ in LAYOUT** (not 3 recolours), let the
   human pick, and record why. Clear brief ⇒ one direction.

## §3 One master canvas, sources in the repo, a card on every drawing

- **The repo is the original.** One folder per drawing next to the code (`design/<slug>/` with the artboards,
  the canvas index and a `card.json`). The canvas on claude.ai is only a projection: any account or machine can
  rebuild it from the repo, and switching accounts never loses a drawing.
- **One master canvas for the whole product**, one *page* per product area (CRM, onboarding, settings…). A new
  feature is a new folder + a page section, never a new canvas or artifact. Reuse the area's frame artboards
  (sidebar, list column, light/dark) instead of redrawing them. Name artboards with a feature prefix.
- **Every drawing carries a design card** — what a reviewer needs before saying yes: feature, live route(s),
  why this design, built yet, plus measured devices / states / colour DNA / type DNA
  (`scripts/design-card.mjs`). Orange card = fix it before asking for approval.
- Draw in an **Artifact canvas**, not a claude.ai/design project — agents cannot read those back. Several Claude
  accounts or parallel agents on one canvas: `references/canvas-workflow.md`.

## §4 Every screen = at least 5 artboards

| Artboard | Must contain |
|---|---|
| **Empty** | icon + a specific instruction + a primary action (never a blank screen) |
| **Loading** | an **in-flow** skeleton shaped like the real content (no full-screen spinner, no `position:fixed; inset:0` overlay) |
| **Data** | **real-looking** sample data — real local names, organic numbers (1,247 not 1,000), varied dates |
| **Error** | inline field error under the field + a toast for the action; plain sentence, no exclamation mark |
| **Success** | confirmation toast or a state change |

Also draw the **interactive** states that matter (hover, focus-visible, pressed, disabled) — on touch there is
no hover, so every hover-only affordance needs a visible alternative.

**Device matrix — three widths, not one.** Draw 1280–1440 (desktop), **768 (tablet)** and 390 (phone) whenever the
layout changes shape, not just shrinks. Tablet is the one everybody skips: measured on 56 production drawings,
only 5 had a tablet artboard — and tablet is where two-column layouts break.

## §5 Lock the tokens INSIDE the drawing

The drawing uses no free colours. Use exactly the project's variables so coding is just copying:

```
body text           var(--ds-ink) / --ds-ink-soft / --ds-ink-muted
brand-coloured text var(--ds-primary-ink)        ← not the brand BACKGROUND colour
primary button      bg var(--ds-primary) + text var(--ds-primary-fg)
text on -soft fills var(--ds-<tone>-ink)         (info / success / warning / danger)
spacing             var(--ds-space-N)            (one scale, no magic px)
```

Read exact values from the token source file, **not from a table in some doc** — tables drift (a real
case: a spacing table documented every value at 2× the truth). Before drawing, run
`scripts/token-audit.mjs <tokens.css>`: it checks WCAG contrast of every text/background pair **in every theme**
and flags near-white / near-black tokens that have no dark-mode value (they vanish in dark mode).

Fonts are part of the brand DNA too: only the product's families. Measured on 56 production drawings, 20 used a
font the product does not ship (an agent "picking something nicer").

Backgrounds should not be one flat colour; glass needs something behind it (glass on a flat background is
invisible glass). Text over an image needs a scrim **measured at the text position**.

## §6 Self-check for "AI slop" before sharing the link

`scripts/slop-check.mjs` catches the ✓ items mechanically. Full list: `references/slop-tells.md`.

- ✓ hex / `rgb()` outside the token file · ✓ emoji used as icons · ✓ `transition: all`
- ✓ `word-break: break-all` (breaks emails, phone numbers, order codes in half)
- ✓ fake data: "John Doe", "Lorem ipsum", round 1,000 / 50,000, dates on the 1st of January
- ✓ purple–blue gradient not in the tokens · ✓ italic headings / a second font injected for emphasis
  (emphasise with **weight or colour of the SAME font**)
- ✓ `grid-template-columns: 1fr` (= `minmax(auto,1fr)` ⇒ horizontal page scroll; write `minmax(0,1fr)`)
- more than 3 corner radii on one screen · ≥6 identical cards when the content is not uniform
- tracked-out ALL-CAPS eyebrow on every section · centred hero when the reading line did not ask for it
- three identical "feature" columns · 01/02/03 numbering when the content has no order

## §7 Hand-off to code

Hand over with the drawing: DOM tree + class names (BEM `block__element--modifier`), TypeScript props,
the list of tokens used (names, not values), and anti-truncation notes for identifiers.

While coding: **follow the drawing's layout and proportions 100%**; do not re-layout mid-build. If the
drawing is wrong, fix the drawing first (D1 → D2), then the code.

## §8 Acceptance — drawing vs running page

- **Versions:** never overwrite D1; duplicate to D2. Commits say which version they implement.
- **Before/after:** screenshot production BEFORE the change and AFTER the deploy completes, same width,
  same theme, same URL. Any metric that got worse rejects the change.
- **Match table:** compare code to drawing with `getComputedStyle` (token names, absolute font sizes,
  spacing ±2px, all 5 states). Every mismatch is fixed in code or becomes D(n+1).
- **Real data:** map every field to its API/DB source before drawing; draw with edge-case data from
  production (longest name, empty optional field, huge number).
- **Priority order when auditing:** accessibility (contrast, keyboard, aria) → tap targets ≥44px →
  performance (images, CLS) → layout per breakpoint → type & colour → motion → forms → navigation →
  charts. A failure higher up blocks checking lower items.
- **Before asking for approval:** `scripts/design-card.mjs <drawings> --tokens … --fonts … --app … --strict`
  must pass (phone + tablet + desktop, 4 states, ≥85% colours on token, brand fonts only, routes exist).
- Open the real page at 390 / 768 / 1440 and **look at the screenshot**; also read
  `references/measurement-traps.md` — most "it passed" reports come from a wrong measurement.

## §9 Kill-list

- ❌ Writing TSX/CSS before there is a drawing (except §1 right column)
- ❌ Drawing only the data state and skipping the other 4
- ❌ Hex colours or Tailwind colour utilities in the drawing
- ❌ Placeholder data; one avatar reused for many people
- ❌ Cliché copy ("Elevate", "Seamless", "Unlock"), Title Case everywhere, exclamation marks in errors
- ❌ Re-laying out while coding without updating the drawing
- ❌ Saying "done" without same-condition before/after screenshots
- ❌ Drawing a field that has no data source
- ❌ Asking for approval while the design card is orange; drawing without a tablet artboard

## §10 Tools (zero dependencies, Node ≥18)

| Script | Answers | Typical use |
|---|---|---|
| `scripts/slop-check.mjs <src>` | does the code carry "AI slop" tells? (10 rules) | pre-commit / CI on UI source |
| `scripts/token-audit.mjs <tokens.css> [--src <dir>]` | do my tokens pass contrast in every theme? any token missing a dark value? any `var()` that resolves to nothing? | when tokens change; CI |
| `scripts/design-card.mjs <drawings> --tokens … --fonts … [--app …]` | is each drawing complete and on-brand? | before asking for approval |

Templates: `templates/brief.md` (reading line, dials, field map, edge-case data) · `templates/card.json`.
