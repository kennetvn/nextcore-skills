# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning: [SemVer](https://semver.org/).

## [1.3.0] — 2026-10-03

### Changed
- Moved into [nextcore-skills](../../README.md) as `plugins/nextcore-design` (history preserved). Tools now run with
  `npx -p github:kennetvn/nextcore-skills <tool>`; the standalone repo is retired.

## [1.2.0] — 2026-10-03

### Added
- **Any stack that renders HTML.** `slop-check` reads PHP/Laravel Blade/WordPress, Twig, ERB, Jinja/Django, Nunjucks,
  Handlebars/Mustache, Liquid, EJS and Razor (with Blade/Twig/ERB/Razor comments ignored) plus Stylus/PostCSS;
  SCSS `$vars` and LESS `@vars` count as token declarations. `token-audit` reads SCSS/LESS token files, including
  variables that point to other variables. `design-card` checks routes from Next.js `pages/`, Laravel
  `routes/web.php`, or any plain route list (`rails routes`, Django, WordPress…).
- `AGENTS.md` + `llms.txt`: a 3-minute protocol for an agent asked "is this useful for my project?" — detect the
  stack, measure with `--warn-only`, recommend a level (L0–L3) with the numbers.
- `.claude-plugin/plugin.json`: installable as a Claude Code plugin from the `nextcore` marketplace.
- Contributor credit policy (CHANGELOG, provenance line next to the rule, contributors wall).

### Fixed
- `purple-gradient` now also catches the hex form of the default AI gradient (`#667eea → #764ba2`): on a plain-PHP
  admin it found 23 instead of 3; brand blues (hue < 235°) stay silent.

## [1.1.0] — 2026-10-03

### Added
- `design-review.mjs`: squint-test sheet — every artboard at 50% / 25% (distance test), grayscale (black-and-white
  test) and with shadows, gradients and background images stripped (hierarchy-without-decoration), plus the 5-second
  questions; `--shot` screenshots it with a local Chrome/Edge. Flags artboards whose text is filled by a canvas runtime.
- `slop-check` rule `pixel-patch` (warn): odd spacing (7px, 11px) and off-scale negative margins; on-scale bleeds
  (−4, −8, −16px) and 1–2px hairlines are not flagged.
- `agents/design-critic.md` and `agents/design-auditor.md`: Claude Code subagents for a separate critic before code
  and a script-only auditor after it.
- `references/design-thinking.md`: FACT / ASSUMPTION / HYPOTHESIS labels, study the product first, information
  hierarchy before visuals, a "why" for every element, visual-direction block, extended data and component states,
  localised content, authentic imagery, squint tests, design > code.
- `references/agent-pipeline.md`: Designer → Critic → Implementer → Audit → Visual review → Iterate, with a stop rule.
- `templates/spec.md` (replaces `brief.md`) and `templates/report.md`.

## [1.0.0] — 2026-10-03

### Added
- `token-audit.mjs`: WCAG contrast of text/background token pairs in every theme (light, `[data-theme=dark]`,
  `.dark`, `prefers-color-scheme: dark`); near-white/near-black tokens with no dark value; `var()` that resolves
  to nothing (understands next/font and chart-library vars defined from JS).
- `design-card.mjs`: per-drawing card — devices (desktop/tablet/phone), 4 states, colour DNA (% on token),
  type DNA (first family only, fallbacks ignored), declared routes exist; `--strict` CI gate.
- `templates/brief.md`, `templates/card.json`.
- `references/canvas-workflow.md`: Claude Design vs Artifact canvas, one master canvas across Claude accounts and
  parallel agents.
- Skill: device matrix (tablet 768 is mandatory), interactive states, design-card gate before approval, tools table.
- CI: `npm test` + dogfood runs on Ubuntu · Windows · macOS × Node 18 · 20 · 22.
- English README (primary) + `README.vi.md`, workflow diagram, `package.json` with `bin` for `npx`, two-way
  `node:test` suite, contributing guide, issue/PR templates.

### Fixed
- `slop-check`: `placeholder-data` no longer flags format hints inside `placeholder="…"` (6 false positives on a
  production codebase → 0).

## [0.1.0] — 2026-10-03

### Added
- Design-first skill, `slop-check.mjs` (10 rules), `slop-tells.md`, `measurement-traps.md`.
