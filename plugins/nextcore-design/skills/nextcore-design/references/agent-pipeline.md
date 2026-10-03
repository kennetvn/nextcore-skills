# Agent pipeline — Designer → Critic → Implementer → Audit → Visual review → Iterate

One agent that designs, judges and builds its own work grades itself generously. Split the roles; give each a
narrow job, a fixed input and a fixed output; let numbers, not moods, decide when to loop.

```
 ┌──────────┐ spec + drawing ┌────────┐ verdict ┌─────────────┐ code ┌───────────┐ numbers ┌──────────────┐
 │ Designer │ ─────────────▶ │ Critic │ ──────▶ │ Implementer │ ───▶ │ Auditor   │ ──────▶ │ Visual review│
 └──────────┘ ◀───────────── └────────┘         └─────────────┘      │ (scripts) │         │ (squint +    │
      ▲        "revise" + list     ▲                                 └───────────┘         │  browser)    │
      └────────────────────────────┴──────── mismatch / orange card / failed test ◀────────┴──────────────┘
```

| Stage | Who | Input | Output | Passes when |
|---|---|---|---|---|
| 1. Designer | the main agent with this skill | brief, existing product | `spec.md` (FACT/ASSUMPTION labelled) + drawing (5 states × 3 widths) + `card.json` | spec complete; every element has a "why" |
| 2. Critic | **separate** agent, `agents/design-critic.md` | spec + drawing + design-review sheet | verdict `ship` / `revise` with a numbered list | no blocking item left |
| 3. Implementer | the main agent (or a builder agent) | approved drawing D*n* | code that copies the drawing 1:1 | builds; no re-layout during build |
| 4. Auditor | **scripts**, run by `agents/design-auditor.md` | code + tokens + drawings | `slop-check`, `token-audit`, `design-card --strict` output | 0 errors; card green |
| 5. Visual review | agent with browser tools, or a human | running page at 390 / 768 / 1440 + `design-review` sheet | match table drawing ↔ page, before/after screenshots | 100% match or every mismatch assigned |
| 6. Iterate | back to 1 or 3 | the failing items only | D*n+1* or a code fix | measured improvement |

## Rules that keep the loop honest

- **The critic never sees the designer's self-assessment**, only the artefacts. It must cite the artboard and
  element for each point, and mark each point *blocking* or *nice-to-have*.
- **Automate whatever can be automated before a model looks at it.** A critic spending tokens on hex codes is
  wasted; `slop-check` and `token-audit` do that in two seconds.
- **Stop condition:** iterate only while a blocking item is open or a measured number improved in the last
  round. Three rounds without measurable improvement ⇒ stop and report the remaining risks to a human.
- **Mismatch between drawing and page** is resolved one of two ways, never silently: fix the code, or raise the
  drawing to D*n+1* with the reason.
- **Version everything:** D1, D2 stay on the canvas; commits say which drawing version they implement.

## Running it in Claude Code

```bash
cp skills/nextcore-design/agents/*.md ~/.claude/agents/      # or <project>/.claude/agents/
```

Then, after the designer stage: *"Use the design-critic agent on design/billing"* — and after implementation:
*"Use the design-auditor agent on src/app/billing with tokens src/styles/tokens.css"*.
Other agents (Cursor, Codex): run the two prompts in `agents/` as separate chats or background tasks; the inputs and
outputs are files, so any runner works.
