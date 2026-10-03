# Contributing

This repo grows from real incidents. A contribution is useful when it starts with "this happened, here is the number"
rather than "agents should probably…". This page says what we take, where it goes, how to make it, and what gets
closed — so the repo stays small, checked and worth reading.

Issues and discussions in Vietnamese are welcome; files in the repo are in English (the READMEs have a Vietnamese copy).

## 1. Pick the kind of contribution

| You have… | Open | It ends up in |
|---|---|---|
| a production incident or measurement trap, with numbers | a PR adding `cases/<slug>.md`, or a [lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) | [`cases/`](cases/README.md) |
| a rule an agent should follow (design, API contract, running agents) | a [rule issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=rule.yml) first | `plugins/<skill>/skills/<skill>/SKILL.md` or its `references/` |
| a checker that flags something correct, misses something wrong, or crashes | a [bug issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=bug.yml) or a PR with a fixture | the tool + `tests/fixtures/` |
| how the backend principles map to your framework | a PR to the stack notes | [`stacks.md`](plugins/nextcore-dev/skills/nextcore-dev/references/stacks.md) |
| a product built with the skills | a [showcase issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=showcase.yml) | [Built with these skills](README.md#built-with-these-skills) |
| a question or a loose idea | a [discussion](https://github.com/kennetvn/nextcore-skills/discussions) | — |
| a security problem in a tool | a private report, see [SECURITY.md](SECURITY.md) | — |

Not sure? Open a discussion. A new rule or a new tool should start as an issue so nobody writes code that gets
declined.

## 2. Where things go

```text
cases/                      one file per incident · taxonomy.json · TEMPLATE.md · README.md (index, generated)
plugins/<skill>/
  .claude-plugin/plugin.json  name + version of the plugin
  skills/<skill>/SKILL.md     what the agent reads first — short, ≤ ~200 lines
  skills/<skill>/references/  detail the SKILL links to (one topic per file)
  skills/<skill>/scripts/     zero-dependency Node tools (each listed in package.json "bin")
  tests/ (design) · tests/fixtures/   bad + good inputs for every check
tools/                      repo maintenance scripts (cases-index)
tests/hub.test.mjs          repo-wide checks: marketplace, links, privacy, cases, tools
```

Three skills, three scopes — put a rule in the one an agent would be reading when it matters:
**nextcore-design** (screens, tokens, drawings, review) · **nextcore-dev** (API contract, auth, data, jobs) ·
**nextcore-workflow** (several agents on one product: gates, diagnosis, numbers in docs, machine hygiene).

## 3. How to make each kind

**A case.** Copy [`cases/TEMPLATE.md`](cases/TEMPLATE.md) to `cases/<short-english-kebab>.md`. Fill the frontmatter
(`layer`, `area`, `kind`, `skill` from [`taxonomy.json`](cases/taxonomy.json); `stack` is free, lowercase, one word per
tool) and the five sections — Symptom · Cause · Fix · How to catch it · Rule. Numbers in Symptom and Fix. Then
`npm run cases` (rebuilds the index) and `npm test`. A layer or area that doesn't exist yet: add it to `taxonomy.json` in
the same PR with a one-line meaning.

**A rule.** Say where it bit you, then write it as one or two sentences an agent can follow. If it can be checked by a
script, the PR also adds the check. Put long explanations in `references/`, not in `SKILL.md`.

**A check or a tool change.** Zero dependencies, Node ≥ 18, works on Windows, macOS and Linux (CI runs all three).
Every new or changed check ships **two fixtures**: a bad input that fires and a similar good input that stays silent —
the false positive you expect to fight. A new tool also gets a `bin` entry, a header comment that `--help` prints, and a
line in the README tools table.

**A stack note.** One framework per PR: a new column in the §1 table (write `—` where you are not sure — a gap beats a
guess) and a paragraph of traps in §2, from a project you run.

**A bug fix.** The fixture that reproduces the bug comes first; the fix makes it pass.

## 4. What gets merged, what gets closed

Merged when it:
- comes from something that happened, with a number (count, size, time, before → after);
- changes one thing, and `npm test` is green;
- is checked where it can be (fixture, test, `--check`);
- keeps private data out (the privacy scan in `npm test` checks hostnames, IPs, emails, internal paths and ticket
  numbers — naming your own product and linking it is fine).

Closed, with the reason, when it is:
- advice without an incident ("agents should always…"), or a list of best practices copied from elsewhere;
- a new dependency, a framework port of a tool, or a rewrite nobody asked for;
- generated text that wasn't checked against a real codebase. AI-assisted PRs are welcome — this repo is about agents —
  but the numbers must be ones you measured;
- a duplicate of an existing rule or case (link the old one and improve it instead).

## 5. Commits, PRs and releases

- Branch from `main`, one change per PR. PR title says what changes: `token-audit: read Style Dictionary JSON`,
  `cases: nginx cached /api responses`.
- Add a line under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) (Added / Changed / Fixed), ending with
  `(thanks @you)` if you want the credit there.
- PRs are squash-merged, so the PR title becomes the commit — no need to tidy your branch history.
- Maintainers cut releases: they move *Unreleased* to a version, bump `package.json` and the touched plugin's
  `plugin.json`, and tag. Don't bump versions in a PR.
- Maintainers aim to answer new issues and PRs within a week. An issue waiting on the author for 30 days is closed; reopen
  it any time.

## 6. How contributions are credited

1. **CHANGELOG** — the entry ends with `(thanks @handle)`.
2. **Provenance** — a case or rule you reported keeps a source line: `— reported by @handle, <stack>`, plus your
   product's name and link if you want them there.
3. **Contributors** — the README wall (contrib.rocks) lists everyone who landed a commit.

A lesson issue that becomes a case or a rule is credited even if a maintainer writes the final text.

## 7. Run it locally

```bash
git clone https://github.com/kennetvn/nextcore-skills && cd nextcore-skills
npm test          # marketplace, SKILL frontmatter, dead links, privacy scan, cases + index, every tool's fixtures
npm run cases     # rebuild cases/README.md after adding or editing a case
```

On Windows, clone with `git -c core.longpaths=true clone …` — a few paths are long.
