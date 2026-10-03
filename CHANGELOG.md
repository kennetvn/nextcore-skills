# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [1.10.0] — 2026-10-03

### Added
- `nextcore update [--check]`: compares the installed version with the latest, prints what changed in between (from
  this CHANGELOG) and re-runs the same install. Every installed SKILL.md (and the Cursor rule / AGENTS.md block) now
  says which version it came from and tells the agent to run it about once a week — the agent keeps it current, not
  the person. The installer records `nextcore-install.json` (version, agent, skills).

### Changed
- **Cases live in one folder per subject**: platforms (`zalo/`, `facebook/`, `discord/`) and engineering areas
  (`devops/`, `infra/`, `backend/`, `data/`, `ai-agents/`, `testing/`, `design/`…). A platform folder can carry a
  playbook `README.md` (what still works and when it was checked, how to re-check it, deploy, known failures) from
  `cases/PLAYBOOK-TEMPLATE.md`. The index groups by folder; `npm test` checks folders against `taxonomy.json` and
  playbooks for a `Verified:` line and their sections. The nine existing cases moved into their folders.

### Fixed
- `slop-check` reported every colour in a `<style>:root{--brand:#…}</style>` block inside an HTML drawing or template
  (one-line blocks entirely, multi-line blocks after the first line): token blocks in `<style>` elements are now exempt
  by block, like in CSS files. On two real drawing folders: 19 → 13 and 27 → 1 errors; what remains are inline
  `style="…"` hex values. Reported by an agent drawing with the skill.

## [1.9.1] — 2026-10-03

### Fixed
- `nextcore measure` counted files that `nextcore-install` itself created (`.claude/skills/nextcore-*`, the marked block in
  AGENTS.md) as the project's own agent setup and recommended workflow for it; only files the person wrote count now.
  Found by running the published package on the test project a fresh agent had just set up.

## [1.9.0] — 2026-10-03

### Added
- `nextcore` — one call: `measure` (detects stack, UI folder, colour-token file, drawings, API routes, database, git
  history; runs slop-check, token-audit and spec-check in one process; recommends skills with a reason each), `all`
  (measure, then install exactly the recommended skills for an agent), `install`. On the small test project it gave
  the same numbers a fresh agent had measured by hand (4 slop findings, a 2.54:1 pair, 1 route, Prisma without schema)
  in 0.7 s; on the 6,000-file source product in 19 s. Fix hot-spots skip generated files, lockfiles, baselines and notes.
- AGENTS.md §6 and CONTRIBUTING §5b: an agent that finds an improvement asks the person first, shows the exact text,
  posts from their own account with an "AI-drafted, reviewed by" line, anonymised, one at a time — never on its own.

## [1.8.1] — 2026-10-03

A fresh agent was given only the README sentence on a small Next.js project. It measured (4 slop findings, a 2.54:1
contrast pair, 0 of 1 API routes guarded), chose design + dev, skipped workflow (no git history), dry-ran, installed 30
files and verified. These fixes come from where it said it had to guess.

### Fixed
- `nextcore-install --agent claude` copied the design subagents twice (`.claude/agents/` and inside the skill folder);
  now once, in `.claude/agents/`.

### Changed
- AGENTS.md: a "measure, then install what fits" route; read the rules from GitHub before installing; read the summary
  line, not the exit code (`--warn-only` exits 0); what `<token-file>` is; what to do when a measurement cannot run
  (no git history, no drawings, an ORM with no schema); levels are per skill and map to `--skills`; valid `--skills`
  values; verify that the harness sees the skills, not only that the files run.

## [1.8.0] — 2026-10-03

### Added
- `nextcore-install`: one command an agent can run itself — `--agent claude|cursor|codex|gemini|copilot|windsurf|generic`,
  `--skills`, `--dry-run`. Writes where that harness reads (`.claude/skills` + `.claude/agents`, `.cursor/rules/*.mdc`,
  a marked block in `AGENTS.md` / `GEMINI.md` / `.github/copilot-instructions.md`, `.windsurf/rules`), keeps the user's
  own text, stops on files it did not create, re-runs only update. Tested for every harness, for idempotence, conflicts
  and dry-run.
- AGENTS.md rewritten as the agent's entry point: route by what the person asked (evaluate · install · use), the
  install table, and how to use the skills after install (size the task, open one file, the check before "done").
- README quick start: a sentence to paste to your agent; install section uses `nextcore-install`.

### Fixed
- README quick start fits the column without a horizontal scrollbar.

## [1.7.1] — 2026-10-03

### Changed
- README (both languages) re-laid out for the first visit: a hero image, a one-paragraph intro, **Quick start** (install
  + one check) right below it — the install command moved from 65% down the page (y ≈ 5,100 px) to the first screen
  of the README (≈ 480 px) — then the skills with a new pipeline diagram (size → discover → draw → critique → build →
  audit → validate; incidents → cases), tools, before/after, cases, why, stacks, install, showcase, contribute. Long
  sample output and the FAQ are collapsed. Hero and diagram follow light/dark mode.
- `CODE_OF_CONDUCT.md` and `SECURITY.md` moved to `.github/` (GitHub still finds them); the old overview diagram removed.

## [1.7.0] — 2026-10-03

### Added
- **Product discovery before the drawing** (nextcore-design `references/product-discovery.md`): problem with a number,
  job to be done, success criteria for user / business / system, current-experience audit, a user flow with every
  branch, evidence labels. `templates/spec.md` gains Size, Impact, Problem, Job to be done, Success criteria, User flow.
- **Validation after the build** (`references/validation.md`, `templates/validation-report.md`): walk the primary job
  on the real page through every branch; business validation states the mechanism and the measurement, never a
  claimed uplift. `templates/decision-record.md` for decisions people will ask "why" about.
- **Task sizing** (nextcore-workflow `references/task-sizing.md`, SKILL §0): six sizes decide which phases run;
  impact LOW / MEDIUM / HIGH by counting callers, contracts and rules; ask a person only when the answer changes
  architecture, a business rule, permissions or the flow.
- **`spec-check`**: missing spec, size, discovery, flow branches, states, responsive decisions, unchecked
  assumptions, unreviewed HIGH impact, and a missing or empty validation report once `card.json` says it shipped.
  Two-way fixtures. Run on 84 production drawings: 65 drawing folders found, 0 with a spec.
- The design critic runs `spec-check` first; the design auditor reports it.
- Case: `drawings-shipped-without-a-problem`.

## [1.6.0] — 2026-10-03

### Changed
- The live size card moved from a `quy-mo` branch here to its own repo, [kennetvn/nextcore-stats](https://github.com/kennetvn/nextcore-stats), so this repo keeps a single branch.

### Added
- CONTRIBUTING: what goes where (repo map), how to make each kind of contribution, what gets merged and what gets
  closed, commits / squash merges / who cuts releases. PR template by kind; issue chooser links to Discussions,
  SECURITY and CONTRIBUTING; blank issues off.
- Lesson issues ask for the case layer; the bug form lists every tool. A test keeps both in sync with
  `package.json` and `cases/taxonomy.json`.

## [1.5.0] — 2026-10-03

### Added
- `token-audit` reads WordPress `theme.json` palettes (`--wp--preset--color--<slug>`; a style variation titled
  dark/night given as a second file is the dark theme) and Tailwind v3 `tailwind.config.{js,cjs,mjs,ts}` colours
  (`theme.colors` / `theme.extend.colors`, nested keys flattened to `--color-<group>-<shade>`, `DEFAULT` →
  `--color-<group>`) without executing the file; it prints how many values it skipped or could not read as a colour.
  Two-way fixtures for both. (closes 1, 2)
- `token-audit`: `hsl()` / `hsla()` colours; `contrast` counts as a text token and pairs are found under any prefix
  (`wp--preset--color--contrast` on `…--base`).
- Stack notes: FastAPI and Go (net/http + chi) columns for every backend principle, plus their traps. (closes 3)

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
