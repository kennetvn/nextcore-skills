# Measurement traps — when "it passed" is a lie

Each item happened in a real production codebase. The fix is always: measure in the real browser, at the
real place, and distrust numbers that look too good.

## Layout

1. **`grid-template-columns: 1fr` scrolls the whole page sideways.** `1fr` means `minmax(auto, 1fr)`; a
   long word or wide child pushes the track past the viewport (measured 441px on a 375px screen).
   Always write `minmax(0, 1fr)`.
2. **Invisible tap traps.** `opacity: 0` + `:hover { opacity: 1 }` while `pointer-events` stays `auto`
   leaves an invisible button on touch screens (no hover). One page had 12 buttons + 8 overlays of
   293×288px sitting on top of images. Hide with `pointer-events: none` too, and give touch a visible
   affordance.
3. **`content-visibility` / `contain` pins `position: fixed` children to the block** instead of the
   viewport. Count fixed descendants before adding containment.
4. **`container-type` removes intrinsic size** — the parent must be `flex: 1 1 auto` or the box collapses.
5. **Bottom-fixed elements must sit above the mobile navigation bar** — two CTAs were hidden under it.
6. **Dialogs inside an app shell can be squeezed** by a wildcard `max-width: 100%` rule with high
   specificity. Portal dialogs to `body` and measure their width at 1280px.
7. **A heading rule on the shell wins over your class** (`.shell h1` = 0,1,1 beats `.title` = 0,1,0):
   declared 16px, rendered 30px. Measure computed style on the real page.

## Text

8. **Never `word-break: break-all` on identifiers** (email, phone, order code, domain, user id). It does
   not fix a box that is too small; it moves the break into the middle of something people must copy.
   Fix order: widen the box → auto-shrinking text (container query units) → break at legal points.
   Measure "fits vs overflows" at 1280 and 375 — do not eyeball.

## Colour & contrast

9. **Measure the scrim at the TEXT position**, not at its darkest point (bottom 0.6 opacity, but only
   0.367 where the text actually sits).
10. **Brand colour is a BACKGROUND colour.** White text on it measured 3.39:1; use a dedicated
    `-fg` (on-brand) token for text on it, and an `-ink` token for brand-coloured text on light
    backgrounds.
11. **Bright tone on its own `-soft` fill is the worst pair** (warning on warning-soft measured 1.91:1).
    Use `-ink` variants for text on soft fills.
12. **A token without a dark-mode value is invisible in dark mode.** Check every token you use has both.
13. **A contrast checker reporting ~1.00 for white text means the TOOL is wrong**, not the page (it read
    a transparent background). On one homepage 56 of 92 "failures" were false.

## Tools & process

14. **Overflow detector says 0 errors while a column is visibly crushed.** Always look at the screenshot.
15. **A clean `pageerror` log does not mean no crash** — error boundaries swallow errors into
    `console.error`. Listen to both.
16. **Measuring an iframe widget directly is a false green** — measure it through the page that embeds it.
17. **Performance measured once is noise** (FPS ranged 75–154 between 5 identical runs). Run ≥5 times.
18. **Before/after on production with another deploy in between** proves nothing. Pin the commit.
19. **Measure the page at rest too** — infinite animations burn CPU every frame and Lighthouse/TBT does not
    see short per-frame tasks.
