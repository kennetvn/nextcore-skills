---
title: Approved canvas drawings looked worse than the agents' plain HTML pages
date: 2026-11-26
layer: [process, ai-agents]
area: [ui, frontend]
stack: [html, design-canvas]
kind: measurement-trap
skill: design
---

## Symptom

The process required every UI task to be drawn first in a canvas tool, through a restricted JSX subset, and a checker
blocked hand-off until each screen had 5 states × 4 widths, tokens only and no uppercase. The product owner compared
the outputs and said the agents' HTML pages looked better than the approved drawings. One page built as HTML and
imported into the canvas reached SSIM 0.98 with 0 overflow — yet the checker reported 3 errors and 3 warnings on it.

## Cause

The drawing subset could not express `::before`, dashed borders, SVG fills, gradients, `color-mix()` or web fonts; the
checker scored compliance (cell count, raw values, uppercase), not quality, so agents optimised the checker; 20 cells
per screen thinned the effort; drawings were rarely read back as images; cloning a bad live screen copied its flaws;
sample data hid wrapping and density problems.

## Fix

The drawing became a runnable HTML prototype with real tokens and real data, opened for the owner at their real window
size, fixed over 2+ look-and-fix rounds, then imported into the canvas for versions and notes. Shipped screens are
compared with the prototype (SSIM ≥ 0.95). The checker accepts «not applicable» states and `var(--token, fallback)`.

## How to catch it

Put a screenshot of the approved drawing next to a screenshot of the shipped screen and of an HTML prototype of the same
screen; ask someone who did not make them which is best. If the drawing loses, the drawing step is a cost, not a guide.
Also count how many checker findings remain on a screen the owner already approved — a non-zero count means the gate
measures something other than quality.

## Rule

Design in the medium the product ships in: build the screen as runnable HTML with real data, show it to the user, fix
it by looking at screenshots, then store it in the design tool. Score taste on the real screenshot, not only rules.
