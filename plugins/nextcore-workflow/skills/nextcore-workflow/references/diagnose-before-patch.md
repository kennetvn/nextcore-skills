# Diagnose before you patch

## What happened

We measured 90 days of git history instead of guessing:

| | |
|---|---|
| commits | 3,525 (39/day) |
| browser-extension releases | **473** (5.3/day) |
| commits that said "root cause" | **2** |
| longest patch chains on one minor version | 12 · 12 · **11** |
| one polling file, edits in 60 days | **106** |

The 11-release chain, in order: stop failing silently → split into three states → error missing a
code → inspect the schema → classify the query IDs → **root cause: reading the wrong field of the
API response**. Five releases treated symptoms.

## Why

The feedback loop for an extension is expensive: bump version → commit → publish to the fleet →
wait for machines to reload → wait for a job to run → read logs. 5–15 minutes per round.
So the agent tested each hypothesis **by shipping it**, and each ship looked like progress.

## Rule: the third patch is blocked

Patches 1 and 2 to the same `major.minor` are normal. The **3rd within 72 hours is blocked** by a
release gate until a diagnosis file exists for that version with three sections:

```
## 1. Measured symptom
   A number, not a feeling. How many, out of how many, read where.
   Quote the real query (logs table, DB, browser devtools).

## 2. Hypothesis + how to refute it
   State the hypothesis, then the measurement that would prove it WRONG.
   No refutation test = a hunch, not a hypothesis.

## 3. On-site observation
   Did you look at the live thing, or only infer from code?
```

The file is not paperwork. It forces a stop. Writing it opens the gate immediately.

For web code (no release gate): same file edited 3 times in one day for the same symptom → stop,
write the note, then continue.

Early warning words in your own commit messages: "still", "again", "attempt 2", "revert".

## Don't ship to measure

Nearly every question can be answered before the bump:

| You want to know | Measure on site, without releasing |
|---|---|
| What the API returns | Browser devtools on the real page, call it directly, print the payload |
| Whether a button/menu exists | DOM snapshot of the real page |
| Whether a query ID still works | Minimal call; read the numeric error code, not the message |
| Whether the queue has work | Query the command and log tables |
| Whether new code runs | The extension's own tests + a release checker |
| What version the fleet runs | A "report version" action in the log portal |

Ship only when you know what you changed and why it will be right.

## Measured symptoms, not reported ones

- Classify errors by **numeric code**, never by message text. Messages are localized and change.
- Read counts **twice, a few seconds apart**, and take the difference. Cumulative counters look
  like a live problem.
- Measure **total volume per hour**, not 4 samples. "4 runs enqueued 0" looked like a dead
  pipeline; the real rate was 19 commands/hour. The job had a cap; short zero streaks were normal.

## Before patching a "false done"

A task marked `done` with an error result looks like a bug. In one session we found three:

| Suspect | Looked like | Refuted by |
|---|---|---|
| 36 `done` with rate-limit error | only 51 of 140 actually joined | the other 89 still met every candidate condition → would be retried |
| 764 `done` with error, locked 28 days | filter on status but not on result | **0 / 764** actually un-handled — all fixed by a later command |
| 3 runs `enqueued: 0` | dead pipeline | 19 commands/hour still created |

Rule: count objects that carry the wrong mark **and** have not reached the target state by any
other path. Zero → it is a label problem. Patching it is an unrequested change that can create
duplicate work.

## Two ways checks lie in a diagnosis

- **Checking a script with a cruder method recreates the old bug.** We re-checked a "who calls
  this function" script with a one-line grep. Grep said a release function had 0 external callers —
  "bookings block the calendar but cancellations never release it". It was called through a
  dispatcher in the same file (11 real call sites). The script already classified that case; the
  grep carried the model the script was fixed to remove. Check a tool with **controls**
  (one name certainly called, one certainly not), not with a weaker re-implementation.
- **A pass is not a cause.** If the fix and the measurement were both yours, get a second,
  independent measurement before closing.

## Checklist

- [ ] Which patch number is this for the same symptom? ≥3 → diagnosis note first
- [ ] Observed on site, or inferred from code?
- [ ] Does the hypothesis say how to refute it?
- [ ] Do the numbers survive `measurement-discipline.md` (too clean, empty sample, cumulative)?
- [ ] Is there a second, independent measurement for the same conclusion?
- [ ] If you added a gate: tested both directions?
