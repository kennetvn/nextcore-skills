---
title: Two end-to-end batches on one machine turned 37% of suites red, and a third of the red was not the code
date: 2026-11-09
layer: [testing, ai-agents]
area: [desktop]
stack: [electron, playwright]
kind: measurement-trap
skill: workflow
---

## Symptom

An agent ran the full end-to-end batch of a desktop app on a test machine: 171 of 279 suites ran before it was
stopped — 101 passed, **64 failed** (37%), 6 skipped. Another agent had started a second full batch on the same
machine, a third agent's dev build was open, and the app restarted once mid-run. 64 red suites would have meant 64
bug issues.

## Cause

The batch measured the machine as much as the code. Reading each failing suite's log before filing anything split
the 64 into:

- 10 fixture or invocation problems (a suite that needs arguments, a macOS-only suite on Windows, missing test data);
- 4 that need production sign-in or a role the test account does not have;
- 3 "empty" suites that printed 0 PASS lines and exited 0 — the runner counted them as failed;
- 3 crashes or hangs of the runner itself;
- 44 with a concrete assertion failure — of which ~10 were `locator … Timeout`, the typical signature of a covered or
  busy window rather than a wrong UI.

So at least 20 of 64 (31%) were not product bugs, and the 44 still needed a clean re-run before anyone could call them
real.

## Fix

One end-to-end batch per machine at a time (a machine-level lock, not per agent). The 44 are re-run **one suite at a
time** on an idle machine against the same build: pass twice ⇒ environment, logged with the reason; fail the same way
twice ⇒ a child issue with the log and the suspected `file:line`.

## How to catch it

Before filing from a batch, check what else ran on the machine in the same window (other test runs, open builds,
restarts). A failure rate far above the last clean batch, or timeouts dominating, means: re-run sequentially first.

## Rule

A red suite from a shared, busy machine is a hypothesis, not a bug. Classify from the log, re-run alone twice, then
file — one issue per failure that reproduces.
