# GitHub as the agents' workbench

Agents that report in chat leave nothing behind. The next session, another machine, or the human opening the repo
tomorrow sees only what is on the issue. So every step of the work cycle writes to the issue: claim, plan, evidence,
handoff, what moved where. This file is the cycle; two scripts make the mechanical parts one command.

## Set the repo up once — `github-bootstrap`

```bash
npx -y -p github:kennetvn/nextcore-skills github-bootstrap --dry-run   # see the plan
npx -y -p github:kennetvn/nextcore-skills github-bootstrap             # apply; re-running adds only what is missing
```

- **Labels:** `status:todo · status:in-progress · status:blocked · status:review`, `p0`–`p3`, `bug · task · lesson`,
  `needs-human`, `decision-inbox`. Existing labels with the same name (any case) are kept.
- **Issue forms** `.github/ISSUE_TEMPLATE/{bug,task,lesson}.yml`: a bug asks for the *measured* symptom; a task asks
  for "done when" as a checklist of at most 8 items; a lesson asks for the rule and the check that enforces it.
- **PR template** with `Closes #`, an Evidence section and "Moved elsewhere".
- **One pinned "Decision inbox"** issue. Questions for the human go there as one comment each, never scattered.
- Files are written into the working tree and never overwrite yours; commit them with an issue number.

## The cycle for one issue

### 1. Claim before the first line of code — `issue-claim`

```bash
issue-claim status 12                         # exit 0 free, 3 held (prints who, until when)
issue-claim claim 12 --as agent-a --ttl 4h    # comment with expiry + status:in-progress + assignee
```

- The claim **comment** is the lock; the label and assignee make it visible in the list. No server, no database.
- A claim **expires**. A crashed session cannot hold an issue forever; `renew` before the TTL if the work runs long.
- A live claim by someone else blocks (exit 2). Pick another issue. Take over only after reading their claim and
  talking to them: `--force-with-lease <their comment id>` — a newer claim than the one you read makes it fail.
- Two agents in the same second: both post, both re-read, the earlier comment wins, the later deletes itself.
- Give each parallel session its own `--as` (or `ISSUE_CLAIM_AS`): one GitHub login can run several agents.
- A free claim does not prove nobody is working: read the last comments and recent commits too
  (see `parallel-agents.md`).

### 2. "Received" comment — before the first commit

```markdown
**Received**
- Understanding: <the problem in one sentence, in your words>
- Plan: <steps; for 3+ steps, how each is verified>
- Done when: <the checks you will show>
- Risks: <what could break, what you will not touch>
```

If the issue has more than 8 acceptance items or more than a day of work, split it into child issues first and link
them; do not start a two-week issue under one claim.

### 3. While working — the issue is the decision record

- A finding you will not fix now → **a new issue in the same session**, linked from this one.
- Scope or direction changed → a comment saying what and why. A local plan file is not a record.
- A question only the human can answer (OTP / MFA / personal secret, real money, a pure business decision) → one
  comment on the Decision inbox, `needs-human` on the blocked issue, then continue with everything that does not
  depend on the answer.
- Every commit names the issue (`#12`) so history and issue point at each other.

### 4. "Handoff" comment — before releasing the claim, also when stopping half-way

```markdown
**Handoff**
- Done: <commits / files / commands>
- Evidence: <command + output: tests passed, HTTP status, the measured number>
- Moved to: <unfinished item → #n, one per line; "none">
- Risks: <what the next person should watch>
```

Then `issue-claim release 12`, or `issue-claim release 12 --close` when it is finished. `--close` refuses while any
unchecked `- [ ]` item does not name the issue it moved to (`→ moved to #40`). We once closed an issue at 0 of 5
criteria; nobody outside the session could tell why.

## Keep the list honest

- **48 hours** from claim to done for a sized task. Over the deadline: comment "Overdue" with the reason and the new
  estimate. Never close sloppily to meet it — the deadline is there to push, not to lower the bar.
- **A cap on open issues** (we use 100). Above it, triage before adding: merge duplicates, close what measurement shows
  is already fixed (with the measurement), move stale ideas to one parking issue.
- Read zero-comment issues first when picking work; they are the ones nobody has looked at.
