---
title: One line that says what went wrong, in plain words
date: 2026-10-03
layer: [infra, performance]
area: [api]
stack: [nginx]
kind: incident
skill: dev
---

<!-- Copy to cases/<short-kebab-slug>.md. Values for layer/area/kind/skill: cases/taxonomy.json. stack is free
     (lowercase, one word per tool). Keep it under ~60 lines. No product names, hostnames, IPs, people or ticket
     numbers. Then run `npm run cases` and `npm test`. -->

## Symptom

What people saw, with the numbers you measured (counts, sizes, durations). Say what made it look like something else.

## Cause

The mechanism, specific enough that a reader can check it in their own setup (the setting, the default, the line).

## Fix

What changed, and the before/after numbers that show it worked.

## How to catch it

A command, query or test that finds this before users do. Include the comparison that tells a real fix from a lucky
run.

## Rule

One or two sentences an AI agent can follow next time.
