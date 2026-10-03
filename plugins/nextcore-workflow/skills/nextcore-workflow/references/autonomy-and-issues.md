# Autonomy and the issue tracker

## Default: execute plan A

If the agent has analyzed the problem and has a recommended plan A that is **recoverable**
(git revert, tests, a DB backup taken first), it executes plan A. It does not ask the human to choose.

Why: the human running the product is often not an engineer. A menu of options moves the
engineering decision to the person least equipped to make it, and stalls the work until they reply.
A wrong but recoverable choice costs one revert.

Applies to: code, schema, UI, bugs, refactors, URL changes, performance, tests, applying an existing
standard, silent background refetches. Do it, commit, deploy through CI, verify, close.

Record the assumption you made on the issue, in one line, so it can be overturned later.

## Stop only for the physical world

1. **OTP / MFA / personal secrets** — a QR scan with a personal phone, a bank code, a cloud
   console login.
2. **Real money** — paying for a domain, topping up hosting, a real bank transfer.
3. **Pure business decisions** — listed prices, commission rates.

Not on the list, so not a reason to stop: "should this feature be on by default?" Make it a setting,
default it to the safe value, ship. "Wait for the human to make a test payment?" Verify each step
with production data instead (webhook received, order matched, ledger row written), then close.

## One inbox

When one of the three stops is hit, the question goes to **one pinned issue** labelled as the inbox,
via a script that appends a structured entry (what, why, options, the agent's recommendation).
Never scattered across issue comments, never in chat only, never as a label applied by hand.
The human reads one place; the agent reads answers from one place.

## The issue tracker is the only decision record

The human sees issues. They do not read local plan files or reports.

Same session, always:
- A finding you will not fix now → new issue.
- Scope or direction changed relative to the issue → comment on the issue.
- An item deferred → comment saying where it went.

**Happened:** a scope decision (dropping a third-party component) was written only in a local plan.
26 UI commits followed with zero design references. The issue was closed with **0 of 5** acceptance
criteria met. Nobody outside the session could see why.

Rules:
- Do not close an issue with unchecked criteria unless each one names the issue it moved to.
  A close script can refuse when that mapping is missing.
- For new UI, link the design on the issue **before** the first component commit. A commit-msg hook
  can warn when it is missing.

## Issue titles state only what was measured

A title carries a symptom you measured, not a cause you have not proven. We retitled one issue twice
because the first title named a cause that later measurement disproved; every reader had anchored on it.

## Verify before "done"

"Done" = ran the command, read the output, saw HTTP 200 / tests pass / 0 type errors / the screen.
For production: measure only after the deploy run is **completed**, and confirm the deployed SHA
contains your commit. "The route is live" does not prove "my fix is live".

## When done, really done

Done = trunk + released artifact + update manifest + backup. Do not keep an issue open waiting for
users to reload an old extension on their own machines; old clients update on their own schedule.

## Never idle

A loop that waits should check every ~60 s, and when one item is blocked for long, switch to another
issue instead of sleeping. Read zero-comment issues first.
