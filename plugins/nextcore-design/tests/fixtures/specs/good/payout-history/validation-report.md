# Validation — Owner payout history (D1, built in 4f2c9e1)

## Primary job (from the spec)
- Job: match one payout to its bookings.
- Walked as: owner with 3 listings, on a phone at 390×844, from the "payout sent" email link

## UX validation
| Measure | Result |
|---|---|
| Finished the job? | FACT: yes — payout of 14,730,000 matched to its 6 bookings |
| Steps / decisions from entry to success | FACT: 2 taps, 1 decision (which month) |
| Primary action visible on first paint (390 px)? | FACT: yes, the latest payout card is above the fold |
| Each error: message next to the cause, input kept, can continue? | OBSERVATION: ledger error shows inline with retry; month kept |
| After each state: next step obvious? | OBSERVATION: empty month says when the next payout is scheduled |

## Business validation
- Business goal (from the spec): fewer payout questions to support.
- Expected mechanism: the email links straight to the payout, so the answer is one tap away instead of a message.
- Supporting evidence today: the walk-through needed 2 taps from the email.
- Measurement required: support messages tagged "payout" · helpdesk export · baseline 41 in August · read again on 2026-11-05
- Hypothesis (can turn out false): payout questions fall below 20 per month. check: helpdesk export on 2026-11-05
