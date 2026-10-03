---
title: 56 screens shipped from approved drawings, none of which said what problem they solved
date: 2026-10-03
layer: [process, ai-agents]
area: [ui, frontend]
stack: [nextjs, claude-design]
kind: measurement-trap
skill: design
---

## Symptom

An audit of 84 production design folders: 56 marked "shipped", 3 "partly shipped", and **0** contained a written
problem, job to be done or success criteria. The drawings themselves were good by every visual check — states,
phone/tablet/desktop, brand tokens, fonts. Meanwhile, two failures of the kind discovery is meant to stop:

- a feature issue was closed at 0 of 5 acceptance criteria after 26 UI commits, because the scope change lived only in
  a local plan file and nobody restated what the screen was for;
- a home-page card promised "available this weekend" and linked to a listing that dropped the check-out date, so the
  guest could not book the two nights the card had just offered. Each screen passed its own checks.

## Cause

The design process gated what a screen *looks like* (a design card measured devices, states, colour and type) and
nothing gated *why it exists* or *whether a person can finish the job with it*. Approving a drawing meant approving a
picture. The checker reported green because it only measured what was there — a missing spec produced no finding.

## Fix

Discovery and validation became part of the design skill, sized to the task: a `Size:` line decides how deep the
spec goes; MEDIUM and larger write the problem, the job, success criteria and every flow branch before the first
artboard, and a validation report (walk the primary job on the real page; business goal as mechanism + measurement)
before "done". `spec-check` enforces it — and reports drawing folders that have **no** spec, so an empty folder no
longer reads as clean. First run on the same 84 folders: 65 drawing folders detected, 65 without a spec.

## How to catch it

Run `spec-check` on the drawings folder and read the `drawing(s) without one` count, not just the error count. Then
pick any shipped screen and try to state its primary job and success criterion from the repo alone. If you can't,
neither could the agent that built it.

## Rule

Before the first artboard of a MEDIUM+ screen, write the problem (with a number), the job to be done and the flow
branches; before calling it done, walk that job on the real page from the real entry point.
