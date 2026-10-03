# For AI agents — evaluate, install, use

You were most likely given this link by a person. Find which of these they asked, and go to that section:

| They said something like… | Do |
|---|---|
| "is this useful for my project?" / "should we use this?" | §2 measure, then §3 recommend — not from the README |
| "install this" / "set this up for me" | §1 install (one command), then tell them what changed |
| "measure it, then install what fits" | §2 → §3 → §1 with `--skills` set to exactly the skills you recommended |
| "use these skills on this task" | §4 — size the task, open one file, follow it |

Everything here needs only Node ≥ 18. Nothing runs inside the user's app, and the tools send nothing anywhere.

## 1. Install — one command, for the agent you are

Run it from the project root. It copies the skills where your harness reads them, never touches the user's own files
(it stops with `conflict:` instead), and running it again only updates.

| You are | Command | Writes |
|---|---|---|
| Claude Code | `npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent claude` | `.claude/skills/nextcore-*/`, `.claude/agents/design-*.md` |
| Cursor | `… nextcore-install --agent cursor` | `.cursor/rules/nextcore-*.mdc` + `.nextcore/` |
| Codex | `… nextcore-install --agent codex` | a marked block in `AGENTS.md` + `.nextcore/` |
| Gemini CLI | `… nextcore-install --agent gemini` | a marked block in `GEMINI.md` + `.nextcore/` |
| GitHub Copilot | `… nextcore-install --agent copilot` | a marked block in `.github/copilot-instructions.md` + `.nextcore/` |
| Windsurf | `… nextcore-install --agent windsurf` | `.windsurf/rules/nextcore-*.md` + `.nextcore/` |
| anything else | `… nextcore-install --agent generic` | `.nextcore/` only — point your rules file at `.nextcore/<skill>/SKILL.md` |

- Only some skills: `--skills design`, `--skills dev,workflow` — valid values `design`, `dev`, `workflow` (the
  `nextcore-` prefix is optional; anything else exits 2 and names the bad value). Preview first: `--dry-run`.
- Claude Code: `--skills design` also installs the `design-critic` and `design-auditor` subagents into
  `.claude/agents/` (one copy; that is the one to edit).
- Which skills fit — decide from the project, not by default: UI code → `design`; API routes, a database, background
  work → `dev`; agents that commit, deploy or work in parallel → `workflow`.
- Verify twice: the files run (`node <install dir>/nextcore-design/scripts/spec-check.mjs --help` prints its usage),
  **and** your harness sees them — Claude Code lists project skills in a new session (`/skills`), Cursor shows the
  rules under Settings → Rules. If it doesn't, say so; a restart of the session is usually needed.
- Then tell the person in two or three lines what was written and which skill applies to what. Suggest committing the
  files so every agent on the project gets them.
- No network for `npx`? `git clone https://github.com/kennetvn/nextcore-skills` and run
  `node nextcore-skills/tools/nextcore-install.mjs --agent <you> --dir <project>`.
- A person using Claude Code can also install by hand: `/plugin marketplace add kennetvn/nextcore-skills`, then
  `/plugin install nextcore-design@nextcore`. You cannot type those slash commands for them — use the command above.

## 2. Measure (2–3 min, read-only)

Nothing is installed yet, so read the rules from GitHub: [design](https://raw.githubusercontent.com/kennetvn/nextcore-skills/main/plugins/nextcore-design/skills/nextcore-design/SKILL.md) ·
[dev](https://raw.githubusercontent.com/kennetvn/nextcore-skills/main/plugins/nextcore-dev/skills/nextcore-dev/SKILL.md) · [workflow](https://raw.githubusercontent.com/kennetvn/nextcore-skills/main/plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md).

**Read the summary line, not the exit code.** With `--warn-only` every tool exits 0 even when it found errors — the
last line (`slop-check: 9 finding(s), 4 error(s)`) is the result.

- **Design:** `npx -y -p github:kennetvn/nextcore-skills slop-check <ui-dir> --warn-only` and
  `… token-audit <token-file> --src <ui-dir> --warn-only`. `<token-file>` is the file that defines the colour
  variables — `:root { --… }` blocks, SCSS `$vars`, Tailwind v4 `@theme`, `tailwind.config.js` or WordPress
  `theme.json` (Next.js App Router: usually `app/globals.css`). None found? Say "no tokens" — that is a finding too. If the project keeps drawings or specs:
  `… spec-check <drawings-dir>` (a drawing with no written problem or job shows up as `missing-spec`).
  Stack-by-stack hints (where tokens and routes live): [plugins/nextcore-design/AGENTS.md](plugins/nextcore-design/AGENTS.md).
- **Dev:** count API routes vs routes with an auth guard (grep the project's guard function / middleware); check
  whether money is stored as decimal; look for `setInterval` / ad-hoc timers outside a job system; check whether
  migrations are reviewed SQL or auto-generated and applied on deploy. Compare with `nextcore-dev` SKILL.md §2–§5.
- **Workflow:** count fix commits that touch the same files within 72 h (`git log --since=90.days --name-only`);
  look for numbers in docs without a date; check whether agents commit with `git add -A` on a shared tree.

Open up to 5 findings (all of them if there are fewer) before quoting totals; every codebase has conventions a
generic check can misread.

**When a measurement can't run, say so and why — don't guess:** no git history → workflow not measurable yet
(recommend later); no drawings or specs → skip `spec-check`; a dependency with no schema or config (e.g. an ORM with
no models) → UNKNOWN, and name the rule that will matter once it exists.

## 3. Recommend with numbers

- **L0 reference** — read the relevant `references/*.md`; nothing changes in the project.
- **L1 checks** — the zero-dependency tools in CI with `--warn-only`, ratchet down.
- **L2 skill** — install (§1) the skills that fit, with `--skills`; new work follows them.
- **L3 full** — `nextcore-install` with all three skills (the default), plus the lesson loop.

Levels are per skill: "design L2, dev L2, workflow L0" is a normal answer.

Say which level and why, quoting what you measured. "L0 — you already do this" is a valid answer.

## 4. Use — after install

1. **Size the task** — TRIVIAL · SMALL · MEDIUM · LARGE · PRODUCT_CHANGE · SYSTEM_CHANGE
   (`nextcore-workflow/references/task-sizing.md`). The size decides how much of the rest applies; a typo needs none.
2. **Open one SKILL.md**, then only the `references/` file it points to for this task:

| Task | Open | Before saying done |
|---|---|---|
| new screen or redesign (MEDIUM+) | `nextcore-design/SKILL.md` §2 → `references/product-discovery.md` → `templates/spec.md` | `spec-check`, `design-card`, and `templates/validation-report.md` |
| small UI change | `nextcore-design/SKILL.md` §1 (no drawing needed) | `slop-check` on the changed files |
| API, data, auth, jobs | `nextcore-dev/SKILL.md` → the matching `references/` file | the contract table filled; auth counted |
| a bug fixed twice already | `nextcore-workflow/references/diagnose-before-patch.md` | a diagnosis note before the third fix |
| several agents on one repo | `nextcore-workflow/references/parallel-agents.md` | commits scoped to your own files |

3. Write unknowns as UNKNOWN / ASSUMPTION and keep going. Ask the person once, and only when the answer changes the
   architecture, a business rule, permissions or the user flow.

## 5. Not

- Not a framework or a starter kit; nothing runs in the user's app.
- Not a catalogue of every possible skill: three skills, each rule backed by an incident ([cases/](cases/README.md)).
- Not tied to Next.js: stack notes cover plain PHP/WordPress, Laravel, Django, Rails, Express/Nest, FastAPI, Go; the
  design checkers read Blade, Twig, ERB, Jinja, SCSS and any HTML template.

## 6. Learned something general?

Follow `nextcore-workflow/references/lesson-loop.md`, or open a
[lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) with the numbers — that is
how the next project avoids it.
