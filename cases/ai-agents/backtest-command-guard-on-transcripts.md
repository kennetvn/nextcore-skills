---
title: An off-the-shelf command blocker for coding agents was wrong 12 times out of 12 on our real history
date: 2026-10-06
layer: [ai-agents, process]
area: [security]
stack: [claude-code, git]
kind: measurement-trap
skill: workflow
---

## Symptom
Our coding agents run without permission prompts, and the rules "never `git add -A` in the shared tree", "never stash
someone else's work", "never skip hooks" existed only as prose. One agent's bare `git commit` swept up a file another
session had staged. We took the force-push and dangerous-command blockers from a popular public hooks catalog as the fix.

## Cause
Before enabling them we replayed every shell command from our own agent transcripts (10 sessions, 2,594 commands)
through the rules. The pattern-based blockers matched 12 commands and all 12 were legitimate: work inside a separate
git worktree (its own index), `git add -A -- <dir>` with an explicit pathspec, a forced push of a release *tag*, and a
scoped `git stash push -- <file>` used for an A/B test. The danger is not the verb, it is the verb applied to the
shared working tree without a pathspec.

## Fix
The guard now blocks only: whole-tree `add`/`commit -a`/`reset --hard`/`checkout .`/`clean -f`/bare `stash` when the
effective directory (tracking `cd` and `git -C`) is the shared tree and not a worktree; a bare `git commit` only when the
index already holds files the command does not mention; forced or deleting pushes to branches (tags pass);
`commit --no-verify` anywhere. An explicit bypass variable exists for emergencies. Replay result: 2 blocks in 2,618
commands, both correct. The replay also exposed three parser bugs that synthetic tests missed: heredoc bodies read as
commands, `\"` inside double quotes splitting a string, and `~` inside a Windows 8.3 short path treated as `$HOME`.

## How to catch it
Agent transcripts are a ready-made corpus of real commands. Replay any new PreToolUse rule over all of them and read
every command it would block before turning it on. Count blocks per rule; a rule that fires only on legitimate work is
worse than none, because the agent learns to route around it.

## Rule
A command guard is ready when its replay over real history shows zero false positives, not when its unit tests pass.
