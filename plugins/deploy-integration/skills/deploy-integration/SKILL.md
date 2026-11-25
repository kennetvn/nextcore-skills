---
name: deploy-integration
description: Learn and follow any project's deploy path instead of inventing one — one deploy profile per repo (channel, trigger, target, steps, verify, rollback, forbidden), three roads (an existing pipeline such as GitHub Actions read-only, a server the agent can already reach, a brand-new server given as address + root + password) and a checker that keeps the profile true to the workflow. Use when asked to deploy, set up deployment, take over or document how a project ships, add a server, or when a deploy, health check or rollback fails.
metadata:
  description_vi: "Hiểu và làm đúng quy trình deploy của bất kỳ dự án nào thay vì tự chế — một hồ sơ deploy mỗi repo (kênh, kích hoạt, đích, bước, xác minh, lùi, điều cấm), ba đường (đã có pipeline như GitHub Actions — chỉ đọc · VPS agent đã vào được · VPS mới chỉ có IP + root + mật khẩu) và bộ kiểm giữ hồ sơ khớp workflow thật. Dùng khi được bảo deploy, dựng deploy, tiếp quản hay ghi lại cách một dự án lên prod, thêm máy chủ, hoặc khi deploy / health check / lùi bản hỏng."
---

# deploy-integration

An agent that deploys a project it did not set up usually does one of two wrong things: it invents a new path (an
`ssh … && git pull && pm2 restart` next to a CI pipeline that already does it properly), or it follows the path
half-way and calls a single `200` "done". This skill makes the agent **learn the project's own path first, write it
down once, and act only through it.**

Distilled from a production product whose deploys are run by AI agents: one Next.js app on a self-hosted runner with
three possible build machines, one static site with an off-by-default auto-deploy flag, both on a server shared with
sites that belong to someone else.

---

## 1. One deploy profile per repo

`deploy-profile.json` at the repo root, committed with the code it describes. Schema and every field:
[references/profile-schema.md](references/profile-schema.md). Template: [templates/deploy-profile.example.json](templates/deploy-profile.example.json).

| Field | Answers |
|---|---|
| `channel` | `gha` (CI pipeline) · `vps-ssh` (agent runs commands on a server) · `paas` (Vercel, Fly, Render…) · `manual` |
| `trigger` | push to which branch and paths · manual dispatch · a command a human runs — and **who** presses it |
| `host` | the server **role** (`web`, `db`, `runner`, `backup`) first; address only as a fallback |
| `steps` | what the pipeline does, in order, in one line each |
| `verify` | URLs and the status expected, measured from where (`host` or `public`) |
| `rollback` | automatic or not, and the one command that goes back |
| `forbid` | data, not code: "do not touch site X on the same server", "deploy never runs migrations" |

Secrets appear by **name only** (`VPS_SSH_KEY`), never by value. The checker refuses a profile that holds a password,
a private key or a token.

```bash
npx -y -p github:kennetvn/nextcore-skills deploy-profile-check deploy-profile.json   # exit 1 on drift
```

For a `gha` target it compares the profile with the workflow file **both ways**: push branch and paths, manual
dispatch, workflow name, every `secrets.*` and `vars.*` the workflow reads, runner labels. Run it in CI next to the
workflow, so changing the pipeline without the profile goes red.

## 2. Pick the road from evidence, not from habit

| What you find | Road |
|---|---|
| A workflow / pipeline file with a deploy step, a PaaS config, a `scripts/deploy*` | **1 — read the existing path** |
| No pipeline, but a server you can already reach (`~/.ssh/config` entry, key that logs in) | **2 — import the server** |
| Nothing but an address, `root` and a password from the person | **3 — build from zero** |

Several roads can be true at once (a pipeline that deploys to a server you can also reach). Road 1 wins: the pipeline
is the path, the server access is for measuring. Detection list: [references/channel-detection.md](references/channel-detection.md).

## 3. Road 1 — an existing pipeline: read, do not rewrite

Inventory only; nothing changes unless the person asks.

```bash
ls .github/workflows/ && grep -lE 'ssh|rsync|scp|docker push|vercel|flyctl|pm2|kubectl|helm' .github/workflows/*
gh workflow list ; gh run list -w <workflow> -L 5          # last runs: green/red, duration
gh secret list ; gh variable list                          # NAMES only — values are unreadable by design
```

Read every workflow that deploys: its `on:` block (branch, paths, dispatch inputs), `concurrency`, `runs-on`
(hosted or self-hosted labels), the deploy step, the health check, the rollback, and any flag that gates it
(`vars.AUTO_DEPLOY == 'true'`). A flag that is **unset** is off — say so with the command that read it.

Output: the profile plus one table the person can read — *which road, who presses, what is measured after, how to go
back*. Then use the path exactly: push to the branch it listens to, or `gh workflow run` it; follow the run to
`completed` before measuring anything.

## 4. Road 2 — a server you can already reach

With the person's consent, import it instead of making them set it up again. Full procedure:
[references/existing-vps-import.md](references/existing-vps-import.md).

1. Read `~/.ssh/config` and `known_hosts`: aliases, users, ports, key **paths**, host key fingerprints. A private key
   is moved into the tool's encrypted key store, never printed, never copied off the machine.
2. `ssh -o BatchMode=yes <alias> true` — proves the key works without ever prompting.
3. Probe the stack read-only: OS, web server, process manager, containers, control panel, listening ports,
   certificates, disk. Assign a role. Fill `host` and, if road 1 also applies, link the two.

## 5. Road 3 — a new server from address + root + password

The order is the safety. Full checklist with commands: [references/new-vps-bootstrap.md](references/new-vps-bootstrap.md).

1. Log in with the password **once**; create a deploy user and an ed25519 key held by the tool; **log in with the key
   in a second session and only then** disable password and root login. The other order locks you out.
   Forget the password: it never reaches a file, a log, an issue or a commit.
2. Updates, firewall (22/80/443 only), fail2ban, time zone, swap sized to RAM.
3. Runtime from what the repo uses (Node + process manager · Python · containers), reverse proxy + TLS, the app as a
   service, a health URL.
4. The deploy path: a CI pipeline (deploy key or self-hosted runner) **or** pull-on-server — the person chooses;
   write it in the profile.
5. Backups and monitoring bound to `127.0.0.1`; hand over a table: what was done, which ports are open, how to undo.

Every step is idempotent, logged, and can stop half-way. Anything that cannot be undone — deleting, changing DNS,
turning off password SSH — waits for the person to approve it.

## 6. After every deploy

- **Wait for the run to finish.** Measuring while it is `in_progress` measures the old version.
- **Measure the version, not only the status.** A cluster with two instances can answer `200` from the old one
  right after a reload. Write the deployed commit to a file on the server (`.deploy-sha`, `/release.txt`) and compare
  it with the commit you shipped.
- **Measure from outside** (`public`) as well as on the host: the proxy, TLS and caching sit in between.
- **Keep the previous build** and a one-command rollback. Measured: swapping the kept build back takes seconds;
  reverting in git and rebuilding took 15–20 minutes of a broken site. The kept build cost ~1.9 GB of disk.
- **Do not deploy the same commit twice.** Before building, look for an earlier green run of that commit (and for a
  newer commit that will deploy anyway) and skip; keep an explicit "force" input for the rare re-deploy.

## 7. Secrets and keys

- Profile, logs, issues, commits: names only. The checker enforces it for the profile.
- A key a job needs goes to a temp directory of that job, with its own `known_hosts` and `StrictHostKeyChecking=yes`,
  and is deleted in an `always()` step — never `~/.ssh` of the machine running it. Measured: a smoke test that wrote
  its key into `~/.ssh` overwrote the owner's own key.
- A CI key on the server should be **forced to one command** (`command=` in `authorized_keys`): no shell, no copy,
  no forwarding.

## 8. For an orchestrator

The same knowledge as four situations a scheduler can ask about, each answered from the profile:

| Situation | Facts in | Decision out |
|---|---|---|
| detect channel | repo file list, workflow texts, reachable hosts | road 1 / 2 / 3 + filled profile draft |
| choose road | profile, what the person asked | push / dispatch / command, who must approve |
| verify after deploy | run status, `verify` URLs, deployed commit | done · wait · failed with the measured number |
| roll back | failed verify, `rollback` | run the command or ask for approval; measure again |

## 9. Do not

- Add a second deploy path next to a working one.
- Edit someone's pipeline when you were only asked to read it.
- Touch anything listed in `forbid`, even when it is on the same server and you have root.
- Call it done on a `200` measured before the run completed or from the wrong version.
