# Several AI accounts taking turns

Setting: the human uses two AI accounts and switches when one runs out of quota (`/login`),
sometimes **in the middle of a running session**. The agent is not told.

## Account-bound things are projections; the repo holds the original

**Happened:** designs lived only as hosted artifacts. Before consolidation: 82 loose artifacts split
across two accounts, each account got "not found" for the other's canvases, and one product area
had two competing "official" canvases because an agent on the second account could not see the
first and drew a new one. After consolidation: 1 shared canvas, 390 boards, 59 designs, 12 pages.

**Why:** anything stored only under one account disappears the moment the account changes, or gets
silently re-created as a duplicate.

**Rule:**
- The original of every account-bound object (designs, canvases, docs pages) lives in the repo:
  one folder per item, with its source files and a small manifest (what it is, which route it
  belongs to, why it exists, published version).
- The hosted copy is a **projection**, rebuilt from the repo by one command.
- One shared projection, owned by one account, shared with edit rights to the other, so both
  publish to the same URL.
- New item = new folder in the repo, not a new hosted object. Drafts stay in a scratch directory.
- After publishing: copy the result back to the repo and commit **in the same turn**.
- Only one session publishes the shared projection at a time — it holds a claim on it and tells the
  other sessions by message.
- If the human edited the hosted copy, pull those edits into the repo **before** re-publishing.
  Publish refused as "not the latest version" → read the live version, diff, merge, retry once.
  Third refusal → stop and report.

## Many "not found" at once → check the account

**Happened:** one session switched accounts 3 times. A batch of **8** reads all failed "not found"
— only because the account had just changed.

**Rule:** at the start of any account-bound work, and whenever "not found" appears in bulk, run a
short listing (e.g. the last 5 artifacts) to see which account you are on. Do not conclude anything
was deleted.

## Some actions need a human, and retrying will not change that

**Happened:** **8 / 8** parallel artifact deletes were refused by the harness ("needs the user's
confirmation, and no one can answer it in this session"), even though the human had approved the
deletion in chat.

**Why:** irreversible actions require a click in the UI. A chat message is not a confirmation.

**Rule:** do not retry. Verify each item is safely in the repo (compare its published version to the
manifest), then hand the human a list **grouped by account**, with the exact steps to delete.
Record what was deleted back in the manifest afterwards.

## Checklist

- [ ] Which account am I on? (short listing)
- [ ] Is the original of everything I touch in the repo?
- [ ] Am I the only session publishing the shared projection right now?
- [ ] Did I pull human edits from the hosted copy first?
- [ ] Copied back and committed (explicit paths) in the same turn?
