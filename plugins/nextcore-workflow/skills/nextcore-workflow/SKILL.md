---
name: nextcore-workflow
description: Operating rules for AI coding agents that build and run a real product — use when setting up or running agents that commit, deploy, measure, or work in parallel (several CLIs, several AI accounts), or when an agent is about to claim "done", patch the same bug again, trust a zero, or ask a human a question.
---

# nextcore-workflow

How to run AI coding agents on a real product without them lying to you or stepping on each other.

Distilled from a production booking platform built and run by AI coding agents: Next.js, ~230 pages,
9 browser extensions, several agents in parallel on one working tree, two AI accounts taking turns.
Every rule below exists because the opposite happened and was measured.

Each lesson reads: **what happened (numbers) → why → rule.**

---

## 1. Enforce in tiers: gates for what a machine can check, reasoning for the rest

Agents forget rules. A rule that a hook can check should be a hook, not a paragraph.

- **Tier 0 (gated):** colors, fonts, class names, auth on every API route, response shape, no
  `setInterval` outside the job system, page loading/error/metadata triad. A pre-commit or PreToolUse
  hook rejects the write and prints the reason. Agents write naturally; the gate teaches when wrong.
  **Do not spend reasoning pre-checking these.**
- **Tier 1 (reasoned):** git/deploy flow, data changes on prod, surgical scope, money flows,
  migrations. No gate, so a mistake reaches production. **This is where reasoning budget goes.**
  Read the rule file only when the task touches it.
- Keep the always-loaded rule text small (one page). Ours was 3,761 lines; agents re-read it every
  task and still missed things. Now one page plus an on-demand catalog.

**A new gate must be tested in both directions** before you trust its green:
forward (current code → no false alarm) and reverse (plant a known violation → it fails, naming it).
Our "third patch" gate passed forward three times while being blind; only the reverse test showed it
saw 1 commit where there were 166. Details: `references/enforcement-tiers.md`.

## 2. Diagnose before you patch

90 days of git: 3,525 commits, **473** extension releases, **2** commits that said "root cause".
One feature took **11** releases; releases 5–9 patched symptoms, release 10 found the real bug
(reading the wrong GraphQL field). Each round trip cost 5–15 minutes of bump → publish → wait → read logs.
Agents were *testing hypotheses by shipping*.

Rule: **the third patch to the same spot within 72 hours is blocked** until a diagnosis note exists with:
1. **Measured symptom** — a number, where it was read, the query.
2. **Hypothesis + how to refute it** — a hypothesis you cannot disprove is a hunch.
3. **On-site observation** — did you look at the live thing, or only reason from code?

Enforce it, don't just write it: `scripts/third-patch.mjs` as a pre-commit hook counts `fix:` commits per staged file
in the last 72 h (following renames) and refuses the third one until `docs/diagnosis/<area>.md` names the file and has
the three sections. `echo 'node path/to/third-patch.mjs' > .git/hooks/pre-commit`.

Early warning in commit messages: "still", "again", "attempt 2", "revert". Details: `references/diagnose-before-patch.md`.

## 3. Evidence before assertion

- "Done" means: ran the command, read the output, saw the number. Not "should work".
- Before trusting a **zero**, run the same measurement on something that certainly exists (positive control).
- Before trusting "no change", prove the intervention actually applied.
- A number that is **too clean** (0, 100%, exactly the `limit`) → suspect the tool first, the code second.
- Find a **second, independent** measurement for any conclusion that triggers an action.
- All gates green does not mean the product is good: content and ordering bugs pass every check.

Twelve measurement traps with real numbers: `references/measurement-discipline.md`.

## 4. Autonomy: do plan A, stop only for the physical world

Default: **act and close.** If you analyzed the problem and have a recommended plan A that is
recoverable (git, tests, backups), execute it. Do not hand the human a menu. The human is often
not an engineer; a question costs them more than a reverted commit costs you.

Stop only for three things outside the codebase:
1. **OTP / MFA / personal secrets** — scanning a QR with a personal phone, bank codes, console logins.
2. **Real money** — paying for a domain, topping up hosting, real transfers.
3. **Pure business decisions** — listed prices, commission rates.

Questions go to **one inbox** (a single pinned issue), never scattered across comments.
Everything technical — code, schema, UI, refactors, performance — the agent decides and owns.
Details: `references/autonomy-and-issues.md`.

## 5. Many agents, one tree

The real risk is not waiting on each other. It is the **shared git index**.

- **Claim** an issue plus a file area before starting. A free lock does not prove nobody is working:
  check the latest issue comments and the last 3 hours of commits, and ask the other session.
- **Commit with explicit paths.** Never `git add -A` / `git add .` — it swallows other sessions' work.
- Pathspec protects *files*, not *hunks*: a shared file can hold another session's half-finished
  edit. Read `git diff HEAD -- <file>` before committing a shared file.
- `git pull --rebase` before every push. One trunk. Deploy only through CI.
- Long or risky work → a worktree **inside** the repo on the same branch. No new branches.
- Other sessions' uncommitted files: leave them. No reset, checkout, stash, or committing for them.
- Ask other agents by message. Do not guess what they are doing.

Details: `references/parallel-agents.md`.

## 6. Several AI accounts

Anything bound to an account (artifacts, canvases, shared pages) is a **projection**; the original
lives in the repo. Accounts switch mid-session: one session switched 3 times, and a batch of 8 reads
all failed "not found" only because the account changed. Many "not found" at once → check which
account you are on before concluding something was deleted. Details: `references/multiple-ai-accounts.md`.

## 7. The issue tracker is the only place decisions live

Findings not acted on now, scope changes, deferrals → an issue or comment **in the same session**.
A local plan file is not a decision record. Do not close an issue with unchecked acceptance criteria
unless each one says which issue it moved to. We closed one at 0/5 criteria with 26 UI commits and
zero designs, because the scope change lived only in a local plan.

## 8. Documentation has an expiry date

Numbers in rules go stale. In one session we found 4 docs that had drifted from the code; 3 made
agents do wrong or redundant work (an old color palette, "pay down debt" already paid,
"76 routes without auth" when the real count was 0).

- Every number in a rule carries a marker: `<!--measure: name=value @YYYY-MM-DD-->`.
- A script re-measures every marker at session start and reports drift; silent when clean: `scripts/doc-drift.mjs --quiet` (commands in `doc-drift.json`; `--update` rewrites drifted markers; `--strict` for CI).
- Memory: **one file, one fact**, with why and how to apply. The index is one line per entry and
  must fit the loader's limit; a 68 KB index once lost 143 of its 305 lines to silent truncation.

Details: `references/living-docs.md`.

## 9. Surgical changes

Every changed line must trace to the request. Do not improve adjacent code, comments, or formatting.
Remove only orphans **your** change created; mention other dead code, do not delete it.
Counter-examples we lived through: fixing a layout bug by inventing a sidebar nobody asked for;
renaming variables in 5 files while fixing one endpoint.

A "wrong" status label that blocks no live repair path is bookkeeping debt, not a bug. Fixing it is
an unrequested change. Measure whether anything is actually stuck before patching.

## 10. Lessons flow back to the community

When an agent learns something general, it flags it, writes an anonymized English section, a script
opens a public issue, and a maintainer turns it into a rule with a two-way fixture.
Mechanism: `references/lesson-loop.md`.

---

## 11. The agent recovers its own tools

A dead browser MCP, piled-up Node processes, a CLI eating RAM: measurable states with known fixes. Run the fix,
verify, continue; never "please check your browser". Drop-in scripts: `references/machine-hygiene.md`.

## Kill-list

| Never | Instead |
|---|---|
| Ship to find out if the fix works | Observe on site first; ship when you know why it is right |
| Third patch to the same spot | Write the diagnosis note |
| Trust a zero | Positive control on a known-present case |
| "No change" without proof it applied | Measure the intervention itself in the same run |
| Trust a gate because its name sounds right | Make it red first |
| Comment "guarded by test X" without opening X | Grep X for the exact thing you forbid |
| Mark "processed" before the attempt | Mark after a result, or after the retry budget is spent |
| `git add -A` on a shared tree | Explicit paths; read the diff of shared files |
| New branch per agent | One trunk, worktrees on the same branch |
| Deploy from a laptop | CI from trunk, serialized |
| Ask the human to choose between options | Execute plan A, record the assumption on the issue |
| Questions in random comments | One inbox issue |
| Decisions in a local plan file | Issue comment, same session |
| Close an issue with open criteria | Move each to a named issue first |
| Numbers in docs without a date | Marker + re-measure script |
| "Not found" × N → "it was deleted" | Check which account you are on |
| Retry an action the harness says needs a human | Hand the human a list |
| Refactor while fixing | Mention it; fix only what was asked |
| Idle because "my lane is done" | Read open issues with zero comments first |
