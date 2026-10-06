---
title: Our pre-commit secret check had never run, because it sat after an early exit
date: 2026-10-06
layer: [testing, devops]
area: [security]
stack: [git, bash]
kind: incident
skill: dev
---

## Symptom
The repository's pre-commit hook had a "block committing secrets" step. A value-based audit of tracked files still
found a production database password in five planning/notes files, a database URL with an inline password, and a
personal access token (already revoked) in a handoff note.

## Cause
The hook lived in a parent repository that contains the web app as a git submodule. The secret step came after
"if no web files are staged, exit 0", and the web-file filter matched paths like `<submodule>/src/x.ts`. A parent repo
never stages files inside a submodule, only the submodule pointer, so the filter was always empty and every commit
exited before the secret step. The submodule's own hook had no secret step at all. The step also matched only four
patterns and would not have seen a password pasted into a markdown note.

## Fix
A scanner runs before any early exit on every commit. It reads the real values from the app's `.env` files (skipping
public-by-design keys such as `NEXT_PUBLIC_*` and a key that ships inside the browser extension) and blocks any added
line containing one, plus high-precision provider prefixes (GitHub, Anthropic, OpenAI, Google, AWS, Slack, private-key
blocks, DB URLs with a real password). It never prints values, only `file:line` and the variable name. Audit noise was
removed with evidence: regex/sed lines that parse `DATABASE_URL` are not passwords. The leaked values were redacted and
password rotation tracked separately.

## How to catch it
For every gate in a hook, run a positive control through the hook itself: stage a fake token and confirm a non-zero
exit. Read the hook top to bottom and list every early `exit 0` with the condition that reaches it. When printing lines
that may contain secrets during an investigation, mask by the secret's value, not by a format regex: the author of this
fix printed a password because the note used ``pw `...` `` instead of the `user:pass@` shape the mask expected.

## Rule
A gate is only real if a positive control through the actual hook turns it red. Scan secrets by value as well as by
pattern.
