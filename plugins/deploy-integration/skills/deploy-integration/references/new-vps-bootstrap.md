# A new server from address + root + password (road 3)

The person gives an address, `root` and a password. The agent builds the server step by step. Every step:

- is **idempotent** (running it twice changes nothing the second time),
- is **logged** (what ran, what it printed, without secrets),
- **checks before it acts** and can stop between steps,
- marks anything that cannot be undone as **needs approval** and waits.

## 0. Before touching the server

- Read the repo: runtime (Node / Python / PHP / containers), the start command, the port, the health URL if any.
- Agree on the domain(s) and who changes DNS. Changing DNS needs approval.

## 1. Access — the order is the safety

| # | Action | Check before going on |
|---|---|---|
| 1.1 | Log in **once** with the password (from memory, never a file or a variable that is logged) | `whoami` = `root` |
| 1.2 | Pin the host key: record its fingerprint | fingerprint written to the profile |
| 1.3 | Create the deploy user, add it to the admin group | `id deploy` |
| 1.4 | Generate an ed25519 key **in the tool's key store**; install the public half for `deploy` | permissions 700 / 600 |
| 1.5 | Open a **second** session with the key: `ssh -o BatchMode=yes -o PasswordAuthentication=no deploy@<host> sudo -n true` | prints nothing, exit 0 |
| 1.6 | **Needs approval:** `PasswordAuthentication no`, `PermitRootLogin no` (or `prohibit-password`); `sshd -t` then reload | a new key session still works; a password attempt is refused |
| 1.7 | Drop the password from memory | — |

Reversing 1.5 and 1.6 locks everyone out of a server that may have no console access.

## 2. Base system

- Updates; unattended security updates.
- Firewall: allow 22, 80, 443 only (`ufw` or the cloud firewall). Check from outside afterwards.
- fail2ban for SSH; time zone and NTP; locale.
- Swap sized to RAM (none on large-RAM machines, 1–2× on small ones) — a build that runs out of memory kills the app.

## 3. Runtime and the app

- Runtime the repo needs (pinned major version), process manager (PM2 / systemd) or a container runtime.
- Reverse proxy (nginx / Caddy) with TLS from ACME; HTTP → HTTPS redirect.
- The app as a service that restarts on failure and on boot; listening on `127.0.0.1` behind the proxy.
- A health URL that answers `200` only when the app can serve.

## 4. The deploy path — the person chooses

| Option | Fits when | Writes |
|---|---|---|
| CI with a deploy key | the repo already uses a CI | a key **forced to one command** in `authorized_keys`; the workflow; the secret name in the profile |
| CI with a self-hosted runner on the server | builds need the server's network or data | runner service under a non-root user |
| pull-on-server | no CI, a small project | a script that fetches, builds, swaps and health-checks; a cron or webhook calls it |

Whatever is chosen: keep the previous build for a one-command rollback, write the running commit to a file, and fill
`trigger`, `steps`, `verify`, `rollback` in the profile.

## 5. Backups, monitoring, handover

- Database dump + file backups off the server, with a restore that has been run once.
- Monitoring bound to `127.0.0.1` (reached through an SSH tunnel), not to a public port.
- Hand over one table: steps done, ports open (measured from outside), users and keys (fingerprints), how to undo each
  step, what is still pending approval.

## Never

- Write the password or a private key into the profile, a log, an issue, a commit or a chat message.
- Turn off password login before a key login has been proven in a separate session.
- Open a database or monitoring port to the internet "for now".
