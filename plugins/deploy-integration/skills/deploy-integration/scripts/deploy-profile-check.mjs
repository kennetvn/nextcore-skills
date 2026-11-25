#!/usr/bin/env node
// deploy-profile-check — a deploy profile (deploy-profile.json) is data an agent acts on, so it must say the truth.
// Checks the shape (schema v1), that no secret VALUE is in it (names only), and — for a GitHub Actions target — that it
// still matches the workflow it describes: trigger branch and paths, manual dispatch, workflow name, every secret and
// variable the workflow reads (both ways), and the runner labels. Zero dependencies, Node >= 18.
//
//   deploy-profile-check [deploy-profile.json] [--root <dir>] [--json]
//
// --root   directory the profile's relative paths start from (default: the profile's own directory)
// --json   machine output: { ok, errors: [{ target, msg }], warnings: [...] }
//
// Exit 0 = matches · 1 = errors (each printed as "ERR <target>: <message>") · 2 = cannot read the profile.
// Schema: references/profile-schema.md of the deploy-integration skill.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  const src = readFileSync(new URL(import.meta.url), 'utf8').split('\n');
  console.log(src.slice(1, src.findIndex((l) => l.startsWith('import'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n').trim());
  process.exit(0);
}
const opt = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const file = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--root') || 'deploy-profile.json');
const ROOT = resolve(opt('--root') || dirname(file));

export const CHANNELS = ['gha', 'vps-ssh', 'paas', 'manual'];
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const errors = [], warnings = [];
const err = (target, msg) => errors.push({ target, msg });
const warn = (target, msg) => warnings.push({ target, msg });

let p;
try { p = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }

// ── 1. No secret values: names only ─────────────────────────────────────────────────────────────
const SECRET_KEY = /pass(word)?|pwd|secret|token|private.?key|api.?key|credential/i;
const NAME_ONLY = /^[A-Z][A-Z0-9_]*$/;
(function scan(v, path) {
  if (typeof v === 'string') {
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v)) err('profile', `${path}: a private key is pasted here — keep it in the key store, write only its name`);
    if (/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/.test(v)) err('profile', `${path}: looks like a token value — write the secret NAME, never the value`);
    const k = path.split('.').pop().replace(/\[\d+\]$/, '');
    if (SECRET_KEY.test(k) && !NAME_ONLY.test(v)) err('profile', `${path}: "${k}" holds a value — a profile stores secret names (UPPER_SNAKE), not values`);
    return;
  }
  if (Array.isArray(v)) return v.forEach((x, i) => scan(x, `${path}[${i}]`));
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, path ? `${path}.${k}` : k);
})(p, '');

// ── 2. Shape ────────────────────────────────────────────────────────────────────────────────────
if (p.version !== 1) err('profile', 'version must be 1');
if (!Array.isArray(p.targets) || !p.targets.length) err('profile', 'targets must be a non-empty array');
const seen = new Set();
for (const t of p.targets || []) {
  const id = t.id || '?';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id || '')) err(id, 'id must be kebab-case');
  if (seen.has(t.id)) err(id, 'duplicate id'); seen.add(t.id);
  if (!CHANNELS.includes(t.channel)) err(id, `channel must be one of ${CHANNELS.join(' | ')}`);
  if (!t.trigger || typeof t.trigger !== 'object') err(id, 'trigger missing (push / dispatch / manual)');
  if (!Array.isArray(t.verify) || !t.verify.length) err(id, 'verify missing — a deploy nobody measures is a guess');
  for (const v of t.verify || []) {
    if (!/^https?:\/\//.test(v.url || '')) err(id, `verify.url must be http(s): ${v.url}`);
    if (!Number.isInteger(v.expect)) err(id, `verify.expect must be an HTTP status for ${v.url}`);
  }
  if (!t.rollback?.how) err(id, 'rollback.how missing — write how to go back before the first deploy');
  if (t.channel === 'vps-ssh' && !t.host?.role && !t.host?.address) err(id, 'vps-ssh needs host.role (preferred) or host.address');
  if (t.channel === 'paas' && t.paas?.config && !existsSync(join(ROOT, t.repoPath || '.', t.paas.config))) err(id, `paas.config not found: ${t.paas.config}`);
  if (t.channel === 'gha') checkGha(t, id);
}

// ── 3. GitHub Actions target ⇔ its workflow file ────────────────────────────────────────────────
function listAfter(block, key) {
  const lines = block.split('\n');
  const i = lines.findIndex((l) => new RegExp(`^\\s+${key}:`).test(l));
  if (i < 0) return null;
  const inline = lines[i].match(/\[([^\]]*)\]/);
  if (inline) return inline[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const ind = lines[i].match(/^\s*/)[0].length;
  const out = [];
  for (const l of lines.slice(i + 1)) {
    if (!l.trim() || /^\s*#/.test(l)) continue;
    const m = l.match(/^(\s*)-\s*(.+?)\s*$/);
    if (!m || m[1].length <= ind - 1) break;
    out.push(m[2].replace(/\s+#.*$/, '').replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

function checkGha(t, id) {
  const g = t.gha || {};
  if (!g.workflow) return err(id, 'gha.workflow missing (path of the workflow file)');
  const wf = join(ROOT, t.repoPath || '.', g.workflow);
  if (!existsSync(wf)) return err(id, `workflow not found: ${join(t.repoPath || '.', g.workflow)}`);
  const y = readFileSync(wf, 'utf8').replace(/\r\n/g, '\n');
  const code = y.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

  const name = (code.match(/^name:\s*['"]?(.+?)['"]?\s*$/m) || [])[1];
  if (g.name && name !== g.name) err(id, `gha.name "${g.name}" ≠ workflow name "${name}"`);

  const onStart = code.search(/^(on|'on'|"on"):/m);
  const rest = onStart < 0 ? '' : code.slice(onStart);
  const onBlock = rest.split('\n').slice(0, (rest.split('\n').slice(1).findIndex((l) => /^\S/.test(l)) + 1) || undefined).join('\n');
  const push = t.trigger?.push;
  const hasPush = /^\s+push:/m.test(onBlock);
  if (!!push !== hasPush) err(id, `trigger.push ${push ? 'set' : 'absent'} but the workflow ${hasPush ? 'runs' : 'does not run'} on push`);
  if (push && hasPush) {
    const pushBlock = onBlock.slice(onBlock.search(/^\s+push:/m));
    const branches = listAfter(pushBlock, 'branches') || [];
    if (push.branch && !branches.includes(push.branch)) err(id, `trigger.push.branch "${push.branch}" not in workflow branches [${branches.join(', ')}]`);
    const paths = listAfter(pushBlock, 'paths');
    if (paths && !sameSet(push.paths || [], paths)) err(id, `trigger.push.paths differ from the workflow — workflow: [${paths.join(', ')}]`);
    if (!paths && push.paths?.length) err(id, 'trigger.push.paths set but the workflow has no paths filter');
  }
  const hasDispatch = /^\s+workflow_dispatch:/m.test(onBlock);
  if (!!t.trigger?.dispatch !== hasDispatch) err(id, `trigger.dispatch is ${!!t.trigger?.dispatch} but workflow_dispatch is ${hasDispatch ? 'present' : 'absent'}`);

  const used = (kind) => [...new Set([...code.matchAll(new RegExp(`\\b${kind}\\.([A-Za-z0-9_]+)`, 'g'))].map((m) => m[1]))].filter((n) => n !== 'GITHUB_TOKEN').sort();
  for (const [kind, key] of [['secrets', 'secrets'], ['vars', 'vars']]) {
    const inWf = used(kind), inProfile = [...(g[key] || [])].sort();
    if (!sameSet(inProfile, inWf)) err(id, `gha.${key} [${inProfile.join(', ')}] ≠ workflow ${kind}.* [${inWf.join(', ')}]`);
  }
  for (const label of g.runsOn || []) if (!code.includes(label)) err(id, `runner label "${label}" not in the workflow`);
  if (!g.runsOn?.length) warn(id, 'gha.runsOn empty — say which runner deploys (hosted or self-hosted labels)');
}

// ── 4. Report ───────────────────────────────────────────────────────────────────────────────────
if (argv.includes('--json')) console.log(JSON.stringify({ ok: !errors.length, errors, warnings }, null, 2));
else {
  for (const e of errors) console.log(`ERR ${e.target}: ${e.msg}`);
  for (const w of warnings) console.log(`WARN ${w.target}: ${w.msg}`);
  console.log(errors.length ? `deploy-profile-check: ${errors.length} error(s)` : `deploy-profile-check: ok — ${(p.targets || []).length} target(s) match`);
}
process.exit(errors.length ? 1 : 0);
