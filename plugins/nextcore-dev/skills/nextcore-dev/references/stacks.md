# Stack notes

The principles are stack-neutral. This table shows where each one lives in common frameworks.
Pick the column you use; build the missing piece once, centrally.

## 1. Principle → framework

Plain PHP and WordPress have no column because there is no framework hook: see §2 for how to build the guard and count it.
The FastAPI and Go columns come from the frameworks' documentation, not yet from an incident on a product here —
corrections from people running them in production are welcome (one framework per PR).

| Principle | Next.js (route handlers + Prisma) | Laravel | Django (DRF) | Rails | Express / Nest | FastAPI | Go (net/http + chi) |
|---|---|---|---|---|---|---|---|
| One envelope | `handler()` wrapper returns `{success,data}` | API Resource + `JsonResource::wrap`, or a response macro | custom `Renderer` + exception handler | `render_success` / `render_error` concern in `ApplicationController` | Express: `res.ok()` helper; Nest: global interceptor | generic `Envelope[T]` Pydantic model as `response_model` | `writeJSON(w, status, envelope{…})` helper, the only writer |
| Error codes | typed error classes → wrapper maps to status + code | custom exceptions + `render()` in `Handler` / `withExceptions` | `APIException` subclasses with `default_code` | `rescue_from` per error class | Nest: exception filter; Express: error middleware | `AppError` + `@app.exception_handler(AppError)` | typed `*AppError`; handlers return `error`, one adapter maps it with `errors.As` |
| Input validation | Zod schema in the handler | `FormRequest` | serializer `is_valid(raise_exception=True)` | strong params + model/form object validation | Nest: `ValidationPipe` + DTO; Express: Zod/Joi middleware | Pydantic models in the signature; override the `RequestValidationError` handler so 422 keeps the envelope | `json.Decoder` + `DisallowUnknownFields()` + struct-tag validator |
| Auth on every route | wrapper with `roles`; gate script counts routes | `auth` middleware on route groups; `Gate`/`Policy` | `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]` | `before_action :authenticate_user!` in base controller | Nest: global `AuthGuard` + `@Public()`; Express: router-level middleware | `APIRouter(dependencies=[Depends(require_user)])` | `r.Group(func(r chi.Router) { r.Use(auth) … })` |
| Reasoned public exemption | `// PUBLIC_ENDPOINT — reason` | route outside group + comment, listed in a test | `permission_classes = [AllowAny]` + comment | `skip_before_action` + comment | `@Public()` with a reason string argument | separate `public_router` without the dependency + comment | route registered outside the group + comment |
| Gate that counts | script over `app/api/**/route.ts` | test over `Route::getRoutes()` asserting middleware | test over URL resolver asserting permission classes | test over `Rails.application.routes` + controller callbacks | test over Nest `DiscoveryService` / Express `app._router.stack` | test over `app.routes` asserting `require_user` in each route's dependencies | test with `chi.Walk` asserting the auth middleware on every route |
| Tenant isolation | `where: { tenantId }` in every query, or a Prisma extension | global scope on models | `get_queryset()` filtered by `request.user` | `default_scope` avoided; `current_tenant.records` | repository layer adds tenant filter | dependency yields a tenant-scoped query helper; SQLAlchemy `with_loader_criteria` | repository functions take `tenantID`; no query helper without it |
| Money as decimal | `Decimal @db.Decimal(18,2)` + decimal.js | `decimal:2` cast + brick/money | `DecimalField(max_digits=18, decimal_places=2)` | `decimal precision: 18, scale: 2` + `BigDecimal` | TypeORM/Prisma decimal + decimal.js | `Decimal` + SQLAlchemy `Numeric(18, 2)` | `shopspring/decimal` or integer minor units; never `float64` |
| Explicit onDelete | `onDelete:` on every `@relation` | `->restrictOnDelete()` / `->cascadeOnDelete()` | `on_delete=models.PROTECT` / `CASCADE` (required arg) | `foreign_key ..., on_delete: :restrict` + `dependent:` | TypeORM `onDelete`; Prisma as Next.js | `ForeignKey(…, ondelete="RESTRICT")` + `passive_deletes` | `ON DELETE RESTRICT` in the SQL migration |
| Hand-written migrations | `migrations/manual-*/up.sql` + ledger; deploy runs `generate` only | migrations are code; review `--pretend` SQL before prod | review `sqlmigrate` output; `RunSQL` for risky ops | review `db:migrate` SQL; `strong_migrations` gem | Prisma as Next.js; TypeORM: review generated SQL | Alembic autogenerate, then review `alembic upgrade --sql` | goose / golang-migrate SQL files (hand-written by default) |
| Lock mode declared | `ALGORITHM=INSTANT` in the SQL | raw `DB::statement` for ALTER with ALGORITHM | `RunSQL` with ALGORITHM | `execute` with ALGORITHM; `strong_migrations` warns | raw SQL | `op.execute()` with ALGORITHM | in the SQL file |
| One job system | job registry + DB lock + run table | Scheduler + queued Jobs + `withoutOverlapping()->onOneServer()` | Celery beat + `django-celery-results`; lock with `select_for_update` or Redis | ActiveJob + Solid Queue / Sidekiq-cron; `with_lock` | BullMQ repeatable jobs; Nest `@nestjs/schedule` + Redis lock | Celery / ARQ / RQ; not `BackgroundTasks` for work that must survive a restart | river (Postgres) or asynq (Redis); not bare goroutines on a `time.Ticker` |
| Job status reflects failure | handler returns counts; failed > 0 ⇒ status FAILED | throw or `$this->fail()` | raise; result backend records state | raise; retries + dead set | throw; BullMQ marks failed | raise; result backend records state | job returns `error` ⇒ retried / discarded and recorded |
| Idempotency key | table `idempotency_keys` UNIQUE(key,user) | middleware + cache/DB lock | middleware + model with unique constraint | concern + unique index | interceptor + Redis `SET NX` | dependency + unique constraint | middleware + unique index |
| Graceful shutdown | listen SIGINT + SIGTERM; close SSE | Horizon/queue `--stop-when-empty`; Octane signals | gunicorn `graceful_timeout`; Celery warm shutdown | Puma `on_worker_shutdown`; Sidekiq quiet | `app.enableShutdownHooks()`; `server.close()` + track sockets | uvicorn `--timeout-graceful-shutdown`; lifespan shutdown | `signal.NotifyContext(SIGINT, SIGTERM)` + `srv.Shutdown(ctx)`; track SSE/hijacked conns yourself |
| Real 404 | middleware / existence check before streaming | `findOrFail` → 404 | `get_object_or_404` | `find` raises → 404 | throw `NotFoundException` | `raise HTTPException(404)` | `errors.Is(err, sql.ErrNoRows)` ⇒ 404 |
| DB client singleton | cache on `globalThis` in **all** envs | framework-managed | framework-managed | framework-managed | one module-level instance; watch hot-reload duplicates | one engine per process (lifespan); workers × pool size = connections | one `*sql.DB` per process; set `SetMaxOpenConns` |

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

**FastAPI.** A plain `def` endpoint runs in a thread pool (40 threads by default); an `async def` endpoint that
calls a blocking driver stalls the whole event loop — pick one per endpoint on purpose. Validation errors come back as
FastAPI's own 422 shape unless you override the `RequestValidationError` handler, which silently breaks a single
envelope. `BackgroundTasks` die with the worker: anything that must finish goes to a real queue. Each gunicorn/uvicorn
worker owns its own connection pool, so connections = workers × pool size.

**Go (net/http + chi).** A `nil` slice encodes as `null`, not `[]` — the UI's Empty state needs `data: []`, so
initialise list results with `make([]T, 0)`. `http.Server{}` without `ReadHeaderTimeout` / `WriteTimeout` keeps slow
clients forever. `json.Decoder` accepts unknown fields unless told otherwise. `srv.Shutdown` does not wait for
hijacked or streaming connections. Every `rows` needs `defer rows.Close()` and a `rows.Err()` check, or the pool
drains under load.

**Plain PHP / WordPress (no framework).** Every `.php` file under the web root is a public endpoint
unless something proves otherwise — there is no router to hang a guard on. Make one front file
(`bootstrap.php` / `index.php` + rewrite) or one `require_once 'guard.php'` as the **first line** of every
endpoint, and count it: a script that lists every `.php` reachable from the web root and checks that
its require chain reaches the guard (stub files that `require` a module count only if the module is
guarded). Deny `TEMP_*`, `_deploy*`, `debug*`, `*.bak` in the web server config. WordPress: REST routes
need a `permission_callback` (never `__return_true` without a written reason); `admin-ajax` actions
registered with `wp_ajax_nopriv_` are public by definition — list them.
Real case: an admin area was 25/25 guarded, but its `api/` folder was 0/27; two "temporary, delete
after use" upload endpoints wrote base64 POST bodies straight into a `.php` file — remote code execution
for anyone — and survived a full service migration because no check counted unguarded endpoints. A
first-time count found them in minutes.

## 3. Same traps, every stack

- Timezones: store UTC, set the DB session time zone explicitly, convert at display.
- Reverse proxy caching in front of any framework will cache `/api` if enabled at the top level.
- Supervisors (PM2, systemd, Docker) send different stop signals; read the config.
- A process memory limit below heap + native allocations causes a restart loop on any runtime.
