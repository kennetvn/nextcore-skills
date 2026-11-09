# The trail: issue card, milestones, commit shape, definition of done

`github-workbench.md` is the cycle (claim → Received → Handoff). This file is what each step must contain so that a
person or an agent who was not there can pick the work up from the issue alone — and what a machine can check.

## Why it is written down

We measured our own trail over ~1,300 issues and the last 400 commits of three repos:

| What | Done by | Coverage |
|---|---|---|
| "Received" comment before the first commit | agent's conscience | 15% |
| "Handoff" with all four sections | agent's conscience | 33% |
| Issues with no label at all | — | 49% |
| Closed with an unchecked `- [ ]` that named no follow-up issue | — | 73 issues |
| Commits following the documented template | agent's conscience | 5–9% |
| Commit id, session id, rules-installed marker | a hook | ~100% |

Anything a machine fills is near 100%; anything left to conscience is under 35%. So the principle is:
**the machine fills the facts, the agent writes only the reasoning, a gate blocks what is missing.**

Agents had also converged, on their own, on a commit body better than the documented one (Problem / Root cause /
Fix / Measured). We rewrote the rule to describe what was already working instead of enforcing the old template.

## 1. Issue card — the top of every issue

```markdown
<!-- trail:card v1 -->
| Field | Value |
|---|---|
| Area | `area:web` · `area:db` · <main folder or file> |
| Type · Priority | `type:bug` · `p1` |
| Source | <who asked, where and when — a chat on dd/mm, a scan command, a customer ticket, a gate> |
| Created | dd/mm/yyyy · deadline <date> |
| Related | parent #… · replaces #… · regression of #… |
```

Five body sections under the card, in this order (an empty one says "none", never delete the heading):

1. **Current state** — a number measured in this session (command + result), not a remembered one.
2. **Evidence** — `file:line`, log lines, commits. No secrets or personal data (point to `file:line`).
3. **Root cause** — proven, or "unknown — hypothesis: …" (then the first slice is the diagnosis).
4. **Done when** — `- [ ]` items, each a command and its expected result. No command ⇒ not a task yet.
5. **Out of scope** — what is easy to drag in but not done here (with `#n` if it already has an issue).

An issue touching more than 3 areas is too big: split it before anyone claims it. Create a missing label before
`gh issue create`, or the whole command fails.

## 2. Milestones — one comment each, with a marker a machine can read

```markdown
**<Milestone>** · #<n> · dd/mm/yyyy HH:MM · <machine> · <model>
<!-- trail:milestone=<code> v1 [status=done|partial] [result=pass|returned] -->
```

| Milestone | When | The agent writes |
|---|---|---|
| **Received** | before the first line of code | understanding (and the assumption chosen for anything vague) · plan in slices · done when · risks |
| **Progress** | after every push; after 2 hours with no slice done; when scope changes | what is done (sha) · the next step as a file or command |
| **Blocked** | blocked, or a number already reported turns out wrong | blocked by what · what was tried · what is needed · numbered options |
| **Handoff** | before releasing the claim, closing, or ending the session — also half-way | the four sections below |
| **Cross-check** | high-risk work, before closing | a different agent re-runs each "done when" with its own commands |
| **Closed** | after Handoff | one-line reason (done · duplicate · won't do · moved) |
| **Follow-up** | 7 days after closing | re-run the "done when" commands; a regression re-opens the issue |

Why "Progress after every push": sessions die mid-task. One afternoon, 14 tasks lost their terminal within 40 minutes,
their locks stayed, and 0 of them had a comment — the next agent restarted each from scratch. The last line on the
issue must be enough to continue.

### Handoff — four sections, always

```markdown
**Handoff** · #12 · 05/11/2026 03:58 · build-box · <model> · **Done**
### Done
- `<repo>@<sha>` <commit subject> — <effect>   (0 commits ⇒ "0 commits — operations work")
### Evidence
| Done-when item | Command → result |
### Not done → moved
- <item> → #<n>   (or "none")
### Risk + rollback
- <what is left> · rollback: `git revert <sha>` / the exact steps
```

- `status=partial` adds **Next person starts at:** <file or command>.
- Evidence is a command and its real output ("12/12", "HTTP 200", "3.2 s → 0.8 s"), never an adjective. A test that is
  already red on the untouched trunk is written as such: "red before this change, ran on the original code".
- Code that runs on users' machines is **done** only when a release containing the sha is installed there; before
  that it is `partial` — "waiting for a release containing <sha>".
- Order at the end of a session: Handoff comment → release the claim → only then print "done" to whoever dispatched
  you. Printing first and losing the terminal leaves a "done" with no trace.

## 3. Commit shape

```text
{type}({area}): #<n> {summary, at most 72 characters, no trailing period}

Problem: <measured symptom — who saw it, how many>
Root cause: <proven cause, file:line>                ← required for fix
Fix: <what changed; bullets when several>
Measured: `<command>` → <real output>                ← required for fix · feat · perf
Risk·Rollback: <what is left> · rollback: git revert <sha>

Issue: #<n>
```

- Light commits (a typo, one docs or chore file) need only the subject. Anything that changes behaviour gets the body.
- A field that genuinely does not apply is dropped, not filled with "N/A". **Measured holds only what actually ran**;
  if nothing ran, write `Measured: not run — <why>`. An honest gap is useful; an invented "tested" is not.
- One commit, one logical change. Stage explicit paths (`parallel-agents.md`).
- A submodule pointer bump has a fixed shape so it can be traced back: `chore(bump): #<n> <repo> <sha7> — <subject of
  the original commit>`. Bump only for your own commits, and only forward (`git merge-base --is-ancestor old new`).

`scripts/commit-trail.mjs` enforces this as a `commit-msg` hook and measures coverage over any range
(`--range origin/main..HEAD`, `--strict` in CI). Run the report first: it tells you where your history stands before
you turn the gate on.

## 4. Definition of done — six points, not negotiable near a deadline

An issue closes only when all six hold:

1. Every `- [ ]` is ticked **with evidence**, or moved to a numbered child issue with a technical reason.
2. The root cause is fixed (diagnose first when it is unknown) **and** something blocks a recurrence: a test that
   turns red when the fix is removed, or a gate.
3. Measured on what real users use: production after the deploy reports *completed*, the release build of the app,
   the real third-party platform — not only mocks.
4. It reached users: deployed, released, installed.
5. Handoff comment posted.
6. Closed through a check that refuses open items (`issue-claim release --close`).

### Shortcuts that count as sloppy work

- Skipping, disabling or loosening a test, gate or hook to meet the deadline.
- Ticking an item before measuring it; measuring on fake data and reporting "checked on real"; a screenshot instead of
  a number.
- Splitting off a child issue only so the parent can close on time, with the hard part pushed away without a reason.
- Closing as "won't do" or "duplicate" before reading every related comment and commit.
- Fixing the symptom (a try/catch that swallows, hiding a button, a longer timeout) instead of the cause.

### Bypassing a gate — only when the gate is wrong, with evidence

We once found 56 bypasses and 0 approvals: "never bypass" was ignored because at least three in four were false reds.
So split it:

| Allowed | Condition | Do |
|---|---|---|
| The gate is red falsely | at least one proof: the same gate is also red on a clean checkout of trunk, or a measured environment difference (worktree without dependencies, gate reading the shared tree) | bypass with the reason in the environment + open an issue to fix the gate; every bypass is appended to a log (when, which gate, reason, sha) |
| Forbidden | to meet a deadline · the gate is right about your change · no gate-fix issue | fix what the gate reports |

Read the bypass log weekly: the gate at the top is the next one to fix.

## 5. Rolling out a new gate

Every new trail gate runs **7 days in warning mode** (label or comment, no block), then blocks once the weekly
coverage report shows the target (for us: Received ≥ 95%, complete Handoff ≥ 90%, closes with unmoved items 0,
fixes with Root cause + Measured ≥ 90%). A gate switched on cold against a 5% baseline gets bypassed, not obeyed.

## 6. Deadline rhythm (48 hours, at most one day of work per issue)

| When | What |
|---|---|
| Creating | one day of work or less, measurable "done when"; bigger ⇒ split now, not by whoever picks it up |
| Hour 0 | claim + Received; read the known traps for the area before the first line |
| Working | one terminal = one issue, continuously; commit + push per slice; release what is done |
| 24 h | under half-way ⇒ comment the risk and change direction or split |
| 48 h | not done by the six points ⇒ **do not close sloppily**: comment "Overdue" with the measured reason, what is done, and the remaining plan with times |

The clock stops only for the three physical-world blockers (OTP / personal secret, real money, a pure business
decision) — asked in the one decision inbox, while work that does not depend on the answer continues.

**Concentrate, don't scatter.** One machine per issue leaves many issues half-done at once, all hitting the deadline.
Put several workers on one issue's slices (with "blocks" relations in the right order) and let its slices go before a
new issue's.
