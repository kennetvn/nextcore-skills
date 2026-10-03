# Validation — after it is built, go back to the job

Visual verification (§8 of the SKILL) proves the page matches the drawing. It does not prove a person can finish the
job. Validation answers that, then asks whether the business goal can move. Required for MEDIUM and larger tasks;
the result is `templates/validation-report.md` in the drawing's folder, and `spec-check` fails a built MEDIUM+
feature without one.

## 1. UX validation — can the user finish the primary job?

Walk the real page (not the drawing), on a phone first, as the user from the spec, from the real entry point — the
link, notification or search result people actually arrive from. Then every branch of the user flow.

Record, for the primary job:

| Measure | How |
|---|---|
| finished the job? | yes / no, and where it stopped |
| steps and decisions | count taps/fields and choices from entry to success |
| time to understand / to act | where is the primary action on first paint (above the fold at 390 px?) |
| errors and recovery | trigger each validation and server error: is the message next to the field, in words, and can the user continue without losing input? |
| next step | after each state, can the user tell what to do next? |

Any "no" on *finished the job* or *next step* is a **UX failure**: fix it or record why it ships anyway.

Real case: a home-page card said "available this weekend" and linked to the listing with both dates in the URL. The
listing page dropped the check-out date, and picking it again moved the check-in date — so the guest could not book
the two nights the card had just promised. Every screen passed its own checks; only walking the job from the card to
the booking showed it.

## 2. Evidence, not taste

Never "looks good" or "feels intuitive". Write what was observed and label it:

```text
FACT:           primary action is visible at 390×844 without scrolling (screenshot: …)
OBSERVATION:    the error appears under the price field and keeps the typed value
INTERPRETATION: the owner can recover without retyping
HYPOTHESIS:     fewer abandoned drafts — check: weekly draft→published ratio
```

## 3. Business validation — mechanism, not outcome

You cannot measure conversion on the day you ship. Do not claim it. For the business goal in the spec, write:

- **Expected mechanism** — which change should move which behaviour (e.g. "price shown before the date picker removes
  the step where people leave").
- **Supporting evidence today** — what the walk-through showed (primary action discoverable, trust signals present,
  unnecessary fields removed, failure recoverable).
- **Measurement required** — the event or field, where it is stored, the baseline value today, and when to read it
  again. If the product does not record it yet, say so: that is a task, not a footnote.
- **Hypothesis** — stated so it can turn out false.

## 4. After release

Read the measurement on the date the report named, append the result to the report (do not rewrite the
hypothesis), and if it failed, open the next iteration from that number. A serious failure becomes a lesson:
incident → root cause → rule → check (`nextcore-workflow` → `references/lesson-loop.md`).
