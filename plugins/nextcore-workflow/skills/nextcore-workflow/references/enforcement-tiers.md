# Enforcement tiers

## The problem

A rule an agent must remember is a rule it will forget under load. We had ~30 rule files,
3,761 lines, loaded or re-read on every task. Agents spent reasoning on checks a regex could do,
and still let the unguarded rules slip to production.

## Two tiers

**Tier 0 — gated.** If a machine can decide it, make it a gate:

- PreToolUse hook on Write/Edit (rejects the write before it lands, prints the reason)
- pre-commit validator (rejects the commit)
- pre-push quality gate (typecheck + unit tests + build)
- the same checks again in CI, so `--no-verify` on a laptop is not a bypass

Examples that fit: no hex colors outside the token file, approved fonts only, class naming,
auth helper present on every API route, fixed response shape, no `transition: all`, no
`setInterval` outside the job system, keyboard handlers on clickable non-buttons, a loading +
error + metadata file next to every page.

Agents write naturally. When blocked, they read the reason and the matching rule file, then fix.
Nobody pre-reads Tier 0 rules.

**Tier 1 — reasoned.** No gate, so mistakes reach production. Read the rule file when the task
touches it: git/deploy, prod data changes, scope of a change, money flows, schema migrations,
form and error patterns, resource budgets.

Keep one always-loaded page that says which is which. Everything else is on-demand reference.

## Baselines: gates on old debt

A gate added to a codebase with existing violations needs a baseline:

- `--report` prints current count; `--write-baseline` stores it.
- The gate fails only if the count **goes up**. It may only go down.
- Store the count with a dated marker (see `living-docs.md`) so drift is visible.

## Bypass

One environment variable, for emergencies only, and the human is told. If the bypass is used
twice for the same gate, the gate is wrong or the rule is wrong — fix one of them.

## Fail closed

A hook that cannot determine its scope must run, not skip. We had a pre-push hook comparing
against a branch that no longer existed, followed by `|| true`. It silently passed everything.
Same incident class: a CI trigger pointing at a branch name that did not exist — CI simply never
ran, with no error anywhere. A dead self-hosted runner produces the same silence; one CI outage
went unnoticed for 6 days. Alert on "no run" as well as on "failed run".

## Test every new gate in both directions

- **Forward:** run on current code. It must not raise false alarms (exit 0 when all is right).
- **Reverse:** plant a real, known violation. It must fail, and name the right file and rule.

Forward alone proves nothing. Our "third patch" gate:

| Version | Forward | Reverse | Bug |
|---|---|---|---|
| 1 | green | **green (wrong)** | `git log` without `--follow`: saw 1 commit, real count 166 |
| 2 | green | **green (wrong)** | `--follow` added, but read file content at the *new* path |
| 3 | green | red, correct name | read content at the path that existed at each commit |

Forward was green all three times.

## Before trusting an existing gate, make it red

What happened: we needed to know if dead sidebar links were guarded. A test file was named
roughly "sidebar matches routes". We planted a link to a non-existent route and ran it plus 4
related suites: **44/44 green**. The test actually checked "exactly one item is highlighted".
Then we measured: 95 links, 0 dead — so a new gate could start at zero, no baseline needed.

Why: a file name is chosen by its author, not a contract. A list of well-named tests is the
easiest way for a whole codebase to believe it is protected.

Rule: plant the violation you fear, run the gate, see red, restore byte-for-byte, see green.

## Comments that point at gates

What happened: a comment said "keep this value — guarded by test X". Test X had 0 lines
touching that value; it guarded a different layer (URL access, not menu visibility).

Why: a comment pointing at a gate is worse than no comment. Without it, the next person checks.
With it, they trust and change.

Rule: before writing "guarded by X", open X and find the exact string you forbid. Not there →
extend the test (usually two `expect` lines) or correct the comment.

## Source-reading tests

Tests that `readFileSync` a source file and regex it are cheap and often right (the invariant is
about code shape). They fail in two specific ways:

1. **Character-count windows** (`slice(start, start + 5000)`) run past the block and match the
   same string in the next branch. Green while the code under test was broken. Cut at the
   closing brace instead.
2. **Regex matches comments**, including the comment that explains the old bug. One test went red
   on correct code because the explanatory comment above it contained the old pattern. Strip
   comments before matching.

Both were found only by the reverse test.
