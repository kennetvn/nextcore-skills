---
title: A panel's default nginx config cached /api responses for every site on the server
date: 2026-10-03
layer: [infra]
area: [api, backend]
stack: [nginx, aapanel, nextjs]
kind: incident
skill: dev
---

## Symptom
An admin created a blog category and the list kept showing the old data. Through the domain, 6 of 6 GETs to the bare
URL returned the stale list; the app on 127.0.0.1 returned fresh data 8 of 8 times; adding `?t=1` also returned
fresh data. The response `Date` header was always current, which made it look like nothing was cached.

## Cause
The hosting panel ships a shared `proxy.conf` with `proxy_cache` declared at the `http` level. Every `location`
with `proxy_pass` inherits it — including `location /api`, which never mentions caching — and caches according to
the upstream's `Cache-Control`. `grep proxy_cache` in the site's vhost finds nothing. nginx also sets a fresh
`Date` on cached responses, so that header proves nothing.

## Fix
In the site's vhost only (the shared file serves other sites): `map $http_cookie $has_session` on the session cookie,
then `proxy_cache_bypass $has_session; proxy_no_cache $has_session;` inside `location /api`. Logged-in requests
then matched the app 100%. `$cookie_*` can't be used when the cookie name contains `-` or `.`, hence the `map`.

## How to catch it
Right after a write, request the same URL three ways: app port on localhost, the public domain, the domain with a
cache-busting query. Different answers = a cache in between. Read the effective config with `nginx -T`, never the
vhost file alone.

## Rule
When data looks stale after a write, compare localhost vs domain on the same fresh change before touching app code,
and read `nginx -T` — inherited directives don't appear in the file you are looking at.
