---
title: A test with a hard-coded month turned red for everyone at midnight on the 1st
date: 2026-10-03
layer: [testing]
area: [backend]
stack: [vitest, typescript]
kind: incident
skill: dev
---

## Symptom
Just after midnight on 1 October, the pre-push gate failed for every developer and agent on 5 cases of one test
(`expected [] …`), though the code had not changed for ten days. With several agents pushing in parallel, each blamed
another's unfinished work.

## Cause
The fixture described a sheet for "month 9, year 2026"; the code under test drops months that are already over,
based on `Date.now()`. On 1 October the fixture's month was in the past and the result became empty.

## Fix
Pin the clock in the test: `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(…)`. The test is green again
and stays green on any date.

## How to catch it
When an untouched test fails right after a day or month boundary, grep the test for literal months/years/dates and the
code under test for `Date.now` before suspecting anyone's changes.

## Rule
Code that filters by the current date gets a pinned clock in its tests from the first commit.
