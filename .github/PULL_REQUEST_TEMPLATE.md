<!-- One change per PR. What goes where and what gets closed: CONTRIBUTING.md -->

## What and why

<!-- What happened that this fixes or records — with a number (count, size, time, before → after). Link the issue. -->

## Kind

- [ ] case (`cases/<category>/<slug>.md`) or a platform playbook (`cases/<platform>/README.md`)
- [ ] rule / skill text
- [ ] check or tool
- [ ] stack note
- [ ] bug fix
- [ ] docs / showcase

## Checklist

- [ ] `npm test` is green
- [ ] **case:** five sections filled, values from `cases/taxonomy.json`, `npm run cases` run
- [ ] **check / tool / bug fix:** a bad fixture that fires and a similar good fixture that stays silent
- [ ] **check / tool:** ran on a real codebase — before → after counts:
- [ ] **stack note:** from a project I run; `—` where I am not sure
- [ ] line added under `## [Unreleased]` in `CHANGELOG.md` (no version bump)
- [ ] no hostnames, IPs, emails, people or internal ticket numbers (my own product's name and link are fine)
