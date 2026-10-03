// Repo hygiene + tool tests for the nextcore-skills marketplace. Zero dependencies: `node --test tests/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, cpSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  if (['node_modules', '.git', 'fixtures'].includes(n)) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test('marketplace: every local plugin exists and its plugin.json name matches the entry name', () => {
  const mk = JSON.parse(read('.claude-plugin/marketplace.json'));
  assert.ok(mk.name && mk.owner?.name && Array.isArray(mk.plugins) && mk.plugins.length);
  for (const p of mk.plugins) {
    assert.ok(p.name && p.source && p.description, `entry ${p.name} incomplete`);
    if (typeof p.source !== 'string') continue;
    assert.ok(!p.source.includes('..'), `${p.name}: no .. in source`);
    const manifest = JSON.parse(read(join(p.source, '.claude-plugin', 'plugin.json')));
    assert.equal(manifest.name, p.name, 'entry name must equal manifest name');
    assert.ok(existsSync(join(root, p.source, 'skills', p.name, 'SKILL.md')), `${p.name}: skills/${p.name}/SKILL.md`);
  }
});

test('skills: frontmatter has name + description, body stays lean', () => {
  for (const f of walk(join(root, 'plugins')).filter((f) => f.endsWith('SKILL.md'))) {
    const t = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    const fm = (t.match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
    assert.match(fm, /^name:\s*\S+/m, `${f}: name`);
    assert.match(fm, /^description:\s*\S+/m, `${f}: description`);
    assert.ok(t.split('\n').length <= 260, `${f}: keep SKILL.md lean, move detail to references/`);
  }
});

test('docs: every relative markdown link resolves', () => {
  const dead = [];
  for (const f of walk(root).filter((f) => extname(f) === '.md')) {
    for (const [, link] of readFileSync(f, 'utf8').matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
      if (/^(https?:|mailto:)/.test(link)) continue;
      if (!existsSync(join(dirname(f), link))) dead.push(`${f.slice(root.length)} -> ${link}`);
    }
  }
  assert.deepEqual(dead, []);
});

test('docs: nothing private leaked (product names, internal paths, IPs, emails, internal issue numbers)', () => {
  const LEAKS = [
    /homestay|lamdong|dilinh|huyendilinh/i, // product / account names
    /NEXTCORE-(?!SKILLS\b)[A-Z]|\.agent\//, // private repo paths (case-sensitive; the old public name NEXTCORE-SKILLS is fine)
    /\b(?!127\.|0\.0\.0\.0|10\.0\.0\.)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // non-loopback IPs
    /[\w.+-]+@[\w-]+\.(?:com|org|vn|net)\b/, // emails
    /(?<![\w/&])#\d{3}\b/, // internal issue numbers
  ];
  const hits = walk(root).filter((f) => ['.md', '.json', '.mjs', '.yml'].includes(extname(f)))
    .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l]))
    .filter(([f, , l]) => LEAKS.some((re) => re.test(l)) && !f.endsWith('hub.test.mjs'))
    .map(([f, n, l]) => `${f.slice(root.length)}:${n}: ${l.trim().slice(0, 100)}`);
  assert.deepEqual(hits, []);
});

// doc-drift: copy the fixture so --update never edits the repo; pass --max-age explicitly (no time bombs)
const drift = (dir, ...a) => spawnSync(process.execPath, [join(root, 'plugins/nextcore-workflow/skills/nextcore-workflow/scripts/doc-drift.mjs'), 'docs', ...a], { cwd: dir, encoding: 'utf8' });
const fixture = () => { const d = mkdtempSync(join(tmpdir(), 'drift-')); cpSync(join(root, 'tests/fixtures/drift'), d, { recursive: true }); return d; };

test('doc-drift: reports drift, a marker without a command, and stale markers; report-only unless --strict', () => {
  const d = fixture();
  const r = drift(d, '--max-age', '30');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /DRIFT\s+pages\s+doc says 12\s+now 15/);
  assert.match(r.stdout, /NOCMD\s+orphan/);
  assert.match(r.stdout, /stale\s+old/);
  assert.equal(drift(d, '--max-age', '36500', '--strict').status, 1);
});

test('doc-drift: --update rewrites only measurable markers, then --quiet stays silent about them', () => {
  const d = fixture();
  drift(d, '--max-age', '36500', '--update');
  const doc = readFileSync(join(d, 'docs/rules.md'), 'utf8');
  assert.match(doc, /measure: pages=15 @\d{4}-\d{2}-\d{2}/);
  assert.match(doc, /measure: orphan=1 @2026-10-01/, 'a marker with no command is left alone');
  const q = drift(d, '--max-age', '36500', '--quiet');
  assert.doesNotMatch(q.stdout, /DRIFT/);
});
