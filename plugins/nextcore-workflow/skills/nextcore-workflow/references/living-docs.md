# Documentation has an expiry date

## What happened

Rules and docs contain numbers: "76 routes without auth", "baseline 144", "the palette is green".
Code moves; the numbers do not. In one session we found **4** docs that had drifted from the code.
**3** of them made agents do wrong or redundant work:

- an outdated color palette, used as the token source after the brand had changed;
- "pay down the page-triad debt", already paid in full;
- "76 API routes lack auth" — the real count was **0**; agents went hunting for a problem that
  did not exist.

A stale number in a rule is worse than no number: agents trust rules more than they trust code.

## Rule 1: every number carries a dated marker

```markdown
Auth gate covers 728/739 routes <!--measure: auth-routes=728 @2026-09-25-->
```

- `name` identifies a measurement the script knows how to recompute.
- `value` is what was true on that date.
- The marker is invisible in rendered Markdown and greppable in source.

## Rule 2: a script re-measures every marker

- Runs automatically at session start (a SessionStart hook).
- For each marker: recompute, compare, report drift with file and line.
- **Silent when clean.** A check that prints on every session gets ignored.
- When the script cannot compute a name, it says so — an unmeasurable marker is itself drift.

Ready-made: `scripts/doc-drift.mjs` (zero dependencies). Map each marker name to a shell command in
`doc-drift.json` — `{ "auth-routes": "node scripts/count-guarded-routes.mjs" }` — then run it with
`--quiet` from a session-start hook, `--update` to rewrite drifted values with today's date, `--strict` in CI.
Markers older than `--max-age` days (default 90) are reported as stale even when the value still matches.

The re-measure must use the **same definition** as the original measurement (same filter, same
WHERE clause). Re-implementing the count with a simpler query recreates whatever the first version
got wrong.

## Rule 3: keep the always-loaded text small

Track the byte size of auto-loaded rules with its own marker. Ours dropped from 3,761 lines of
rule text to one page plus an on-demand catalog with a machine-readable index (trigger → file).

## Memory: one file, one fact

Agent memory that persists across sessions:

```markdown
---
name: positive-control-before-trusting-zero
description: one line, used to decide relevance at recall time
type: feedback | project | reference | user
---
The fact, with the real numbers.
**Why:** what went wrong without it.
**How to apply:** the concrete check.
```

- One fact per file. Update an existing file instead of creating a near-duplicate.
- Delete memories proven wrong. Correct ones whose numbers changed, and say what changed.
- Do not store what the repo already records (code structure, git history, rule files).
- Absolute dates, never "yesterday".
- Link related memories by name.

## The index must fit the loader

**Happened:** the memory index grew to 68 KB / 305 lines. The harness loads a fixed number of lines;
**143** entries were silently cut. Agents could not recall lessons they had written.

**Rule:**
- One line per entry: link + a hook of a few words. Never the content itself.
- Watch the line count against the loader's limit (ours: 200).
- Move older or narrow entries to an archive file that is not auto-loaded, grouped by topic, and
  leave one pointer line per group in the index.

## Rule files point at gates — verify the pointer

If a rule says "enforced by X", run X exactly as written and read the exit code. Several of our rules
claimed a gate that did not check what the rule described (see `enforcement-tiers.md`).
