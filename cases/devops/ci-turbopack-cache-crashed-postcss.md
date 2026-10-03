---
title: A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader
date: 2026-10-03
layer: [devops, performance]
area: [frontend]
stack: [nextjs, turbopack, github-actions]
kind: incident
skill: workflow
---

## Symptom
Four production deploys in a row failed with `Turbopack build failed … globals.css … Node.js subprocess crashed while
evaluating loaders [postcss]: failed to receive message`; tests on the runner slowed to 88 s. The same build passed on
a developer machine (postcss: 7.7 s, 85 MB). Raising the job's memory ceiling from 5 GB to 6.5 and 7.5 GB did not
help: peak memory climbed to the new ceiling each time.

## Cause
The workflow keeps the workspace between runs (`clean: false` on checkout) to reuse caches, and `.next/cache/turbopack`
grew to 8.1 GB in one day. Memory use that follows the ceiling up means waste, not shortage.

## Fix
Delete the cache; the next deploy passed. A workflow step now removes the Turbopack cache when it exceeds 2 GB.

## How to catch it
When a build fails only on the runner, run `du -sh .next/cache/*` on the runner before changing memory limits or
blaming a commit.

## Rule
If raising a memory limit just moves the peak up to the new limit, find what is growing instead of raising it again.
