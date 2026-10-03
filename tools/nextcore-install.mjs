#!/usr/bin/env node
// nextcore-install — put the skills where your AI coding agent reads them. Zero dependencies; an agent can run it.
//
//   npx -y -p github:kennetvn/nextcore-skills nextcore-install --agent <agent> [--skills design,dev,workflow]
//                                                              [--dir .] [--dry-run] [--force]
//
// --agent   claude    .claude/skills/<skill>/ (+ design-critic / design-auditor in .claude/agents/)
//           cursor    .cursor/rules/<skill>.mdc  + skill files in .nextcore/<skill>/
//           codex     a marked block in AGENTS.md            + .nextcore/<skill>/
//           gemini    a marked block in GEMINI.md            + .nextcore/<skill>/
//           copilot   a marked block in .github/copilot-instructions.md + .nextcore/<skill>/
//           windsurf  .windsurf/rules/<skill>.md             + .nextcore/<skill>/
//           generic   .nextcore/<skill>/ only — point your agent's rules file at .nextcore/<skill>/SKILL.md
// --skills  which skills (default: all three)
// --dir     project root (default: current directory)
// --dry-run print what would be written, write nothing
// --force   overwrite skill files that differ from this version (your own files outside these paths are never touched)
//
// Idempotent: running it again updates the skill files and rewrites only the block between
// <!-- nextcore-skills:start --> and <!-- nextcore-skills:end -->. Exit 1 on a conflict without --force.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const AGENTS = ['claude', 'cursor', 'codex', 'gemini', 'copilot', 'windsurf', 'generic'];
const agent = opt('--agent');
if (!AGENTS.includes(agent)) {
  console.error(`nextcore-install: --agent is required, one of: ${AGENTS.join(', ')}`);
  process.exit(2);
}
const skills = opt('--skills', 'design,dev,workflow').split(',').map((s) => s.trim().replace(/^nextcore-/, ''));
const bad = skills.filter((s) => !['design', 'dev', 'workflow'].includes(s));
if (bad.length) { console.error(`nextcore-install: unknown skill(s): ${bad.join(', ')}`); process.exit(2); }
const DIR = opt('--dir', process.cwd());
const dry = args.includes('--dry-run');
const force = args.includes('--force');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const START = '<!-- nextcore-skills:start -->';
const END = '<!-- nextcore-skills:end -->';

const plan = []; // { path, content }
const conflicts = [];
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p]);
const want = (path, content) => plan.push({ path: join(DIR, path), content });

function skillInfo(s) {
  const src = join(ROOT, 'plugins', `nextcore-${s}`, 'skills', `nextcore-${s}`);
  const md = readFileSync(join(src, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const description = (md.match(/^description:\s*"?(.+?)"?\s*$/m) || [])[1] || `nextcore-${s}`;
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  return { name: `nextcore-${s}`, src, description, body };
}

function copySkill(info, destRoot) {
  for (const f of walk(info.src)) want(join(destRoot, info.name, relative(info.src, f)), readFileSync(f));
}

function block(lines) {
  return `${START}\n## nextcore-skills ${VERSION}\n\n${lines.join('\n')}\n${END}\n`;
}

const infos = skills.map(skillInfo);
const pointer = (i) => `- **${i.name}** — read \`.nextcore/${i.name}/SKILL.md\` (and only the \`references/\` file the task touches) when: ${i.description}`;

if (agent === 'claude') {
  for (const i of infos) {
    copySkill(i, '.claude/skills');
    const agentsDir = join(i.src, 'agents');
    if (existsSync(agentsDir)) for (const f of readdirSync(agentsDir)) want(join('.claude/agents', f), readFileSync(join(agentsDir, f)));
  }
} else {
  for (const i of infos) copySkill(i, '.nextcore');
  want('.nextcore/VERSION', `${VERSION}\n`);
  if (agent === 'cursor') {
    for (const i of infos) {
      want(`.cursor/rules/${i.name}.mdc`, `---\ndescription: ${JSON.stringify(i.description)}\nalwaysApply: false\n---\n\n` +
        `> Files referenced below (references/, templates/, scripts/) live in \`.nextcore/${i.name}/\`.\n${i.body}`);
    }
  } else if (agent === 'windsurf') {
    for (const i of infos) {
      want(`.windsurf/rules/${i.name}.md`, `---\ntrigger: model_decision\ndescription: ${JSON.stringify(i.description)}\n---\n\n` +
        `Read \`.nextcore/${i.name}/SKILL.md\` before this kind of task; open only the \`references/\` file it points to.\n`);
    }
  } else if (agent !== 'generic') {
    const file = { codex: 'AGENTS.md', gemini: 'GEMINI.md', copilot: '.github/copilot-instructions.md' }[agent];
    const path = join(DIR, file);
    const old = existsSync(path) ? readFileSync(path, 'utf8') : '';
    const checks = infos.filter((i) => existsSync(join(i.src, 'scripts')))
      .map((i) => `\`.nextcore/${i.name}/scripts/\` (${readdirSync(join(i.src, 'scripts')).map((f) => f.replace(/\.mjs$/, '')).join(', ')})`);
    const blk = block(['Skills installed in `.nextcore/` (https://github.com/kennetvn/nextcore-skills):', '', ...infos.map(pointer),
      ...(checks.length ? ['', `Checks, each with \`--help\`: ${checks.join(' · ')}.`] : [])]);
    const a = old.indexOf(START), b = old.indexOf(END);
    const next = a >= 0 && b > a ? old.slice(0, a) + blk + old.slice(b + END.length).replace(/^\n/, '') : `${old}${old && !old.endsWith('\n') ? '\n' : ''}${old ? '\n' : ''}${blk}`;
    plan.push({ path, content: next, block: true });
  }
}

let wrote = 0, same = 0;
for (const p of plan) {
  const buf = Buffer.isBuffer(p.content) ? p.content : Buffer.from(p.content);
  if (existsSync(p.path)) {
    const cur = readFileSync(p.path);
    if (cur.equals(buf)) { same++; continue; }
    // our own skill files may be updated; a file we did not create is a conflict unless --force
    const rel = relative(DIR, p.path).replace(/\\/g, '/');
    const ours = p.block || /^(\.nextcore\/|\.claude\/skills\/nextcore-|\.cursor\/rules\/nextcore-|\.windsurf\/rules\/nextcore-)/.test(rel);
    if (!ours && !force) { conflicts.push(p.path); continue; }
  }
  if (!dry) { mkdirSync(dirname(p.path), { recursive: true }); writeFileSync(p.path, buf); }
  wrote++;
  if (dry) console.log(`would write ${relative(DIR, p.path)}`);
}
for (const c of conflicts) console.error(`conflict: ${relative(DIR, c)} exists and differs — rerun with --force to overwrite`);
console.log(`nextcore-install ${VERSION} → ${agent}: ${infos.map((i) => i.name).join(', ')} — ${dry ? 'would write' : 'wrote'} ${wrote}, unchanged ${same}${conflicts.length ? `, ${conflicts.length} conflict(s)` : ''}`);
if (!dry && wrote + same) {
  const where = agent === 'claude' ? '.claude/skills/' : '.nextcore/';
  console.log(`next: open ${where}nextcore-design/SKILL.md (or the skill your task needs); verify with \`node ${where}nextcore-design/scripts/spec-check.mjs --help\``);
}
process.exit(conflicts.length ? 1 : 0);
