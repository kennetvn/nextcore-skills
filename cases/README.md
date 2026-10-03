# Cases

Things that broke, or measured wrong, while AI agents built and ran a production app — each with the symptom, the
cause, the fix with numbers, a way to catch it, and the rule an agent should follow next time.

The skills say *what* to do; cases show *why*, on a specific stack. Experience is shared, not code: every case is
written from scratch, without the product's source or data.

**One folder per subject.** Platforms you integrate with — `zalo/`, `facebook/`, `discord/` — and engineering areas —
`devops/`, `infra/`, `backend/`, `data/`, `ai-agents/`, `testing/`, `design/`… A platform folder starts with a
**playbook** (`README.md`): what still works and when it was last checked, how to re-check it yourself, how to deploy
it, the failures seen so far. The cases next to it are single incidents: symptom with numbers, cause, fix, how to
catch it, the rule.

Each case also carries **layer**, **area** and **stack** in its frontmatter, so it can be found from any direction.
Lists and meanings: [taxonomy.json](taxonomy.json).

New case: copy [TEMPLATE.md](TEMPLATE.md) to `cases/<category>/<slug>.md`; new platform: start its folder with
[PLAYBOOK-TEMPLATE.md](PLAYBOOK-TEMPLATE.md) as `README.md`. Then `npm run cases` and `npm test` (fields, sections,
the index, nothing private). Cases from other teams are welcome — open a
[lesson issue](https://github.com/kennetvn/nextcore-skills/issues/new?template=lesson.yml) or a PR.

## Index

<!-- cases:start -->
12 cases in 8 folders. Newest first in each folder.

### [zalo](zalo/) — Zalo — official OA API and unofficial personal-account libraries (zca-js)

| Case | Layer | Stack | Kind |
|---|---|---|---|
| ["Message history" from the unofficial Zalo library only goes back to when the session was created](zalo/history-only-since-the-session-started.md) | code, data | zca-js | measurement-trap |
| [Conversations the account owner started from the phone had no customer name — the sender name was the owner's](zalo/outgoing-first-conversation-has-no-name.md) | code, data | zca-js, nodejs | incident |
| [Two test accounts on the same workspace made the AI assistant answer itself, about every 4 seconds](zalo/two-test-accounts-bots-answered-each-other.md) | ai-agents, process | zca-js, llm | incident |

### [ai-agents](ai-agents/) — LLM calls, tool use, agents writing or running the code

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-agents/ai-sdk-multistep-text-is-last-step.md) | ai-agents, code | vercel-ai-sdk, typescript | incident |

### [backend](backend/) — server code, ORM, request handling

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [The documented Prisma singleton created three connection pools per process in Next.js production](backend/prisma-singleton-three-pools-nextjs.md) | performance, code | prisma, nextjs, mysql | incident |

### [data](data/) — exports, backfills, migrations, data correctness

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](data/mysql-batch-escapes-base64-newlines.md) | data | mysql, nodejs, shell | measurement-trap |

### [design](design/) — screens, drawings, specs, design process

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [56 screens shipped from approved drawings, none of which said what problem they solved](design/drawings-shipped-without-a-problem.md) | process, ai-agents | nextjs, claude-design | measurement-trap |

### [devops](devops/) — CI/CD, deploys, process managers, runners

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](devops/ci-turbopack-cache-crashed-postcss.md) | devops, performance | nextjs, turbopack, github-actions | incident |
| [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](devops/pm2-reload-sends-sigint.md) | devops, code | pm2, nodejs, nextjs | incident |

### [infra](infra/) — web server, reverse proxy, cache, OS

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](infra/nginx-if-zero-is-false.md) | infra | nginx, nextjs | measurement-trap |
| [A panel's default nginx config cached /api responses for every site on the server](infra/panel-nginx-default-cached-api.md) | infra | nginx, aapanel, nextjs | incident |

### [testing](testing/) — tests and gates that pass or fail for the wrong reason

| Case | Layer | Stack | Kind |
|---|---|---|---|
| [A test with a hard-coded month turned red for everyone at midnight on the 1st](testing/hard-coded-month-test-time-bomb.md) | testing | vitest, typescript | incident |

### By stack

- **aapanel** — [A panel's default nginx config cached /api responses for every site on the server](infra/panel-nginx-default-cached-api.md)
- **claude-design** — [56 screens shipped from approved drawings, none of which said what problem they solved](design/drawings-shipped-without-a-problem.md)
- **github-actions** — [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](devops/ci-turbopack-cache-crashed-postcss.md)
- **llm** — [Two test accounts on the same workspace made the AI assistant answer itself, about every 4 seconds](zalo/two-test-accounts-bots-answered-each-other.md)
- **mysql** — [The documented Prisma singleton created three connection pools per process in Next.js production](backend/prisma-singleton-three-pools-nextjs.md) · [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](data/mysql-batch-escapes-base64-newlines.md)
- **nextjs** — [The documented Prisma singleton created three connection pools per process in Next.js production](backend/prisma-singleton-three-pools-nextjs.md) · [56 screens shipped from approved drawings, none of which said what problem they solved](design/drawings-shipped-without-a-problem.md) · [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](devops/ci-turbopack-cache-crashed-postcss.md) · [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](devops/pm2-reload-sends-sigint.md) · [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](infra/nginx-if-zero-is-false.md) · [A panel's default nginx config cached /api responses for every site on the server](infra/panel-nginx-default-cached-api.md)
- **nginx** — [nginx `if ($var)` treats the string "0" as false, so a header block let "0" through](infra/nginx-if-zero-is-false.md) · [A panel's default nginx config cached /api responses for every site on the server](infra/panel-nginx-default-cached-api.md)
- **nodejs** — [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](data/mysql-batch-escapes-base64-newlines.md) · [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](devops/pm2-reload-sends-sigint.md) · [Conversations the account owner started from the phone had no customer name — the sender name was the owner's](zalo/outgoing-first-conversation-has-no-name.md)
- **pm2** — [PM2 reload sends SIGINT, so a SIGTERM-only shutdown handler never ran](devops/pm2-reload-sends-sigint.md)
- **prisma** — [The documented Prisma singleton created three connection pools per process in Next.js production](backend/prisma-singleton-three-pools-nextjs.md)
- **shell** — [mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill](data/mysql-batch-escapes-base64-newlines.md)
- **turbopack** — [A self-hosted CI runner's Turbopack cache grew to 8.1 GB and crashed the CSS loader](devops/ci-turbopack-cache-crashed-postcss.md)
- **typescript** — [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-agents/ai-sdk-multistep-text-is-last-step.md) · [A test with a hard-coded month turned red for everyone at midnight on the 1st](testing/hard-coded-month-test-time-bomb.md)
- **vercel-ai-sdk** — [In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped](ai-agents/ai-sdk-multistep-text-is-last-step.md)
- **vitest** — [A test with a hard-coded month turned red for everyone at midnight on the 1st](testing/hard-coded-month-test-time-bomb.md)
- **zca-js** — ["Message history" from the unofficial Zalo library only goes back to when the session was created](zalo/history-only-since-the-session-started.md) · [Conversations the account owner started from the phone had no customer name — the sender name was the owner's](zalo/outgoing-first-conversation-has-no-name.md) · [Two test accounts on the same workspace made the AI assistant answer itself, about every 4 seconds](zalo/two-test-accounts-bots-answered-each-other.md)
<!-- cases:end -->
