---
title: nginx `if ($var)` treats the string "0" as false, so a header block let "0" through
date: 2026-10-03
layer: [infra]
area: [security]
stack: [nginx, nextjs]
kind: measurement-trap
skill: dev
---

## Symptom
A rule meant to block bots probing framework server actions — `if ($http_next_action) { return 404; }` — answered
`Next-Action: x` with 404 but `Next-Action: 0` with 307: the request went through. Bots send exactly such values.

## Cause
In nginx, `if ($variable)` is false for an empty string **and** for the string "0".

## Fix
Compare explicitly: `if ($http_next_action != "") { return 404; }`. Both `0` and `x` then return 404.

## How to catch it
Test every header/variable filter with several values — `0`, `1`, a word and empty — and check the status code of
each, not one happy value.

## Rule
In nginx, never use a bare `if ($var)` as a presence test; compare to `""` and test with `0`.
