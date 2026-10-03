# Backend and data traps

Each trap: what happened (measured) → why → rule. All from one production system. None threw an
error. That is what makes them traps.

## 1. ORM singleton cached only in dev ⇒ 3 connection pools per instance

**What:** each Next.js server held ~60 MySQL connections with `connection_limit=20` (exactly
3 × 20). RSS 2.2–2.6 GB five minutes after start; the supervisor had killed it 977 times.
**Why:** the documented pattern caches the client on `globalThis` only in development. In
production the app router bundles the server into several layers (RSC, SSR, route handlers,
instrumentation); each loads the module again and builds its own client and pool.
**Rule:** cache the DB client on `globalThis` in every environment. Connections that are an exact
multiple of the pool size point at duplicate clients, not a leak. Count connections from the DB
side (`processlist`); over a unix socket `ss | grep :3306` shows 0.
**Result:** 98 → 41 connections, RSS 2,574/2,190 → 1,007/763 MB.

## 2. Raw UPDATE triggers `ON UPDATE` with server-local time

**What:** a data-fix reopened 1,013 rows at 23:24 local. A job filtering `updatedAt < now − 2h`
deferred them until 08:24 instead of 01:24.
**Why:** DB `time_zone = SYSTEM` (+07). The column has `ON UPDATE CURRENT_TIMESTAMP(3)`. The ORM
writes and compares UTC; the raw `UPDATE` wrote local time, 7 hours "in the future".
**Rule:** in raw SQL touching such tables, write `updated_at = updated_at` to keep the value, or
set `UTC_TIMESTAMP(3)` explicitly. Read `SHOW CREATE TABLE` first.

## 3. Optional DTO field hides a mapper that forgot to copy it

**What:** server returned the new field correctly (HTTP 200, verified with a real signed request).
The worker had the code to act on it. Nothing happened: 0 errors, 0 logs, 0 rows changed.
~20 minutes to find.
**Why:** the client built its result key by key: `return { items: …, syncGroups: … }`. The new
field was added to the type as optional (`x?: T`), so the compiler accepted its absence.
**Rule:** after adding a field to a DTO, grep it in the client; fix every hand-listed `return`.
At the read site turn optional into definite (`?? []`). Call the endpoint directly to split
"server wrong" from "client wrong".

## 4. `notFound()` in a layout still returns HTTP 200

**What:** `/services/<made-up-slug>` returned 200 with "not found" text. The fix called
`notFound()` in the layout. After deploy: still 200. The HTML contained the 404 fallback marker.
**Why:** with streaming, the status line is sent before the layout decides. A comment in a sibling
route already said so.
**Rule:** produce real 404s before rendering starts (middleware or an existence check at the edge).
Verify with `curl -o /dev/null -w '%{http_code}'`, not by looking at the page.

## 5. Dynamic route with `revalidate` but no `generateStaticParams` is fully dynamic

**What:** three detail routes declared `revalidate = 300`. Responses had no `x-nextjs-cache`
header; each request rendered again (TTFB 1,920 ms).
**Why:** without `generateStaticParams` the segment never enters the ISR cache.
**Rule:** add `generateStaticParams() { return [] }` (unless the page reads cookies/session).
Result: MISS → HIT, TTFB 115 ms, LCP 7.98 → 3.70 s on throttled mobile.
**Second trap:** once cached, a garbage ID returned 200 **and was cached** with `index, follow`.
Wire the real-404 check (trap 4) before enabling ISR. Measure headers, not the `revalidate` line.

## 6. A reverse proxy caches `/api` because caching is on at the top level

**What:** an admin created a record; GET through the domain returned the old list 6/6 times.
`127.0.0.1:<port>` returned the new list 8/8 times.
**Why:** the hosting panel's default config enables `proxy_cache` at the `http` level. Every
`location` with `proxy_pass` inherits it, including `/api`. `grep` in the site config finds
nothing; `nginx -T` does. The `Date` header looked fresh because nginx sets it on cached replies.
**Rule:** suspect stale data after a write ⇒ compare origin vs domain vs `?t=<now>` right after the
write. Bypass cache for requests with a session cookie. Send `Cache-Control: private, no-store`
from signed-in API routes.

## 7. Supervisor reload sends SIGINT, not SIGTERM

**What:** a graceful-shutdown handler listened for SIGTERM. On reload the old instance was
SIGKILLed after 16 s. The log said "via signal SIGKILL" — the last step, not the first.
**Why:** PM2 6.x defaults `kill_signal` to SIGINT. Also, the production server calls
`server.close()` but does not close open SSE/long-poll connections.
**Rule:** listen for both signals, or read `kill_signal`. Measure on the **second** reload after
deploy, when the old instance already runs the fix.

## 8. A test with a hard-coded month is a time bomb

**What:** at 00:0x on the 1st of a month, pre-push failed on a test untouched for 11 days, for
every engineer at once.
**Why:** fixture used `month: 9`; code under test drops past months using `Date.now()`.
**Rule:** tests for date-filtering code pin the clock (`vi.setSystemTime(...)`,
`freezegun`, `travel_to`) from day one. Red test nobody touched + a date boundary ⇒ grep for
literal months/years before blaming someone's work in progress.

## 9. `mysql -N` corrupts base64 output

**What:** a backfill exported `TO_BASE64(content)` with `mysql -N > out.tsv` and decoded it.
4,615 of 7,645 rows (60%) were corrupted after the first 57 bytes.
**Why:** `TO_BASE64` wraps every 76 chars; batch mode escapes the newline as `\` + `n`. The decoder
skips `\` but `n` is valid base64 ⇒ bits shift. Short rows decode fine, so spot checks pass.
**Rule:** strip `\\n` and whitespace before decoding, or use `--raw` / `INTO OUTFILE`. Verify by
comparing decoded length to `CHAR_LENGTH(content)`. A comparison that says 7,645/7,645 changed
when a hand count said ~106 ⇒ suspect the tool.

## 10. Delete job ignores relation semantics

**What:** one `deleteMany` could lose FKs silently (SetNull), wipe link rows (Cascade) or abort
the batch (Restrict). The job printed 435; 2,841 dependent rows went with them.
**Rule:** classify every incoming relation before a hard delete. See `jobs-and-ops.md` §2.

## 11. Job status SUCCESS, integration dead for 23 days

**What:** 26 consecutive runs `SUCCESS`; every token refresh failed.
**Why:** failures were in `output.failed`, not in the status column. Root cause: two stores held
refresh tokens for the same provider account; re-authorizing one invalidated the other.
**Rule:** failures change the status. One credential store per external account.

## 12. A check printed next to an UPDATE does not gate it

**What:** seven data-fix scripts printed `COUNT(*) AS must_be_0` before an `UPDATE`. The seventh
printed 6; the `UPDATE` ran anyway.
**Rule:** put the condition into the `WHERE`, or abort (`SIGNAL SQLSTATE '45000'`) when it fails.

## 13. A public gate that matches one code style reports clean

**What:** the auth gate skipped 53% of route files (372/698) because it matched only one export
style, and reported 0 violations.
**Rule:** gates print `checked N / total M`. Plant a violation to prove the gate fires.

## 14. Deploy "success" does not prove the fix is live

**Rule:** before measuring production, confirm the deployed commit contains yours
(`git merge-base --is-ancestor <yours> <deployed>`). Measure only after the deploy reports
completed.
