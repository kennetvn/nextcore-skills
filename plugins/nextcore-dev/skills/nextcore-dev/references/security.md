# Secure by default

The goal is a number, not a feeling: **routes checked / routes total, exemptions, violations.**

## 1. Every route proves its guard

Accept exactly one of these per route file:

| # | Proof | Example |
|---|---|---|
| 1 | Shared handler with roles | `handler({ roles: ['ADMIN'] }, async (req, ctx) => …)` |
| 2 | Session check | `const s = await getSession(); if (!s) throw Unauthenticated()` |
| 3 | Named auth helper | `requireAuth()`, `requireAdmin()` |
| 4 | Public marker **with a reason** | `// PUBLIC_ENDPOINT — public price list, reads no user data` |

The marker must be followed by a separator and a reason, within the first ~30 lines. An empty
marker is the easiest way to switch the gate off without anyone noticing later. The reason is
what the next engineer reads to decide whether to keep it public.

Signature-verified webhooks use their own marker (`// WEBHOOK_ENDPOINT`) and verify the
signature before parsing the body.

## 2. Exemptions are a short, path-based list

Typical: `/webhooks/`, `/health`. That is all.

Do not add a pattern to "let it through for now". A path pattern exempts every route that will
ever be created under it.

## 3. The gate must count

A gate that prints only "OK" can be wrong for months.

What happened: the auth gate looked for `export function GET(`. The standard style was
`export const GET = handler(...)`. The gate silently skipped 372 of 698 route files (53%) and
reported "0 violations". It was fixed to print:

```
auth gate: checked 728/739 routes · 11 exempt (listed) · 0 violations
```

Rules for any security gate:

- Print `checked N / total M`. If N < M, list what was skipped and why.
- Plant a violation in a temp file; the gate must fail and name the file.
- Run it in pre-commit **and** CI. Pre-commit can be skipped.

## 4. One mutation path

All mutations go through one handler that does, in order:

```
rate limit → authenticate → authorize (roles + tenant) → validate (schema) → run → map errors → emit events
```

Why not per-action checks (e.g. framework server actions with inline `if (!session)`): every
action is a public endpoint. Each one re-implements the check. One forgotten line is an open
endpoint. In the source project: ~630 REST handlers behind one wrapper vs 1 server-action file;
the REST surface had 0 auth violations, and adding a second convention would double what must
be guarded.

Use server-side form actions only when all three hold: progressive enhancement matters, no
non-browser caller needs the endpoint, and a shared wrapper gives the same guarantees.

## 5. Do not trust input

- Validate body, query and params with a schema on the server. Coerce types there.
- Re-derive identity from the session, never from the body (`userId` in a POST body is a hint
  at best).
- **Tenant isolation:** for owned data, the query includes the owner:
  `where: { id, tenantId: session.tenantId }`. "Logged in" is not "allowed to read this row".
- Search with raw SQL ⇒ re-apply the tenant filter by hand. Raw queries bypass ORM middleware.
- File uploads: check size before buffering, check type by content, store outside the web root.

## 6. Middleware is not a guard you can see

Middleware that buffers bodies applies its size limit to every matched path. Removing an upload
path from the matcher (to allow large files) removes CSRF and payload checks for it too; the
route must re-add them explicitly.

What happened: a middleware file was written but never loaded by the framework (wrong location).
Its protection was absent for 24 days. Nothing failed. Verify middleware by hitting a protected
path and reading the response, not by reading the file.

## 7. Secrets

- Scan for secrets by **value** (known prefixes, high entropy), not only by variable names.
- Never print headers, cookies or env in logs or in test output; automation tools that echo the
  code they run will echo embedded tokens.
- One store per credential. Two stores holding refresh tokens for the same provider account
  rotate each other out — one of them is always dead (see `backend-traps.md`).

## 8. Checklist per new route

- [ ] Guard proof present (one of four)
- [ ] Roles declared at the handler, not checked inline
- [ ] Tenant filter on every owned-data query
- [ ] Schema validation on body/query/params
- [ ] Rate limit appropriate to the action (auth, OTP, money: strict)
- [ ] Gate output still shows `checked N/M` with M increased by one
