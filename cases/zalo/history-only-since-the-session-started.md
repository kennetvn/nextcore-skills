---
title: "Message history" from the unofficial Zalo library only goes back to when the session was created
date: 2026-10-03
layer: [code, data]
area: [messaging, integrations]
stack: [zca-js]
kind: measurement-trap
skill: dev
---

## Symptom
A history sync for a CRM returned the same first page on every request. After fixing paging, the oldest 1-1
message for an account was exactly the moment its QR code had been scanned: 106 messages on one account, 11 one-to-one
plus 105 group messages on another — nothing from before the login. Group history calls returned 404.

## Cause
The library always sends `first: true` for its old-messages request, so it never pages. Sending the request by hand
with `first: false` and the last id pages correctly — but forward in time: that channel is the session's sync queue,
not an archive. The platform had also switched off the group history endpoint the library still calls.

## Fix
Stopped promising history before the account was connected. The paged request is kept only to fill gaps while the
worker was down. Older history lives only on the phone (and its encrypted backup); for business accounts the
official OA API is the legal route.

## How to catch it
After any "history" import, compare the oldest imported message with the session's creation time. If they match,
you imported the session, not the history.

## Rule
Before building on an unofficial "history" call, measure how far back it really goes on a real account; don't
promise customers data the platform does not hand out.
