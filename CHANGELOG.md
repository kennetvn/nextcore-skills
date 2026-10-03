# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · versioning: [SemVer](https://semver.org/).

## [1.0.0] — 2026-10-03

### Added
- Claude Code plugin marketplace `nextcore` (`/plugin marketplace add kennetvn/nextcore-skills`) listing three plugins:
  - **nextcore-design** (hosted in [kennetvn/nextcore-design](https://github.com/kennetvn/nextcore-design)).
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
