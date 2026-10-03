# Claude Design vs Artifact canvas — one canvas, many accounts, many agents

Field notes from running design-first on a production codebase with **two Claude accounts used in turns**
(one runs out of quota → switch to the other) and **several Claude Code CLI sessions in parallel** on the
same repo. Everything below is a mistake that actually happened, with the fix that stuck.

## 1. Three things are all called "Claude Design" — they are not the same

| Kind | Where it lives | Can a coding agent read/write it? | Use it for |
|---|---|---|---|
| **Artifact of type "Design"** (a canvas of `.dc.html` artboards) | claude.ai artifact URL | **Yes** — read files, publish files, list files | every drawing an agent makes or maintains |
| **claude.ai/design project** | the Claude Design app | **No** — it does not even show up in the artifact list of its own owner | a human sketching by hand |
| **Artifact of type "Design System"** | claude.ai artifact URL | Yes (design-system sync tools) | the token source the Design app draws with |

Rules of thumb:

- An agent should draw in an **Artifact canvas**, never in a Design-app project: the agent cannot read the
  project back, so the next session redraws from scratch.
- A Design-app project gets into the repo only by a human: *Share → Export → Project HTML (.zip)*, drop the zip
  somewhere the agent can unzip and commit.
- A Design System artifact is a **copy** of your tokens. If nothing regenerates it from your real token file,
  it drifts (we found one still carrying the palette from before a rebrand). Regenerate it from code, don't edit it by hand.

## 2. Artifacts belong to an account. Your repo doesn't

What went wrong: each account built its own canvases. From account B every link made on account A
returned `artifact not found`, so the agent "helpfully" drew a second CRM canvas. After a few weeks there were
**82 loose artifacts across two accounts** and two competing "official" canvases for the same area.

What stuck:

1. **The repo is the source of truth.** One folder per drawing, next to the code:
   ```
   design-previews/<slug>/project/*.dc.html    # artboards, exactly as published
   design-previews/<slug>/project/canvas.json  # board layout
   design-previews/<slug>/SOURCE.json          # where it is published, version id, design card (below)
   ```
2. **One master canvas for the whole product.** Each product area is a *page*; each drawing is a folder
   `project/<slug>/` inside it — the same path as in the repo. A small script rebuilds `project/canvas.json`
   (boards laid out per page, a title note per drawing) from the repo, so the canvas can always be regenerated.
3. **Share the master canvas once** with the other account as *Can edit*. Both accounts now publish to the
   same URL; switching accounts no longer loses anything. (Sharing is a UI action — an agent can't do it.)
4. **New drawing = new folder in the repo**, then republish the master canvas. Never create a new artifact
   per feature again; that is how the 82 appeared.

### Accounts can switch in the middle of a session

The human may run `/login` to the other account while an agent is mid-task. Symptom: a batch of reads
that worked a minute ago all return `not found`. **Check which account you are on before concluding
anything was deleted** — list your artifacts and see whether the master canvas shows as yours or as shared.

## 3. Many CLI agents, one canvas, one git index

- **One publisher at a time.** Whoever rebuilds the master canvas takes a lock (we use a tiny claim script
  keyed by issue + paths) and tells the other sessions. Two sessions rebuilding the index at once overwrite
  each other's boards.
- **Read before you publish.** The human edits the canvas directly in the browser (move a board, add a note,
  change text) and each save is a new version. Read `project/canvas.json` first; if the publish is refused
  with "you haven't viewed the latest version", re-read, merge the human's change into the repo, rebuild,
  publish again. Third refusal in a row → stop and ask.
- **Send only what changed** (new/changed artboards + the index); remove a file by sending `null` for its path.
- **Commit with a pathspec** — `git commit -- design-previews/` — never `git add -A` or a bare commit. Parallel
  CLI sessions share one index; a bare commit once swept another session's half-done rename into ours.
- **Large single-file HTML artifacts** (base64 fonts/images, 2–4 MB) don't belong in git history. Keep a
  record (URL, size, sha256) instead, and prefer the multi-file canvas format for anything you'll keep.

## 4. A design card on every drawing

The owner's complaint: "I open a drawing and can't tell what it's for or whether it matches our brand."
So every drawing carries a **card**, rendered as a sticky note next to it on the canvas:

| Field | Filled by | Example |
|---|---|---|
| Feature | human/agent | "CRM · suggested replies in the inbox" |
| Live link(s) | declared, **machine-checked** against real routes | `/dashboard/crm` ✓ |
| Why this design | declared | the problem it solves, from the ticket — no marketing words |
| Built? | declared + file path | built / partly / not yet |
| Devices | **measured** from artboard widths | desktop ≥1024 · tablet 600–1023 · phone ≤599 |
| 5 states | **measured** from artboard names/titles | empty · loading · error · success (+ data) |
| Brand colour DNA | **measured** | % of hex values in the artboards that are real tokens; ≥85% passes |
| Brand type DNA | **measured** | only the product's font families |

Green card = all pass; orange = something is off and must be fixed before asking for approval.

What the measurement found on our first run (59 drawings): 19 used a font the product doesn't ship,
several sat at 9–17% token colours (generic grey ramps instead of the palette), and almost none had a
tablet artboard. None of that was visible by eyeballing the canvas.

## 5. Cleaning up

- **Archive, don't delete, inside the repo.** Mark a drawing archived (date + measured reason) and the
  canvas build skips it; the files stay in git. Good reasons are measurable: byte-identical to another
  drawing, drawn for a screen that was removed (route gone / redirect), superseded by a newer version.
- **Before deleting a loose artifact, compare versions**: the version id you exported must equal the
  live version id. Otherwise someone edited it after export — export again first.
- **Agents can't delete artifacts.** The delete action needs a human to click confirm; from an agent
  session it is refused every time. The agent's job is the list (per account); the human deletes from
  the artifact menu or the CLI's artifact list.

## TL;DR

Draw in an artifact canvas, not a Design-app project · repo folder per drawing is the original · one master
canvas, one page per area, shared *Can edit* with every account you use · one publisher at a time, read
before publish · a measured design card on every drawing · archive in the repo, let a human delete.
