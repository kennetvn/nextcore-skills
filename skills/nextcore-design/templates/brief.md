# Brief — <feature> (D1)

> Fill this BEFORE the first artboard. Keep it in the drawing's folder next to `card.json`.

## Reading line
Reading as: <screen kind> for <who uses it>, <feel>, layout type <named skeleton>.

## Dials (1–10) — same as the other drawings of this area
variance <n> · motion <n> · density <n>

## Five form questions (new screens only)
- Role of the screen (entry / transition / data):
- Viewing distance (phone in hand / laptop):
- Temperature (calm / urgent / authoritative):
- Capacity — what must be understood in a 5-second glance:
- One motif taken from the content itself:

## Field map — every value on the drawing has a real source
| UI element | Source (API route / model.field) | Real example value | Can be empty? |
|---|---|---|---|
| | | | |

No source ⇒ do not draw the field (or draw its "not available yet" state and open a backend ticket).

## Edge-case data — pulled from production (read-only), used on the artboards
- longest / shortest name:
- highest / lowest / missing price:
- 0 / 1 / many items:
- 0 images / 1 image / portrait image:

## Artboards to deliver
- [ ] Data · desktop 1280–1440   - [ ] Data · tablet 768   - [ ] Data · phone 390
- [ ] Empty   - [ ] Loading (in-flow skeleton)   - [ ] Error (inline + toast)   - [ ] Success
- [ ] Interactive: hover / focus-visible / pressed / disabled (touch alternative for hover)

## Feasibility (engineer ticks before code starts)
- [ ] every field is in the field map   - [ ] every edge case has an artboard and still reads well
- [ ] only existing tokens; contrast passes in light AND dark (`token-audit`)
- [ ] reuses existing components; anything new has a reason
- [ ] no new API on a hot path, no infinite animation
