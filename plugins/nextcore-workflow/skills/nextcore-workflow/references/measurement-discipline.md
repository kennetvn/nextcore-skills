# Measurement discipline: twelve traps

Each trap is a time we reached a wrong conclusion because the **measurement** was wrong, not the
code. Format: what happened → why → rule.

Umbrella rule: **a number that matches your hypothesis too well is the moment to question it.**

---

## 1. A zero without a positive control

**Happened:** "Does anyone still call these 15 old API paths?" Three independent tools, each run
also on a path we *knew* was called by 207 files. Results for the known path: filesystem grep
123 + 92 (works) · web server access log, alive, 32,185 lines **0** (broken: did not capture API
traffic) · `git log -S` **0** (broken: the folder was gitignored, 2,091 files invisible to git).
Without the control: "three independent sources say zero" — and we would have deleted live routes.
**Why:** a live log is not a log of your question.
**Rule:** before concluding "0 callers / 0 leaks / 0 violations", run the same tool on a case that
certainly exists. Control returns 0 → discard the tool, not the hypothesis. Report the control.

## 2. "No change" without proof the change applied

**Happened:** a layout shift (CLS 0.75–1.15 on every dashboard page). We nearly discarded the
correct cause three times: read a value after the page settled (the jump is in the first frame);
simulated a fix whose attribute never got set (`null`); injected CSS that never applied. The
first hypothesis was right. Real fix: CLS **0.7479 → 0.0157**.
**Why:** "no change" has two explanations: the fix is wrong, or the fix never ran.
**Rule:** every negative result carries a proof-of-application metric from the same run (attribute
≠ null right after commit; computed style of the exact property; `transitionrun` = 0). For
first-frame bugs, record per animation frame — the settled state tells you nothing.

## 3. All gates green, product still bad

**Happened:** a public listing page at 375px: CLS 0.035, 249 ms load, 0 small tap targets, 0 console
errors. A screenshot showed **12/12** first cards with "no photo". 131 of 165 public items (79%)
had no images, and the sort fell through to newest-first. One extra sort key: 0/12 → 12/12.
**Why:** the bugs that make users think a product is bad live in content and ordering. HTTP is 200,
nothing throws.
**Rule:** when every technical metric is green, look at the screen.

## 4. Measuring a public page with an admin session

**Happened:** same page, logged in as admin: "510 items". Looked like the page over-reported.
Anonymous `curl` returned 165 — the admin view intentionally includes hidden items.
**Rule:** measure public surfaces with no cookies.

## 5. Hidden elements in the sample

**Happened:** "41 tap targets at 43.12 px, under the 44 px minimum." All 41 were inside a closed
menu (`opacity: 0`, `pointer-events: none`).
**Rule:** filter hidden elements through the whole ancestor chain, and check `elementFromPoint`
returns the element itself.

## 6. Too-clean numbers

**Happened, repeatedly:** 100%, exactly 0, or a count exactly equal to the query `limit`.
**Rule:** suspect the tool first. A count equal to the limit is a ceiling, not a total. "643 / 643
have the key" → check the sample contains the set you meant to measure.

## 7. Cumulative counters

**Happened:** console error count kept rising; looked like an active error storm.
**Rule:** read twice, seconds apart, take the delta. Same for CPU: `ps %CPU` is a lifetime average;
measure instantaneous CPU from two reads of the process stat file.

## 8. Checking a tool with a weaker tool

**Happened:** re-checked a call-graph script with a one-line grep. Grep said a release function had
0 callers — shaped like a severe bug (booked dates never freed). It had 11 callers through a
dispatcher in the same file; the script already classified that case.
**Rule:** check a measurement with controls (one known-called, one known-unused), not with a cruder
re-implementation.

## 9. Line endings and byte comparison

**Happened:** comparing files byte-for-byte: **83 of 114** reported as different. The repo mixes LF
and CRLF; the "differences" were `\r`.
**Rule:** decide what you compare against (committed blob or working tree) and normalize line
endings. One sample does not describe a mixed repository.

## 10. Coincidence vs base rate

**Happened:** "8.6% of failures line up with deploy times" looked like a cause. Random timestamps
lined up 9.1% of the time.
**Rule:** any timestamp match must be compared against the random base rate.

## 11. One performance run is noise

**Happened:** FPS ranged **75–154** across 5 identical runs.
**Rule:** run N times, report median and spread. Compare before/after only within the same
conditions, and never across a deploy that happened in between.

## 12. Marking "done" before the attempt

**Happened:** a sweep added each person to a `done` set **before** trying to act on them. Anyone
whose attempt failed was skipped for the rest of the sweep. 7 days of prod: 159 touched, 95
handled → **64 (40%) burned**. Most failures were transient (the page re-rendered mid-action).
**Rule:** mark processed **after** a result, and only on success or when the retry budget is spent.
Count people, not attempts, or every rate built on it is wrong.

---

## Before you report a number

- [ ] Positive control run with the same tool?
- [ ] For "no change": proof the intervention applied, same run?
- [ ] Hidden / off-screen / admin-only items excluded?
- [ ] Too clean? Equal to a limit?
- [ ] Delta, not cumulative?
- [ ] Compared to a base rate / measured more than once?
- [ ] A second, independent measurement agrees?
- [ ] Did you look at the screen?
