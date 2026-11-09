---
title: Renaming internal builds from a timestamp to a counter would have stopped every machine from auto-updating
date: 2026-11-09
layer: [devops, code]
area: [desktop]
stack: [semver, electron, nodejs]
kind: measurement-trap
skill: dev
---

## Symptom

Internal (dev-channel) builds of a desktop app were versioned `<next>-dev.<yyMMddHHmm>`, e.g. `0.3.191-dev.2611091855`.
The owner asked for readable names: build 1, 2, 3 of the next version. The obvious spelling `0.3.191-dev.1` looked
fine in every list a human reads, and every machine already running a timestamp build would have treated it as
**older** and never installed it.

## Cause

Semver compares pre-release identifiers one by one; numeric identifiers compare as numbers. `dev.1` vs
`dev.2611091855`: same `dev`, then 1 < 2611091855. Sorted with the updater's own `semver.compare`:

`0.3.191-dev.1 < 0.3.191-dev.2611091855 < 0.3.191-dev-001 < 0.3.191-dev-002 < 0.3.191-dev-010 < 0.3.191 < 0.3.192-dev-001`

`dev-001` is a single identifier compared as text; `dev` is its prefix, so it sorts after every `dev.<n>`. Being text,
it also needs padding: `0.3.191-dev-1000` sorts **before** `0.3.191-dev-999`.

## Fix

Version string `<x.y.z>-dev-NNN` (one identifier, three digits), displayed as `V0.3.191-Dev-001`. The counter is the
highest number already **published** on the shared dev channel for that `x.y.z`, plus one — not a count of local build
folders, which gave two machines the same number. A new `x.y.z` restarts at 001. Every reader of version strings (cleanup
of old builds, the updater, test helpers) accepts both forms during the switch.

## How to catch it

A unit test that sorts the old and the new scheme with the updater's comparator and asserts the new one is greater
than every old build of the same base version, and that build N+1 > build N across the padding boundary you allow.

## Rule

Before changing a version or pre-release scheme, sort old and new together with the exact comparator your updater
uses. A name that reads "newer" to people can be "older" to semver.
