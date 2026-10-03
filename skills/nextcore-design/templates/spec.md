# Spec — <feature> (D1)

> Fill BEFORE the first artboard; keep it in the drawing's folder next to `card.json`. It is the source of truth for
> implementation. Tag claims: **FACT** (measured/given) · **OBS** (seen in the product) · **ASSUMPTION** · **HYPOTHESIS** ·
> **DECISION** (with its reason). No "users prefer…" without a source.

## Goal
- Business wants:
- User wants:
- Primary action / conversion:

## User
- Who, experience level, device, urgency, trust concerns (tag each FACT / ASSUMPTION):

## Existing product (inventory before inventing)
- Tokens / components / patterns reused:
- Inconsistencies found (name them; fix on purpose or leave):

## Information hierarchy
1. Primary goal · 2. Primary action · 3. Primary information · 4. Secondary information
5. Removed · 6. Grouped · 7. Emphasised · 8. Progressively disclosed · 9. What happens after the primary action

## Reading line and dials
Reading as: <screen kind> for <who>, <feel>, layout type <named skeleton>.
variance <n> · motion <n> · density <n>  (same as other drawings of this area)

## Visual direction (reuse the area's block; change only with a reason)
Mood · personality · type character · density · rhythm · colour strategy · shape language · icons · images · motion ·
signature element:

## "Why" log — every non-content element earns its place
| Element | Reason (hierarchy / zones / status / discoverability / brand / scanning / cognitive load) |
|---|---|

## Field map — every value has a real source
| UI element | Source (API route / model.field) | Real example | Can be empty? |
|---|---|---|---|

## Edge-case data (pulled from production, read-only)
- longest / shortest name · highest / lowest / missing price · 0 / 1 / many items · missing / portrait image ·
  long localised text (diacritics, long words):

## States
- [ ] data · [ ] empty · [ ] loading (in-flow) · [ ] error (inline + toast) · [ ] success
- [ ] partial · [ ] permission denied · [ ] offline · [ ] long / unexpected content (rule out with a reason if N/A)
- Components: default · hover · focus-visible · active · disabled · loading · error · success · empty

## Responsive — what changes STRUCTURALLY (not "how it shrinks")
| | phone 390 | tablet 768 | desktop 1280+ |
|---|---|---|---|
| navigation | | | |
| layout / grid | | | |
| tables / forms / dialogs | | | |

## Accessibility
Contrast in every theme (`token-audit`) · focus order · 44px targets · labels · errors in words · reduced motion ·
colour never the only signal:

## Feasibility (engineer ticks before code starts)
- [ ] every field is in the field map  - [ ] every edge case has an artboard and still reads well
- [ ] only existing tokens; reuses components; anything new has a reason
- [ ] no new API on a hot path, no infinite animation

## Open questions
- (only those that change architecture or the primary task)
