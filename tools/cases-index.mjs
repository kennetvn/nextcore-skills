#!/usr/bin/env node
// cases-index — validate every case in cases/ and rebuild the index in cases/README.md.
//
//   node tools/cases-index.mjs           # rewrite the index
//   node tools/cases-index.mjs --check   # exit 1 if a case is invalid or the index is stale (used by the tests)
//
// A case is cases/<slug>.md with frontmatter (title, date, layer, area, stack, kind, skill) whose values come from
// cases/taxonomy.json (stack is free), and the sections listed in taxonomy.sections, in that order.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
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

export function loadCases() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && !['README.md', 'TEMPLATE.md'].includes(f))
    .sort()
    .map((f) => parseCase(f, readFileSync(join(DIR, f), 'utf8')));
}

export function renderIndex(cases) {
  const link = (c) => `[${c.title}](${c.file})`;
  const out = [`${cases.length} case${cases.length === 1 ? '' : 's'}. Newest first inside each group; a case can sit in more than one layer.`, ''];
  out.push('### By layer', '');
  for (const [layer, what] of Object.entries(TAX.layer)) {
    const rows = cases.filter((c) => c.layer.includes(layer)).sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) continue;
    out.push(`**${layer}** — ${what}`, '', '| Case | Area | Stack | Kind |', '|---|---|---|---|');
    for (const c of rows) out.push(`| ${link(c)} | ${c.area.join(', ')} | ${c.stack.join(', ')} | ${c.kind} |`);
    out.push('');
  }
  const stacks = {};
  for (const c of cases) for (const s of c.stack) (stacks[s] ??= []).push(c);
  out.push('### By stack', '');
  for (const s of Object.keys(stacks).sort()) out.push(`- **${s}** — ${stacks[s].map(link).join(' · ')}`);
  return out.join('\n');
}

if (process.argv[1]?.endsWith('cases-index.mjs')) {
  const cases = loadCases();
  const bad = cases.filter((c) => c.errors.length);
  for (const c of bad) console.error(`cases/${c.file}: ${c.errors.join('; ')}`);
  const readmePath = join(DIR, 'README.md');
  const readme = readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n');
  const a = readme.indexOf(START), b = readme.indexOf(END);
  if (a < 0 || b < 0) { console.error('cases/README.md: index markers missing'); process.exit(1); }
  const next = `${readme.slice(0, a + START.length)}\n${renderIndex(cases.filter((c) => !c.errors.length))}\n${readme.slice(b)}`;
  if (process.argv.includes('--check')) {
    if (next !== readme) console.error('cases/README.md: index is stale — run `npm run cases`');
    process.exit(bad.length || next !== readme ? 1 : 0);
  }
  writeFileSync(readmePath, next);
  console.log(`cases-index: ${cases.length - bad.length} case(s) indexed${bad.length ? `, ${bad.length} invalid` : ''}`);
  process.exit(bad.length ? 1 : 0);
}
