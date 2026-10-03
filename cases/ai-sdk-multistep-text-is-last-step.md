---
title: In a multi-step generateText call, r.text is only the last step, so the model's apology was dropped
date: 2026-10-03
layer: [ai-agents, code]
area: [messaging, backend]
stack: [vercel-ai-sdk, typescript]
kind: incident
skill: dev
---

## Symptom
A chat assistant was told to apologise before handing a customer to a human. Customers only received the second
message ("I've passed you to a colleague"). The prompt was rewritten once and the instruction repeated in the tool
result once; 3 of 3 runs still lost the apology, so it looked like the model ignored instructions.

## Cause
With `generateText({ tools, stopWhen: stepCountIs(N) })`, `r.text` holds the text of the **last** step. The apology
was written in step 1, together with the hand-over tool call, and lives in `r.steps[0].text`. The code only sent
`r.text`.

## Fix
Read the text of the steps (`r.steps.map(s => s.text)`) and pick the right one per case; joining every step blindly
repeats content. The apology then reached customers on every hand-over.

## How to catch it
Log the number of steps that contain text and their contents, next to what was actually sent.

## Rule
When an instruction is "ignored" two runs in a row, log what the model produced at every step before editing the
prompt again — the text may have been written and dropped by the code.
