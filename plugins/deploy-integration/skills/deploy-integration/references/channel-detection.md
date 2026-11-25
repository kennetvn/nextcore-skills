# Detecting the deploy channel (road 1)

Read-only. Nothing here changes the repo, the pipeline or the server.

## Files that mean "a path already exists"

| File / pattern | Channel | Read next |
|---|---|---|
| `.github/workflows/*.yml` with `ssh`, `scp`, `rsync`, `docker push`, `pm2`, `kubectl`, `helm`, `flyctl`, `vercel`, `wrangler` | `gha` | `on:`, `concurrency`, `runs-on`, the deploy step, health check, rollback, `vars.*` gates |
| `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, `.circleci/config.yml`, `Jenkinsfile`, `azure-pipelines.yml` | CI other than GitHub (`manual` in v1, note the file) | the stage that deploys and its rules |
| `vercel.json`, `netlify.toml`, `fly.toml`, `render.yaml`, `railway.json`, `app.yaml`, `Procfile` | `paas` | build command, regions, health checks; the dashboard may also deploy on push |
| `docker-compose*.yml`, `Dockerfile`, `k8s/`, `helm/`, `kustomization.yaml` | packaging — the channel is whoever runs it | find the runner (CI step or a server cron) |
| `ecosystem.config.*` (PM2), `*.service` (systemd), `nginx*.conf`, `Caddyfile` | server-side pieces | process names, ports, health URL |
| `scripts/deploy*`, `deploy/`, `Makefile` target `deploy`, `package.json` script `deploy` | `manual` or called by CI | who calls it — grep the workflows for the script name |

## Commands

```bash
gh workflow list                                   # names + state (an "disabled_manually" workflow is not the path)
gh run list -w "<name>" -L 5 --json conclusion,createdAt,updatedAt,headSha
gh secret list ; gh variable list                  # names only; values are unreadable, do not try to read them
gh variable get <GATE>                             # "not found" = unset = the gate is off
gh api repos/{owner}/{repo}/environments --jq '.environments[].name'
grep -nE 'runs-on|self-hosted' .github/workflows/*.yml
```

## Questions the inventory must answer

1. Which file deploys which target, and on what event (branch + paths, manual, schedule)?
2. Who presses: a push by anyone, a person clicking, an agent?
3. Where does it build and where does it run (hosted runner, self-hosted labels, the server itself)?
4. Which secrets and variables does it read (names), and which variable gates it?
5. What does it measure after deploying, and from where?
6. How does it go back, and has that ever been run?
7. What did the last five runs do (green/red, minutes)?

Write the answers into the profile and a short table for the person. Leave the pipeline as it is.
