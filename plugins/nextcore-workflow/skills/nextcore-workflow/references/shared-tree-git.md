# Shared working tree: git traps that deleted or rewound other agents' work

Several agents (or CLIs) on one machine share one checkout: one index, one `HEAD`, one stash stack, one submodule
pointer. Every row below is a real incident; most passed every hook.

| Command / habit | What happened | Rule |
|---|---|---|
| `git fetch && git reset --soft origin/main`, then add your folder and commit (to "update" an old worktree) | `--soft` moves `HEAD` but keeps the old index; 7 files another agent had pushed meanwhile were committed as **deleted** | Update with `git rebase origin/<trunk>`; read `git diff --name-status origin/<trunk>..HEAD` (all of it) before every push |
| `git stash push -- <file>` / `git stash pop` | The push failed on syntax, `pop` applied **another agent's** stash: 2 conflicted files | Never stash in a shared tree. To test the unpatched version, copy it out: `git show HEAD:<file> > /tmp/x` |
| `git pull --rebase --autostash` | Autostash is a stash; it could not re-apply and left 7 files of another agent's WIP in the stash | Same rule: commit your paths with a pathspec first, or work in a worktree |
| `git reset --soft HEAD~1` to drop your local commit after a push race | Between your two commands another agent rebased and committed; `HEAD~1` dropped **their** commit | Record the absolute sha (`git log -1 --format=%H`) and reset/compare against it; relative refs (`HEAD~1`, `@{u}`) read the state at run time |
| Temporary index: `GIT_INDEX_FILE=… git read-tree origin/main` + `commit-tree` (to push without touching the shared index) | On Windows `read-tree` rejected a path containing `?`, the index came up short, `write-tree` recorded 38 files as deleted; the `--stat` printed in the same command as the push | `git -c core.protectNTFS=false read-tree …`, chain with `&&`, and check `git diff --stat origin/<trunk> <new>` lists only your paths **before** pushing |
| Submodule pointer from a hand-assembled sha (`prefix$(… \| cut -c9-)`) | One character off: the parent repo pointed to a commit that does not exist; no hook caught it | `b=$(git -C <sub> rev-parse <ref>)` then `--cacheinfo 160000,$b,<path>`; compare `git ls-tree HEAD <path>` to `$b` before pushing |
| "Bump the submodule to X" done later without looking | Meanwhile another agent had moved it past X; the bump **rewound** the app | Before bumping: `git merge-base --is-ancestor X <current>`; if X is already an ancestor, do nothing |
| `git commit … \| grep …` then `push`/`tag $(git rev-parse HEAD)` | The commit was rejected by a hook, the pipe hid the exit code, `HEAD` was another agent's commit — it got pushed / tagged as a release | No pipes on commit (or `set -o pipefail`); check `git log -1 --format=%s` is your message before push/tag; tag an explicit sha |
| Removing a worktree whose `node_modules` is a junction/symlink to the main tree | `Remove-Item -Recurse` and `git worktree remove --force` both followed the junction and emptied the main `node_modules` (3 times) | Unlink the junction first (`cmd /c rmdir <link>` / `unlink`), then remove; enforce with a script or a hook that blocks the raw commands |
| Pushed a new file from a clean worktree, kept the untracked copy in the main tree | Next `pull --rebase` in the main tree refused: "untracked working tree files would be overwritten" | Commit the same content in the main tree with a pathspec; the rebase drops the duplicate commit |
| Copying a submodule commit message into the parent repo | `fix: #N …` in the repo that hosts the issues **closed** the issue while acceptance was still pending | In the issue repo, write `chore(scope): #N bump` / `(#N)`; closing keywords only when it is really done |

## The one-minute habit

```bash
git log -1 --format='%H %s'                      # is HEAD mine?
git diff --name-status origin/<trunk>..HEAD      # only my paths? no unexpected D?
git push origin HEAD:<trunk>
```
