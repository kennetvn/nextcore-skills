# Task sizing — how deep the process goes

One process for every task means either the small ones drown in ceremony or the big ones skip discovery. Size the
task first, write the size at the top of the spec or the issue, and run only the phases that size needs.

## 1. The six sizes

| Size | Looks like | Example |
|---|---|---|
| **TRIVIAL** | text, one token, an icon, a spacing value | fix a label typo |
| **SMALL** | one field, one filter, one component change inside an existing screen | add a "phone" column to a table |
| **MEDIUM** | a new page, a new step in a flow, a changed interaction | a settings page for notifications |
| **LARGE** | a new area or a full flow | a new booking flow, a new dashboard |
| **PRODUCT_CHANGE** | changes *how* a user does a business task, even with little code | let owners publish without review |
| **SYSTEM_CHANGE** | architecture, API contract, permissions, database | split one role into two |

When unsure between two sizes, take the larger one. PRODUCT_CHANGE and SYSTEM_CHANGE are about consequence, not code
size: a ten-line permission change is a SYSTEM_CHANGE.

## 2. Phases per size

| Phase | TRIVIAL | SMALL | MEDIUM | LARGE | PRODUCT_CHANGE | SYSTEM_CHANGE |
|---|---|---|---|---|---|---|
| Impact analysis (§3) | — | quick | yes | yes | yes | **deep** |
| Discovery: problem, JTBD, success criteria | — | — | yes | yes | **deep** | yes |
| Existing-experience audit (reuse / extend / replace) | — | quick | yes | yes | yes | yes |
| User flow with every branch | — | — | yes | yes | yes | if UI changes |
| Drawing: states × widths, critic | — | if layout changes | yes | yes | yes | if UI changes |
| Implementation + match table | yes | yes | yes | yes | yes | yes |
| UX validation (can the user finish the job?) | — | spot-check | yes | yes | yes | if UI changes |
| Business validation (mechanism + what to measure) | — | — | if a business goal exists | yes | **yes** | if it changes a business rule |
| Validation report | — | — | yes | yes | yes | yes |

"Quick" = one or two lines in the issue. "Deep" = written before any code and checked by a second agent or a person.

Design-side detail: `nextcore-design` → `references/product-discovery.md` (before drawing) and
`references/validation.md` (after building). `spec-check` enforces the size-dependent parts.

## 3. Impact analysis

Before changing an existing screen, flow, API or rule, list what depends on it — by searching, not from memory:

- **Callers** — pages, components, jobs, extensions that use it (grep the name *and* the route string, including
  template literals and relative imports).
- **Contracts** — API consumers, stored data shapes, URLs people bookmarked or that search engines index.
- **Rules** — permissions, money, notifications, analytics events that read it.

Then rate it:

| Impact | Means | Before implementing |
|---|---|---|
| **LOW** | one caller, no stored data, no external consumer | go |
| **MEDIUM** | several callers or stored data, all inside the repo | list them in the spec; test each |
| **HIGH** | money, permissions, external consumers, data migration, or a flow many users run daily | written plan + a second reviewer (agent or person) **before** code |

Real case: a fix was applied to the wrong file for a whole day because the agent went from a component *name* up
instead of from the *route* down; two components had matching names. Walk from the route to the component, then
count callers.

## 4. Asking versus assuming

Discovery is not a questionnaire. For each open point write **KNOWN / UNKNOWN / ASSUMPTION** and keep going.
Ask a person only when the answer would change the architecture, a business rule, permissions, the user flow or a
major UX decision — and ask once, all questions together. Never ask what you can find by reading the code, the
data or the logs.
