---
title: Conversations the account owner started from the phone had no customer name — the sender name was the owner's
date: 2026-10-03
layer: [code, data]
area: [messaging, integrations]
stack: [zca-js, nodejs]
kind: incident
skill: dev
---

## Symptom
In a CRM fed by an unofficial Zalo personal-account library, 62 of 152 one-to-one conversations showed a long numeric
id instead of the customer's name and photo. All 62 had no incoming message at all; none of the conversations with
at least one incoming message lacked a name. Staff could not tell who they were talking to.

## Cause
The worker listens to the owner's own messages too (`selfListen`) so that replies typed on the phone appear in the
CRM. For those messages the library's sender display name (`dName`) is the **owner's** name, so the worker sent them
up without a customer name or avatar. Names had only ever come from incoming messages; a conversation the owner
started never got one.

## Fix
For outgoing messages seen on the phone, look the other party up by id (`getUserInfo(peerId)` — name and avatar
together, cached 6 hours) and send both. A backfill fills old conversations: the server lists 1-1 conversations
still missing a name or photo, the worker looks each up 1.5 s apart and posts them back in batches of 20; the server
only fills empty fields, never overwrites a name staff typed. After deploy: nameless 62 → 0, without photo 72 → 1.

## How to catch it
Count conversations missing a name, split by "has at least one incoming message" vs "outgoing only". A gap that
lives entirely in one group points at one code path, not at the platform.

## Rule
Never take the contact's identity from the sender of a message the account owner sent; resolve the other party by
id, and backfill what was stored before the fix.
