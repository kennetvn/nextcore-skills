---
title: PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran
date: 2026-10-03
layer: [devops, code]
area: [backend]
stack: [pm2, nodejs, nextjs]
kind: incident
skill: dev
---

## Symptom
After adding a graceful-shutdown handler, the first reload still ended with the old process killed by SIGKILL after
about 16 s. The log line "exited … via signal [SIGKILL]" only shows the last step, not the signal that was sent first.

## Cause
PM2's default `kill_signal` is `SIGINT` (overridable by `PM2_KILL_SIGNAL` or `kill_signal` in the ecosystem file).
The handler listened only to `SIGTERM`, the Docker/Kubernetes convention. Separately, `next start` in production
calls `server.close()` without closing open connections, so SSE and long-poll requests keep the process alive until
`kill_timeout`.

## Fix
Listen to both `SIGINT` and `SIGTERM`, and end long-lived connections yourself on shutdown. The next reload exited
cleanly within the timeout.

## How to catch it
Read `kill_signal` in the ecosystem file (or PM2's constants) before writing the handler. Measure on the second reload
after the deploy: the first reload stops the old code, which does not have the handler yet.

## Rule
For processes run by PM2, handle SIGINT and SIGTERM, and judge a shutdown fix only on a reload where the old instance
already ran the fix.
