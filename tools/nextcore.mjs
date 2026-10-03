#!/usr/bin/env node
// nextcore — measure a project, recommend the skills that fit, install them. One npx call; zero dependencies.
//
//   npx -y -p github:kennetvn/nextcore-skills nextcore measure [--dir .] [--json]
//   npx -y -p github:kennetvn/nextcore-skills nextcore all --agent <agent> [--dir .] [--skills …] [--dry-run]
//   npx -y -p github:kennetvn/nextcore-skills nextcore install --agent <agent> [--skills …] [--dry-run]
//   npx -y -p github:kennetvn/nextcore-skills nextcore update [--check] [--dir .]
//
// measure  read-only. Detects the stack, the UI folder, the colour-token file, drawings/specs, API routes, a database
//          and git history; runs slop-check, token-audit and spec-check in the same process tree (no extra npx);
//          prints per-skill findings and a recommendation with the reason for each skill.
// all      measure, then install exactly the recommended skills for --agent (claude · cursor · codex · gemini ·
//          copilot · windsurf · generic). --skills overrides the recommendation. --dry-run installs nothing.
// install  same as nextcore-install (see its --help).
// update   compares the installed version (.claude/skills/ or .nextcore/nextcore-install.json) with this package —
//          npx fetches the latest — prints what changed in between from CHANGELOG.md, and re-runs the same install
//          (same agent, same skills). --check prints and changes nothing.
//
// Read the summary, not the exit code: measure exits 0 whatever it finds; all/install exit 1 only on an install conflict.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const cmd = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const DIR = opt('--dir', process.cwd());
const asJson = args.includes('--json');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = {
  slop: join(ROOT, 'plugins/nextcore-design/skills/nextcore-design/scripts/slop-check.mjs'),
  token: join(ROOT, 'plugins/nextcore-design/skills/nextcore-design/scripts/token-audit.mjs'),
  spec: join(ROOT, 'plugins/nextcore-design/skills/nextcore-design/scripts/spec-check.mjs'),
  install: join(ROOT, 'tools/nextcore-install.mjs'),
};
const node = (script, a, cwd = DIR) => spawnSync(process.execPath, [script, ...a], { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });

if (cmd === 'update') {
  const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  const found = ['.claude/skills', '.nextcore'].map((d) => join(DIR, d, 'nextcore-install.json')).filter((f) => existsSync(f));
  if (!found.length) {
    console.log('nextcore update: no install found here (.claude/skills/ or .nextcore/nextcore-install.json) — run nextcore all --agent <you> first.');
    process.exit(0);
  }
  const num = (v) => v.split('.').map(Number);
  const newer = (a, b) => { const [x, y] = [num(a), num(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
  const log = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
  let status = 0;
  for (const f of found) {
    const m = JSON.parse(readFileSync(f, 'utf8'));
    const where = relative(DIR, dirname(f)).replace(/\\/g, '/');
    if (!newer(VERSION, m.version)) { console.log(`${where}: up to date (${m.version}).`); continue; }
    const notes = [...log.matchAll(/^## \[(\d+\.\d+\.\d+)\][^\n]*\n([\s\S]*?)(?=^## \[|$(?![\s\S]))/gm)]
      .filter(([, v]) => newer(v, m.version) && !newer(v, VERSION));
    console.log(`${where}: ${m.version} → ${VERSION} (${m.agent}: ${m.skills.join(', ')}) — what changed:\n`);
    for (const [, v, body] of notes) console.log(`## ${v}\n${body.trim()}\n`);
    if (args.includes('--check')) continue;
    const r = spawnSync(process.execPath, [TOOL.install, '--agent', m.agent, '--skills', m.skills.join(','), '--dir', DIR, ...(args.includes('--force') ? ['--force'] : [])], { stdio: 'inherit' });
    status = Math.max(status, r.status ?? 1);
  }
  process.exit(status);
}

if (cmd === 'install') {
  const r = spawnSync(process.execPath, [TOOL.install, ...args.slice(1)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
if (!['measure', 'all'].includes(cmd)) {
  console.error(`nextcore: unknown command "${cmd}" — use measure, all, install or update (--help)`);
  process.exit(2);
}

// ---------- scan the project once ----------
const SKIP = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', '.next', 'out', 'coverage', '.nextcore', '.cache', '__pycache__', '.venv', 'venv', 'storage']);
const files = [];
(function walk(d, depth) {
  if (depth > 7 || files.length > 40000) return;
  let names;
  try { names = readdirSync(d); } catch { return; }
  for (const n of names) {
    if (SKIP.has(n) || (n.startsWith('.') && !['.claude', '.cursor', '.github'].includes(n))) continue;
    const p = join(d, n);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, depth + 1);
    else files.push(relative(DIR, p).replace(/\\/g, '/'));
  }
})(DIR, 0);
const has = (re) => files.some((f) => re.test(f));
const count = (re) => files.filter((f) => re.test(f)).length;
const read = (f) => { try { return readFileSync(join(DIR, f), 'utf8'); } catch { return ''; } };
const pkg = (() => { try { return JSON.parse(read('package.json')); } catch { return {}; } })();
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

// stack
const stack = [];
if (deps.next) stack.push('Next.js');
else if (deps.react) stack.push('React');
if (deps.vue || deps.nuxt) stack.push('Vue');
if (deps.svelte) stack.push('Svelte');
if (deps.astro) stack.push('Astro');
if (has(/^artisan$/)) stack.push('Laravel');
if (has(/(^|\/)manage\.py$/)) stack.push('Django');
if (has(/^Gemfile$/) && has(/^app\/views\//)) stack.push('Rails');
if (has(/(^|\/)style\.css$/) && has(/(^|\/)functions\.php$/)) stack.push('WordPress theme');
if (deps.express) stack.push('Express');
if (deps['@nestjs/core']) stack.push('Nest');
if (has(/^go\.mod$/)) stack.push('Go');
if (!stack.length && has(/\.php$/)) stack.push('PHP');

// UI
const UI = /\.(tsx|jsx|vue|svelte|astro|html|blade\.php|twig|erb|jinja|j2|njk|liquid|hbs|cshtml|razor|css|scss|less)$/;
const uiFiles = files.filter((f) => UI.test(f) && !/(^|\/)(tests?|__tests__|fixtures)\//.test(f));
const top = {};
for (const f of uiFiles) { const t = f.includes('/') ? f.split('/')[0] : '.'; top[t] = (top[t] || 0) + 1; }
const uiDir = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

// tokens: the file with the most colour-variable definitions
let tokenFile = null, best = 0;
for (const f of files) {
  let n = 0;
  if (/(^|\/)tailwind\.config\.[cm]?[jt]s$/.test(f)) n = /colors\s*:/.test(read(f)) ? 50 : 0;
  else if (/(^|\/)theme\.json$/.test(f)) n = /"palette"/.test(read(f)) ? 50 : 0;
  else if (/\.(css|scss|less)$/.test(f) && !/\.min\./.test(f)) {
    const t = read(f);
    n = (t.match(/--[\w-]+\s*:\s*(#|rgb|hsl|oklch)/g) || []).length + (t.match(/^\s*\$[\w-]+\s*:\s*#/gm) || []).length;
  }
  if (n > best) { best = n; tokenFile = f; }
}

// drawings / specs
const drawings = count(/(^|\/)spec\.md$|\.dc\.html$|(^|\/)(card|canvas)\.json$/);

// backend
const apiRoutes =
  count(/(^|\/)app\/api\/.*\/route\.[jt]s$/) + count(/(^|\/)pages\/api\/.*\.[jt]sx?$/) +
  (read('routes/api.php').match(/Route::(get|post|put|patch|delete|any)/g) || []).length +
  files.filter((f) => /(^|\/)urls\.py$/.test(f)).reduce((n, f) => n + (read(f).match(/\bpath\(/g) || []).length, 0) +
  files.filter((f) => /\.(js|ts|mjs)$/.test(f) && !/(^|\/)(app|pages)\//.test(f) && /(^|\/)(routes?|server|api)/.test(f))
    .reduce((n, f) => n + (read(f).match(/\b(app|router)\.(get|post|put|patch|delete)\(/g) || []).length, 0);
const db = [
  has(/(^|\/)schema\.prisma$/) ? 'Prisma schema' : deps['@prisma/client'] ? 'Prisma (no schema yet)' : null,
  has(/(^|\/)(migrations|database\/migrations)\//) ? 'migrations folder' : null,
  deps.typeorm || deps.sequelize || deps.mongoose || deps.drizzle ? 'ORM dependency' : null,
  has(/(^|\/)models\.py$/) ? 'Django models' : null,
].filter(Boolean);

// git
const git = (a) => spawnSync('git', a, { cwd: DIR, encoding: 'utf8' });
const commits = Number(git(['rev-list', '--count', 'HEAD']).stdout.trim()) || 0;
let hot = [];
if (commits) {
  const log = git(['log', '--since=90.days', '--name-only', '--format=@%s']).stdout.split('\n');
  const fixes = {};
  let isFix = false;
  for (const l of log) {
    if (l.startsWith('@')) { isFix = /^@(fix|hotfix|bugfix)\b/i.test(l); continue; }
    // code only: generated files, lockfiles and notes change with every fix and are not where the bug lives
    const f = l.trim();
    if (isFix && f && !/\.(md|lock|log|txt)$|(^|\/)(package-lock|yarn\.lock|pnpm-lock)|\.generated\.|baseline|snapshot|(^|\/)(plans|docs)\//i.test(f)) fixes[f] = (fixes[f] || 0) + 1;
  }
  hot = Object.entries(fixes).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5);
}
// agent config the PERSON wrote — not what nextcore-install created (its marked block, .nextcore, nextcore-* rules/skills)
const ownText = (f) => read(f).replace(/<!-- nextcore-skills:start -->[\s\S]*?<!-- nextcore-skills:end -->/g, '').trim();
const ownDir = (d) => {
  try {
    return readdirSync(join(DIR, d), { recursive: true }).map(String)
      .some((f) => /\.(md|mdc|json)$/.test(f) && !/(^|[\\/])(nextcore-|design-(critic|auditor)\.md$)/.test(f));
  } catch { return false; }
};
const agentFiles = [
  ...['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'].filter((f) => existsSync(join(DIR, f)) && ownText(f)),
  ...['.claude', '.cursor', '.windsurf'].filter((d) => existsSync(join(DIR, d)) && ownDir(d)),
];

// ---------- run the checks ----------
const result = { dir: DIR, stack, uiDir, uiFiles: uiFiles.length, tokenFile, drawings, apiRoutes, db, commits, hotFiles: hot, agentFiles, checks: {} };
if (uiDir) {
  const r = node(TOOL.slop, [uiDir, '--json', '--warn-only']);
  try {
    const f = JSON.parse(r.stdout);
    const byRule = {};
    for (const x of f) byRule[x.rule] = (byRule[x.rule] || 0) + 1;
    result.checks.slop = { findings: f.length, errors: f.filter((x) => x.level === 'error').length, byRule, sample: f.slice(0, 5).map((x) => `${x.file}:${x.line} [${x.rule}]`) };
  } catch { result.checks.slop = { error: (r.stderr || r.stdout).trim().split('\n').pop() }; }
}
if (tokenFile) {
  const r = node(TOOL.token, [tokenFile, ...(uiDir ? ['--src', uiDir] : []), '--json', '--warn-only']);
  try {
    const j = JSON.parse(r.stdout);
    result.checks.tokens = { tokens: j.tokens, darkTokens: j.darkTokens, pairs: j.pairsChecked, errors: j.findings.filter((x) => x.level === 'error').length, sample: j.findings.slice(0, 5).map((x) => `${x.where} — ${x.message.split(' — ')[0]}`) };
  } catch { result.checks.tokens = { error: (r.stderr || r.stdout).trim().split('\n').pop() }; }
}
if (drawings) {
  const r = node(TOOL.spec, ['.', '--json', '--warn-only']);
  try {
    const j = JSON.parse(r.stdout);
    const byRule = {};
    for (const x of j.findings) byRule[x.rule] = (byRule[x.rule] || 0) + 1;
    result.checks.specs = { specs: j.specs, byRule };
  } catch { result.checks.specs = { error: (r.stderr || r.stdout).trim().split('\n').pop() }; }
}

// ---------- recommend ----------
const rec = {};
const s = result.checks.slop, t = result.checks.tokens;
if (uiFiles.length) {
  const why = [`${uiFiles.length} UI file(s) in ${uiDir}/`];
  if (s?.findings) why.push(`slop-check ${s.findings} finding(s), ${s.errors} error(s)`);
  if (t?.errors) why.push(`${t.errors} contrast error(s)`);
  if (!tokenFile) why.push('no colour-token file found');
  if (drawings === 0) why.push('no specs or drawings');
  rec.design = why.join('; ');
}
if (apiRoutes || db.length) {
  rec.dev = [apiRoutes ? `${apiRoutes} API route(s) — check auth on each (AGENTS.md §2)` : null, db.length ? db.join(', ') : null].filter(Boolean).join('; ');
}
if (commits >= 30 || hot.length || agentFiles.length) {
  rec.workflow = [commits ? `${commits} commit(s)` : null, hot.length ? `${hot.length} file(s) with ≥3 fix commits in 90 days` : null,
    agentFiles.length ? `agent config: ${agentFiles.join(', ')}` : null].filter(Boolean).join('; ');
}
const skipped = {};
if (!rec.design) skipped.design = 'no UI files found';
if (!rec.dev) skipped.dev = 'no API routes or database found';
if (!rec.workflow) skipped.workflow = commits ? `only ${commits} commit(s), no repeated fixes, no agent config` : 'no git history yet — measure again later';
result.recommend = rec;
result.skipped = skipped;

if (asJson && cmd === 'measure') {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const L = [];
L.push(`nextcore measure — ${DIR}`);
L.push(`stack        ${stack.join(', ') || 'not recognised'}`);
L.push(`UI           ${uiFiles.length ? `${uiFiles.length} file(s), mostly in ${uiDir}/` : 'none'}`);
L.push(`tokens       ${tokenFile || 'no colour-token file found'}`);
if (s) L.push(`slop-check   ${s.error ? `could not run: ${s.error}` : `${s.findings} finding(s), ${s.errors} error(s) — ${Object.entries(s.byRule).map(([k, v]) => `${k} ${v}`).join(', ')}`}`);
if (t) L.push(`token-audit  ${t.error ? `could not run: ${t.error}` : `${t.tokens} token(s), ${t.darkTokens} with a dark value, ${t.pairs} pair(s), ${t.errors} contrast error(s)`}`);
L.push(`specs        ${drawings ? (result.checks.specs.error ? `could not run: ${result.checks.specs.error}` : `${result.checks.specs.specs} spec(s) — ${Object.entries(result.checks.specs.byRule).map(([k, v]) => `${k} ${v}`).join(', ') || 'clean'}`) : 'no specs or drawings — skipped'}`);
L.push(`API routes   ${apiRoutes}${apiRoutes ? ' (auth: grep the guard per route — not measured here)' : ''}`);
L.push(`database     ${db.join(', ') || 'none found'}`);
L.push(`git          ${commits ? `${commits} commit(s); ${hot.length} file(s) with ≥3 fix commits in 90 days${hot.length ? `: ${hot.map(([f, n]) => `${f} (${n})`).join(', ')}` : ''}` : 'no history'}`);
const samples = [...(s?.sample || []), ...(t?.sample || [])];
if (samples.length) { L.push('', 'open these before quoting totals:'); for (const x of samples) L.push(`  ${x}`); }
L.push('', 'recommend:');
for (const [k, v] of Object.entries(rec)) L.push(`  ✓ ${k.padEnd(9)} ${v}`);
for (const [k, v] of Object.entries(skipped)) L.push(`  – ${k.padEnd(9)} ${v}`);
console.log(L.join('\n'));

if (cmd === 'measure') {
  const list = Object.keys(rec).join(',');
  if (list) console.log(`\ninstall: npx -y -p github:kennetvn/nextcore-skills nextcore all --agent <claude|cursor|codex|gemini|copilot|windsurf|generic>   (would install: ${list})`);
  process.exit(0);
}

// ---------- all: install what was recommended ----------
const agent = opt('--agent');
if (!agent) { console.error('\nnextcore all: --agent is required (claude · cursor · codex · gemini · copilot · windsurf · generic)'); process.exit(2); }
const chosen = opt('--skills', Object.keys(rec).join(','));
if (!chosen) { console.log('\nnothing to install: no skill fits this project yet.'); process.exit(0); }
console.log('');
const r = spawnSync(process.execPath, [TOOL.install, '--agent', agent, '--skills', chosen, '--dir', DIR, ...(args.includes('--dry-run') ? ['--dry-run'] : []), ...(args.includes('--force') ? ['--force'] : [])], { stdio: 'inherit' });
process.exit(r.status ?? 1);
