#!/usr/bin/env node
// issue-claim — a light claim lock on a GitHub issue, no server: one comment with an expiry, plus a label and an assignee.
//
// Why: several agents (and people) pick work from the same issue list. Without a claim two of them build the same thing;
// with a claim that never expires, a crashed session holds the issue forever. The comment is the lock; the label and
// the assignee only make it visible in the issue list.
//
//   issue-claim claim 12 [--ttl 4h] [--as agent-a] [--note "plan in one line"]
//   issue-claim claim 12 --force-with-lease 987654   # take over ONLY the claim whose comment id you read
//   issue-claim renew 12 [--ttl 4h]                   # extend your own claim
//   issue-claim status 12                             # who holds it, until when (exit 0 free, 3 held)
//   issue-claim release 12 [--close]                  # drop the claim; --close also closes the issue, refused while
//                                                     # an unchecked "- [ ]" item names no #issue it moved to
//   [--repo owner/name] (default: the repo of the current directory)  [--json]
//
// An active claim by someone else blocks (exit 2) until it expires. --force-with-lease <comment-id> takes over only if
// that comment is still the active claim, so you never override a claim you have not read. Two agents claiming in the
// same second: both post, both re-read, the earlier comment wins and the later one deletes itself.
// Identity: --as, else $ISSUE_CLAIM_AS, else your GitHub login. Give each parallel session its own --as.
// Needs the GitHub CLI (gh), signed in. Exit 1 = usage or gh error, 2 = held by someone else, 3 = held / close refused.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [cmd, num] = args;
const asJson = args.includes('--json');
const die = (msg, code = 1) => { console.error(`issue-claim: ${msg}`); process.exit(code); };
if (!['claim', 'renew', 'status', 'release'].includes(cmd)) die(`unknown command "${cmd}" — see --help`);
if (!/^\d+$/.test(num || '')) die('give the issue number, e.g. issue-claim claim 12');

// gh runner. NEXTCORE_GH = path of a stand-in script run with this node (the tests use one; no network).
function gh(a, soft = false) {
  const fake = process.env.NEXTCORE_GH;
  const r = fake ? spawnSync(process.execPath, [fake, ...a], { encoding: 'utf8' }) : spawnSync('gh', a, { encoding: 'utf8' });
  if (r.error) die(r.error.code === 'ENOENT' ? 'GitHub CLI (gh) not found — install it and run `gh auth login`' : r.error.message);
  if (r.status !== 0) {
    if (soft) return null;
    die(`gh ${a.slice(0, 4).join(' ')} failed: ${(r.stderr || r.stdout).trim().split('\n')[0]}`);
  }
  return r.stdout.trim();
}
const api = (a, soft) => { const o = gh(['api', ...a], soft); return o ? JSON.parse(o) : null; };

const repo = opt('--repo') || gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
const login = api(['user']).login;
const me = opt('--as') || process.env.ISSUE_CLAIM_AS || login;
const base = `repos/${repo}/issues/${num}`;
const LABEL = 'status:in-progress';
const MARK = /<!-- issue-claim (\{.*?\}) -->/;

function ttlMs(s) {
  const m = /^(\d+(?:\.\d+)?)([mhd])$/.exec(s || '');
  if (!m) die(`--ttl wants a number with m, h or d (30m, 4h, 1d), got "${s}"`);
  return Number(m[1]) * { m: 6e4, h: 36e5, d: 864e5 }[m[2]];
}

function comments() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = api([`${base}/comments?per_page=100&page=${page}`]);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

// Replay claim/renew/release comments in order. A claim counts when nothing live holds the issue at that moment, when
// it carries the lease of the live claim, or when the holder re-claims. Renew and release count only from the holder.
function resolve(list, now = Date.now()) {
  let lock = null;
  const sorted = [...list].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id - b.id);
  for (const c of sorted) {
    const m = MARK.exec(c.body || '');
    if (!m) continue;
    let d; try { d = JSON.parse(m[1]); } catch { continue; }
    const live = lock && Date.parse(lock.until) > Date.parse(c.created_at);
    if (d.op === 'claim' && (!live || String(d.lease) === String(lock.id) || d.by === lock.by)) lock = { id: c.id, by: d.by, until: d.until };
    else if (d.op === 'renew' && live && d.by === lock.by) lock = { ...lock, until: d.until };
    else if (d.op === 'release' && live && d.by === lock.by) lock = null;
  }
  return lock && Date.parse(lock.until) > now ? lock : null;
}

const post = (op, extra, text) =>
  api(['-X', 'POST', `${base}/comments`, '-f', `body=<!-- issue-claim ${JSON.stringify({ op, by: me, ...extra })} -->\n${text}`]);
const out = (o, code = 0) => { console.log(asJson ? JSON.stringify(o) : o.text); process.exit(code); };
const held = (l) => `#${num} is claimed by ${l.by} until ${l.until} (claim comment ${l.id})`;
const untilFromTtl = () => new Date(Date.now() + ttlMs(opt('--ttl', '4h'))).toISOString();

const lock = resolve(comments());

if (cmd === 'status') out(lock ? { free: false, ...lock, text: held(lock) } : { free: true, text: `#${num} is free` }, lock ? 3 : 0);

if (cmd === 'claim') {
  const lease = opt('--force-with-lease');
  if (lock && lock.by !== me) {
    if (!lease) out({ ok: false, ...lock, text: `${held(lock)} — pick another issue, wait for expiry, or talk to them and take over with --force-with-lease ${lock.id}` }, 2);
    if (String(lease) !== String(lock.id)) out({ ok: false, ...lock, text: `lease ${lease} is stale: the live claim is comment ${lock.id} by ${lock.by} — read it before taking over` }, 2);
  }
  const until = untilFromTtl();
  const note = opt('--note');
  const mine = post('claim', { until, ...(lease ? { lease } : {}) },
    `**Claimed** by \`${me}\` until ${until}${lease ? ` (took over claim ${lease})` : ''}.${note ? `\n\n${note}` : ''}`);
  const winner = resolve(comments());
  if (!winner || winner.id !== mine.id) {
    api(['-X', 'DELETE', `repos/${repo}/issues/comments/${mine.id}`], true);
    out({ ok: false, ...(winner || {}), text: `lost the race: ${winner ? held(winner) : 'the claim did not register'}` }, 2);
  }
  api(['-X', 'POST', `${base}/labels`, '-f', `labels[]=${LABEL}`], true);
  api(['-X', 'POST', `${base}/assignees`, '-f', `assignees[]=${login}`], true);
  out({ ok: true, id: mine.id, by: me, until, text: `claimed #${num} as ${me} until ${until} (comment ${mine.id})` });
}

if (cmd === 'renew') {
  if (!lock || lock.by !== me) out({ ok: false, text: lock ? held(lock) : `#${num} has no live claim by ${me} — claim it again` }, 2);
  const until = untilFromTtl();
  post('renew', { until }, `Claim by \`${me}\` extended to ${until}.`);
  out({ ok: true, by: me, until, text: `renewed #${num} until ${until}` });
}

if (cmd === 'release') {
  if (lock && lock.by !== me) out({ ok: false, ...lock, text: `${held(lock)} — only the holder releases` }, 2);
  const close = args.includes('--close');
  if (close) {
    const body = api([base]).body || '';
    const open = body.split(/\r?\n/).filter((l) => /^\s*[-*] \[ \]/.test(l) && !/#\d+/.test(l));
    if (open.length) out({ ok: false, open, text: `close refused: ${open.length} unchecked item(s) name no issue they moved to:\n${open.map((l) => `  ${l.trim()}`).join('\n')}\nTick them, or append "→ moved to #n" to each.` }, 3);
  }
  if (lock) post('release', {}, `**Released** by \`${me}\`.`);
  api(['-X', 'DELETE', `${base}/labels/${encodeURIComponent(LABEL)}`], true);
  api(['-X', 'DELETE', `${base}/assignees`, '-f', `assignees[]=${login}`], true);
  if (close) api(['-X', 'PATCH', base, '-f', 'state=closed']);
  out({ ok: true, text: `released #${num}${close ? ' and closed it' : ''}` });
}
