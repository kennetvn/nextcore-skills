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

## Images

20. **`naturalWidth` of a `srcset` image is already divided by density.** With `w` descriptors Chrome reports
    `naturalWidth = file width × (sizes / w)`. Multiplying by `devicePixelRatio` "proved" every block was upscaled
    3.8–4.5× — the same number everywhere is the fingerprint of a broken meter. Compute upscale from the `w=` of
    `currentSrc`: `max(boxW×dpr / fileW, boxH×dpr / fileH)`.
21. **`sizes` describes width, but `object-fit: cover` fills the shorter side.** A 200×340 portrait cell showing a
    3:2 landscape photo with `sizes="200px"` got the 256–414px file, 133–276px tall, stretched to 340px — visibly
    blurry. For a cell whose ratio differs from the image: `sizes` = cell height × image ratio (340 × 1.5 ≈ 520px).
22. **An image with a `src` is not an image on screen.** An optimiser endpoint (`/_next/image?url=…`) builds a URL for
    any host; the host allow-list is checked only when the image is requested. Every request returned 400, the HTML
    looked right, and a headless audit reported 0 errors because it only fetched the smallest `srcset` entry. Request
    the exact URL at the width users get (`curl -o /dev/null -w '%{http_code}'`) and grep the allow-list.
23. **Lazy images inside a hidden panel never load.** A mega-menu kept in the DOM with `visibility: hidden` + `inert`
    for its CSS animation: 3/3 cover images still had an empty `currentSrc` 10 s after the panel opened. Use
    `loading="eager"` for images in panels/drawers toggled by CSS; check `currentSrc`/`naturalWidth`, not the URL.

## Loading and rendering (React / Next.js App Router)

24. **A parent `loading.tsx` wraps every dynamic child route.** Navigating from `/` to `/items/[slug]` showed the
    LIST skeleton because `items/` was the new segment; the child's own `loading.tsx` never ran. Move the list page and
    its loading file into a route group (`items/(list)/`, URL unchanged). Reproduce with a client-side navigation on a
    slow network, after the link has been prefetched — an unprefetched link shows the root fallback and misleads you.
25. **A root `app/loading.tsx` flashes on every hard load.** A full-height brand screen flushed first on 12/12 public
    pages, then jumped to the page's own skeleton. Check the first class after `<main>` in `curl` output of a hard load.
26. **`loading.tsx` on a static page still streams.** A `force-static` home page with a loading file shipped
    `<template id="B:0">` + a hidden `S:0` block and a swap script: one 441 ms task right after first paint, 1.1 s LCP
    render delay. Removing the loading file took TBT from 869 to 173 ms. Count `<template id="B:` in `curl` HTML first.
27. **"Compositor-only" animation is not free when the page has an IntersectionObserver.** A transform-only
    transition (`compositeFailed: 0`) still cost ~800 style recalcs per 5 s; a bare page with one animation cost 0, the
    same page plus ONE unrelated IntersectionObserver cost 825. Framework link prefetching registered 89 targets (even
    inside a hidden menu). Measure recalc count with the animation ON vs OFF on the real page, plus a bare control.
28. **The first `Intl` call pays for cold ICU/time-zone data.** A price formatter (`toLocaleString`) cost 89 ms inside
    hydration; replacing it moved the same ~95 ms to the next `Intl.DateTimeFormat` call even with a cached formatter.
    Read self-time per module in a CPU profile; for a fixed-offset time zone, plain arithmetic removes the cost.

## More meter traps

29. **Contrast parsed from `color(srgb …)` reads as ~1.00.** With `color-mix`/`oklch` tokens Chromium returns
    `color(srgb 0.13 0.5 0.3)`; a regex treating those as 0–255 makes text and background both near-black. Read
    colours through a 2D canvas (`fillStyle = computed; fillRect; getImageData`) — it accepts every CSS format.
30. **CDP automation pins `prefers-color-scheme: light`.** Playwright attached over CDP emulates light on every page it
    drives (desktop app windows and embedded webviews included), so a dark-mode test failed for days on a correct app.
    Call `emulateMedia({ colorScheme: null })` per page before measuring theme; positive control: the host window must
    report dark after you switch the OS/app to dark.
31. **Every number green, layout still wrong.** 198 screens with 0 overflow / clipped text / tap-target / contrast /
    console issues; at 2000px one screen had ~717px of dead space because a 720px column was left-aligned. Tools catch
    technical faults, not balance. Always look at the WIDEST real viewport with real (dense) data next to the drawing
    and ask "where does the extra width go?". Two attempts to auto-detect dead space (elementsFromPoint sweeps) gave
    false results 4 runs in a row — do not rebuild that heuristic.
