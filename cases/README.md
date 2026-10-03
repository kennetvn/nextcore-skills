# Cases

Things that broke, or measured wrong, while AI agents built and ran a production app — each with the symptom, the
cause, the fix with numbers, a way to catch it, and the rule an agent should follow next time.

The skills say *what* to do; cases show *why*, on a specific stack. They are filed on three axes so the library can
grow in any direction:

- **layer** — where it lives: code, data, infra, devops, performance, testing, ai-agents, process;
- **area** — which part of the product: ui, api, database, security, payments, jobs…;
- **stack** — the tools involved: nextjs, prisma, mysql, nginx, pm2, laravel, django… (open list).

Lists and meanings: [taxonomy.json](taxonomy.json). New case: copy [TEMPLATE.md](TEMPLATE.md), then `npm run cases` and
`npm test` (they check the fields, the sections, the index and that nothing private leaked). Cases from other teams
are welcome — open a [lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) or a PR.

## Index

<!-- cases:start -->
8 cases. Newest first inside each group; a case can sit in more than one layer.

### By layer

**code** — application logic, framework and library behaviour

| Case | Area | Stack | Kind |
|---|---|---|---|
| [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-sdk-multistep-text-is-last-step.md) | messaging, backend | vercel-ai-sdk, typescript | incident |
| [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](pm2-reload-sends-sigint.md) | backend | pm2, nodejs, nextjs | incident |
| [The documented Prisma singleton created three connection pools per process in Next.js production](prisma-singleton-three-pools-nextjs.md) | database, backend | prisma, nextjs, mysql | incident |

**data** — schemas, migrations, exports, backfills, data correctness

| Case | Area | Stack | Kind |
|---|---|---|---|
| [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](mysql-batch-escapes-base64-newlines.md) | database, jobs | mysql, nodejs, shell | measurement-trap |

**infra** — web server, reverse proxy, cache, OS, network

| Case | Area | Stack | Kind |
|---|---|---|---|
| [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](nginx-if-zero-is-false.md) | security | nginx, nextjs | measurement-trap |
| [A panel's default nginx config cached /api responses for every site on the server](panel-nginx-default-cached-api.md) | api, backend | nginx, aapanel, nextjs | incident |

**devops** — CI/CD, deploys, process managers, runners

| Case | Area | Stack | Kind |
|---|---|---|---|
| [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](ci-turbopack-cache-crashed-postcss.md) | frontend | nextjs, turbopack, github-actions | incident |
| [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](pm2-reload-sends-sigint.md) | backend | pm2, nodejs, nextjs | incident |

**performance** — memory, CPU, latency, connections, bundle size

| Case | Area | Stack | Kind |
|---|---|---|---|
| [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](ci-turbopack-cache-crashed-postcss.md) | frontend | nextjs, turbopack, github-actions | incident |
| [The documented Prisma singleton created three connection pools per process in Next.js production](prisma-singleton-three-pools-nextjs.md) | database, backend | prisma, nextjs, mysql | incident |

**testing** — tests, gates and checks that pass or fail for the wrong reason

| Case | Area | Stack | Kind |
|---|---|---|---|
| [A test with a hard-coded month turned red for everyone at midnight on the 1st](hard-coded-month-test-time-bomb.md) | backend | vitest, typescript | incident |

**ai-agents** — LLM calls, tool use, agents writing or running the code

| Case | Area | Stack | Kind |
|---|---|---|---|
| [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-sdk-multistep-text-is-last-step.md) | messaging, backend | vercel-ai-sdk, typescript | incident |

### By stack

- **aapanel** — [A panel's default nginx config cached /api responses for every site on the server](panel-nginx-default-cached-api.md)
- **github-actions** — [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](ci-turbopack-cache-crashed-postcss.md)
- **mysql** — [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](mysql-batch-escapes-base64-newlines.md) · [The documented Prisma singleton created three connection pools per process in Next.js production](prisma-singleton-three-pools-nextjs.md)
- **nextjs** — [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](ci-turbopack-cache-crashed-postcss.md) · [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](nginx-if-zero-is-false.md) · [A panel's default nginx config cached /api responses for every site on the server](panel-nginx-default-cached-api.md) · [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](pm2-reload-sends-sigint.md) · [The documented Prisma singleton created three connection pools per process in Next.js production](prisma-singleton-three-pools-nextjs.md)
- **nginx** — [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](nginx-if-zero-is-false.md) · [A panel's default nginx config cached /api responses for every site on the server](panel-nginx-default-cached-api.md)
- **nodejs** — [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](mysql-batch-escapes-base64-newlines.md) · [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](pm2-reload-sends-sigint.md)
- **pm2** — [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](pm2-reload-sends-sigint.md)
- **prisma** — [The documented Prisma singleton created three connection pools per process in Next.js production](prisma-singleton-three-pools-nextjs.md)
- **shell** — [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](mysql-batch-escapes-base64-newlines.md)
- **turbopack** — [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](ci-turbopack-cache-crashed-postcss.md)
- **typescript** — [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-sdk-multistep-text-is-last-step.md) · [A test with a hard-coded month turned red for everyone at midnight on the 1st](hard-coded-month-test-time-bomb.md)
- **vercel-ai-sdk** — [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-sdk-multistep-text-is-last-step.md)
- **vitest** — [A test with a hard-coded month turned red for everyone at midnight on the 1st](hard-coded-month-test-time-bomb.md)
<!-- cases:end -->
