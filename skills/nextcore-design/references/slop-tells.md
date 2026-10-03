# Slop tells — signs a UI was generated on autopilot

Merged and de-duplicated from taste-skill, hallmark, huashu-design, anthropics/frontend-design and
ui-ux-pro-max, plus lessons from a production codebase. **M** = `scripts/slop-check.mjs` detects it.

## Colour
- [M] Hex / `rgb()` / `hsl()` literals outside the token file
- [M] Purple→blue / violet gradients that are not part of the brand tokens
- Warm cream page background + terracotta accent + high-contrast serif (the "default tasteful" look)
- Dark background + neon acid-green or vermilion accent
- One flat background colour for the whole page; glass on a flat background

## Typography
- [M] Italic headings; a second font family injected to emphasise one word (use weight/colour of the same font)
- Serif display chosen "because it looks premium" without a brand reason
- Tracked-out ALL-CAPS eyebrow above every section (max 1 per 3 sections)
- More than ~4 font sizes on one screen

## Layout
- Centred hero by default when the content is not a statement
- Three identical "feature" columns with icon + title + two lines
- 01 / 02 / 03 numbering when the content has no sequence
- [M] `grid-template-columns: 1fr` (horizontal scroll on mobile — use `minmax(0,1fr)`)
- ≥6 identical cards (same radius, same grey shadow) for content that is not uniform — the "SaaS card kit"
- More than 3 corner radii on one screen; cards nested in cards

## Components & motion
- [M] Emoji used as icons
- [M] `transition: all` / Tailwind `transition-all`
- Full-screen spinner overlay instead of an in-flow skeleton
- Hover-only affordances (invisible on touch)
- Middle-dot metadata strips (`Author · 5 min · Design`) on everything

## Content
- [M] "Lorem ipsum", "John Doe", "Jane Smith", "Nguyễn Văn A", "Acme"
- [M] Round sample numbers: 1,000 · 10,000 · 50,000 · 99% · 100+
- Copy clichés: Elevate, Seamless, Unlock, Empower, Supercharge, "Take your X to the next level"
- Title Case On Every Label; exclamation marks in error messages
- One avatar image reused for many different people

## Text handling
- [M] `word-break: break-all` (cuts emails / phone numbers / codes in half)
