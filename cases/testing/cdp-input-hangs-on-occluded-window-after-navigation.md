---
title: CDP mouse input hangs exactly 5 s and the click is lost when the page navigated while its window was occluded
date: 2026-10-14
layer: [testing, infra]
area: [frontend]
stack: [chromium-cdp]
kind: measurement-trap
skill: dev
---

## Symptom
Intermittent "connection closed" errors from Input.dispatchMouseEvent in a headful Chromium driven over CDP with several overlapping windows; which window fails changes between runs. Measured: mouseMoved took 5010–5028 ms on the failing tab, 2 ms on another tab of the same browser; document state showed the click never happened.

## Cause
On Windows, Chromium's native window occlusion marks covered windows hidden. A page that navigates while hidden produces no compositor frame, so input hit-testing waits ~5 s and drops the event. A page that finished loading before being covered still receives clicks (12–57 ms), so "occluded ⇒ hang" alone is not the rule.

## Fix
Launch Chromium with `--disable-features=CalculateNativeWinOcclusion` (merge into the single existing `--disable-features` flag — a later one overrides an earlier one), `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`. With the flags: 1–2 ms, click registered (3/3). Taking a screenshot first does not help.

## How to catch it
Reproduce with two overlapping windows: navigate the covered one via Page.navigate, then time Input.dispatchMouseEvent and check a page-side effect of the click. Probe latency per tab; a constant ~5 s is the fingerprint. Also: /json/list may list a chrome://newtab target before the tab you just navigated — prefer real web pages when picking the target.

## Rule
Automation browsers that may be covered by other windows must disable occlusion/backgrounding; assert the flags in a unit test of the launch arguments.
