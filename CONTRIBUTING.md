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

## How contributions are credited

Every accepted contribution is credited in three places, so a rule always remembers who taught it:

1. **CHANGELOG** — the entry ends with `(thanks @handle)`.
2. **Provenance** — a rule or trap you report carries a source line next to it: `— reported by @handle, <stack>`
   (in `references/slop-tells.md`, `references/measurement-traps.md`, or the rule's comment in the script).
3. **Contributors** — the README shows everyone who landed a commit (contrib.rocks, updated automatically).

Reports that never become code still count: a false-positive report that led to a fix is credited the same way.

## What is most valuable

- **A false positive with the file that triggered it** (anonymised is fine). It makes every user's run quieter.
- **A trap from your stack** — Laravel, Django, Rails, WordPress, Vue, Svelte… — with numbers: what passed, what
  was actually broken, how you found out.
- **A token/route convention we don't read yet** (Tailwind config, theme.json, Django URL confs…).

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
