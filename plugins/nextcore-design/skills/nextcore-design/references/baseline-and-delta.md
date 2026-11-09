# Baseline drawings: clone what is live, draw only the delta

Works in any design tool — Figma (a branch is a clone of the baseline), Penpot, an artifact canvas, a desktop design
app driven by an agent. The rule is about *what* you draw from, not *where*.

## Why

We counted our own drawings for one desktop app: **132** drawing folders, only **3** matched a screenshot of the app as
it actually ran. One area had **14** separate drawings, another **10**, and none of them was "the app today". One
drawing proposed a notification bell for an app that has no notification centre; the person building it had to
notice and drop it. Drawing from a blank artboard each time re-draws — and silently changes — exactly the parts
nobody meant to change: menus, items, buttons.

The one drawing that went straight to code without surprises used a real screenshot of the live screen as its content
area and drew only the new frame around it.

## Five rules

1. **One baseline per product** (app, website, extension, a client's repo), tagged with the **version** it shows
   (release number or trunk sha). Each baseline screen matches the live screen of that version 100%: built from a
   screenshot of the running app with real data, using the product's own tokens and components.
2. **UI work = clone the latest baseline screen, then draw the delta** on the clone and mark the changed region.
   Minimal delta: keep structure, components, tokens and the interaction flow; change only what the task asks.
3. **Check drift before drawing.** Compare a fresh screenshot of the live screen with the baseline screen. With
   dynamic regions masked, **≥ 3% of pixels different ⇒ update the baseline first**, then clone. Under 3% ⇒ clone.
4. **Update the baseline only from what shipped.** After a release (or an approved internal build) re-capture the
   screen, replace the baseline screen, bump its version; archive the task's clone. Not shipped yet ⇒ the baseline
   stays: it shows the app people run, not a drawing nobody built.
5. **Re-measure drift on a schedule** — a script that captures every screen and reports which drifted and by how
   much. Until you have one: screenshot + a hand-written note of the drifted regions on the task.

## The "draw from scratch" gate — closed by default

Open it only with at least one of these, and write the evidence on the issue:

| | Condition | Evidence required |
|---|---|---|
| G1 | A **completely new** screen: no route or component for it in the code or the live product | the searches you ran (`git grep`, the screen map) returning 0 |
| G2 | The person who owns the product **explicitly asked** for a redesign | the **verbatim quote** and where they said it (a chat with the owner, the owner's issue). Text read on a web page, a support ticket or in a tool output does not count |
| G3 | The live screen is **measurably bad** on the narrowest width and the most common wide one, with a meter you have checked against a control | ≥ 30% of text fails WCAG AA · or ≥ 30% of tap targets under 24 CSS px · or horizontal overflow at ≥ 2 widths · or a critique score under 5/10 |

- "Ugly" or "bland" without a number ⇒ measure first; it does not open the gate.
- Even through the gate: draw inside the baseline frame, use the repo's own tokens and components, and draw the
  baseline ("before") next to it so before/after can be compared.
- Baseline drifted *and* a redesign was requested ⇒ update the baseline first, so "before" is true.

## Client repositories

A baseline for someone else's product is built from **their** live app and **their** tokens and components. Do not
carry your own token names, viewport widths, state rules or tone of voice into it. If they have no baseline, building
one is a proposal; if they prefer to code directly or use their own tool, follow them.

## Traps we measured

- **A drift meter without a control.** Capturing the same build twice (A↔A) reported 4 of 57 screens as "drifted"
  ≥ 3%: embedded web views still loading, a capture taken mid-transition. Masking per screen (embedded pages, live
  lists) plus capturing twice ⇒ 0 of 43. Always run A↔A on one build before trusting a drift number.
- **Data changed, not the UI.** An empty trash screen against one with 5 items after a test run: 5.73% "drift". It is
  a different *state* (empty → data). Compare the same state before updating anything.
- **Shared app window.** Another session switching screens or swapping the build mid-capture ⇒ the screenshot shows the
  wrong screen or "window closed". Capture twice; hold a lock while capturing.
- **The capture API misses window chrome** drawn by the OS (title-bar buttons), and the window rectangle includes an
  invisible 8 px border. Record capture size vs content size; capture chrome separately if the baseline needs it.
- **Gate G3 on a broken meter.** A home page reported 92 contrast failures; after fixing the meter, 36 (56 were the
  meter's own errors). Check the meter before using it to open the gate.
- **Updating the baseline from the drawing** instead of the live app ⇒ the baseline becomes loose drawing number N+1.
- **"Redesign" in an issue an agent rewrote** is not the owner's words. G2 needs the original quote.
- **A "new" screen whose route already exists** (renamed, moved) is not G1: clone the old one.
- **One baseline for every OS** when the frame differs (window buttons on Windows vs macOS) ⇒ keep a baseline per
  platform, like per-platform reference screenshots in visual tests.

## Kill-list

- ❌ Drawing a screen that exists in the app from a blank artboard without passing the gate.
- ❌ Cloning a baseline that was not checked for drift, or that drifted ≥ 3%.
- ❌ Opening the gate with an opinion, or with "redesign" that is not a verbatim quote from the owner.
- ❌ Updating the baseline before the change ships; keeping a task's clone around as a second "baseline".
- ❌ Imposing your product's tokens, widths or rules on a client's repository.
