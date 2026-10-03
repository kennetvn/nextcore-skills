# Design ↔ dev handoff

Two directions. Design hands a drawing to dev; dev hands feasibility back to design. Both are
checklists, not conversations.

Versions: drawings are **D1, D2, …**; code builds are **C1, C2, …**. "Code C3 matches D2" is a
statement you can check. "Matches the design" is not.

## 1. Design → dev: what a drawing must carry

A drawing is ready to build when it has all of this. Missing items go back to design.

- [ ] **Field map** (in `spec.md` from nextcore-design): every data-bearing element has
      `UI element · source (route + field) · real example value · can be empty`.
- [ ] **No invented numbers.** Ratings, counts, "only N left" each have a query.
- [ ] **Edge data from production** (read-only query), drawn with real records:
      longest / shortest name · highest / lowest / missing price · 0 / 1 / portrait image ·
      0 / 1 / many reviews · empty / one / full list.
- [ ] **All states drawn:** empty · loading (in-flow, not a full-screen overlay) · hover/focus ·
      error · success. Plus **permission** and **not found** where the route can return them.
- [ ] **Breakpoints:** at least 390 · 768 · 1440.
- [ ] **Tokens only**, and every text/background pair passes contrast in light and dark.
- [ ] **Reuses existing components**; each new component has a stated reason.
- [ ] **Interaction rules:** what happens on double-submit, on slow network, on 409 conflict.

## 2. Dev → design: feasibility review

Before building, the engineer checks the drawing and answers in writing. Any "no" returns the
drawing as D(n+1) with a specific list.

- [ ] Every field-map source exists today, or a backend ticket is linked.
- [ ] No new API call on a hot render path that does not exist yet.
- [ ] No list that needs a total count on a table where counting is expensive (say so; offer
      "has more" instead).
- [ ] Sort and filter options in the drawing are indexable.
- [ ] No asset or animation that measurably hurts LCP or idle CPU (infinite animations show up
      as constant main-thread work).
- [ ] The error states drawn match the error codes the API can return. If the drawing has a
      state the API cannot signal, add the code or drop the state.

Design does not skip this feedback. Dev does not build around it.

## 3. The API contract derived from the field map

For each screen, dev writes the contract next to the field map before coding:

```
GET /api/stays?cursor&limit=24
200 { success, items: [{ id, name, priceFrom: "450000.00" | null, coverUrl | null }], nextCursor, hasMore }
401 UNAUTHENTICATED · 403 FORBIDDEN · 422 VALIDATION_FAILED (bad cursor)
UI: items=[] ⇒ Empty · 403 ⇒ Permission · priceFrom=null ⇒ "No price yet"
```

Key names in the contract are the names in the field map. A rename later is a contract change
(see `api-contract.md` §6), not a refactor.

## 4. After build: the match table

Measure the built page against the drawing by computed values, not by eyeballing screenshots.

| Item | How | Tolerance |
|---|---|---|
| Presence and order of elements | count by role (title, price, button, image) | 0 missing, 0 extra |
| Color | token name of text, background, border | exact token |
| Font size, weight, line height | computed style | exact |
| Spacing, box size | bounding rect | ±2 px |
| Max lines / truncation | at the narrowest width | exact |
| States | force each (block request, empty data, 403) | all drawn states reachable |

Record it as `element · drawing · code · match?` and a ratio (e.g. 23/24).

## 5. When code and drawing disagree: fix code or raise D(n+1)?

Every mismatch row is closed one of two ways. Leaving it is not an option.

| Situation | Action |
|---|---|
| Code deviates; drawing is feasible and the data exists | **Fix code.** |
| Drawing needs data that does not exist | **D(n+1):** draw the "not available" state, or link a backend ticket. |
| Drawing breaks on real edge data (long name, missing image) | **D(n+1)** with that record drawn. |
| Drawing fails contrast, touch size, or performance when measured | **D(n+1)** with the number. |
| Drawing shows a state the API cannot signal | add the error code (dev) **or** drop the state (D(n+1)). |
| Both are "fine" but different | **Fix code.** The drawing is the reference until replaced. |

Write the reason on the row. Close the task when the match table is 100% or every mismatch
points at a newer drawing. Never overwrite D1 with D2 — keep both for comparison and rollback.

## 6. Before / after evidence

- Before and after shots use the same viewport, same data, same environment, same login.
- "After" is captured only after the deploy reports completed and contains the change.
- Report numbers (match ratio, LCP, contrast) beside the images.

## 7. Fix what is broken before decorating

If measured problems are open in the same area (wrong data, unreadable text, unreachable
button, layout overflow), the drawing fixes those first. A drawing that adds gradients or
animation while those stay open is returned.
