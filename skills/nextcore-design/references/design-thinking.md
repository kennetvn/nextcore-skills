# Design thinking — what a senior product designer decides before any pixel

Read this when the screen is new, the brief is vague, or a review says "it looks fine but something is off".
Everything here ends in a written decision (in `templates/spec.md`) or a measurable check — not in mood.

## 1. Label what you know

Every claim in a spec is one of: **FACT** (measured or given) · **OBSERVATION** (seen in the current product) ·
**ASSUMPTION** (reasonable, unverified) · **HYPOTHESIS** (to be tested) · **DECISION** (chosen, with a reason).
Never write "users prefer…" without a source. "Hypothesis: owners check occupancy first" is honest; it also tells
the team what to measure later.

Ambiguous brief: infer, write the assumptions down, and proceed. Ask only when the answer changes architecture or the
primary task.

## 2. Study the product before inventing anything

Inventory the existing tokens, type scale, spacing, components, icons, and how loading / empty / error look today.
Reuse what is good. If the current system is inconsistent, **name the inconsistency first** (e.g. "three button
heights: 36 / 40 / 44"), then fix it on purpose — never by accident, and never by starting a second design system.

## 3. Information architecture before visuals

Answer in the spec, in this order:

1. Primary user goal · 2. primary action · 3. primary information · 4. secondary information ·
5. what can be **removed** · 6. what can be **grouped** · 7. what needs emphasis · 8. what can be disclosed
progressively · 9. what happens **after** the primary action.

Hierarchy then comes from content order, type, spacing, grouping and position — colour, shadow and size come last.

## 4. "Why?" for every visual element

Before keeping a gradient, shadow, badge, card, icon or animation, write its reason in one phrase: *establishes
hierarchy · separates interaction zones · communicates status · improves discoverability · reinforces the brand ·
improves scanning · reduces cognitive load.* "Looks nice" is not a reason. Elements without a reason are removed.
Complexity is not quality: more cards, sections, pills or gradients do not make a screen more designed.

## 5. Visual direction (one block, per product area — reused, not reinvented per screen)

```
Mood · Brand personality · Typography character · Density · Spatial rhythm · Colour strategy ·
Shape language (radii, how many) · Iconography (one set, one stroke) · Image strategy · Motion strategy ·
Signature element (one motif taken from the content itself)
```

## 6. States — data and components

**Data-driven screens:** initial · loading · empty · partial · success · error · permission denied ·
offline / network failure · long content · unexpected content (missing image, 0, a huge number, an RTL name).

**Interactive components:** default · hover · focus-visible · active/pressed · disabled · loading · error ·
success · empty. Not every component needs every state; every applicable one is drawn or explicitly ruled out.

## 7. Content is design material

Draw with real content: long and short titles, missing images, long names, big numbers, other currencies,
multi-line addresses, empty values, real error messages. **Localised text is longer and taller** — Vietnamese
diacritics stack above and below the line, German compounds overflow; never size boxes on English placeholder.

## 8. Accessibility, motion, icons, images

- Contrast in **every** theme (`scripts/token-audit.mjs`), visible focus, ≥44px targets, labels on inputs, errors
  in words next to the field, never colour as the only signal.
- Motion only for state change, feedback, spatial relation, loading or continuity; subtle; honour
  `prefers-reduced-motion`; no infinite decoration.
- One icon set, one stroke weight, one optical size; text beside any icon whose meaning is not obvious; no emoji as icons.
- Real places, real rooms, real food: use authentic photos, verify location claims, never generate a fake
  landmark. No image available ⇒ an intentional placeholder, not a fabricated reality.

## 9. Three squint tests (run them; `scripts/design-review.mjs` builds the sheet)

| Test | How | Fails when |
|---|---|---|
| **5-second** | look at the 25% view only | you can't say where you are, what the page is for, what matters most, what to do next |
| **Distance** | 100 → 75 → 50 → 25% | the main hierarchy dissolves; everything weighs the same |
| **Black & white / no decoration** | grayscale, then remove shadows, gradients, images | hierarchy disappears ⇒ it lived in decoration |

Fix failures with type, spacing, grouping, scale and position — **not** by adding colour or contrast.

## 10. Design > code

If a visual problem can be solved in the layout, solve it there. Chains like `margin-top:-7px; translateY(3px);
padding-left:11px` mean the structure is wrong (`slop-check` flags off-scale spacing as `pixel-patch`). If
implementation forces a design change, change the drawing (D2) and its reasoning — don't improvise in CSS.

## 11. Report like a designer

End a meaningful design task with: decisions and why · UX structure · visual system · states · responsive behaviour ·
accessibility decisions · what was implemented · **remaining risks** that need a human or real users
(`templates/report.md`). Never call a design perfect; present it as a reasoned solution that can be validated.

> The goal is not "look impressive". It is: the right information understandable, the right action obvious, the
> experience trustworthy, the interface coherent for the people who use it.
