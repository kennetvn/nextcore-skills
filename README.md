# nextcore-design

**Draw first, code second — and measure both.** A design-first skill for AI coding agents (Claude Code,
Cursor, Codex, Windsurf, Gemini CLI, Copilot) plus three zero-dependency checkers that turn "looks good to me"
into numbers.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-16181D.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0293DA.svg)](package.json)
[![test](https://github.com/kennetvn/nextcore-design/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-design/actions/workflows/test.yml)
[Tiếng Việt](README.vi.md)

![Workflow: read the brief → draw 5 states at 3 widths → design card gate → build 1:1 → measure in a real browser](docs/flow.svg)

## Why

Agents are fast at writing UI and bad at consistency. Patch-by-patch UI work produces screens that each look
fine and together look like five different products. This repo is what stuck after doing design-first on a
production codebase (Next.js, 230 pages, two Claude accounts, several agents in parallel):

- **Draw before code**, in a canvas the human can click and edit, with every state and width.
- **Lock the brand inside the drawing** — tokens only, brand fonts only — so code is a copy, not a re-interpretation.
- **Gate with numbers, not taste.** Each drawing carries a measured *design card*; each build is compared to the
  drawing in a real browser.

What the checkers found on that codebase on day one (56 drawings, 2,226 UI source files):

| Check | Finding |
|---|---|
| `design-card` | 51/56 drawings had **no tablet artboard** · 29 had < 85% of colours on token · 20 used a font the product doesn't ship · 28 had no success state |
| `token-audit` | an alert button pair at **3.95:1** in both themes · 4 near-white/near-black tokens with **no dark value** · 0 false positives after teaching it next/font and chart-library vars |
| `slop-check` | 1,443 hex literals outside tokens · 372 emoji used as icons · 825 `1fr` grid tracks that can scroll the page sideways — in 2 seconds |

## Quickstart

```bash
git clone https://github.com/kennetvn/nextcore-design
cp -r nextcore-design/skills/nextcore-design ~/.claude/skills/      # Claude Code, every project
# or: cp -r nextcore-design/skills/nextcore-design <project>/.claude/skills/
```

Then ask your agent for a new screen, a redesign, or say "this looks like a template". The skill activates on its own.

| Agent | Install |
|---|---|
| Claude Code | copy `skills/nextcore-design` to `~/.claude/skills/` or `<project>/.claude/skills/` |
| Cursor | paste `SKILL.md` into `.cursor/rules/nextcore-design.mdc` (set *Agent Requested*) |
| Codex · Gemini CLI · Copilot | paste `SKILL.md` into `AGENTS.md` / `GEMINI.md` / `.github/copilot-instructions.md` |
| Windsurf | paste `SKILL.md` into `.windsurf/rules/nextcore-design.md` |

The checkers run anywhere with Node ≥18 — no install:

```bash
npx -y -p github:kennetvn/nextcore-design slop-check src
npx -y -p github:kennetvn/nextcore-design token-audit src/styles/tokens.css --src src
npx -y -p github:kennetvn/nextcore-design design-card design --tokens src/styles/tokens.css --fonts "Inter,Fraunces" --app src/app
```

## What's inside

| Path | What it is |
|---|---|
| [`skills/nextcore-design/SKILL.md`](skills/nextcore-design/SKILL.md) | The workflow: when to draw · read the brief + 3 dials · one master canvas · 5 states × 3 widths · lock tokens · hand-off · acceptance |
| [`scripts/slop-check.mjs`](skills/nextcore-design/scripts/slop-check.mjs) | 10 mechanical "AI slop" rules for CSS/TSX/HTML/Vue/Svelte; CI-ready exit codes |
| [`scripts/token-audit.mjs`](skills/nextcore-design/scripts/token-audit.mjs) | WCAG contrast of text/background token pairs **in every theme**, tokens missing a dark value, `var()` that resolves to nothing |
| [`scripts/design-card.mjs`](skills/nextcore-design/scripts/design-card.mjs) | Per-drawing card: devices, states, colour DNA, type DNA, routes exist; `--strict` gate |
| [`references/canvas-workflow.md`](skills/nextcore-design/references/canvas-workflow.md) | Claude Design vs Artifact canvas · one canvas across several Claude accounts and parallel agents |
| [`references/slop-tells.md`](skills/nextcore-design/references/slop-tells.md) | ~35 signs a UI was generated on autopilot, merged from 5 leading skills |
| [`references/measurement-traps.md`](skills/nextcore-design/references/measurement-traps.md) | 19 ways a check says "pass" while the page is broken — each happened in production |
| [`templates/`](skills/nextcore-design/templates) | `brief.md` (reading line, dials, field map, edge-case data) · `card.json` |

## The checkers

### `slop-check` — is the code carrying AI tells?

```text
$ node slop-check.mjs src
ERROR  src/app/dashboard/auto-post/auto-post.css:30  [color-literal] hex outside tokens — use var(--…)
        border: 1px solid #fde68a;
warn   src/app/blogs/page.tsx:33  [emoji-icon] use an icon set, not emoji
        LOCATION: { label: "Địa điểm", emoji: "📍", …
slop-check: 4228 finding(s), 1447 error(s) — emoji-icon 372 · color-literal 1443 · rgb-literal 1565 · grid-1fr 825 · …
```

| Rule | Level | Catches |
|---|---|---|
| `color-literal` | error | hex outside token blocks (CSS) · hex in colour props (TSX/HTML) |
| `rgb-literal` | warn | `rgb()/hsl()` outside tokens |
| `transition-all` | error | `transition: all`, `transition-all` |
| `break-all` | error | `word-break: break-all` (cuts emails, phone numbers, order codes in half) |
| `placeholder-data` | error | Lorem ipsum, John Doe, Acme (format hints inside `placeholder="…"` are fine) |
| `grid-1fr` | warn | `1fr` not wrapped in `minmax(0, …)` ⇒ sideways scroll on mobile |
| `purple-gradient` | warn | the default AI violet/indigo gradient |
| `italic-heading` | warn | italic headings / `<em>` in headings |
| `emoji-icon` | warn | emoji as icons |
| `round-number` | warn | round sample numbers (1,000 / 10,000) in copy |

It does **not** flag hex inside `:root` / `[data-theme]` / `@theme` blocks, `var(--x, #fallback)`, SVG logo
paths, `href="#id"`, or comments.

### `token-audit` — do the tokens hold up in every theme?

```text
$ node token-audit.mjs src/tokens.css --src src
warn   [contrast] light: --ds-alert-fg on --ds-alert
        3.95:1 (X-fg on X) — needs 4.5:1 for body text, 3:1 only for large text
warn   [dark-missing] --ds-bg-muted
        #F2F5F8 has no dark-theme value — near-white colours vanish or glare in dark mode
token-audit: 228 tokens (56 with a dark value), 22 text/background pairs × 2 theme(s) — 6 finding(s), 0 error(s)
```

Pairs come from naming conventions — `X-fg` on `X`, `X-ink` on `X-soft`, `ink`/`text` on `bg`/`surface` — plus
`--pair fg:bg` for anything else. Themes: `:root`, `[data-theme=dark]`, `.dark`, `@media (prefers-color-scheme: dark)`.
`var()` defined from JS (next/font `variable: "--font-x"`, chart libraries' `` `--color-${key}` ``) counts as defined.

### `design-card` — is each drawing complete and on-brand?

```text
$ node design-card.mjs tests/fixtures/drawings --tokens tests/fixtures/tokens/good.css --fonts "Inter,Fraunces" --app tests/fixtures/app
✗ tests/fixtures/drawings/bad/settings  — Settings
    1 artboards · widths 1280 · desktop ✓ tablet · phone ·
    states: empty · loading · error · success · · colour 0% on token · fonts OFF: poppins
    → no phone artboard · no tablet artboard · no empty state · no loading state · no error state · no success state · colours 0% on token (< 85%) · off-brand font: poppins · route /settings/billing has no page
✓ tests/fixtures/drawings/good/settings  — Settings · invite and manage team members
    7 artboards · widths 390/768/1280 · desktop ✓ tablet ✓ phone ✓
    states: empty ✓ loading ✓ error ✓ success ✓ · colour 100% on token · fonts ok
design-card: 2 drawing(s), 1 pass, 1 need work
```

A drawing is a folder of artboards (`*.dc.html` / `*.html`), optionally with a Claude Design `canvas.json`
(sizes, titles) and a [`card.json`](skills/nextcore-design/templates/card.json) (feature, routes, why, built).

## In CI

```yaml
# .github/workflows/design.yml
name: design
on: [pull_request]
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx -y -p github:kennetvn/nextcore-design slop-check src
      - run: npx -y -p github:kennetvn/nextcore-design token-audit src/styles/tokens.css --src src
      - run: npx -y -p github:kennetvn/nextcore-design design-card design --tokens src/styles/tokens.css --fonts "Inter" --strict
```

Big legacy codebase? Start with `--warn-only` and ratchet down.

## How it differs from other design skills

| | taste-skill · hallmark · frontend-design | **nextcore-design** |
|---|---|---|
| Picks fonts and colours for you | yes — great for a blank page | **no** — keeps your design system |
| Unit of work | a page of code | a **drawing** (5 states × 3 widths) the human approves, then code |
| "Done" means | it looks good | **measured**: design card, token contrast, real-browser match table |
| Multi-account / multi-agent | — | one master canvas, repo as source of truth ([playbook](skills/nextcore-design/references/canvas-workflow.md)) |

Use them together: let a taste skill propose a direction for a brand-new product, then lock it with this one.

## FAQ

**Do I need Claude Design?** No. Any canvas or HTML prototype works; the skill and `design-card` read plain
`.html` artboards. Claude's Artifact canvas is what we use because humans can click-edit it and agents can read it back.

**Our tokens aren't named `--ds-*`.** Fine. `token-audit` pairs by suffix (`-fg`, `-ink`, `-soft`, `bg`, `surface`…),
and `--pair a:b` adds any pair you need.

**Will `slop-check` drown a legacy app?** Run it with `--warn-only --ignore legacy/` first, fix new code only, ratchet.

## Contributing

Issues and PRs welcome — especially new slop rules with a real false-positive story. Every rule ships with a bad
fixture that must fire and a good fixture that must stay silent. See [CONTRIBUTING.md](CONTRIBUTING.md); run `npm test`.

## Credits

Written in our own words, with ideas learned from these MIT projects (stars as of 2026-10-03):
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (3 dials, reading line, same-font emphasis) ·
[Nutlope/hallmark](https://github.com/nutlope/hallmark) (skeleton first, slop gate, self-critique) ·
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) (5 form questions, 3 directions) ·
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (audit priority order) ·
[anthropics/skills](https://github.com/anthropics/skills) `frontend-design` (LLM tells, two-pass).

## License

[MIT](LICENSE)
