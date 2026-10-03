---
title: Two test accounts on the same workspace made the AI assistant answer itself, about every 4 seconds
date: 2026-10-03
layer: [ai-agents, process]
area: [messaging]
stack: [zca-js, llm]
kind: incident
skill: dev
---

## Symptom
Two test chat accounts belonging to the same business messaged each other once. The AI assistant on each side
replied to the other's reply: about 120 messages at roughly 4 s apart, around 10k tokens per turn, until someone
noticed. It surfaced only when a test set built from "customer turns" turned out to be the assistant's own words.

## Cause
Nothing stopped an assistant from replying to text another assistant wrote. Both sides looked like a normal
customer conversation to each other.

## Fix
A circuit breaker before every automatic reply, on two signals: an echo (the incoming text equals, character for
character and at least 20 characters long, a message an assistant sent in the last 2 minutes) and a rate (10 or more
assistant messages in 5 minutes). Replayed over 30 days of real traffic (3,069 customer messages): it trips on 3
conversations, all bot-to-bot, and blocks 0 real customers.

## How to catch it
Before using real conversations as test data or quality samples, check whether "customer" messages match outgoing
bot messages elsewhere.

## Rule
Any auto-reply needs a loop breaker tested against a replay of real traffic — and test accounts are not customers.
