---
title: A lockfile written by npm 11 on a laptop failed `npm ci` on the CI runner's npm 10 — twice in eight days
date: 2026-11-09
layer: [devops]
area: [backend]
stack: [npm, github-actions, nextjs]
kind: incident
skill: dev
---

## Symptom

A commit added two dependencies and updated `package-lock.json` in the same commit (+446 lines). The production deploy
job failed at install: `npm error code EUSAGE` — "`npm ci` can only install packages when your package.json and
package-lock.json are in sync", `Missing: nodemailer@8.0.11 from lock file`. Production stayed up: the job fails before
the switch, so the previous build kept serving. The same error, same package, had been fixed by hand eight days
earlier.

## Cause

The lockfile was regenerated on a laptop with npm 11. npm 11 dropped a **nested** entry (an older copy of a package
pinned under another dependency) that npm 10 on the self-hosted runner still requires. Reproduced on the exact
`package.json` + lock of that commit: `npx npm@10 ci --dry-run` → EUSAGE, `Missing: nodemailer@8.0.11`; npm 11.19
`npm ci --dry-run` → "added 1475 packages". The first fix restored the entry by hand and did nothing about the
version gap, so the next dependency change on the same laptop removed it again.

## Fix

Regenerate the lock with the runner's npm: `npx npm@10 install --package-lock-only --ignore-scripts` adds back exactly
one entry (1,600 → 1,601 package entries); afterwards `npm ci --dry-run` passes on **both** npm 10 and npm 11. Then
make the versions agree so it cannot drift again: pin npm in `packageManager` / `engines` and use that npm on the
laptop and the runner.

## How to catch it

A pre-push check that runs, whenever `package-lock.json` changed, `npx npm@<runner's version> ci --dry-run
--ignore-scripts` (≈ 1 s, no install). Compare against the runner's npm, not the laptop's — the laptop's own
`npm ci` passes.

## Rule

The npm that writes the lockfile must be the npm that installs it in CI. A hand-fixed lockfile without pinning the
version is a fix that expires on the next `npm install`.
