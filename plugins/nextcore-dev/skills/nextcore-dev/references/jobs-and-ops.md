# Background jobs, resources, operations

## 1. One job system

Anything that runs on a schedule (sweep, cleanup, digest, reminder, aggregation, health check)
is a registered job. Not a server crontab line, not a supervisor cron restart, not a DB
`EVENT`, not a `setInterval` in app code.

A job definition has:

```ts
defineJob({
  name: 'expire-pending-orders',          // kebab-case, unique
  description: 'Cancels unpaid orders older than 30 min',  // shown in the admin UI
  schedule: '*/5 * * * *',
  lockTtl: '10m',                          // DB mutex: one run across all instances
  timeout: '5m',
  handler: async (ctx) => ({ processed, failed: failures.length, failures }),
});
```

Why each part:

- **Lock in the DB.** With 2+ app instances, an in-process timer runs twice. Double-sending a
  reminder is annoying; double-charging is not.
- **Run log** (start, end, status, output) with retention (e.g. 30 days). "Did it run?" must be a
  query, not a guess.
- **Status reflects failure.** If `failed > 0`, the run is `PARTIAL` or `FAILED`. What happened:
  a token-refresh job reported `SUCCESS` 26 times in a row while every refresh failed — the
  failures lived in the output JSON. An integration was dead for 23 days.
- **Description is required.** Nobody deletes a job they cannot explain.
- Legacy external cron endpoints may stay for rollback, but they **delegate** to the job handler.

## 2. Delete jobs read the relation graph first

`deleteMany` looks like one table. It is the whole graph of relations pointing at that table,
and the foreign keys decide what happens:

```
Order.room        SetNull   ⇒ delete room ⇒ orders lose roomId, 0 errors, 0 logs
OrderRoom.room    Cascade   ⇒ delete room ⇒ link rows vanish
Order.property    Restrict  ⇒ delete property with orders ⇒ throws, the WHOLE batch fails
```

One statement, two opposite failure modes. Before enabling any hard delete:

1. List every relation that points at the model.
2. `Cascade` ⇒ count those rows and report them. A job that printed "435 deleted" also removed
   2,841 availability rows — 7x the number it showed.
3. `Restrict` ⇒ exclude those parents in the query, or the batch dies.
4. `SetNull` ⇒ block. It is the dangerous one because it is silent.
5. Default the job to report-only; enabling deletion is a setting.
6. Lock it with a test that has a **positive control** (a fixture that must be excluded). A
   production count of 0 can mean "safe" or "the table is empty"; in that case it was empty.

## 3. Scan cursors record what was scanned

An incremental job stores "scanned up to T" where T is the **actual** time of the last
completed scan, not an estimate of the next one. Writing a future timestamp created a blind gap
that swallowed three updates; only a set comparison (30 open → 29 open) caught it.

## 4. Resources: suspect configuration before traffic

Incident: load 9.22 on 12 cores, 4 queries/second, 25 DB connections, all jobs together ~5 s per
30 min. Real demand was near zero. Two self-made loops ate the machine:

1. **RSS limit = heap limit.** The supervisor restarts on RSS; `--max-old-space-size` caps only the
   V8 heap. Image processing, Buffers and DB drivers allocate outside the heap. With both set to
   2 GB, the app was killed 647 times at 2.15–2.63 GB, each restart paying the most CPU-heavy
   phase (compile/JIT). Fix: RSS limit ≥ heap + 512 MB. Still hitting it ⇒ a real leak; find it,
   do not raise the limit again.
2. **A respawn loop in the web server's log pipe.** A child process died and was respawned
   endlessly. Counting zombies showed "1" — harmless-looking. The PID changed on every sample.

After fixing both: load 3.47, idle CPU 32% → 78%, system CPU 29.6% → 3.3%.

## 5. Measure the machine correctly

- **`%CPU` in `ps`/`top` is a lifetime average.** A 4-minute-old process at 111% was busy at
  startup. For now: delta of `/proc/<pid>/stat` fields 14+15 over 5 s, or `top -H` per thread.
- **`load average` is lagging and counts I/O wait.** Measured: load 13.04 while `top` showed
  77.8% idle, 0.0 wa, 0.0 st. Read idle, `wa`, `st` before calling it overload.
- **Respawn loops show up as changing PIDs**, not as counts.
- **Memory pressure events:** `memory.events high` counts normal reclaim and only grows
  (3.8 M, +88 k/hour). Alert on `max > 0` or `oom_kill > 0`.
- **Convert `dmesg` uptime seconds to age** before calling an OOM current. Two "OOM" lines were
  26 days old.
- **Read limits from the system** (`systemctl show <unit> -p MemoryMax -p MemoryHigh`), not from
  docs. A doc said 4G/3G while the unit ran 6G/5G.
- **Measure before you change.** Without a "before" number you cannot tell "I broke it" from
  "it was already like that".

## 6. Caps on everything in the background

- CI runners building on the production host: hard `MemoryMax` **and** `CPUQuota`. Without a
  memory cap the kernel OOM-killed twice and picks victims by score — it can choose the DB.
- `CPUWeight` is not a cap. It only divides CPU under contention. Measured: a build took 790% CPU
  on 12 cores and a page went from ~120 ms to 11.6 s. Adding `CPUQuota=600%` fixed latency;
  cost: deploy 15–16 min → 19m41s.
- Editing a systemd drop-in and `daemon-reload` updates `systemctl show`, but the running cgroup
  can keep the old value. Apply with `systemctl set-property --runtime` and read the cgroup file.
- Image libraries default to concurrency = core count. Load them through one module that sets
  concurrency (e.g. 2) and cache size. Decode once and clone per variant: decoding a 4.5 MB photo
  per variant produced ~600 MB of garbage for one image.
- Keep the framework's optimized-image cache across deploys. Swapping the build directory wiped
  1,902 optimized images; every view re-encoded at peak load.

## 7. Do not produce what nobody reads

A heavy job built image variants and blur placeholders. Measured consumers: 0 reads of the
variants field, 0 uses of the placeholder. Before optimizing a job, check its output is used.
Sometimes the fix is deleting the job.

## 8. Graceful shutdown

Process managers differ. PM2 6.x sends **SIGINT** on reload by default, not SIGTERM. A handler
listening only for SIGTERM never ran; the instance was SIGKILLed after the timeout. Listen for
both, or read `kill_signal` in the config. Long-lived connections (SSE, long-poll) keep a
process alive until the kill timeout unless you close them.
