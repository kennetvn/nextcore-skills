// Two-way tests: every check must fire on the bad fixtures, nothing may fire on the good ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (...p) => join(here, 'fixtures', ...p);
const tool = (name, ...args) => {
  const r = spawnSync(process.execPath, [join(here, '..', 'skills', 'nextcore-design', 'scripts', name), ...args], { encoding: 'utf8' });
  return { code: r.status, json: args.includes('--json') ? JSON.parse(r.stdout) : null, out: r.stdout };
};

test('slop-check: all 11 rules fire on bad fixtures', () => {
  const rules = new Set(tool('slop-check.mjs', fx('bad'), '--json', '--warn-only').json.map((f) => f.rule));
  for (const r of ['color-literal', 'rgb-literal', 'purple-gradient', 'transition-all', 'break-all', 'grid-1fr', 'italic-heading', 'emoji-icon', 'placeholder-data', 'round-number', 'pixel-patch']) {
    assert.ok(rules.has(r), `rule ${r} did not fire`);
  }
});

test('slop-check: zero findings on good fixtures (tokens, fallbacks, logos, placeholders)', () => {
  assert.deepEqual(tool('slop-check.mjs', fx('good'), '--json').json, []);
});

test('slop-check: exits 1 on errors, 0 with --warn-only', () => {
  assert.equal(tool('slop-check.mjs', fx('bad')).code, 1);
  assert.equal(tool('slop-check.mjs', fx('bad'), '--warn-only').code, 0);
});

test('token-audit: catches low contrast, missing dark value, undefined var', () => {
  const r = tool('token-audit.mjs', fx('tokens', 'bad.css'), '--src', fx('tokens', 'bad-src'), '--json');
  const got = r.json.findings.map((f) => `${f.rule} ${f.where}`);
  assert.ok(got.some((g) => g.includes('contrast') && g.includes('--ds-warning-fg on --ds-warning')), 'fg-on-fill contrast');
  assert.ok(got.some((g) => g.includes('contrast') && g.includes('--ds-ink-muted on --ds-bg')), 'muted text contrast');
  assert.ok(got.some((g) => g.startsWith('dark-missing --ds-bg-muted')), 'near-white surface without dark value');
  assert.ok(got.some((g) => g.startsWith('undefined-var')), 'undefined var()');
  assert.equal(r.code, 1);
});

test('token-audit: clean token file + JS-defined vars (next/font, chart --color-${key}) pass', () => {
  const r = tool('token-audit.mjs', fx('tokens', 'good.css'), '--src', fx('tokens', 'good-src'), '--json');
  assert.deepEqual(r.json.findings, []);
  assert.equal(r.json.pairsChecked, 6);
  assert.equal(r.code, 0);
});

const card = (kind) => tool('design-card.mjs', fx('drawings', kind), '--tokens', fx('tokens', 'good.css'), '--fonts', 'Inter,Fraunces', '--app', fx('app'), '--json', '--strict');

test('design-card: a complete drawing passes every check', () => {
  const r = card('good');
  assert.equal(r.json.length, 1);
  assert.deepEqual(r.json[0].problems, []);
  assert.equal(r.code, 0);
});

test('design-card: an incomplete drawing reports every gap', () => {
  const r = card('bad');
  const p = r.json[0].problems.join(' | ');
  for (const want of ['no phone artboard', 'no tablet artboard', 'no empty state', 'no loading state', 'no error state', 'no success state', 'on token', 'off-brand font: poppins', 'route /settings/billing has no page']) {
    assert.ok(p.includes(want), `missing problem: ${want}`);
  }
  assert.equal(r.code, 1);
});

test('design-review: one sheet, four squint views per artboard, 5-second questions per drawing', async () => {
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const out = join(mkdtempSync(join(tmpdir(), 'ncd-')), 'review.html');
  const r = tool('design-review.mjs', fx('drawings'), '--out', out);
  assert.equal(r.code, 0);
  const html = readFileSync(out, 'utf8');
  const count = (s) => html.split(s).length - 1;
  // 7 artboards in good + 1 in bad
  for (const view of ['distance 50%', 'distance 25%', 'grayscale', 'no decoration']) assert.equal(count(`<figcaption>${view}</figcaption>`), 8, view);
  assert.equal(count('5-second test'), 2);
  assert.ok(html.includes('html{filter:grayscale(1)!important}'), 'no-decoration view stays grayscale');
});

test('multi-stack: Blade/Twig/SCSS scanned; SCSS tokens audited; Laravel and plain route lists understood', () => {
  const bad = tool('slop-check.mjs', fx('bad'), '--json', '--warn-only').json;
  assert.ok(bad.some((f) => f.file.endsWith('view.blade.php') && f.rule === 'color-literal'), 'Blade inline hex');
  assert.ok(bad.some((f) => f.file.endsWith('view.blade.php') && f.rule === 'placeholder-data'), 'Blade fake data');
  // good/ holds a Blade view, a Twig template and SCSS token declarations — all must stay silent (asserted above too)
  const scss = tool('token-audit.mjs', fx('tokens', 'bad.scss'), '--json').json.findings.map((f) => f.where);
  assert.ok(scss.some((w) => w.includes('$warning-fg on $warning')), 'SCSS $warning-fg: $bg resolved, reported with its $ sigil');
  for (const routes of [fx('laravel', 'routes', 'web.php'), fx('routes.txt')]) {
    const cards = tool('design-card.mjs', fx('drawings'), '--tokens', fx('tokens', 'good.css'), '--fonts', 'Inter,Fraunces', '--routes', routes, '--json').json;
    const all = Object.fromEntries(cards.flatMap((c) => c.routes.map((r) => [r.route, r.exists])));
    assert.deepEqual(all, { '/settings': true, '/settings/billing': false }, routes);
  }
});

test('purple-gradient also catches the hex form (#667eea → #764ba2) but not brand blues', () => {
  const bad = tool('slop-check.mjs', fx('bad'), '--json', '--warn-only').json;
  assert.ok(bad.some((f) => f.rule === 'purple-gradient' && f.snippet.includes('#764ba2')));
  assert.deepEqual(tool('slop-check.mjs', fx('good'), '--json').json, []);
});

test('token-audit: WordPress theme.json palette (+ dark style variation) — bad fails, good stays silent', () => {
  const bad = tool('token-audit.mjs', fx('tokens', 'wp-bad', 'theme.json'), '--json');
  const got = bad.json.findings.map((f) => f.where);
  assert.ok(got.includes('light: --wp--preset--color--contrast on --wp--preset--color--base'), 'contrast on base');
  assert.ok(got.includes('light: --wp--preset--color--accent-fg on --wp--preset--color--accent'), 'accent-fg on accent');
  assert.equal(bad.code, 1);
  const good = tool('token-audit.mjs', fx('tokens', 'wp-good', 'theme.json'), fx('tokens', 'wp-good', 'styles', 'dark.json'), '--json');
  assert.deepEqual(good.json.findings, []);
  assert.equal(good.json.darkTokens, 2, 'dark variation read as the dark theme');
  assert.equal(good.code, 0);
});

test('token-audit: Tailwind v3 config read without executing it — bad fails, good stays silent, skips are counted', () => {
  const bad = tool('token-audit.mjs', fx('tokens', 'tw-bad', 'tailwind.config.js'), '--json');
  const got = bad.json.findings.map((f) => f.where);
  assert.ok(got.includes('light: --color-primary-foreground on --color-primary'), 'DEFAULT flattened to --color-primary');
  assert.ok(got.includes('light: --color-foreground on --color-background'));
  assert.ok(bad.json.sources[0].includes('4 colour(s) read, 1 skipped'), bad.json.sources[0]);
  assert.equal(bad.code, 1);
  const good = tool('token-audit.mjs', fx('tokens', 'tw-good', 'tailwind.config.js'), '--json');
  assert.deepEqual(good.json.findings, []);
  assert.equal(good.json.pairsChecked, 4, 'foreground/background, primary, muted (hsl), card skipped as non-colour');
  assert.ok(good.json.sources[0].includes('11 colour(s) read (1 not a colour value'), good.json.sources[0]);
  assert.ok(good.json.sources[0].endsWith('1 skipped (not a literal value)'), good.json.sources[0]);
  assert.equal(good.code, 0);
});
