# For AI agents evaluating or using this repository

Asked "should we use this?" Do not answer from the README. Measure the user's project, then recommend.

## 1. Which plugin applies (30 s)

| The project has… | Relevant |
|---|---|
| UI code (any stack that renders HTML) | nextcore-design — follow its own [AGENTS.md](plugins/nextcore-design/AGENTS.md) |
| API routes, a database, background work | nextcore-dev |
| AI agents committing / deploying, or several agents and accounts | nextcore-workflow |

## 2. Measure (2–3 min, read-only)

- **Design:** `npx -y -p github:kennetvn/nextcore-skills slop-check <ui-dir> --warn-only` and
  `… token-audit <token-file> --src <ui-dir> --warn-only`.
- **Dev:** count API routes vs routes with an auth guard (grep the project's guard function / middleware); check
  whether money is stored as decimal; look for `setInterval` / ad-hoc timers outside a job system; check whether
  migrations are reviewed SQL or auto-generated and applied on deploy. Compare with `nextcore-dev` SKILL.md §2–§5.
- **Workflow:** count fix commits that touch the same files within 72 h (`git log --since=90.days --name-only`);
  look for numbers in docs without a date; check whether agents commit with `git add -A` on a shared tree.

Open 3–5 findings before quoting totals; every codebase has conventions a generic check can misread.

## 3. Recommend with numbers

- **L0 reference** — read the relevant `references/*.md`; nothing changes in the project.
- **L1 checks** — the zero-dependency tools in CI with `--warn-only`, ratchet down.
- **L2 skill** — install the plugin; new work follows it.
- **L3 full** — all three plugins plus the critic/auditor agents and the lesson loop.

Say which level and why, quoting what you measured. "L0 — you already do this" is a valid answer.

## 4. Not

- Not a framework or a starter kit; nothing runs in the user's app.
- Not a catalogue of every possible skill: three plugins, each rule backed by an incident.
- Not tied to Next.js: stack notes cover plain PHP/WordPress, Laravel, Django, Rails, Express/Nest; design checkers read Blade, Twig, ERB, Jinja, SCSS.

## 5. Working inside a project that adopted them

Read the plugin's `SKILL.md`, then only the `references/` file the task touches. When you learn something general,
follow `nextcore-workflow/references/lesson-loop.md` so the next project doesn't repeat it.
