# Contributing

Thanks for helping. This project is small on purpose: a skill (Markdown) and three zero-dependency Node scripts.

## Ground rules

- **No dependencies.** Scripts must run with a plain `node` ≥18, offline.
- **Every rule is tested both ways.** A new check ships with a *bad* fixture that must trigger it and a *good*
  fixture that must stay silent (`tests/fixtures/`). `npm test` must stay green.
- **False positives are bugs.** If a check flags something correct (a token block, a fallback, a logo, a format
  hint), add that case to the good fixtures and fix the check — don't just document it.
- **Real stories over opinions.** A proposed slop rule or measurement trap should say where it bit you and what it
  cost. Taste-only rules ("I don't like serifs") belong in your own fork.
- **Keep the skill lean.** `SKILL.md` stays under ~200 lines; detail goes to `references/`.

## Workflow

```bash
git clone https://github.com/kennetvn/nextcore-design && cd nextcore-design
npm test                                   # node --test, no install needed
node skills/nextcore-design/scripts/slop-check.mjs path/to/your/app --warn-only   # try it on real code
```

1. Open an issue first for new rules or behaviour changes (templates provided).
2. One change per PR. Update `CHANGELOG.md` under *Unreleased*.
3. Run the checker on at least one real codebase and paste the before/after counts in the PR.

## Style

- Plain English, short sentences, no marketing words. Numbers beat adjectives.
- Code: ES modules, no compile step, comments explain *why*.
