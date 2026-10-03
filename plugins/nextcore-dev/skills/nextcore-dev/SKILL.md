---
name: nextcore-dev
description: The development contract that makes design and code meet. Use when building or changing an API route, a form/mutation, a schema or migration, a background job, a production data fix, or when implementing a screen from a design spec — and before saying "done" on any backend change.
---

# nextcore-dev

Design and code drift apart at the **data contract**, not at the pixels.
A mockup shows a price, a badge, an empty list. Code has to answer three questions for each:
where does the value come from, what shape does the API return, and what signal tells the UI
which state to draw. When nobody writes those answers down, each side guesses.

This skill is the written answer. It pairs with
[nextcore-design](https://github.com/kennetvn/nextcore-design): that skill produces `spec.md`
with a **field map**; this skill turns the field map into an **API contract** and a set of
backend rules that keep the contract true in production.

Distilled from a production booking platform (Next.js, Prisma, MySQL, ~230 pages, ~740 API
routes, a fleet of browser extensions calling the API). Every rule below cost at least one
incident. The numbers are real.

---

## 1. The chain: design element → field → API → UI state

```
spec.md field map ──► API contract ──► handler + schema ──► UI states
"Price / night"        GET /stays        Decimal(18,2)        empty: "No price yet"
 source: stays.price   data.priceFrom    nullable             loading / error / ok
 can be empty: yes     null allowed
```

Rules:

1. **No source, no element.** Every data-bearing element in a design has a row in the field map:
   UI element · source (route + field) · real example value · can it be empty. No row ⇒ remove
   the element, or open a backend ticket and design it in its "not available" state.
2. **No invented numbers.** "4.9 stars", "1,200+ happy guests", "only 2 left" need a query that
   returns exactly that number. Otherwise they are fiction shipped as UI.
3. **Every UI state maps to one backend signal.** Not to a guess in the component.

| UI state | Backend signal | Wrong signal (seen in production) |
|---|---|---|
| Empty | `success: true`, `data: []` / `items: []` | bare `[]`, or `success: false` for "no rows" |
| Loading | request in flight (client-side) | spinner tied to a timer |
| Error | `success: false`, `error.code` | HTTP 200 with an `error` string inside |
| Permission | HTTP 403 + `error.code = "FORBIDDEN"` | 200 with empty data (looks like Empty) |
| Not found | HTTP 404 + `"NOT_FOUND"` | 200 + a "not found" page (soft-404) |
| Offline / timeout | fetch rejects, no envelope | treated as Empty |
| Partial | `success: true` + `warnings[]` | silently dropped rows |

If Permission and Empty return the same thing, the UI cannot tell "you have no bookings" from
"you are not allowed to see bookings". Users read the first; admins debug the second for hours.

Details: `references/handoff.md` (both directions of the handoff).

---

## 2. API contract — one envelope, always

```ts
// success
{ success: true,  data: T }
{ success: true,  items: T[], nextCursor: string | null, hasMore: boolean }   // lists
// failure
{ success: false, error: { code: "VALIDATION_FAILED", message: "…", fields?: {...} } }
```

- The success flag sits at the top level of **every** JSON response. Pick `success` or `ok`
  once per codebase, never both in one resource.
- `error.code` is for machines (SCREAMING_SNAKE, stable). `error.message` is for people
  (localized, may change). UI branches on `code`, never on `message`.
- HTTP status and body agree. A business failure with HTTP 200 passes every `res.ok` check.
- Renaming a response key on a live route is a breaking change. Add the new key **beside** the
  old one, ship, wait until logs show no caller reads the old key, then remove it.
- Money mutations take an **idempotency key**. Retries happen: double-clicks, mobile networks,
  webhook redelivery.

Why: one route changed `{data}` to `{items}`. The extension read `res.data`, got `undefined`,
treated it as an empty list, and kept running. No error anywhere. Machines do not report blank
screens.

Details: `references/api-contract.md`.

---

## 3. Secure by default

- **Every route proves it is guarded.** One of: the shared handler with declared roles, a
  session check, an auth helper, or an explicit public marker **with a reason**
  (`// PUBLIC_ENDPOINT — price list, reads no user data`). An empty marker does not count.
- **The exemption list is short and path-based** (webhooks verified by signature, health).
  Adding a path pattern opens that subtree forever.
- **The gate prints what it checked.** "Checked 728/739 routes, 11 exempt, 0 violations."
  A gate that prints only "OK" once skipped 53% of route files because it matched one export
  style. Count checked vs total, every run.
- **Mutations go through one handler** (rate limit → auth → roles → validation → error mapping).
  Auth checks scattered inside handlers multiply the attack surface.
- **Validate input on the server** with a schema (Zod, FormRequest, serializer). Never trust the
  client's types. Tenant checks, not just "is logged in", for any data owned by someone.
- **Name routes by business domain, not by caller.** `/api/billing/invoices`, not
  `/api/admin/invoices` or `/api/v1/…`. Keep the domain list closed; adding a domain is a
  reviewed change.

Details: `references/security.md`.

---

## 4. Data

- **Money is Decimal(18,2). Rates are Decimal(5,4).** Never float, never mixed types in one
  domain. Compute with a decimal library.
- **Order codes come from one generator** backed by an atomic DB counter. No `Math.random`,
  no `count() + 1` (races on a cluster). Link records by `orderId`, never by the display code.
- **Price is a snapshot.** Store the price on the order at creation. Changing the catalog
  price must not rewrite history.
- **`onDelete` is explicit on every relation.** Ledger / financial ⇒ `Restrict`.
  Pure child rows ⇒ `Cascade`. Optional lookup ⇒ `SetNull` + snapshot the label.
- **Migrations are written by hand**, reviewed, with a backup, a `down` for destructive
  changes, and a ledger row (`_manual_migrations(name, applied_at, checksum)`).
- **Production data changes:** backup rows → idempotent script in git → apply → re-query to
  verify → commit. Git and production never disagree, in either direction.
- **Timestamps are UTC in storage**, local time only at display.

Details: `references/data.md`.

---

## 5. Background work

- No `setInterval` / ad-hoc cron / DB `EVENT` scattered across the app. **One job system**:
  registry, schedule, DB lock (cluster-safe), run log with retention, a description per job.
- A job's status column must reflect failure. "SUCCESS" with failures inside the output JSON
  kept a dead integration green for 23 days.
- **A delete job reads the relation graph first.** List every relation pointing at the model
  and sort into Cascade (count the blast radius), Restrict (exclude first or the batch dies),
  SetNull (block — it loses data silently).

Details: `references/jobs-and-ops.md`.

---

## 6. Resources and operations

- **Machine is slow ⇒ suspect configuration before traffic.** One incident: load 9.2 on 12
  cores with 4 queries/second. Cause: two self-inflicted restart loops. After the fix: load 3.5,
  idle CPU 32% → 78%.
- **`%CPU` in `ps`/`top` is a lifetime average.** Measure a delta of `/proc/<pid>/stat` over a
  few seconds. `load average` is a lagging average that also counts I/O wait.
- **Memory restart limit (RSS) must exceed the heap limit by ≥512 MB.** Equal values made the
  supervisor kill the app 647 times before V8 could collect garbage.
- **Every background process has a hard memory cap and a hard CPU cap.** CPU weight is not a cap.
- **Check that someone consumes the output** before optimizing a heavy job.

Details: `references/jobs-and-ops.md`.

---

## 7. Verify before "done"

- Green gates are not proof the page runs. tsc, lint and unit tests were all green while a
  missing `"use client"` took down every dashboard page.
- Hit the real endpoint: status code, envelope, `x-cache` headers. `curl -w '%{http_code}'`.
- Measure after the deploy reports **completed**, and confirm the deployed commit contains
  your change.
- New gate or validator ⇒ test both directions: a planted violation must fail it; every flagged
  item must be a real violation.
- A number that is too round (7645/7645 changed) ⇒ suspect the tool first.

Field-tested traps with numbers: `references/backend-traps.md`.
Per-framework mapping (Next.js, Laravel, Django, Rails, Express/Nest): `references/stacks.md`.

---

## 8. Kill-list

| Never | Instead |
|---|---|
| Bare array response `[...]` | `{ success: true, data: [...] }` |
| HTTP 200 for a failure | correct status + `success: false` + `error.code` |
| UI branching on `error.message` text | branch on `error.code` |
| Rename a live response key in place | add beside, wait for zero readers, remove |
| 200 + empty data for "forbidden" | 403 + `FORBIDDEN` |
| Route with no guard and no reasoned public marker | shared handler with roles |
| Gate that prints "OK" without counts | "checked N/M, K exempt" |
| `/api/admin/*`, `/api/v1/*`, `/api/public/*` | `/api/<domain>/<resource>` |
| Float or Int for money | Decimal(18,2) |
| `count() + 1` or random order codes | one generator + atomic counter |
| Relation without explicit `onDelete` | category-based `onDelete` |
| Auto-generated migration applied to prod | hand-written SQL + backup + ledger |
| `UPDATE` typed into a prod shell | backup → script in git → apply → verify → commit |
| `setInterval` in app code | registered job with lock and run log |
| Job "SUCCESS" with failures in its output | failures change the status |
| Design element with no field-map row | remove it, or design its "not available" state |
| "done" from green gates alone | hit the real endpoint after deploy completed |
