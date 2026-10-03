# nextcore-skills

**Skills from a real product, not a demo.** Three Claude Code plugins distilled from a production booking platform
that AI coding agents built and still run every day — paying customers, ~230 pages, ~740 API routes, 10 browser
extensions, several agents working in parallel, two AI accounts taking turns. Every rule here exists because the
opposite happened and was measured.

[![License: MIT](https://img.shields.io/badge/license-MIT-0293DA.svg)](LICENSE)
[![test](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml/badge.svg)](https://github.com/kennetvn/nextcore-skills/actions/workflows/test.yml)
[Tiếng Việt](README.vi.md)

| Plugin | For | What it gives an agent |
|---|---|---|
| [**nextcore-design**](https://github.com/kennetvn/nextcore-design) | anyone shipping UI | spec + information hierarchy first, draw before code (5 states × 3 widths), a separate critic agent, and 4 zero-dependency checkers: `slop-check`, `token-audit`, `design-card`, `design-review` |
| [**nextcore-dev**](plugins/nextcore-dev/skills/nextcore-dev/SKILL.md) | backend / full-stack | the contract that makes design and code meet: field map → API shape → UI state signal; auth on every route; money, migrations and production data changes; background jobs; 14 backend traps; notes for Next.js, Laravel, Django, Rails, Express/Nest |
| [**nextcore-workflow**](plugins/nextcore-workflow/skills/nextcore-workflow/SKILL.md) | whoever runs the agents | diagnose before the third patch; evidence before "done"; parallel agents without collisions; several AI accounts; decisions live on issues; docs that expire (`doc-drift`); a lesson loop back to this repo |

Design and development are two halves of one contract: `nextcore-design` writes the field map in `spec.md`,
`nextcore-dev` turns it into an API contract and the backend rules that keep it true, `nextcore-workflow` keeps the
agents doing both honest.

## Install

```bash
# Claude Code
/plugin marketplace add kennetvn/nextcore-skills
/plugin install nextcore-design@nextcore
/plugin install nextcore-dev@nextcore
/plugin install nextcore-workflow@nextcore
```

Other agents (Cursor, Codex, Windsurf, Gemini CLI, Copilot): copy the `SKILL.md` you need into your rules file
(`.cursor/rules/*.mdc`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`) and keep its `references/`
folder next to it. The tools are plain Node ≥18 scripts with no dependencies.

## Which one first?

| You are… | Start with |
|---|---|
| a solo dev whose UI keeps getting re-patched | nextcore-design, L1: run `slop-check` + `token-audit` with `--warn-only` |
| a backend dev handed mockups | nextcore-dev → `references/handoff.md` and `references/api-contract.md` |
| a PHP / Laravel / Django / Rails team | nextcore-dev `references/stacks.md`; nextcore-design checkers read Blade, Twig, ERB, Jinja and SCSS |
| running several agents or CLIs on one repo | nextcore-workflow → `references/parallel-agents.md` |
| an agent asked "is this useful for my project?" | [AGENTS.md](AGENTS.md) — measure the project first, then recommend a level |

## How it grows

Lessons come from real work, not from brainstorming:

1. An agent on a real project hits something general — a trap, a false "done", a rule that would have saved a day.
2. It writes the lesson down with an anonymised English section and a flag (`community: true`).
3. A script at session start notices the flag, filters out anything private, and opens a **lesson** issue here.
4. A maintainer turns it into a rule — with a bad example that must trigger and a good one that must stay silent —
   or closes it with the reason.

The loop is described in [`nextcore-workflow/references/lesson-loop.md`](plugins/nextcore-workflow/skills/nextcore-workflow/references/lesson-loop.md)
so any project can run it. You can also open a [lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) by hand.

Contributors are credited in the CHANGELOG, next to the rule they taught, and on the contributors wall:

[![Contributors](https://contrib.rocks/image?repo=kennetvn/nextcore-skills)](https://github.com/kennetvn/nextcore-skills/graphs/contributors)

## About the previous version

Until 2026-10 this repository held "NEXTCORE-SKILLS v3", a broad catalogue of 147 skills across 10 IDEs, written in a
single day and never measured against a real project. It was replaced by these three evidence-backed plugins. The old
tree is preserved at tag [`legacy-v3.0.1`](https://github.com/kennetvn/nextcore-skills/tree/legacy-v3.0.1).

## License

[MIT](LICENSE)
