# Many agents, one tree, one trunk

Setting: the human opens several independent agent CLIs on **one working tree** and one trunk
branch. Agents do not wait for each other. The danger is shared state: the git index, submodule
pointers, shared files, the production database.

## One trunk, deploy only through CI

**Happened:** an audit found 21 remote branches (12 merged and dead), 43 tags (14 for one feature),
and the main branch 13 days behind production, because prod was deployed straight from a feature
branch. Main ≠ prod, so nothing ever needed merging back. Agents had also spawned ~25 per-task
branches.
**Rule:**
- One branch. Agents commit directly to it. No per-agent branches, no "integration" branches.
- `git pull --rebase` before every push. Parallel agents serialize through rebase.
- Production deploys only from trunk, only through CI, with a concurrency group that queues
  deploys instead of cancelling them.
- Quality gates (typecheck, tests, lint) run in CI too, not only in a local pre-push hook.
- If a manual deploy path exists, its lock lives **on the target server**, not on the caller.
  Ours used `flock` on the caller: Git Bash on Windows has no `flock`, so the guard skipped itself;
  and each task had its own `$TMPDIR`, so two agents locked two different files. Both silent.
- Tags are immutable release markers after deploy. No WIP or `pre-*` checkpoint tags.

## Isolation = worktree on the same branch

Long or risky task → `git worktree add <repo>/.worktrees/wt-<task> <trunk>`.
Inside the repo, never `../` (it litters the parent folder). When done: commit to trunk, remove the
worktree, delete leftover folders.

## Claim before you start

Each session claims an issue plus a file area (`claim <issue> --paths "<glob>"`), releases when done.
A commit hook can refuse commits that mention an issue claimed by another session.

**But a free lock is not proof nobody is working.**
**Happened:** a claim succeeded on an issue another session had been working on for hours without a
lock. Both sessions built the same slice; each added a different column to the **production**
database. The other landed 5 minutes earlier. ~30 minutes lost, plus a rollback script on prod.
**Rule:** before building a slice of a live issue: (1) latest comment from another session in the
last ~2 hours? (2) commits mentioning the issue in the last 3 hours, in every repo? (3) list active
agents and **ask by message**. Never change a prod schema before the answer.

## Commit with explicit paths

Never `git add -A` or `git add .` on a shared tree: it swallows other sessions' work in progress.
Stage explicit paths, or `git commit -- <paths>`.

**Pathspec protects files, not hunks.**
**Happened:** a commit with the correct three paths included one shared schema file. That file also
held ~20 lines of another session's unfinished work: three relation lines went to trunk, the three
models they pointed to did not. Schema generation failed in CI; **production deploy failed twice in
a row**, blocking every session. Every local gate was green, because local gates read the working
tree and CI builds from the commit.
**Rule:** before committing a shared file (schema, job registry, menu config), run
`git diff HEAD -- <file>` as a separate step. Foreign hunks → build a blob with only your part and
point the index at it:

```bash
git show HEAD:<file> > /tmp/f          # start from HEAD
# apply only your change to /tmp/f
B=$(git hash-object -w /tmp/f)
git update-index --cacheinfo 100644,"$B",<file>
git commit -F msg.txt                   # no pathspec: the index is already right
```

Then validate what CI will build: `git show HEAD:<file>` → run the validator on that copy.

**Pathspec re-reads the working tree.** `git commit -- <path>` overwrites an `update-index` you just
did for that path. After pinning a submodule pointer with `update-index`, commit **without** a pathspec.

## Submodule pointers

- Bump the pointer only to a commit **you** created **and pushed**.
- "Does the pointer contain my commit?" (`merge-base --is-ancestor`) is the wrong question. Ask
  "does this SHA exist on the remote?" We twice pointed the outer repo at another session's
  unpushed commit; fresh clones could not fetch the submodule, and nothing failed at commit time.
- Run `git show --stat HEAD` after every commit. Check what actually went in.
- Parity: each submodule commit gets a matching outer pointer commit (a Stop hook can enforce it).

## Other sessions' files

Uncommitted files you did not create: leave them. No `reset`, `checkout`, `stash`, or committing
them on someone's behalf. If an end-of-session hook reports "N uncommitted files" that are not
yours, end normally and say so.

## Lanes are for avoiding collisions, not for defining your job

**Happened:** an agent split work into lanes with another session, finished its lane, reported "no
active work left", and slowed its loop to 60 minutes. There were 27 open issues; 5 had zero comments
— nobody had read them. One hid a real operational bug.
**Rule:** before "waiting for a signal", list open issues and read the zero-comment ones first.
A long wait is justified only when the **whole** queue is blocked, and the report says so.

## Subagents

- At most 2 subagents in parallel on one machine.
- Give each its file paths, acceptance criteria, and report path. No session history.
- Each ends with a status: DONE · DONE_WITH_CONCERNS · BLOCKED · NEEDS_CONTEXT.
- BLOCKED means something must change before a retry. Same failure 3 times → escalate.
- Do not run the human's dev server. Pipe build/test output through `tail`.
