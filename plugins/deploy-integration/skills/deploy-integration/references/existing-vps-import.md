# Importing a server the agent can already reach (road 2)

Ask first: "I can see you already reach `<alias>`; may I add it to the server list and read what runs there?"
Everything below is read-only on the server.

## 1. Read the local SSH setup — paths and fingerprints, never key contents

```bash
grep -nE '^\s*(Host|HostName|User|Port|IdentityFile|ProxyJump)\b' ~/.ssh/config
ssh-keygen -lf ~/.ssh/id_ed25519.pub                 # fingerprint of a key, from its PUBLIC half
ssh-keygen -F <host> -f ~/.ssh/known_hosts           # is the host key already pinned?
```

Moving a private key into the tool's encrypted key store (an OS keychain or equivalent) is allowed with consent; it is
read once, never printed, never sent off the machine, never written to a log or a profile. Other import sources (an
exported session file from a desktop SSH client) go through the same store.

## 2. Prove access without a prompt

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 <alias> true && echo ok
```

`BatchMode=yes` fails instead of asking for a password, so an agent never hangs on a prompt or types a password.

## 3. Probe the stack (read-only)

```bash
ssh <alias> 'cat /etc/os-release | head -2; uptime; nproc; free -m | head -2; df -h / | tail -1'
ssh <alias> 'ss -tlnp 2>/dev/null | head -30'                       # what listens, on which address
ssh <alias> 'systemctl list-units --type=service --state=running --no-pager | head -40'
ssh <alias> 'command -v nginx caddy apache2 httpd pm2 docker podman node python3 php mysql psql redis-server'
ssh <alias> 'pm2 ls 2>/dev/null; docker ps --format "{{.Names}} {{.Image}} {{.Ports}}" 2>/dev/null'
ssh <alias> 'ls /etc/nginx/sites-enabled /etc/nginx/conf.d /www/server/panel 2>/dev/null'   # last one: a control panel
ssh <alias> 'for d in /etc/letsencrypt/live/* ~/.acme.sh/*/; do echo "$d"; done 2>/dev/null'
```

From the answers:

| Seen | Role |
|---|---|
| reverse proxy + app process listening on a local port | `web` |
| database listening (local only, ideally) | `db` |
| a CI runner service (`actions.runner.*`) | `runner` |
| backup jobs / large archive directories | `backup` |

## 4. Write it down

- `host.role`, `host.address` (if there is no role registry), `host.user`, `host.path`, `host.hostKey` (fingerprint).
- Sites on the same server that the person does not own: one line each in `forbid`.
- If a pipeline (road 1) already deploys here, link the target to this host instead of creating a second path.

## Do not

- Change anything on the server during the import.
- Copy keys between machines, or keep a key on a machine that does not need it.
- Trust a host whose key changed since `known_hosts` was written — stop and ask.
