# Shell traps for agents (Windows + Git Bash + PowerShell included)

Agents run thousands of shell commands; these are the ones that silently did the wrong thing or leaked a secret.

| Symptom | Cause | How to catch it / rule |
|---|---|---|
| A tag was appended to **every** line of a file (15 lines, reached the trunk) | `L=$(grep -n pattern f \| cut -d: -f1); sed -i "${L}s/$/ tag/" f` — grep missed (non-ASCII pattern), `L` empty, sed without an address applies to all lines | Edit by content in a script that asserts exactly one match, or `[ -n "$L" ] \|\| exit 1`; after any mechanical edit `grep -c tag` must equal the expected count |
| `taskkill` "succeeded", 6 stale browser windows piled up, 4 of 5 screenshots captured the wrong window | In Git Bash `$!` is an MSYS PID, not the Windows PID; taskkill missed silently | Start processes you must kill with PowerShell `Start-Process -PassThru` and kill `.Id`; count leftover processes after each run; a screenshot is evidence only when exactly one window of that run exists |
| A database password printed in the session log | `Get-Content script.sh \| ssh host "bash -s"`: PowerShell prepends a BOM, bash fails on line 1 and echoes the line **after** expanding the variable | Never pipe scripts from PowerShell into `bash -s`; write the file without BOM/CR, copy it, run it, delete it |
| A session cookie appeared in the transcript although it was read from a file | The browser-automation "run code" tool echoes the code it ran, values included | Inject credentials once into the browser context, then reuse the context; use short-lived sessions for measurement |
| A test red only in the pre-push gate (4/4), green alone (5 s) and in the full suite | The gate runs type-check, two linters and tests in parallel; the test loaded a whole registry and hit its timeout under contention | Reproduce under the same load (linters in background, `--reporter=json`, read per-test `duration`); fix the test's cost, do not raise the timeout |
| A gate "always passed" | It sat after an early `exit 0` that every commit reached | For each gate, a positive control through the real hook must turn it red (see `measurement-discipline.md`) |
