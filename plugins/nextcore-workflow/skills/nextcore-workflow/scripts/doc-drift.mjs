#!/usr/bin/env node
// doc-drift — numbers written in docs and rules expire. Re-measure them and report what drifted. Zero deps.
//
// Put a marker next to any number an agent will act on:
//     Auth guard covers <!--measure: guarded-routes=728/739 @2026-09-25--> 728 of 739 routes.
// and say how to measure it in doc-drift.json (repo root, or --config):
//     { "guarded-routes": "node scripts/count-guarded-routes.mjs", "pages": "find src/app -name page.tsx | wc -l" }
// Each command prints the current value on stdout (trimmed; the last line is used).
//
//   node doc-drift.mjs [paths…]          compare, print a drift table, exit 0 (report-only by design)
//   node doc-drift.mjs --update          rewrite drifted markers with the new value and today's date
//   node doc-drift.mjs --quiet           print only when something drifted (for a session-start hook)
//   node doc-drift.mjs --strict          exit 1 on drift or on a marker with no command (CI)
//   --config <file> · --max-age <days>   (markers older than this are reported as stale even if equal; default 90)
//
// Why report-only: a count that grows by 3 pages a week is normal; blocking every commit on it teaches people to
// bypass the gate. The point is that an agent never acts on a number nobody re-measured.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const VALUE_OPTS = new Set(['--config', '--max-age']);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const roots = args.filter((a, i) => !a.startsWith('--') && !VALUE_OPTS.has(args[i - 1]));
if (!roots.length) roots.push('.');
const configPath = opt('--config', 'doc-drift.json');
const maxAge = Number(opt('--max-age', 90));
const update = args.includes('--update');
const quiet = args.includes('--quiet');
const strict = args.includes('--strict');

const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const MARKER = /<!--\s*measure:\s*([\w.-]+)\s*=\s*([^@>]*?)\s*@(\d{4}-\d{2}-\d{2})\s*-->/g;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor']);
const DOC_EXT = new Set(['.md', '.mdx', '.markdown', '.txt']);

function* walk(p) {
  if (statSync(p).isFile()) return yield p;
  for (const n of readdirSync(p)) if (!SKIP.has(n) && !n.startsWith('.')) yield* walk(join(p, n));
}

const measured = new Map();
function measure(name) {
  if (measured.has(name)) return measured.get(name);
  let r;
  if (!config[name]) r = { error: 'no command in config' };
  else {
    try {
      const out = execSync(config[name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim().split(/\r?\n/).pop().trim();
      r = { value: out };
    } catch (e) {
      r = { error: `command failed: ${(e.stderr || e.message || '').toString().trim().split('\n').pop()}` };
    }
  }
  measured.set(name, r);
  return r;
}

const today = new Date().toISOString().slice(0, 10);
const ageDays = (d) => Math.floor((Date.parse(today) - Date.parse(d)) / 86400000);
const rows = [];
for (const root of roots) {
  for (const file of walk(root)) {
    if (!DOC_EXT.has(extname(file).toLowerCase())) continue;
    const text = readFileSync(file, 'utf8');
    let changed = text;
    for (const m of text.matchAll(MARKER)) {
      const [whole, name, written, date] = m;
      const line = text.slice(0, m.index).split('\n').length;
      const r = measure(name);
      const where = `${relative(process.cwd(), file)}:${line}`;
      if (r.error) { rows.push({ status: 'unmeasurable', name, written, now: '—', date, where, note: r.error }); continue; }
      if (r.value !== written) {
        rows.push({ status: 'drift', name, written, now: r.value, date, where });
        if (update) changed = changed.replace(whole, `<!--measure: ${name}=${r.value} @${today}-->`);
      } else if (ageDays(date) > maxAge) {
        rows.push({ status: 'stale', name, written, now: r.value, date, where, note: `same value, but last confirmed ${ageDays(date)} days ago` });
        if (update) changed = changed.replace(whole, `<!--measure: ${name}=${written} @${today}-->`);
      } else {
        rows.push({ status: 'ok', name, written, now: r.value, date, where });
      }
    }
    if (update && changed !== text) writeFileSync(file, changed);
  }
}

const bad = rows.filter((r) => r.status !== 'ok');
if (quiet && !bad.length) process.exit(0);
if (!quiet || bad.length) {
  for (const r of quiet ? bad : rows) {
    const tag = { ok: 'ok   ', drift: 'DRIFT', stale: 'stale', unmeasurable: 'NOCMD' }[r.status];
    console.log(`${tag}  ${r.name.padEnd(24)} doc says ${String(r.written).padEnd(12)} now ${String(r.now).padEnd(12)} (${r.date})  ${r.where}${r.note ? '  — ' + r.note : ''}`);
  }
  console.log(`\ndoc-drift: ${rows.length} marker(s) · ${rows.filter((r) => r.status === 'drift').length} drifted · ${rows.filter((r) => r.status === 'stale').length} stale · ${rows.filter((r) => r.status === 'unmeasurable').length} without a command` +
    (bad.length && !update ? ' — run with --update to rewrite them' : update ? ' — markers updated' : ''));
}
process.exit(strict && bad.some((r) => r.status !== 'stale') ? 1 : 0);
