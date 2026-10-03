<p align="center"><img src="docs/hero.svg" width="100%" alt="nextcore-skills — AI agents that ship UI and APIs that hold up. Skills and zero-dependency checks learned on a live product: design, dev, workflow."></p>

Three skills an AI coding agent follows — **design**, **dev**, **workflow** — and seven small checks you can run on your
own project in a minute: Next.js, Laravel, plain PHP, Django, Rails, Vue, anything that renders HTML. Learned on
[homestaynextcore.org](https://homestaynextcore.org), a live booking platform that AI agents built and still run.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-16181D.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-0293DA.svg)](package.json)
[Tiếng Việt](README.vi.md)

## Quick start

```bash
# Claude Code — add the skills
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore      # also: nextcore-dev, nextcore-workflow

# Any project, any stack — no install, nothing sent anywhere
npx -y -p github:kennetvn/nextcore-skills slop-check src --warn-only
```

**Or let your agent do it** — paste this to Claude Code, Cursor, Codex, Gemini CLI, Copilot or Windsurf:

```text
Read https://github.com/kennetvn/nextcore-skills/blob/main/AGENTS.md, measure this project,
tell me which skills fit and why, then install those for yourself.
```

Install by hand for other agents: [install the skills](#install-the-skills). Sample output and the other six tools:
[try it in one minute](#try-it-in-one-minute).

## The three skills

![How the skills fit together: size → discover → spec + draw → critique → contract → build 1:1 → audit → validate; incidents become cases, rules and checks.](docs/pipeline.svg)

**[nextcore-design](plugins/nextcore-design/README.md)** — for anyone shipping UI. Size the task and discover first
(the problem, the job to be done, every branch of the flow), then a spec and a drawing in 5 states × 3 widths, a
review by a separate *critic* agent, a 1:1 build, and validation that a user can actually finish the job. Two words you'll meet: a **design card** is a short checklist attached to each design
(which feature, which page, why, built yet, plus measured devices, states, colours and fonts); a **squint test** shows
each design small, in grayscale and without shadows to check the important things still stand out.
It never picks colours or fonts for you — it keeps the design system you have.

**[nextcore-dev](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md)** — for backend and full-stack work. Turns the
design's list of fields into an API contract (one response shape, error codes the UI maps to states), auth on every
route proved by a counting check, money as decimals, hand-written migrations, safe production data fixes, one system
for background jobs, 14 backend traps, and notes for Next.js, Laravel, Django, Rails, Express/Nest, plain PHP and
WordPress.

**[nextcore-workflow](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md)** — for whoever runs the agents.
Rules a machine can check become git hooks you install, each proved by making it fail once on purpose; a diagnosis before the
third fix; evidence before "done"; several agents on one repo without overwriting each other's work; decisions written
on issues; numbers in docs that get re-measured; cleaning up the machine after long agent sessions.

## The tools

| Tool | Checks | Use it |
|---|---|---|
| `slop-check` | 11 signs of autopilot UI code: hard-coded colours, the default purple gradient, `transition: all`, emoji icons, fake sample data, pixel patches… | in CI on templates / CSS |
| `token-audit` | text/background colour pairs meet WCAG contrast in light **and** dark mode; colours missing a dark version; `var()` that points to nothing | when colours change |
| `design-card` | each design has phone/tablet/desktop, the 4 states, brand colours and fonts, and a page that exists | before approving a design |
| `design-review` | an HTML sheet (and screenshot) of each design small, grayscale and undecorated | reviewing a design |
| `spec-check` | the thinking before the drawing and after the build: task size, problem, job to be done, every flow branch, checkable assumptions, a validation report once it ships | before drawing; before calling it done |
| `doc-drift` | numbers written in docs that are no longer true | at session start, in CI |
| `third-patch` | blocks a third fix to the same file in 72 h without a diagnosis note | pre-commit hook |

Run any of them with `npx -y -p github:kennetvn/nextcore-skills <tool> …`; `<tool> --help` prints its options. All are plain Node ≥18 with no dependencies, and each is tested both ways: it must catch a bad example
and stay silent on a good one.

## What changes when an agent follows the skills

**Design: every state is drawn and reviewed before any code.** Without the skill an agent codes one happy-path screen
at desktop width. With it, the agent writes a short spec, draws empty / loading / error / success at phone, tablet and
desktop width with your colours and fonts only, and a **second agent** reviews the drawing. A real review, trimmed:

```text
VERDICT: revise
BLOCKING
1. all 6 artboards · body text — uses a font the product doesn't ship → use the brand font token
3. no 768 px artboard — the header row (4 filter chips + button ≈ 560 px) cannot fit a tablet
4. grayscale view · "Copy hand-over" button — turns into a grey block as heavy as the filter chips:
   the hierarchy depends on colour alone → make the selected chip an outline, give the button its own row
```

**Backend: a failure looks like a failure to the UI.** Without the skill:

```js
// a user without access gets 200 and an empty list — the screen says "No bookings yet"
if (!canView) return Response.json([])
```

With `nextcore-dev`, every UI state has exactly one backend signal:

```js
if (!canView) return fail(403, 'FORBIDDEN', 'You can only see bookings for your own properties')
// UI: data: [] → Empty state · FORBIDDEN → Permission state · success: false → Error state
```

**Running agents: the third quick fix needs a diagnosis.** With the workflow skill's pre-commit hook:

```text
$ git commit -m "fix: cart total again"
third-patch: BLOCKED — src/cart.js already has 2 fix commits in the last 72h:
    2ac251f fix: cart total again
    6828023 fix: cart total rounding
Write a diagnosis before patching again: docs/diagnosis/<area>.md naming the file, with three sections —
  ## Symptom · ## Hypothesis · ## Observation
```

## Try it in one minute

```bash
npx -y -p github:kennetvn/nextcore-skills slop-check resources --warn-only
npx -y -p github:kennetvn/nextcore-skills token-audit resources/sass/_tokens.scss
```

The first run downloads the package (≈20 s, no dependencies to install). Point `slop-check` at your templates/CSS
folder; point `token-audit` at the file where your colours are defined (CSS custom properties or SCSS/LESS variables —
skip it if you have none). Output on a small Laravel view:

<details>
<summary>Sample output on a small Laravel view</summary>

```text
ERROR  resources/views/rooms.blade.php:1  [color-literal] hex outside tokens — use var(--…)
warn   resources/views/rooms.blade.php:1  [purple-gradient] default AI gradient — use brand tokens
ERROR  resources/views/rooms.blade.php:1  [transition-all] list the properties you animate
warn   resources/views/rooms.blade.php:2  [emoji-icon] use an icon set, not emoji
ERROR  resources/views/rooms.blade.php:3  [placeholder-data] use realistic sample data
ERROR  resources/views/rooms.blade.php:4  [break-all] cuts identifiers in half — widen the box or shrink text
warn   resources/sass/_tokens.scss:6      [pixel-patch] off-scale spacing looks like a pixel patch
…  (2 more warnings trimmed)
slop-check: 9 finding(s), 4 error(s)

ERROR  [contrast] light: $warning-fg on $warning
        1.63:1 (X-fg on X) — needs 4.5:1 for body text
ERROR  [contrast] light: $ink-muted on $bg
        2.07:1 (text on surface) — needs 4.5:1 for body text
```

</details>

On the 2,226-file production app these rules come from, `slop-check` reported 4,932 findings in 2 seconds. On an old
codebase that is normal: run it with `--warn-only`, fix new code first, and let the number go down.

## Cases

**[cases/](cases/README.md)** — the incidents behind the rules, one file each: symptom with numbers, cause, fix with
before/after, a command or test that catches it, and the rule for an agent. Filed by **layer** (code, data, infra,
devops, performance, testing, ai-agents, process), **area** (api, database, security, jobs…) and **stack** (nextjs,
prisma, mysql, nginx, pm2… — open list), so a Laravel or Django team can go straight to what applies to them. New
cases arrive as the product keeps running; yours are welcome.

## Why these rules exist

Each one was added after the opposite happened on the live product and was measured:

| What happened | Rule that came out of it |
|---|---|
| 56 screen designs: 51 had no tablet layout, 29 used under 85% brand colours, 20 used a font the product doesn't ship | draw 3 widths; measure every design (*design card*) before approval |
| a permission error returned as HTTP 200 + empty list, so users saw "no data" instead of "no access" | one response shape; one backend signal per UI state |
| an auth check printed "OK" while skipping 53% of the route files | a gate must print what it checked ("728/739 routes, 11 exempt") |
| on a PHP service, 0 of 27 API endpoints checked the caller; two "temporary" upload endpoints let anyone overwrite PHP code | guard every endpoint and count them, on every stack |
| a background job reported SUCCESS for 23 days while its connection was dead | a job's status must reflect failures |
| 473 extension releases in 90 days, 2 commits that found a root cause; one feature took 11 releases of symptom patches | third patch to the same spot needs a diagnosis |
| docs said "76 routes without auth"; the real count was 0 | numbers in docs carry a date and get re-measured |

### What these numbers show, and what they don't

They come from one product, measured by the people who built it. They show that the problems are real and that the
tools find them. They are **not** independent evidence that the skills make a team faster:

| Shown | Not shown |
|---|---|
| the incidents above happened on a live product and were counted from its git, CI and logs | "productivity +X%", "bugs −Y%", "AI cost −Z%" — there is no controlled before/after, so we don't claim any |
| `slop-check`, `token-audit`, `third-patch` find these problems — you can check that on your own code in a minute | that the rules fit every team; they were tuned on one codebase |
| the tools have tests in CI (3 OS × Node 18/20/22) | outside review — the repo is new and nobody outside has reproduced these numbers yet |

The fastest way to judge it: run the tools on your repository and count what they flag that you agree with. If you
measure a before/after on a real project, [add it](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml)
— that is the evidence this README can't supply on its own.

## Works with your stack

| Stack | `slop-check` reads | `token-audit` reads | Pages for `design-card` |
|---|---|---|---|
| Next.js / React / Remix | `.tsx .jsx .css` | CSS custom properties, Tailwind v4 `@theme`, Tailwind v3 `tailwind.config.js` | `--app src/app` or `--app pages` |
| Laravel / plain PHP / WordPress | `.blade.php .php .css .scss` | SCSS `$vars`, CSS custom properties, WordPress `theme.json` palette | `--routes routes/web.php` |
| Symfony / Craft | `.twig` | CSS / SCSS | `--routes routes.txt` |
| Django / Flask | `.html .jinja .j2` | CSS / SCSS | `--routes routes.txt` |
| Rails | `.erb` | CSS / SCSS | `bin/rails routes > routes.txt` |
| Vue / Nuxt / Svelte / Astro | `.vue .svelte .astro` | CSS custom properties | `--routes routes.txt` |
| Shopify / Jekyll / Eleventy | `.liquid .njk .hbs` | CSS / SCSS | `--routes routes.txt` |
| ASP.NET | `.cshtml .razor` | CSS / SCSS | `--routes routes.txt` |

## Install the skills

```bash
# Claude Code
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore      # and/or nextcore-dev@nextcore, nextcore-workflow@nextcore
```

`@nextcore` is the marketplace name from the first command, not a version.

Any agent, one command from the project root — it writes where that agent reads, keeps your own files, and re-running
only updates:

```bash
# --agent claude · cursor · codex · gemini · copilot · windsurf · generic
npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent cursor --skills design
npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent codex --dry-run
```

Claude Code → `.claude/skills/` + `.claude/agents/` · Cursor → `.cursor/rules/*.mdc` · Codex → `AGENTS.md` · Gemini CLI →
`GEMINI.md` · Copilot → `.github/copilot-instructions.md` · Windsurf → `.windsurf/rules/`; skill files in `.nextcore/`.
What an agent should do after installing: [AGENTS.md §4](AGENTS.md#4-use--after-install).

| You are… | Start with |
|---|---|
| a developer whose UI keeps getting re-patched | `slop-check` + `token-audit` with `--warn-only`, then nextcore-design for the next new screen |
| a backend developer handed mockups | nextcore-dev: [hand-off checklist](plugins/nextcore-dev/skills/nextcore-dev/references/handoff.md) and [API contract](plugins/nextcore-dev/skills/nextcore-dev/references/api-contract.md) |
| a PHP / WordPress / Django / Rails team | nextcore-dev [stack notes](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md) — plain PHP: how to guard and count every endpoint |
| running several AI agents on one repo | nextcore-workflow: [parallel agents](plugins/nextcore-workflow/skills/nextcore-workflow/references/parallel-agents.md) and `third-patch` |
| an AI agent asked "is this useful for my project?" | [AGENTS.md](AGENTS.md): measure the project first, then recommend |

## Built with these skills

| Product | What it is | Stack |
|---|---|---|
| [homestaynextcore.org](https://homestaynextcore.org) | homestay booking in Vietnam, plus browser extensions for its operators; where every rule here was measured | Next.js, Prisma, MySQL, Chrome extensions |

Using the skills or tools on something real? [Add your product](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml)
— one line on what it is, your stack, and (if you have one) a number that changed. Lessons from products listed here
carry the product's name next to the rule they created.

### homestaynextcore.org by size

[![homestaynextcore.org size: files, lines, pages, API routes, models, commits and a COCOMO rebuild-cost estimate](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/size.svg)](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/quy-mo.json)

Recounted by CI on every push to the product (and daily), so it moves as the product grows; raw numbers in
[quy-mo.json](https://raw.githubusercontent.com/kennetvn/nextcore-stats/main/quy-mo.json). Git-tracked files only, non-blank lines; archived extension versions, generated
bundles, planning notes and images left out. Built by one owner directing AI coding agents, with these skills written
along the way.

The cost rows are what the standard COCOMO model (basic, organic; the one `scc` prints) says it would take to rebuild
this from scratch — not a market price, revenue or a valuation. Read it as an order of magnitude: COCOMO counts lines,
and AI-written code tends to have more lines per feature than hand-written code, so it overstates. The gap between that
estimate and what actually happened is not a measurement of what the skills did — see
[what these numbers show](#what-these-numbers-show-and-what-they-dont).

## Contribute

**Start with [CONTRIBUTING.md](CONTRIBUTING.md)** — what we take, where each kind of contribution goes (case, rule,
check, stack note, showcase), how to make it pass `npm test`, and what gets closed.

Found a false positive, a stack the tools don't read yet, or a lesson from your own project? Open an issue — the
[bug](https://github.com/kennetvn/nextcore-skills/issues/new?template=bug.yml),
[rule](https://github.com/kennetvn/nextcore-skills/issues/new?template=rule.yml) and
[lesson](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) templates ask for exactly what we
need: a bad example, a good example that must stay silent, and where it bit you. Good first contributions:

- run `slop-check` on your project and report anything it flags that is actually fine;
- add your framework to the [stack notes](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md);
- teach `token-audit` a token format it doesn't read yet (Style Dictionary / Tokens Studio JSON, Android `colors.xml`);
- add a case from your own stack to [cases/](cases/README.md) — Laravel, Django, Go and Rails are still empty.

Every accepted contribution is credited in the CHANGELOG and next to the rule it created
([details](CONTRIBUTING.md#how-contributions-are-credited)). Teams that run agents can also let them submit lessons
automatically ([lesson loop](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)).

[![Contributors](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## FAQ

<details>
<summary><b>Do I need Claude Code?</b></summary>

No. The skills are Markdown any agent can follow; the tools are Node scripts.

</details>

<details>
<summary><b>What is "Claude Design" in the docs?</b></summary>

Anthropic's canvas for drawing screens. You don't need it: the design tools
read plain `.html` mockups from any source.

</details>

<details>
<summary><b>Is my code sent anywhere?</b></summary>

No. Every tool reads local files and prints a report.

</details>

<details>
<summary><b>Where do the numbers come from?</b></summary>

From [homestaynextcore.org](https://homestaynextcore.org): its repository, CI and
production logs (the code is private). The rules are written so you don't need to know that product to use them.

</details>

<details>
<summary><b>What happened to `kennetvn/nextcore-design` and the old 147-skill catalogue?</b></summary>

The design repo was merged into
`plugins/nextcore-design` with its full history. The old catalogue (never measured on a real project) is kept at tag
[`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

</details>
## Credits

Written in our own words, with ideas learned from these MIT projects:
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) ·
[Nutlope/hallmark](https://github.com/nutlope/hallmark) ·
[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) ·
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) ·
[anthropics/skills](https://github.com/anthropics/skills) `frontend-design`.

## License

[MIT](LICENSE)
