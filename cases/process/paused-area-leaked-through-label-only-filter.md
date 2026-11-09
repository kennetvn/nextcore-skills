---
title: A paused code area kept receiving agent work because the filter read only the issue label
date: 2026-11-09
layer: [ai-agents, process]
area: [jobs]
stack: [github, nodejs]
kind: incident
skill: workflow
---

## Symptom

The owner paused two code areas (web and extension) for agent work. A dispatcher hands issues to idle agent terminals
and skips paused areas. In 16 minutes one evening, 5 tasks in a paused area still reached workers or asked the lead
agent to split them into slices. Each looked like a one-off.

## Cause

Two independent holes:

1. **Area came from one source.** The filter read only the issue's area label. 2 of the 5 tasks had none — they were
   created automatically ("code exists, only verification left") and nobody labelled them, although their files were
   all under the paused folder.
2. **Not every path went through the filter.** Normal dispatch did. Replaying queued actions after the app restarted,
   and the "stuck task ⇒ propose slices" path, assigned work directly.

## Fix

Area of a task = area labels ∪ areas derived from the files it names ∪ areas named in the issue body. The paused-area
check moved to the single final assign function every path calls (manual assignment can override only with an explicit
force flag). A pure test replays the 5 real cases and asserts each is blocked; 899 tests green.

## How to catch it

List every code path that can hand out work and assert each goes through the same gate (one function, one test per
path). For classification, count tasks whose label is empty and check where their files live.

## Rule

A rule about *where* work happens is enforced on *what the work touches*, at the one choke point every path shares —
never only on a label someone may forget, and never in one of several entry points.
