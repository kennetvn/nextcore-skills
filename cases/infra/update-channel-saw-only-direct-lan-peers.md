---
title: Two machines on the same network never saw each other's internal build — the update channel only asked direct LAN peers
date: 2026-11-09
layer: [infra, testing]
area: [desktop]
stack: [electron, nodejs]
kind: incident
skill: dev
---

## Symptom

A desktop app shares internal builds between the owner's machines: one machine builds, the others pull the package and
restart into it. The receiving machine showed "no build machine found on the LAN" although the build machine had just
published. Both machines were on the same subnet; copying the 535 MB package between them by hand took 10 s. Tests
were green: 14/14 unit tests and 19/19 end-to-end checks.

## Cause

The internal channel listed candidates from the **direct LAN peer list** only. The app links machines of one account
two ways — a direct LAN connection, or a relay — and those two machines were linked through the relay: both had their
network profile set to "public" and the app listens on loopback only, so no direct link formed. A third machine on a
private network profile was a direct peer and worked. Every test peer was a direct peer, so the tests could not see
the gap.

## Fix

Discover peers from every link the app already has (LAN ∪ relay). Fetch the package over the relay in resumable
2 MB chunks with the same whole-package SHA-256 check; machines with a direct link keep using it. Fixing the network
profile instead would have needed admin rights on each user's machine and would not stay fixed.

## How to catch it

Measure the path before blaming the network: the app's own link table (`path = relay` vs `lan`) next to a raw copy
speed between the two machines. In tests, include a peer that is reachable **only** through the second transport.

## Rule

A feature that "talks to my other machines" must use the same peer discovery as the rest of the app, not one
transport of it — and its tests need a peer on each transport.
