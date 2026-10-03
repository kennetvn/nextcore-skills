# Product discovery — before the spec's layout sections

"Build the right screen before building the screen right." Required for MEDIUM and larger tasks (sizes:
`nextcore-workflow` → `references/task-sizing.md`); a SMALL task writes the problem in one line and moves on.

The answers go into the top of `templates/spec.md`. `spec-check` fails a MEDIUM+ spec whose discovery sections are
empty.

## 1. Problem — not "the user wants page X"

- **Current problem:** what goes wrong today, for whom, how often. Prefer a number from the product (support
  messages, abandoned steps, logs) over a description.
- **Why it matters:** what it costs the user or the business.
- **If we do nothing:** what happens. If the answer is "nothing much", the task may not be worth a MEDIUM process.

## 2. Users and their decisions

For the person doing the task (and each secondary role: owner, staff, admin, guest):
who they are · what they are trying to finish · what information they need · which decisions they make · what
blocks them · what mistakes they can make.

Facts come from the product (roles in the code, real records, logs, support history). Anything else is tagged
**ASSUMPTION** with how it could be checked. Write **UNKNOWN** rather than invent behaviour.

## 3. Job to be done

```text
When <situation>, I want to <motivation>, so that <outcome>.
Primary job:     the one thing the screen exists for
Secondary jobs:  save a draft · edit · upload · preview · track status …
```

The primary job decides the primary action and the information hierarchy. A screen with two primary jobs is two
screens or one confused screen.

## 4. Success criteria — three kinds

| Kind | Example | How it will be checked |
|---|---|---|
| **User** | an owner publishes a listing without asking for help | walk the flow on a phone; count steps and errors |
| **Business** | more listings reach "published" | the share of drafts that become published, per week |
| **System** | no invalid record can be saved | validation in the API, a test per rule |

No metric you cannot measure: if there is no data source, write **UNKNOWN — needs <event/field>** and say so in the
validation report later.

## 5. Current experience audit

Before designing, inventory what exists for this job: pages, components, flows, API routes, tables, tokens, forms,
error handling, permissions. Sort each into **reuse · extend · must replace · must preserve · regression risk**.
Reuse beats extend beats new; a new component needs a sentence on why the existing one is insufficient.

## 6. User flow — every branch, before any artboard

```text
Entry → select → input → validate → preview → submit → processing → success
```

Write the happy path, then each branch the flow can take, or `N/A — <reason>`:
**error** (validation, server) · **recovery** (how the user gets back on track) · **cancel / back** ·
**permission** (not allowed, or role changes mid-flow) · **expired** (session, hold, price) ·
**network failure / offline** · **empty / partial data**.

Each branch becomes an artboard or a line in the spec's states list. A flow that only has a happy path is the most
common reason a shipped screen "works" and users still cannot finish.

## 7. Evidence labels

Every claim in the spec carries one label: **FACT** (measured or given) · **OBS** (seen in the product) ·
**CONSTRAINT** (existing system limit) · **REQUIREMENT** (business rule from a person) · **ASSUMPTION** ·
**HYPOTHESIS** · **DECISION** (with its reason). An ASSUMPTION or HYPOTHESIS names how it will be checked
(`check: …`); `spec-check` warns on those that don't.
