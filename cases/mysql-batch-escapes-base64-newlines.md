---
title: mysql batch output turned TO_BASE64 line breaks into a literal backslash-n and silently corrupted 60% of a backfill
date: 2026-10-03
layer: [data]
area: [database, jobs]
stack: [mysql, nodejs, shell]
kind: measurement-trap
skill: dev
---

## Symptom
A backfill exported `TO_BASE64(content)` with `mysql -N > rows.tsv` and decoded it in Node. 4,615 of 7,645 rows
(60%) got wrong derived data, with no error. It surfaced only because a "changed rows" count came back as 7,645/7,645
when a manual sample had found 106. Decoded text turned into garbage after the first 57 bytes; the sample output
showed it and it was read as a terminal glitch.

## Cause
`TO_BASE64` wraps lines every 76 characters. In batch mode the `mysql` client escapes a newline inside a field as
two characters, `\` and `n`. Base64 decoders skip the backslash but `n` is a valid base64 character, so every
wrapped value shifts and decodes to garbage — silently, and only for values longer than 57 bytes.

## Fix
Strip the escapes before decoding (`b64.replace(/\\n|\s/g, '')`), or export with `--raw` / `SELECT … INTO OUTFILE`.
The backfill was re-run on all 7,645 rows.

## How to catch it
After decoding, compare the decoded length with `CHAR_LENGTH(content)` for every row. Test with values longer than
76 characters — short samples pass.

## Rule
A result that is too round (every row changed, zero rows changed) means suspect the tool before the data.
