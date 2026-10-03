# nextcore-skills

**Skills from a real product, not a demo.** Three plugins for AI coding agents (Claude Code, Cursor, Codex,
Windsurf, Gemini CLI, Copilot) plus five zero-dependency tools — distilled from a production booking platform that
AI agents built and still run every day: paying customers, ~230 pages, ~740 API routes, 10 browser extensions,
several agents working in parallel, two AI accounts taking turns. Every rule exists because the opposite happened
and was measured.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-16181D.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0293DA.svg)](package.json)
[Tiếng Việt](README.vi.md)

![How the three plugins fit together: brief → nextcore-design (spec + drawing) → nextcore-dev (API contract) → ship, measured by zero-dependency tools, all inside nextcore-workflow](docs/overview.svg)

## Try it on your project in one minute

No install, read-only, Node ≥18:

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check src --warn-only
npx -y -p github:kennetvn/nextcore-skills token-audit src/styles/tokens.css --src src --warn-only
```

What that printed on the production app this repo comes from:

```text
$ slop-check src
ERROR  src/app/dashboard/auto-post/auto-post.css:30  [color-literal] hex outside tokens — use var(--…)
        border: 1px solid #fde68a;
warn   src/app/blogs/page.tsx:33  [emoji-icon] use an icon set, not emoji
slop-check: 4932 finding(s), 1447 error(s) — color-literal 1443 · pixel-patch 698 · emoji-icon 372 · grid-1fr 825 · …

$ token-audit src/design-system-v2/tokens.css --src src
warn   [contrast] light: --ds-alert-fg on --ds-alert
        3.95:1 (X-fg on X) — needs 4.5:1 for body text, 3:1 only for large text
warn   [dark-missing] --ds-bg-muted
        #F2F5F8 has no dark-theme value — near-white colours vanish or glare in dark mode
token-audit: 228 tokens (56 with a dark value), 22 text/background pairs × 2 theme(s) — 6 finding(s), 0 error(s)
```

2,226 UI files in about 2 seconds. On a plain-PHP admin the same scanner took 0.5 s and found 23 violet "AI default"
gradients, 20 of them written in hex.

## Why this exists

Agents are fast at writing code and bad at consistency and honesty about it. On a real product that shows up as:

| Area | What we measured before these rules | Plugin |
|---|---|---|
| UI | 56 drawings: 51 had **no tablet layout**, 29 used < 85% brand colours, 20 used a font the product doesn't ship; screens kept being re-patched and looked like five products | nextcore-design |
| Design ↔ code | fields drawn with no data source; failures returned as HTTP 200; "forbidden" returned as an empty list so the UI showed "no data" | nextcore-dev |
| Security | an auth gate that printed "OK" while skipping **53%** of route files; on a PHP service, **0 of 27** API endpoints checked the caller and two "temporary" endpoints let anyone overwrite PHP code | nextcore-dev |
| Operations | a supervisor killed the app **647** times because the memory limit equalled the heap; a job reported SUCCESS for **23 days** while its connection was dead | nextcore-dev |
| Agents | 90 days: **473** extension releases, **2** commits that said "root cause"; one feature took **11** releases of symptom patches | nextcore-workflow |
| Docs | rules taught numbers that were no longer true ("76 routes without auth" — real count 0); a 68 KB memory index silently lost 143 of 305 lines | nextcore-workflow |

## The three plugins

### nextcore-design — draw first, code second, measure both

For anyone shipping UI. The agent writes a spec (goal, information hierarchy, a field map, FACT vs ASSUMPTION),
draws the screen in **5 states × 3 widths** with the product's tokens and fonts only, has a **separate critic agent**
review it, builds it 1:1, then measures. It never picks colours or fonts for you — it locks in the design system you have.

- Two agents: `design-critic` (adversarial review before any code, cites artboard + element for every point) and
  `design-auditor` (runs the tools after code, reports numbers only).
- A **design card** on every drawing: feature, live route, why, built yet, plus measured devices, states, colour DNA
  and type DNA. Orange card ⇒ not ready for approval.
- Squint tests: distance (50% / 25%), black-and-white, and with every shadow and gradient stripped. On its first real
  run it showed a primary button that turned into a grey block equal to the filter chips once colour was gone.
- [Plugin README](plugins/nextcore-design/README.md) · [SKILL.md](plugins/nextcore-design/skills/nextcore-design/SKILL.md) · [design thinking](plugins/nextcore-design/skills/nextcore-design/references/design-thinking.md) · [agent pipeline](plugins/nextcore-design/skills/nextcore-design/references/agent-pipeline.md)

### nextcore-dev — the contract that makes design and code meet

For backend and full-stack work. Every value on a drawing traces to a source, every source to an API shape, every UI
state to one backend signal:

| UI state | Backend signal | Seen in production instead |
|---|---|---|
| Empty | `success: true`, `data: []` | `success: false` for "no rows" |
| Error | `success: false` + `error.code` | HTTP 200 with an error string |
| Permission | 403 + `FORBIDDEN` | 200 with empty data — looks like Empty |
| Not found | 404 + `NOT_FOUND` | 200 + a "not found" page (soft-404) |

- Auth on every route, proved by a gate that **prints what it checked** ("728/739 routes, 11 exempt, 0 violations").
- Money as Decimal, one order-code generator, explicit `onDelete`, hand-written migrations with a ledger, production
  data changes as backup → script → apply → verify → commit.
- One job system with locks and run logs; a job's status must reflect failure.
- 14 backend traps with numbers, and stack notes for **Next.js, Laravel, Django, Rails, Express/Nest, plain PHP and WordPress**.
- [SKILL.md](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md) · [API contract](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) · [security](plugins/nextcore-dev/skills/nextcore-dev/references/security.md) · [stacks](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md) · [design ↔ dev hand-off](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md)

### nextcore-workflow — running agents on a real product without them lying to you

For whoever runs the agents.

- **Gates for what a machine can check, reasoning for the rest** — and every new gate tested both ways (plant a
  violation, watch it fail) before its green is trusted.
- **Diagnose before the third patch:** the third fix to the same spot within 72 hours is blocked until a diagnosis
  note exists (measured symptom · hypothesis + how to refute it · on-site observation).
- **Evidence before "done":** positive and negative controls; a number that is too clean means suspect the tool first.
- **Parallel agents and several AI accounts:** claims per task and file area, commits by pathspec, one trunk,
  deploy only through CI; anything tied to an AI account (canvases, artifacts) has its original in the repo.
- **Decisions live on issues;** docs carry dated markers that `doc-drift` re-measures; lessons flow back here.
- Machine hygiene for long agent sessions (orphan Node processes, browser MCP self-healing, CLI memory).
- [SKILL.md](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md) · [diagnose before patch](plugins/nextcore-workflow/skills/nextcore-workflow/references/diagnose-before-patch.md) · [measurement discipline](plugins/nextcore-workflow/skills/nextcore-workflow/references/measurement-discipline.md) · [parallel agents](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) · [lesson loop](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)

## The tools

All plain Node ≥18 scripts, no dependencies, CI-ready exit codes, each tested two ways (must fire on a bad fixture,
must stay silent on a good one).

| Tool | Answers | Run |
|---|---|---|
| `slop-check` | does UI code carry "AI slop" tells or pixel patches? 11 rules, any HTML stack | `npx -y -p github:kennetvn/nextcore-skills slop-check <dir>` |
| `token-audit` | do token pairs pass WCAG contrast **in every theme**? tokens missing a dark value? `var()` resolving to nothing? | `… token-audit <tokens.css\|.scss> --src <dir>` |
| `design-card` | is each drawing complete and on-brand (devices, states, colour, fonts, routes exist)? | `… design-card <drawings> --tokens … --fonts … --app\|--routes …` |
| `design-review` | does the hierarchy survive distance, grayscale and no decoration? (contact sheet + screenshot) | `… design-review <drawings> --shot review.png` |
| `doc-drift` | which numbers written in docs and rules are no longer true? | `… doc-drift docs --quiet` |

## Works with your stack

| Stack | UI scanned | Tokens read | Routes for `design-card` |
|---|---|---|---|
| Next.js / React / Remix | `.tsx .jsx .css` | CSS custom properties, Tailwind v4 `@theme` | `--app src/app` or `--app pages` |
| Laravel / plain PHP / WordPress | `.blade.php .php .css .scss` | SCSS `$vars`, CSS custom properties | `--routes routes/web.php` |
| Symfony / Craft | `.twig` | CSS / SCSS | `--routes routes.txt` |
| Django / Flask | `.html .jinja .j2` | CSS / SCSS | `--routes routes.txt` |
| Rails | `.erb` | CSS / SCSS | `bin/rails routes > routes.txt` |
| Vue / Nuxt / Svelte / Astro | `.vue .svelte .astro` | CSS custom properties | `--routes routes.txt` |
| Shopify / Jekyll / Eleventy | `.liquid .njk .hbs` | CSS / SCSS | `--routes routes.txt` |
| ASP.NET | `.cshtml .razor` | CSS / SCSS | `--routes routes.txt` |

## Install

```bash
# Claude Code — all three plugins
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore
/plugin install nextcore-dev@nextcore
/plugin install nextcore-workflow@nextcore
```

Other agents: copy the `SKILL.md` you need into your rules file — `.cursor/rules/*.mdc` (Cursor), `AGENTS.md`
(Codex), `GEMINI.md` (Gemini CLI), `.github/copilot-instructions.md` (Copilot), `.windsurf/rules/` (Windsurf) — and keep
its `references/` folder next to it.

## Which one first?

| You are… | Start with |
|---|---|
| a solo dev whose UI keeps getting re-patched | run `slop-check` + `token-audit` with `--warn-only`, then nextcore-design for the next new screen |
| a backend dev handed mockups | nextcore-dev → [hand-off](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md) and [API contract](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) |
| a PHP (plain, WordPress, Laravel) / Django / Rails team | nextcore-dev [stacks](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md) — plain PHP: how to guard and count every endpoint |
| running several agents or CLIs on one repo | nextcore-workflow → [parallel agents](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) |
| an AI agent asked "is this useful for my project?" | [AGENTS.md](AGENTS.md) — measure the project first, then recommend a level L0–L3 |

We tested that last row: a fresh agent given only this link and a plain-PHP project measured it, recommended
"reference only (L0)" with numbers — and found the unguarded upload endpoints mentioned above.

## How it differs

| | typical design / coding skills | **nextcore-skills** |
|---|---|---|
| Source | best practices, written up | incidents on a live product, with numbers |
| Picks fonts and colours | often | never — locks in your design system |
| Unit of work | a page of code | a spec + drawing a human approves, then code |
| "Done" means | it looks right | measured: tools, squint sheet, match table, gates tested both ways |
| Who judges | the agent that made it | a separate critic agent + scripts |
| Design ↔ backend | separate worlds | one contract: field map → API shape → UI state signal |
| Several agents / accounts | not covered | claims, pathspec commits, repo as original |

## How it grows

1. An agent on a real project hits something general — a trap, a false "done", a rule that would have saved a day.
2. It writes the lesson with an anonymised English section and a flag (`community: true`).
3. A script at session start notices the flag, filters out anything private, and opens a **lesson** issue here.
4. A maintainer turns it into a rule with a bad example that must trigger and a good one that must stay silent — or
   closes it with the reason.

Open a [lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) yourself, or read
[CONTRIBUTING.md](CONTRIBUTING.md). Contributors are credited in the CHANGELOG, next to the rule they taught, and here:

[![Contributors](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## FAQ

**Do I need Claude Code?** No. The skills are Markdown any agent can follow; the tools are Node scripts. Claude Code
just installs everything in one command.

**Do I need Claude Design?** No. Any canvas or HTML prototype works; `design-card` and `design-review` read plain
`.html` artboards.

**Our tokens aren't named `--ds-*`.** `token-audit` pairs by suffix (`-fg`, `-ink`, `-soft`, `bg`, `surface`…) and
`--pair a:b` adds anything else. SCSS `$variables` work too.

**Will the scanners drown a legacy app?** Start with `--warn-only`, scope to changed files, ratchet down.

**Is my code sent anywhere?** No. Every tool reads local files and prints a report; nothing calls the network.

## One repository

Everything lives here: `plugins/nextcore-design` (merged from the former `kennetvn/nextcore-design` with its full
history), `plugins/nextcore-dev`, `plugins/nextcore-workflow` (which also absorbed the former `nextcore-solutions`
fixes). One CI runs every test on Linux, Windows and macOS with Node 18, 20 and 22. The previous "NEXTCORE-SKILLS v3"
catalogue (147 skills written in one day, never measured) is preserved at tag
[`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

## Credits

Written in our own words, with ideas learned from these MIT projects:
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (3 dials, reading line) ·
[Nutlope/hallmark](https://github.com/nutlope/hallmark) (skeleton first, slop gate) ·
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) (form questions, 3 directions) ·
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (audit priority order) ·
[anthropics/skills](https://github.com/anthropics/skills) `frontend-design` (LLM tells, two passes).

## License

[MIT](LICENSE)
