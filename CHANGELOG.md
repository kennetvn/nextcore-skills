# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versioning: [SemVer](https://semver.org/).

## [1.4.0] — 2026-10-03

### Added
- `cases/`: a library of production incidents and measurement traps, one file per case (Symptom · Cause · Fix ·
  How to catch it · Rule), filed by layer, area and stack (`cases/taxonomy.json`), with `TEMPLATE.md`.
- `tools/cases-index.mjs` (`npm run cases`): validates every case and rebuilds the index in `cases/README.md`;
  the test suite fails on an invalid case or a stale index.

## [1.3.2] — 2026-10-03

### Changed
- README: the source product's size is a live card (`size.svg` / `quy-mo.vi.svg` + `quy-mo.json` on the
  `quy-mo` branch), recounted by the product's CI on every push instead of a hand-typed table.

## [1.3.1] — 2026-10-03

### Added
- README: "What these numbers show, and what they don't" — the production numbers are self-reported from one
  product; no productivity, bug-rate or AI-cost claim is made; how to check the tools on your own code instead.
- README: size of the source product (6,662 files, 880,223 lines, counted 3 Oct 2026) and a COCOMO rebuild-cost
  estimate, labelled as an order of magnitude and not a valuation. Same in README.vi.

## [1.3.0] — 2026-10-03

### Added
- "Built with these skills": the product the rules come from is named and linked, and a `showcase` issue template
  lets anyone add theirs; CONTRIBUTING now invites naming your product (private data stays out, CI still checks).

## [1.2.1] — 2026-10-03

### Fixed
- `third-patch` outside a git repository printed a Node stack trace; it now says so in one line and exits 2.

### Added
- `--help` / `-h` on all six tools prints the usage from the script header (tested for every `bin`).
- README: trimmed sample output is marked, `@nextcore` explained as the marketplace name, hooks sentence made concrete.

## [1.2.0] — 2026-10-03

### Added
- `third-patch.mjs` (nextcore-workflow): pre-commit hook that refuses a third `fix:` commit to the same file within
  72 h (history followed across renames) until a diagnosis note with Symptom · Hypothesis · Observation names it.
- README rewritten for first-time readers: plain-language intro, a small Laravel example, before/after for each skill
  (a real critic review, the 403-vs-empty-list contract, a blocked third patch), terms explained where they appear,
  concrete first contributions.

### Changed
- `token-audit` reports SCSS/LESS tokens with their own sigil (`$warning-fg`, not `--warning-fg`).

## [1.1.0] — 2026-10-03

### Changed
- **One repository.** `nextcore-design` merged into `plugins/nextcore-design` with its full git history (subtree);
  the marketplace now serves all three plugins from this repo. All tools run with
  `npx -p github:kennetvn/nextcore-skills <tool>`; one CI (3 OS × Node 18/20/22) runs every test and dogfoods every tool.
- Privacy scan now also covers `.cjs`, `.js`, `.ps1`, `.sh` and ignores hex colours (`'#000'`).

### Added
- `nextcore-dev` stack notes for plain PHP / WordPress: one guard, counted over every reachable `.php`, deny temp/debug
  files at the web server — from a real case where 0 of 27 API endpoints were guarded.
- `nextcore-workflow`: machine hygiene for long agent sessions (orphan Node reaper, browser MCP self-healing,
  long-running AI CLI memory) — absorbed from the former `nextcore-solutions` repo.

## [1.0.0] — 2026-10-03

### Added
- Claude Code plugin marketplace `nextcore` (`/plugin marketplace add kennetvn/nextcore-skills`) listing three plugins:
  - **nextcore-design** (hosted in [kennetvn/nextcore-design](https://github.com/kennetvn/nextcore-skills/tree/main/plugins/nextcore-design)).
  - **nextcore-dev** — field map → API contract → UI state signals; auth on every route; money, migrations and
    production data changes; background jobs and ops; 14 backend traps; stack notes for Next.js, Laravel, Django,
    Rails, Express/Nest; design ↔ dev hand-off checklist.
  - **nextcore-workflow** — enforcement tiers and two-way gate tests; diagnose before the third patch; measurement
    discipline (12 traps); parallel agents and several AI accounts; autonomy and issues as the decision record;
    living docs; the lesson loop. Tool: `doc-drift.mjs` re-measures numbers written in docs.
- `AGENTS.md` + `llms.txt`: how an agent should evaluate the repo for a project (measure first, recommend L0–L3).
- Lesson issue template, contributor credit policy, CI (marketplace consistency, frontmatter, dead links, privacy scan,
  doc-drift tests).

### Removed
- The previous "NEXTCORE-SKILLS v3" catalogue (147 skills, written in one day, never measured on a real project).
  Preserved at tag `legacy-v3.0.1`.
