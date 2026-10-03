#!/usr/bin/env node
// cases-index — validate every case in cases/ and rebuild the index in cases/README.md.
//
//   node tools/cases-index.mjs           # rewrite the index
//   node tools/cases-index.mjs --check   # exit 1 if a case is invalid or the index is stale (used by the tests)
//
// A case is cases/<category>/<slug>.md — <category> one of taxonomy.category — with frontmatter (title, date, layer,
// area, stack, kind, skill) whose values come from cases/taxonomy.json (stack is free), and the sections listed in
// taxonomy.sections, in that order. A platform category (zalo, facebook…) may carry a README.md playbook; when it does,
// it needs a "Verified: <version> · <runtime> · <date>" line and the playbook sections.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'cases');
const TAX = JSON.parse(readFileSync(join(DIR, 'taxonomy.json'), 'utf8'));
const START = '<!-- cases:start -->';
const END = '<!-- cases:end -->';

const list = (v) => v.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);

export function parseCase(file, text) {
  const t = text.replace(/\r\n/g, '\n');
  const fm = (t.match(/^---\n([\s\S]*?)\n---\n/) || [])[1];
  const errors = [];
  if (!fm) return { file, errors: ['missing frontmatter'] };
  const get = (k) => (fm.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim();
  const c = {
    file, slug: file.replace(/\.md$/, ''),
    title: get('title'), date: get('date'),
    layer: list(get('layer') || ''), area: list(get('area') || ''), stack: list(get('stack') || ''),
    kind: get('kind'), skill: get('skill'), errors,
  };
  if (!c.title) errors.push('title');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date || '')) errors.push('date (YYYY-MM-DD)');
  for (const k of ['layer', 'area']) {
    if (!c[k].length) errors.push(`${k} is empty`);
    for (const v of c[k]) if (!TAX[k][v]) errors.push(`${k}: unknown "${v}" (add it to taxonomy.json)`);
  }
  if (!c.stack.length) errors.push('stack is empty');
  for (const v of c.stack) if (!/^[a-z0-9][a-z0-9.+-]*$/.test(v)) errors.push(`stack: "${v}" must be lowercase, one word`);
  if (!TAX.kind[c.kind]) errors.push(`kind: unknown "${c.kind}"`);
  if (!TAX.skill[c.skill]) errors.push(`skill: unknown "${c.skill}"`);
  const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  if (heads.join('|') !== TAX.sections.join('|')) errors.push(`sections must be exactly: ${TAX.sections.join(' · ')} (found: ${heads.join(' · ') || 'none'})`);
  return c;
}

const PLAYBOOK = ['Read this first', 'Status', 'Audit it yourself', 'Deploy', 'Known failures', 'Open questions'];

export function loadCases() {
  const out = [];
  for (const n of readdirSync(DIR).sort()) {
    const p = join(DIR, n);
    if (!statSync(p).isDirectory()) {
      if (n.endsWith('.md') && !['README.md', 'TEMPLATE.md', 'PLAYBOOK-TEMPLATE.md'].includes(n)) {
        out.push({ file: n, errors: ['cases live in a category folder: cases/<category>/' + n] });
      }
      continue;
    }
    for (const f of readdirSync(p).filter((x) => x.endsWith('.md') && x !== 'README.md').sort()) {
      const c = parseCase(`${n}/${f}`, readFileSync(join(p, f), 'utf8'));
      c.category = n;
      if (!TAX.category[n]) c.errors.push(`folder "${n}" is not a category in taxonomy.json`);
      out.push(c);
    }
  }
  return out;
}

/** Playbook READMEs of platform folders: [{ category, file, verified, errors }]. */
export function loadPlaybooks() {
  const out = [];
  for (const [n, meta] of Object.entries(TAX.category)) {
    const p = join(DIR, n, 'README.md');
    if (!existsSync(p)) continue;
    const t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    const errors = [];
    if (!meta.platform) errors.push('only platform categories carry a playbook README');
    const verified = (t.match(/^Verified: (.+ · \d{4}-\d{2}-\d{2})$/m) || [])[1];
    if (!verified) errors.push('"Verified: <version> · <runtime> · <YYYY-MM-DD>" line');
    const heads = [...t.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    for (const r of PLAYBOOK) if (!heads.includes(r)) errors.push(`missing "## ${r}"`);
    out.push({ category: n, file: `${n}/README.md`, verified, title: (t.match(/^# (.+)$/m) || [])[1] || n, errors });
  }
  return out;
}

export function renderIndex(cases, playbooks = []) {
  const link = (c) => `[${c.title}](${c.file})`;
  const out = [`${cases.length} case${cases.length === 1 ? '' : 's'} in ${new Set(cases.map((c) => c.category)).size} folders. Newest first in each folder.`, ''];
  for (const [cat, meta] of Object.entries(TAX.category)) {
    const rows = cases.filter((c) => c.category === cat).sort((a, b) => b.date.localeCompare(a.date));
    const pb = playbooks.find((p) => p.category === cat);
    if (!rows.length && !pb) continue;
    out.push(`### [${cat}](${cat}/) — ${meta.what}`, '');
    if (pb) out.push(`**Playbook:** [${pb.title}](${pb.file}) — verified ${pb.verified}`, '');
    if (rows.length) {
      out.push('| Case | Layer | Stack | Kind |', '|---|---|---|---|');
      for (const c of rows) out.push(`| ${link(c)} | ${c.layer.join(', ')} | ${c.stack.join(', ')} | ${c.kind} |`);
      out.push('');
    }
  }
  const stacks = {};
  for (const c of cases) for (const s of c.stack) (stacks[s] ??= []).push(c);
  out.push('### By stack', '');
  for (const s of Object.keys(stacks).sort()) out.push(`- **${s}** — ${stacks[s].map(link).join(' · ')}`);
  return out.join('\n');
}

if (process.argv[1]?.endsWith('cases-index.mjs')) {
  const cases = loadCases();
  const playbooks = loadPlaybooks();
  const bad = [...cases, ...playbooks].filter((c) => c.errors.length);
  for (const c of bad) console.error(`cases/${c.file}: ${c.errors.join('; ')}`);
  const readmePath = join(DIR, 'README.md');
  const readme = readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n');
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a < 0 || b < 0) { console.error('cases/README.md: index markers missing'); process.exit(1); }
  const next = `${readme.slice(0, a + START.length)}\n${renderIndex(cases.filter((c) => !c.errors.length), playbooks.filter((p) => !p.errors.length))}\n${readme.slice(b)}`;
  if (process.argv.includes('--check')) {
    if (next !== readme) console.error('cases/README.md: index is stale — run `npm run cases`');
    process.exit(bad.length || next !== readme ? 1 : 0);
  }
  writeFileSync(readmePath, next);
  console.log(`cases-index: ${cases.length - bad.length} case(s) indexed${bad.length ? `, ${bad.length} invalid` : ''}`);
  process.exit(bad.length ? 1 : 0);
}
