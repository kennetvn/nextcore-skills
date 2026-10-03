# API contract

One shape for every JSON response. The caller should never need to read the route's source to
know whether a call failed.

## 1. Envelope

```ts
type Ok<T>   = { success: true;  data: T; warnings?: string[] };
type Page<T> = { success: true;  items: T[]; nextCursor: string | null; hasMore: boolean };
type Fail    = { success: false; error: { code: ErrorCode; message: string; fields?: Record<string, string> } };
```

- The flag is at the top level. Always.
- One key per resource. If `/bookings` returns `data`, it returns `data` forever.
- `fields` carries per-input validation messages, keyed by the input name the form uses.
- `warnings` is for partial success ("3 of 50 rows skipped: missing price"). Never drop rows
  silently.

A shared wrapper produces this shape. Handlers return values or throw typed errors; they do not
build envelopes by hand. In the source project, routes using the wrapper had 0 shape violations;
hand-built responses carried 144 legacy violations in 88 files.

## 2. Error codes

Codes are a closed, documented list. Messages are localized and free to change.

| Code | HTTP | UI state | UI action |
|---|---|---|---|
| `VALIDATION_FAILED` | 422 | field errors | inline under each input from `fields` |
| `UNAUTHENTICATED` | 401 | session lost | redirect to sign-in, keep return URL |
| `FORBIDDEN` | 403 | permission | explain who can do this; no retry button |
| `NOT_FOUND` | 404 | not found | page-level not found, real 404 status |
| `CONFLICT` | 409 | stale data | "Changed by someone else" + reload |
| `RATE_LIMITED` | 429 | throttled | disable action, show retry-after |
| `PAYMENT_REQUIRED` / domain codes | 402 / 422 | business rule | specific message per code |
| `UPSTREAM_FAILED` | 502 | dependency down | transient toast + retry |
| `INTERNAL` | 500 | error | generic message; details only in server logs |

Rules:

- UI branches on `code`. A copy edit to `message` must never change behavior.
- Map ORM errors centrally (unique violation ⇒ `CONFLICT`, record missing ⇒ `NOT_FOUND`).
  Never leak the raw ORM message or a stack trace.
- Add a code when the UI needs to do something different. Do not add a code per sentence.

## 3. Error display matches the code

| Context | Channel |
|---|---|
| Field validation | inline under the input, linked with `aria-describedby` |
| Action failed, transient | one toast, ~4 s, retry action if it makes sense |
| Page data failed | error boundary with a "Try again" button |
| Auth lost / payment broken | full-page route, alert to engineers |
| Expected empty | empty-state component, not error styling |

Never: `catch (e) { console.error(e) }` alone in client code. The spinner stops and the user
learns nothing. Keep the log line and add one user-facing channel (toast, field error, rethrow).

## 4. Pagination

- Cursor, not offset, for anything that grows: `?cursor=<lastId>&limit=50` ⇒
  `{ items, nextCursor, hasMore }`.
- Stable sort with a unique tiebreaker (`ORDER BY created_at DESC, id DESC`).
- Cap `limit` on the server. Clients ask for 10,000 rows when nobody stops them.
- Totals are expensive on large tables. Return `hasMore`; compute counts only where a design
  element actually shows the count (and the field map says so).

## 5. Idempotency for money

Any route that moves money or creates an order accepts an `Idempotency-Key` header.

```
1. Client generates a UUID per user intent (not per click, not per retry).
2. Server: INSERT key with status=pending, UNIQUE(key, user_id).
   - insert succeeds ⇒ do the work, store the response, mark done.
   - unique violation, status=done ⇒ return the stored response.
   - unique violation, status=pending ⇒ 409 CONFLICT ("in progress").
3. Keep keys 24–72 h.
```

Payment webhooks get the same treatment keyed on the provider's transaction id. Providers
redeliver. Checksum or signature mismatches should alert, not hard-reject, when the money has
already moved — a rejected real payment is stuck money.

## 6. Changing a live contract

Callers you cannot redeploy (mobile apps, browser extensions, partners) run old versions for
weeks. A "zero callers in source" grep does not prove a path is dead.

1. Add the new key or route beside the old one.
2. Ship the server first.
3. Ship clients that read the new key.
4. Watch request logs for ≥7 days. Remove the old key only at zero real hits.

Reversing the order breaks silently: the old client reads `undefined` as "empty".

## 7. Realtime and caching

- A mutation that changes what another screen shows emits an event (SSE/WebSocket channel) or
  invalidates a cache tag explicitly. "The list will refresh eventually" is a bug report waiting.
- Responses for signed-in users are `Cache-Control: private, no-store` unless proven otherwise.
  A reverse proxy with caching enabled at the top level caches `/api` too, even when the
  `/api` block never mentions caching (see `backend-traps.md`).

## 8. Contract checklist per route

- [ ] Response uses the envelope through the shared wrapper
- [ ] Every failure path has a code from the list and a correct HTTP status
- [ ] 401/403/404 are distinguishable from empty
- [ ] Lists are cursor-paginated with a server-side limit
- [ ] Money/order routes accept an idempotency key
- [ ] Input validated by a schema on the server
- [ ] Key names match the field map in `spec.md`
- [ ] A test asserts the envelope shape for success and for one failure
