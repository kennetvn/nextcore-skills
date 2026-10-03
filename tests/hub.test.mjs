// Repo hygiene + tool tests for the nextcore-skills marketplace. Zero dependencies: `node --test tests/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, cpSync, writeFileSync, mkdirSync } from 'node:fs';
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
    /homestay(?!nextcore\.org)[\w-]|lamdong|dilinh|huyendilinh/i, // account names, old/private product names (the public site is fine)
    /NEXTCORE-(?!SKILLS\b)[A-Z]|\.agent\//, // private repo paths (case-sensitive; the old public name NEXTCORE-SKILLS is fine)
    /\b(?!127\.|0\.0\.0\.0|10\.0\.0\.)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // non-loopback IPs
    /[\w.+-]+@[\w-]+\.(?:com|org|vn|net)\b/, // emails
    /(?<![\w/&'"`])#\d{3}\b(?![0-9a-fA-F])/, // internal issue numbers (not hex colours like '#000')
  ];
  const hits = walk(root).filter((f) => ['.md', '.json', '.mjs', '.cjs', '.js', '.ps1', '.sh', '.yml'].includes(extname(f)))
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

// third-patch: real git history in a temp repo
const sh = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
const patch = (cwd, ...a) => spawnSync(process.execPath, [join(root, 'plugins/nextcore-workflow/skills/nextcore-workflow/scripts/third-patch.mjs'), ...a], { cwd, encoding: 'utf8' });
function repoWithTwoFixes() {
  const d = mkdtempSync(join(tmpdir(), 'patch-'));
  sh(d, 'init', '-q'); sh(d, 'config', 'user.email', 't@t.t'); sh(d, 'config', 'user.name', 't');
  const w = (s) => writeFileSync(join(d, 'cart.js'), s);
  w('a'); sh(d, 'add', '.'); sh(d, 'commit', '-qm', 'feat: cart');
  w('b'); sh(d, 'commit', '-qam', 'fix: cart total rounding');
  w('c'); sh(d, 'commit', '-qam', 'fix: cart total again');
  return d;
}

test('third-patch: blocks a third fix without a diagnosis, even after the file is renamed', () => {
  const d = repoWithTwoFixes();
  const r = patch(d, '--files', 'cart.js');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /BLOCKED — cart\.js already has 2 fix commits/);
  sh(d, 'mv', 'cart.js', 'basket.js'); sh(d, 'commit', '-qm', 'refactor: rename');
  assert.equal(patch(d, '--files', 'basket.js').status, 1, 'history must follow the rename');
});

test('third-patch: passes once a diagnosis note names the file with symptom, hypothesis, observation', () => {
  const d = repoWithTwoFixes();
  mkdirSync(join(d, 'docs/diagnosis'), { recursive: true });
  writeFileSync(join(d, 'docs/diagnosis/cart.md'), '# cart.js total\n## Symptom\n3 of 40 orders off by 1 VND\n## Hypothesis\nfloat sum; refuted if Decimal sum also differs\n## Observation\nDB rows show 0.1+0.2\n');
  assert.equal(patch(d, '--files', 'cart.js').status, 0);
  writeFileSync(join(d, 'docs/diagnosis/cart.md'), '# cart.js\n## Symptom\nwrong total\n');
  assert.equal(patch(d, '--files', 'cart.js').status, 1, 'a note without all three sections does not count');
});

test('third-patch: outside a git repository it says so in one line, no stack trace', () => {
  const r = patch(mkdtempSync(join(tmpdir(), 'nogit-')));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /not inside a git repository/);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
});

test('tools: every bin answers --help with its usage and exit 0', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const [name, rel] of Object.entries(pkg.bin)) {
    const r = spawnSync(process.execPath, [join(root, rel), '--help'], { cwd: tmpdir(), encoding: 'utf8' });
    assert.equal(r.status, 0, `${name} --help exit ${r.status}: ${r.stderr}`);
    assert.match(r.stdout, new RegExp(`^${name} `), `${name} --help should start with its name`);
  }
});

test('issue forms list every tool and every case layer (they drift silently otherwise)', () => {
  const bins = Object.keys(JSON.parse(read('package.json')).bin);
  const bug = read('.github/ISSUE_TEMPLATE/bug.yml');
  for (const b of [...bins, 'cases-index']) assert.ok(bug.includes(b), `bug.yml dropdown is missing ${b}`);
  const layers = Object.keys(JSON.parse(read('cases/taxonomy.json')).layer);
  const lesson = read('.github/ISSUE_TEMPLATE/lesson.yml');
  const opts = (lesson.match(/id: layer[\s\S]*?options: \[([^\]]+)\]/) || [])[1]?.split(',').map((s) => s.trim());
  assert.deepEqual(opts, layers, 'lesson.yml layer options must equal cases/taxonomy.json layers');
});

test('cases: every case is valid and cases/README.md index is current', () => {
  const r = spawnSync(process.execPath, [join(root, 'tools/cases-index.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('cases: the validator rejects a bad case and accepts the template shape', async () => {
  const { parseCase } = await import('../tools/cases-index.mjs');
  const good = read('cases/TEMPLATE.md');
  assert.deepEqual(parseCase('t.md', good).errors, []);
  const bad = good.replace('layer: [infra, performance]', 'layer: [infra, speed]').replace('## Rule', '## Lessons');
  const errs = parseCase('b.md', bad).errors.join(' | ');
  assert.match(errs, /layer: unknown "speed"/);
  assert.match(errs, /sections must be exactly/);
});

const install = (dir, ...a) => spawnSync(process.execPath, [join(root, 'tools/nextcore-install.mjs'), '--dir', dir, ...a], { encoding: 'utf8' });

test('nextcore-install: every agent layout installs, runs, and a second run changes nothing', () => {
  const expect = {
    claude: ['.claude/skills/nextcore-design/SKILL.md', '.claude/skills/nextcore-dev/references/stacks.md', '.claude/agents/design-critic.md'],
    cursor: ['.cursor/rules/nextcore-design.mdc', '.nextcore/nextcore-workflow/SKILL.md'],
    codex: ['AGENTS.md', '.nextcore/nextcore-design/scripts/spec-check.mjs'],
    gemini: ['GEMINI.md'], copilot: ['.github/copilot-instructions.md'],
    windsurf: ['.windsurf/rules/nextcore-dev.md'], generic: ['.nextcore/VERSION'],
  };
  for (const [agent, files] of Object.entries(expect)) {
    const d = mkdtempSync(join(tmpdir(), `nci-${agent}-`));
    const r = install(d, '--agent', agent);
    assert.equal(r.status, 0, `${agent}: ${r.stderr}`);
    for (const f of files) assert.ok(existsSync(join(d, f)), `${agent}: ${f}`);
    assert.match(install(d, '--agent', agent).stdout, /wrote 0, unchanged \d+/, `${agent}: second run must be a no-op`);
  }
  const d = mkdtempSync(join(tmpdir(), 'nci-run-'));
  install(d, '--agent', 'claude', '--skills', 'design');
  assert.ok(!existsSync(join(d, '.claude/skills/nextcore-design/agents')), 'Claude: subagents only in .claude/agents/, not twice');
  const help = spawnSync(process.execPath, [join(d, '.claude/skills/nextcore-design/scripts/spec-check.mjs'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, 'installed tools run from their new place');
});

test('nextcore-install: keeps the user\'s own text, refuses to overwrite a file it did not create, dry-run writes nothing', () => {
  const d = mkdtempSync(join(tmpdir(), 'nci-keep-'));
  writeFileSync(join(d, 'AGENTS.md'), '# House rules\n\nUse pnpm.\n');
  install(d, '--agent', 'codex');
  install(d, '--agent', 'codex', '--skills', 'dev');
  const md = readFileSync(join(d, 'AGENTS.md'), 'utf8');
  assert.ok(md.startsWith('# House rules\n\nUse pnpm.\n'), 'user text kept');
  assert.equal(md.split('nextcore-skills:start').length - 1, 1, 'one block, replaced in place');
  assert.ok(md.includes('nextcore-dev') && !md.includes('**nextcore-design**'), 'block reflects the last install');

  const c = mkdtempSync(join(tmpdir(), 'nci-conflict-'));
  mkdirSync(join(c, '.claude/agents'), { recursive: true });
  writeFileSync(join(c, '.claude/agents/design-critic.md'), 'my own critic\n');
  const r = install(c, '--agent', 'claude', '--skills', 'design');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /conflict: .*design-critic\.md/);
  assert.equal(readFileSync(join(c, '.claude/agents/design-critic.md'), 'utf8'), 'my own critic\n');

  const e = mkdtempSync(join(tmpdir(), 'nci-dry-'));
  assert.match(install(e, '--agent', 'cursor', '--dry-run').stdout, /would write/);
  assert.deepEqual(readdirSync(e), []);
});

test('nextcore measure/all: detects a small Next.js project, recommends design + dev, installs only those', () => {
  const d = mkdtempSync(join(tmpdir(), 'nc-measure-'));
  mkdirSync(join(d, 'app/api/orders'), { recursive: true });
  writeFileSync(join(d, 'package.json'), JSON.stringify({ dependencies: { next: '16.0.0', '@prisma/client': '5.22.0' } }));
  writeFileSync(join(d, 'app/globals.css'), ':root{--bg:#ffffff;--ink:#9ca3af}\n.card{border:1px solid #e5e7eb;transition:all .2s}\n');
  writeFileSync(join(d, 'app/page.tsx'), 'export default function P(){return <main className="card">John Doe ordered 1000 items</main>}\n');
  writeFileSync(join(d, 'app/api/orders/route.ts'), 'export async function GET(){ return Response.json([]) }\n');
  const nc = (...a) => spawnSync(process.execPath, [join(root, 'tools/nextcore.mjs'), ...a, '--dir', d], { encoding: 'utf8' });
  const m = JSON.parse(nc('measure', '--json').stdout);
  assert.deepEqual(m.stack, ['Next.js']);
  assert.equal(m.tokenFile, 'app/globals.css');
  assert.equal(m.apiRoutes, 1);
  assert.equal(m.checks.slop.errors, 3);
  assert.equal(m.checks.tokens.errors, 1);
  assert.deepEqual(Object.keys(m.recommend).sort(), ['design', 'dev']);
  assert.match(m.skipped.workflow, /no git history/);
  const r = nc('all', '--agent', 'generic');
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(d, '.nextcore/nextcore-design/SKILL.md')) && existsSync(join(d, '.nextcore/nextcore-dev/SKILL.md')));
  assert.ok(!existsSync(join(d, '.nextcore/nextcore-workflow')), 'workflow was not recommended, so not installed');
});
