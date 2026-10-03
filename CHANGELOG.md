# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning: [SemVer](https://semver.org/).

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
