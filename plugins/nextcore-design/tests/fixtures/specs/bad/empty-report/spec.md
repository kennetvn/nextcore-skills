# Spec — Owner payout history (D1)

Size: MEDIUM
Impact: MEDIUM — reads the payouts table (2 callers: finance dashboard, monthly email); no schema change

## Problem
- Current problem: FACT — 41 of 118 support messages in August asked "when was I paid and how much"; owners cannot see past payouts.
- Why it matters: FACT — each message takes staff about 6 minutes to answer from the bank statement.
- If we do nothing: support load grows with every new owner.

## Job to be done
- When a payout lands in my bank account, I want to see which bookings it covers, so that I can match it to my own records.
- Primary job: match one payout to its bookings.
- Secondary jobs: download a month as CSV · see the next scheduled payout.

## Success criteria
- User: an owner finds a given payout and its bookings in under 3 taps on a phone.
- Business: payout questions to support drop (baseline 41 / month).
- System: amounts equal the ledger to the cent; no owner sees another owner's payouts.

## Goal
- Business wants: fewer payout questions.
- User wants: proof of what was paid.
- Primary action / conversion: open a payout and read its bookings.

## User
- Owners of 1–4 listings, mostly on a phone in the evening (OBS: 78% of owner sessions are on phones). ASSUMPTION: they compare against a spreadsheet — check: ask 5 owners during onboarding calls.

## Existing product (inventory before inventing)
- Tokens / components / patterns reused: list card, status chip, month picker, money formatter.
- Extend / must replace / must preserve / regression risk: extend the finance list card with a "covers N bookings" line; preserve the CSV format the monthly email links to.
- Inconsistencies found (name them; fix on purpose or leave): finance uses "transfer", the email says "payout" — use "payout".

## User flow
- Happy path: dashboard → Payouts → month → payout → bookings list
- Error: the ledger API fails — inline error with retry, the month picker stays usable
- Recovery: retry keeps the selected month
- Cancel / back: back returns to the same month and scroll position
- Permission: staff without finance role see "Ask the owner to share this" instead of amounts
- Expired: N/A — read-only page, nothing is held
- Network failure / offline: last loaded month stays visible with an "offline" note

## Information hierarchy
1. Primary goal · 2. Primary action · 3. Primary information · 4. Secondary information
5. Removed · 6. Grouped · 7. Emphasised · 8. Progressively disclosed · 9. What happens after the primary action

## States
- [x] data · [x] empty · [x] loading (in-flow) · [x] error (inline + toast) · [ ] success — N/A, nothing is submitted
- [x] partial · [x] permission denied · [x] offline · [x] long / unexpected content

## Responsive — what changes STRUCTURALLY (not "how it shrinks")
| | phone 390 | tablet 768 | desktop 1280+ |
|---|---|---|---|
| navigation | bottom tab | side rail | sidebar |
| layout / grid | one column, payout opens full screen | list + detail side by side | list + detail side by side |
| tables / forms / dialogs | bookings as cards | bookings as table | bookings as table |

## Open questions
- None that change the flow.
