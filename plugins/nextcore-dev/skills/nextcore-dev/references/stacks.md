# Stack notes

The principles are stack-neutral. This table shows where each one lives in common frameworks.
Pick the column you use; build the missing piece once, centrally.

## 1. Principle → framework

| Principle | Next.js (route handlers + Prisma) | Laravel | Django (DRF) | Rails | Express / Nest |
|---|---|---|---|---|---|
| One envelope | `handler()` wrapper returns `{success,data}` | API Resource + `JsonResource::wrap`, or a response macro | custom `Renderer` + exception handler | `render_success` / `render_error` concern in `ApplicationController` | Express: `res.ok()` helper; Nest: global interceptor |
| Error codes | typed error classes → wrapper maps to status + code | custom exceptions + `render()` in `Handler` / `withExceptions` | `APIException` subclasses with `default_code` | `rescue_from` per error class | Nest: exception filter; Express: error middleware |
| Input validation | Zod schema in the handler | `FormRequest` | serializer `is_valid(raise_exception=True)` | strong params + model/form object validation | Nest: `ValidationPipe` + DTO; Express: Zod/Joi middleware |
| Auth on every route | wrapper with `roles`; gate script counts routes | `auth` middleware on route groups; `Gate`/`Policy` | `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]` | `before_action :authenticate_user!` in base controller | Nest: global `AuthGuard` + `@Public()`; Express: router-level middleware |
| Reasoned public exemption | `// PUBLIC_ENDPOINT — reason` | route outside group + comment, listed in a test | `permission_classes = [AllowAny]` + comment | `skip_before_action` + comment | `@Public()` with a reason string argument |
| Gate that counts | script over `app/api/**/route.ts` | test over `Route::getRoutes()` asserting middleware | test over URL resolver asserting permission classes | test over `Rails.application.routes` + controller callbacks | test over Nest `DiscoveryService` / Express `app._router.stack` |
| Tenant isolation | `where: { tenantId }` in every query, or a Prisma extension | global scope on models | `get_queryset()` filtered by `request.user` | `default_scope` avoided; `current_tenant.records` | repository layer adds tenant filter |
| Money as decimal | `Decimal @db.Decimal(18,2)` + decimal.js | `decimal:2` cast + brick/money | `DecimalField(max_digits=18, decimal_places=2)` | `decimal precision: 18, scale: 2` + `BigDecimal` | TypeORM/Prisma decimal + decimal.js |
| Explicit onDelete | `onDelete:` on every `@relation` | `->restrictOnDelete()` / `->cascadeOnDelete()` | `on_delete=models.PROTECT` / `CASCADE` (required arg) | `foreign_key ..., on_delete: :restrict` + `dependent:` | TypeORM `onDelete`; Prisma as Next.js |
| Hand-written migrations | `migrations/manual-*/up.sql` + ledger; deploy runs `generate` only | migrations are code; review `--pretend` SQL before prod | review `sqlmigrate` output; `RunSQL` for risky ops | review `db:migrate` SQL; `strong_migrations` gem | Prisma as Next.js; TypeORM: review generated SQL |
| Lock mode declared | `ALGORITHM=INSTANT` in the SQL | raw `DB::statement` for ALTER with ALGORITHM | `RunSQL` with ALGORITHM | `execute` with ALGORITHM; `strong_migrations` warns | raw SQL |
| One job system | job registry + DB lock + run table | Scheduler + queued Jobs + `withoutOverlapping()->onOneServer()` | Celery beat + `django-celery-results`; lock with `select_for_update` or Redis | ActiveJob + Solid Queue / Sidekiq-cron; `with_lock` | BullMQ repeatable jobs; Nest `@nestjs/schedule` + Redis lock |
| Job status reflects failure | handler returns counts; failed > 0 ⇒ status FAILED | throw or `$this->fail()` | raise; result backend records state | raise; retries + dead set | throw; BullMQ marks failed |
| Idempotency key | table `idempotency_keys` UNIQUE(key,user) | middleware + cache/DB lock | middleware + model with unique constraint | concern + unique index | interceptor + Redis `SET NX` |
| Graceful shutdown | listen SIGINT + SIGTERM; close SSE | Horizon/queue `--stop-when-empty`; Octane signals | gunicorn `graceful_timeout`; Celery warm shutdown | Puma `on_worker_shutdown`; Sidekiq quiet | `app.enableShutdownHooks()`; `server.close()` + track sockets |
| Real 404 | middleware / existence check before streaming | `findOrFail` → 404 | `get_object_or_404` | `find` raises → 404 | throw `NotFoundException` |
| DB client singleton | cache on `globalThis` in **all** envs | framework-managed | framework-managed | framework-managed | one module-level instance; watch hot-reload duplicates |

## 2. Per-stack notes

**Next.js.** Route handlers are the API surface; server actions are a second surface with
their own auth story — keep them rare (see `security.md` §4). `notFound()` after streaming
starts cannot change the status. ISR needs `generateStaticParams`. Middleware location matters:
a file the framework never loads protects nothing. Prisma: never read a very large schema file
whole into an AI context window; extract one model with
`awk '/^model Name \{/,/^\}/' schema.prisma`.

**Laravel.** `FormRequest` + Policy + API Resource covers validation, authorization and shape.
`Route::middleware('auth:sanctum')->group(...)` by default; public routes outside the group,
listed in a test. Scheduler with `onOneServer()` needs a shared cache driver (Redis/DB), not
`file`. Eloquent `$casts` with `decimal:2` returns strings; do arithmetic with a money library.

**Django / DRF.** Set `DEFAULT_PERMISSION_CLASSES` to authenticated; every `AllowAny` is an
exemption to review. Custom exception handler builds the envelope. `on_delete` is required
already — choose `PROTECT` for ledgers. Celery: `acks_late` + idempotent tasks; a beat schedule
on two hosts runs twice without a lock.

**Rails.** `before_action :authenticate_user!` in `ApplicationController`;
`skip_before_action` is the exemption list — grep it. Strong params for input. `rescue_from` maps
errors to codes. `dependent: :destroy` runs callbacks row by row — slow and partial on big
graphs; prefer DB-level FKs. `strong_migrations` catches locking DDL.

**Express / Nest.** Express has no default guard: mount auth at the router level and test
the route table. Nest: global guard + `@Public()` decorator with a required reason argument,
global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, exception filter for
the envelope. For jobs, BullMQ with Redis gives locks and failure state.

## 3. Same traps, every stack

- Timezones: store UTC, set the DB session time zone explicitly, convert at display.
- Reverse proxy caching in front of any framework will cache `/api` if enabled at the top level.
- Supervisors (PM2, systemd, Docker) send different stop signals; read the config.
- A process memory limit below heap + native allocations causes a restart loop on any runtime.
