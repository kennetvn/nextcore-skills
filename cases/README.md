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
0 cases. Newest first inside each group; a case can sit in more than one layer.

### By layer

### By stack

<!-- cases:end -->
