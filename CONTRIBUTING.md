# Contributing

This repo grows from real incidents. A contribution is most useful when it starts with "this happened, here is the
number" rather than "agents should probably…".

## Ways to contribute

- **A lesson** — open a [lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml):
  what happened (with numbers), why, the rule you would teach an agent, your stack.
- **A stack note** — how a rule in `nextcore-dev/references/stacks.md` maps to your framework (Laravel, Django,
  Rails, Spring, Go, .NET…), checked on a real project.
- **A correction** — a rule that is wrong or too absolute for some stack. Say where it broke.
- **Your product** — add it to [Built with these skills](README.md#built-with-these-skills) with a
  [showcase issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml) or a PR to that table.
- **Design rules and checkers** live in [nextcore-design](https://github.com/kennetvn/nextcore-skills/tree/main/plugins/nextcore-design).

## How contributions are credited

1. **CHANGELOG** — the entry ends with `(thanks @handle)`.
2. **Provenance** — a lesson you report keeps a source line next to it: `— reported by @handle, <stack>`, plus your
   product's name and link if you want them there.
3. **Contributors** — the README wall (contrib.rocks) lists everyone who landed a commit.

A lesson issue that becomes a rule is credited even if a maintainer writes the final text.

## Ground rules

- Each lesson reads **what happened (numbers) → why → rule**. No numbers, no lesson — keep it as a discussion.
- Keep private data out: no IPs, emails, people's names, customer data, internal paths or internal issue numbers.
  Naming your own product and linking it is welcome — that is your choice, not a requirement.
- Keep `SKILL.md` lean (≤ ~200 lines); detail goes to `references/`.
- Tools stay zero-dependency (Node ≥18) and ship with tests that prove they fire on a bad case and stay silent on a good one.

## Workflow

```bash
git clone https://github.com/kennetvn/nextcore-skills && cd nextcore-skills
npm test          # marketplace consistency, SKILL frontmatter, dead links, privacy scan, doc-drift
```

One change per PR; update `CHANGELOG.md` under *Unreleased*.
