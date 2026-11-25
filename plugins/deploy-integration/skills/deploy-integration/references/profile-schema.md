# Deploy profile — schema v1

One file, `deploy-profile.json`, at the root of the repo it describes, committed with the code. Not in a local-only
folder: the profile has to change in the same commit as the pipeline it describes, and the checker has to see both.

Checked by `deploy-profile-check` (exit 1 on any error). Template: [deploy-profile.example.json](../templates/deploy-profile.example.json).

## Top level

| Key | Type | Required | Meaning |
|---|---|---|---|
| `version` | `1` | yes | schema version |
| `project` | string | no | a short name |
| `forbid` | string[] | no | rules for every target, written as data ("site X on the same server is not ours — do not touch") |
| `targets` | object[] | yes, ≥ 1 | one entry per thing that gets deployed (web app, static site, worker…) |

## Target

| Key | Type | Required | Meaning |
|---|---|---|---|
| `id` | kebab-case | yes, unique | `web`, `docs`, `worker` |
| `app` | string | no | what runs, in one line (framework, process name, port) |
| `channel` | `gha` · `vps-ssh` · `paas` · `manual` | yes | how a deploy happens |
| `repoPath` | path | no (`.`) | where the app lives in this repo (a sub-folder or submodule); workflow and PaaS paths start here |
| `trigger.push` | `{ branch, paths[] }` | when it deploys on push | `paths` copied exactly, negations included (`!docs/**`) |
| `trigger.dispatch` | boolean | yes for `gha` | the pipeline can be started by hand |
| `trigger.dispatchInputs` | string[] | no | the inputs, one line each |
| `trigger.who` | string | no | who presses: "push to main", "a person runs `make deploy`" |
| `gha.repo` | `owner/name` | no | where the workflow runs, when not obvious |
| `gha.workflow` | path | yes for `gha` | relative to `repoPath` |
| `gha.name` | string | no | the workflow's `name:`; checked when present |
| `gha.runsOn` | string[] | recommended | every runner label that can run a deploy job |
| `gha.secrets` | NAME[] | yes for `gha` | every `secrets.X` the workflow reads (not `GITHUB_TOKEN`) — checked both ways |
| `gha.vars` | NAME[] | yes for `gha` | every `vars.X` the workflow reads — checked both ways |
| `gha.flags` | `{ NAME: text }` | no | a gate variable and its **measured** state ("unset ⇒ off, read with `gh variable get` on <date>") |
| `host.role` | string | yes for `vps-ssh` (or `address`) | `web` · `db` · `runner` · `backup` · your own |
| `host.address` | string | no | fallback when no role registry exists |
| `host.user` · `host.path` · `host.hostKey` | string | no | deploy user, app directory, host key fingerprint (`SHA256:…`) |
| `paas.provider` · `paas.config` | string | for `paas` | `vercel` + `vercel.json`; the config file must exist |
| `steps` | string[] | no | the pipeline in order, one line each |
| `verify[]` | `{ url, expect, via?, note? }` | yes, ≥ 1 | `expect` is an HTTP status; `via` = `host` (asked on the server) or `public` (from outside) |
| `deployedSha` | `{ file, expect }` | recommended | where the running commit is written, so verify checks the version, not only the status |
| `rollback.how` | string | yes | how to go back, in words |
| `rollback.auto` | boolean | no | the pipeline rolls back by itself on a failed health check |
| `rollback.command` | string | no | the one command a person or agent runs |
| `forbid` | string[] | no | rules for this target only |

## Secrets

Names only, in `UPPER_SNAKE`. The checker fails on:

- a value under any key whose name says password / pwd / secret / token / private key / api key / credential;
- a pasted private key (`-----BEGIN … PRIVATE KEY-----`);
- strings shaped like common tokens (GitHub, cloud access keys, API keys).

A password given for a first login (road 3) is used once in memory and never written anywhere, including this file.

## What "matches the workflow" means (`gha`)

| Profile | Workflow | Rule |
|---|---|---|
| `trigger.push` present | `on.push` present | both or neither |
| `trigger.push.branch` | `on.push.branches` | listed |
| `trigger.push.paths` | `on.push.paths` | same set |
| `trigger.dispatch` | `on.workflow_dispatch` | same truth value |
| `gha.name` | `name:` | equal |
| `gha.secrets` | every `secrets.X` outside comments | same set |
| `gha.vars` | every `vars.X` outside comments | same set |
| `gha.runsOn` | file text | each label appears |

The comparison is textual on purpose (no YAML library, zero dependencies): it catches the drift that happens in
practice — a path added to the filter, a new secret, a renamed workflow — and stays readable when it fires.
