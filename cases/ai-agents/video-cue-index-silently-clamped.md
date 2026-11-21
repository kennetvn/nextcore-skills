---
title: A scene index that is clamped instead of rejected shows the right picture on the wrong sentence
date: 2026-11-21
layer: [code, testing]
area: [ui]
stack: [html, ffmpeg, nodejs]
kind: measurement-trap
skill: workflow
---

## Symptom
A scripted promo video attaches each on-screen element to a spoken sentence by index (`beat`). One scene had two sentences, but a list item defaulted to beat 2.
It rendered without any error: the third row simply appeared together with the second sentence. Across 7 scripts, 1 had an out-of-range beat and 4 had at least one sentence that triggered no visual at all. No frame looked wrong, so nobody noticed.

## Cause
The renderer resolved the time as `sentences[Math.min(beat, sentences.length - 1)].start`. Clamping turns a data error into a plausible-looking output.

## Fix
A pure function lists every element's beat per block kind, compares it with the real sentence timings (known only after the voice is generated) and fails the build before the slow render: beat out of range, wrong order inside a block, element later than 0.8 s after its sentence or after the next sentence started. Sentences with no visual are a warning, or an error in strict mode for new scripts. It also writes a "sentence → element" table next to the video for review.

## How to catch it
Before rendering, print a table of (sentence, start time, elements that appear on it) and look for empty rows; run the same check in CI over every script in the repo.

## Rule
An index that points outside its range must raise an error, never be clamped; and any media script that ties visuals to speech needs a gate that checks the mapping against the real timings.
