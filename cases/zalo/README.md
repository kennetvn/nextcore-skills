# Zalo personal accounts with zca-js — playbook

What a team learned running customer chat on Zalo **personal** accounts through the unofficial `zca-js` library, as
part of a CRM, for several weeks with up to seven accounts on one worker. Experience, not code: what still works,
how to check it yourself, how to run it, what broke and how it was fixed.

Verified: zca-js 2.1.2 · Node ≥ 18.18 · 2026-10-03

## Read this first

- **zca-js is unofficial.** It speaks Zalo's private web protocol. Zalo does not support it, can change or switch off
  any call without notice (one already went: group history), and its terms do not allow automated personal
  accounts. You risk the account. For business messaging the official route is the **Zalo OA** (Official Account)
  API — use that when you can.
- **Only message people who wrote to you or expect you.** Everything here is about answering customers in a CRM.
  Nothing here covers bulk messaging, cold outreach, or ways around Zalo's anti-abuse limits — don't use it for that.
- **You handle personal data.** Session files are credentials (cookie, device id). Messages and phone numbers belong
  to your customers: keep them out of logs, issues and prompts.
- **No account was banned or limited in this period** — that is one team's observation, not a promise. The limits
  below were set by the team, not discovered at Zalo's edge.

## Status

| Capability | Status | Checked | Evidence / notes |
|---|---|---|---|
| Login by QR (`loginQR`, generated / expired / scanned / declined events) | works | 2026-09-22 | QR lives ~75 s, not the ~100 s often quoted; event payload shape differs between versions — read the image via the library's save helper |
| Re-login from saved session (`login(cookie, imei, userAgent)`) | works | 2026-09-30 | 22 session re-logins in 7 days, all succeeded; longest continuous session 10 days |
| Listener with `retryOnClose` | works | 2026-09-30 | 4 reconnects in 7 days across all accounts |
| Receive 1-1 messages | works | 2026-09-30 | p50 70 ms · p95 283 ms from Zalo to CRM over 467 messages |
| Receive the owner's own messages (`selfListen: true`) | works, with a trap | 2026-10-03 | the sender name on these is the **owner's** — see [case](outgoing-first-conversation-has-no-name.md) |
| Send text / image / video / quote / link | works | 2026-10-02 | reply lane p50 0.16 s, p90 0.66 s, 59 of 60 ≤ 3 s |
| Typing events | works | 2026-09-30 | — |
| Delivered receipts | works | 2026-10-01 | read receipts wired, not yet seen on a real message |
| Recall own message (`undo`) | deployed, untested in production | — | needs both `msgId` and `cliMsgId`; the second only appears on the echo of your own send — capture it there |
| Customer recalled a message (`undo` event) | deployed, untested in production | — | — |
| User profile (`getUserInfo`) | works | 2026-10-03 | profile key is usually `<uid>_0` — match by prefix; filled names for 62 of 62 conversations |
| Stickers (`getStickersDetail`) | works | 2026-09-29 | a sticker message only carries ids; fetch the image separately or the bubble is empty |
| List groups (`getAllGroups` + `getGroupInfo`) | works, limited | 2026-09-29 | 88 groups synced; the response shape changed between versions — handle both; never treat an empty scan as "no groups" |
| Find user by phone (`findUser`) | works | 2026-10-01 | answer in ~1 s |
| Friend request (`sendFriendRequest`) | deployed, untested in production | — | — |
| Old messages (`listener.requestOldMessages`) | **limited** | 2026-09-29 | only messages since the session was created — see [case](history-only-since-the-session-started.md) |
| Group chat history (`getGroupChatHistory`) | **broken** | 2026-09-29 | HTTP 404: Zalo switched the endpoint off; the library still calls it |

## Audit it yourself

Do this on an account you own, read-only first, and write the date and version next to every row you re-check.

1. **Pin the version** you run (`package-lock.json`) and read the library's changelog since the date above.
2. **Login and session:** log in by QR once, restart the process, confirm it logs back in from the saved session without
   a new QR. Note how long the QR lived.
3. **Receive:** send the account a text, an image, a sticker and a voice note from another phone; check every one
   arrives with content (not an empty bubble) and how long it took.
4. **Own messages:** reply from the phone app, not from your system; check the conversation in your system has the
   **customer's** name and photo, not yours.
5. **Send:** send text and an image from your system; check each arrives once (no duplicate from the echo).
6. **History:** request old messages; compare the oldest one with the time the session was created.
7. **Groups:** list groups twice; compare counts and shapes.
8. Anything that fails: open an issue with the row, the version and what you saw — or update the row
   ([AGENTS.md §6](../../AGENTS.md#6-found-an-improvement-ask-then-contribute--never-on-your-own)).

## Deploy

- **One process, many accounts; never two processes on the same account.** Two logins of one account fight
  (`DuplicateConnection`). One worker held seven accounts at ~112 MB RSS (peak 145 MB), 0.4–1 % CPU — roughly
  4–5 MB per account, so plan to split processes well before ~45 accounts.
- **Memory limits:** give the process manager's restart ceiling at least 512 MB above the V8 heap limit, or it kills
  the process in a loop.
- **Session files are secrets:** mode 600, their folder 700; the QR image folder too. Keep a copy of the session the
  server can use to re-login after a disk loss, encrypted.
- **Talk to your app over signed HTTP** (HMAC over the raw body **plus a timestamp**, reject anything older than a few
  minutes — without the timestamp a captured request can be replayed). Long-poll the outbox instead of polling every
  few seconds: average send latency went from 13.2 s to 0.16 s and outbox requests fell 80 %.
- **Reconnect with backoff and jitter** (5 s × 2ⁿ, ±30 %, capped at 5 min). Every restart re-logs every account once;
  38 such logins in 8 days drew no reaction from Zalo, but don't restart in a loop.
- **Your own limits, before Zalo's:** the team ran with 200 messages per account per day, 20 new people per day,
  4 s + up to 2.5 s random spacing between sends, slower for 30 minutes after login. None was hit.
- **Deploy the server side first** when a release adds a call the worker makes, then the worker.

## Known failures

| Symptom | Cause | Fix | Case |
|---|---|---|---|
| conversations show a numeric id instead of a name | owner's own messages carry the owner's name | look the other party up by id; backfill | [outgoing-first-conversation-has-no-name](outgoing-first-conversation-has-no-name.md) |
| "history" never goes before the login | the call is the session's sync queue | don't promise it; official OA API for business accounts | [history-only-since-the-session-started](history-only-since-the-session-started.md) |
| the assistant answers itself every ~4 s | two accounts of one business message each other | echo + rate circuit breaker, replayed on real traffic | [two-test-accounts-bots-answered-each-other](two-test-accounts-bots-answered-each-other.md) |
| every image you send appears twice | the echo of a sent image arrives **before** the send call returns its id | remember ids for the whole send, match echoes after it finishes | — |
| an account stuck "pending" after re-login | an old revoked channel still held the account's external id under a unique constraint, rolling back every session save | release the id when revoking | — |
| a new account record on every expired QR | expiry was saved as "logged out" and the UI filtered those out | stop filtering by connection state | — |
| group messages lost in bursts | two app instances deadlocked writing the same conversation; the worker dropped failed reports | retry the upsert on the server; retry 5xx/429 in the worker (dedupe by message id) | — |

## Optimise

- Long-poll the outbox (20 s hold) — 13.2 s → 0.16 s median send latency, −80 % requests.
- Cache profiles 6 hours, stickers forever — one `getUserInfo` per customer per 6 hours, however chatty.
- Skip disabled groups in the worker, before any network call — community groups are very noisy.

## Open questions

- Read receipts, recall, friend requests: deployed, never observed on a real account yet.
- Does `checkUpdate: true` do anything useful in production?
- Media URLs on Zalo's CDN may expire; copying them to your own storage is not measured yet.
- How many accounts per IP before Zalo reacts: unknown; the team never tested it on purpose and does not plan to.
