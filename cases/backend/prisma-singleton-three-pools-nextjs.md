---
title: The documented Prisma singleton created three connection pools per process in Next.js production
date: 2026-10-03
layer: [performance, code]
area: [database, backend]
stack: [prisma, nextjs, mysql]
kind: incident
skill: dev
---

## Symptom
Each Next.js server process held about 60 MySQL connections although `connection_limit=20` — exactly 3 × 20 — and
reached 2.2–2.6 GB RSS five minutes after start. The process manager restarted it 977 times for memory. It looked
like a memory leak.

## Cause
The client module followed the common pattern from the Prisma docs: cache the client on `globalThis` only when
`NODE_ENV !== 'production'`. Next.js bundles the server into several layers (React Server Components, SSR, route
handlers, instrumentation) and each layer evaluates the module again, so in production every layer built its own
PrismaClient with its own pool and query engine.

## Fix
Always cache on `globalThis`, in every environment, and attach middleware only to the client that was just created.
Connections went from 98 to 41; RSS from 2,574 / 2,190 MB to 1,007 / 763 MB on the two instances.

## How to catch it
Count connections from the database side (`information_schema.processlist` grouped by host/user). If the count per
app instance is a multiple of the pool limit, you have several clients. `ss | grep :3306` shows 0 when the app talks
over a unix socket — that is a measurement trap, not a clean bill.

## Rule
Connections per instance equal to N × pool size, or high memory right at start-up, means check the client singleton
before taking heap snapshots.
