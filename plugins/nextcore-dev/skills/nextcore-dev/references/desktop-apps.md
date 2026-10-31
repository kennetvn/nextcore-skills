# Desktop apps (Electron) — packaging and measurement traps

Each item happened while shipping a cross-platform Electron app to real users. The common thread: the test ran from
the compiled output on the developer machine, the user ran the installed package.

| Symptom | Cause | How to catch it |
|---|---|---|
| Release crashes on launch: `Cannot find module '<pkg>'` | Packaged from a worktree whose `node_modules` was a junction to a shared folder another session was reinstalling | Package only in a clean checkout with its own `npm ci` (plus the Electron binary install step); after packaging, assert every runtime dependency is inside `app.asar`; launch the portable package and read the window title before publishing |
| Feature works in e2e (18/18), users see "missing binary" | e2e loads `out/main/index.js`, which resolves resources from the repo; the packager config never copied the binary | For every file the main process reads at runtime, a packaging gate lists `<unpacked>/resources` and fails if it is missing |
| macOS: binary hash check fails only on Mac | Ad-hoc signing rewrites bytes, so a pinned SHA no longer matches | Pin hashes per platform after signing, or verify before signing only |
| CPU "0.00 %" idle **and** busy | `getAppMetrics().cpu.percentUsage` returned 0 in both cases | Use the delta of `cumulativeCPUUsage` over a window; always run a busy positive control with the same meter |
| Tray app keeps an extra ~55 MB renderer | `protocol.handle()` registered at `whenReady` spawns a spare renderer (3 → 4 processes in a bare app) | Register custom protocols on first `web-contents-created`; count `--type=renderer` processes against real windows |
| RAM looks 4× worse than Task Manager | Summing `WorkingSetSize` across the process tree double-counts shared DLLs (440 vs 103 MB) | Report private working set (what Task Manager shows) and the raw sum, labelled |
| Embedded webview flashes a loader ~310 ms on every in-app click | `did-start-loading` fires for same-document (`pushState`) navigations too | Drive loading state from `did-start-navigation` with `isMainFrame && !isInPlace`; test with a real SPA, not a static fixture |
| Clicks via CDP hang exactly 5 s and are lost | Window was occluded when the page navigated; no compositor frame, hit-testing times out | Launch with `--disable-features=CalculateNativeWinOcclusion` (merged into the one `--disable-features`), `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`; unit-test the launch args |
| Dark-mode test always light | CDP automation emulates `prefers-color-scheme: light` on every page it drives | `emulateMedia({ colorScheme: null })` per page; positive control on the host window |
| Test double green, real integration empty | The fake returned `{ tail }`, the real API returned `{ terminal: { tail } }` | Write doubles from a recorded real response (keys printed, secrets masked), never from the type you expect |

## Release order that held up

1. Package a dev-channel version first and drive it on **real data** yourself (the e2e fixtures had no row where a
   user pasted a session cookie into a notes column; real data had 54).
2. Destructive or permission-escalation probes run only against a version that already has the fix, with an undo
   ready — a probe against the old version succeeded for real and changed the owner's settings.
3. Then Windows → Linux → macOS. A broken release that cannot start cannot update itself: roll the update channel
   back to the last good manifest immediately.
