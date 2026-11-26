# Prototype first — why the drawing became a runnable HTML file

## What happened

One product required every UI task to be drawn first in a canvas design tool, through a restricted JSX/component
subset, with a checker that blocked hand-off until each screen had 5 states × 4 widths, only design tokens and no
uppercase text. Months later the owner compared the two outputs and said the agents' plain-HTML pages looked better
than the approved drawings.

Measured on one map page built both ways (2026-11):

| | Drawn in the canvas subset | Built as HTML, imported into the canvas |
|---|---|---|
| CSS available | subset: no `::before`, dashed borders lost, SVG `fill` lost, gradients / `color-mix()` / opacity reported as raw values, machine fonts | full CSS |
| Look-and-fix rounds before hand-off | usually 0 | 4 (overflow, overlapping text, label offset, status chip) |
| Data | samples | real rows (681 tasks on a second prototype) |
| Checker result | pass required | 3 errors + 3 warnings on a page the owner approved (static doc: "missing states", tokens with fallbacks, short uppercase labels) |
| Similarity canvas ↔ prototype after import | — | SSIM 0.98, 0 overflow |

## Why drawings lost

1. **Medium.** A subset of CSS is a smaller design vocabulary. Agents that know CSS well were forced to draw with less.
2. **Incentive.** The gate measured compliance, not quality. Agents optimised what was measured (cell count, token
   names), the same way any metric becomes the target.
3. **Spread.** 20 cells per screen split the effort; each cell got a fraction of the attention.
4. **No feedback loop.** Drawings were exported but rarely read back as images and fixed.
5. **Anchoring.** "Clone the live baseline, draw the delta" is right for small changes, but when the live screen is the
   problem, the clone carries the problem into the drawing.
6. **Sample data.** Short sample strings hide density, wrapping and empty-state problems that real data shows at once.

## The replacement flow

1. HTML prototype in the drawing folder — real tokens with fallbacks, real data, real states only.
2. Open it for the user at their real window size and send the URL (file name visible) + a screenshot.
3. Two or more look-and-fix rounds, with a script that finds clipped or overflowing text.
4. Import the static HTML into the design tool for versions, notes and share links; mark non-applicable states.
5. Build 1:1; compare shipped screenshot vs prototype (SSIM ≥ 0.95 or a list of justified differences).
6. Score taste on the screenshot (hierarchy, spacing, full strings, status colours, no internal words).

Keep the baseline rule for small deltas. When the owner rejects the current screen, or it measures badly, the
prototype may change the layout — write the reason on the ticket.

## Checker changes that go with it

- A state with a note «not applicable — reason» is not "missing".
- `var(--token, fallback)` counts as a token; only literal colours / spacing are raw.
- Short uppercase labels styled with `text-transform` are not a sentence-case violation.
- Report "cells imported from HTML" and the SSIM to the prototype next to the compliance numbers.
