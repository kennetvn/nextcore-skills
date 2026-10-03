#!/usr/bin/env node
// third-patch — block the third fix to the same file within 72 hours unless a diagnosis note exists. Zero deps.
//
// Why: 90 days of one product's history had 473 releases and 2 commits that said "root cause"; one feature took 11
// releases because each one patched a symptom. Two quick fixes are normal. A third means nobody has diagnosed it yet.
//
//   node third-patch.mjs                      # check staged files (use as a pre-commit hook)
//   node third-patch.mjs --files a.ts b.ts    # check given files
//   [--hours 72] [--threshold 2] [--diagnosis-dir docs/diagnosis] [--fix-pattern "^(fix|hotfix)"]
//
// A file is "hot" when it already has >= --threshold fix commits within --hours (history followed across renames —
// without --follow, a renamed file once showed 1 commit where there were 166). Committing to a hot file requires a
// diagnosis note in --diagnosis-dir, changed within the window, that names the file (or its folder) and has three
// sections: Symptom (measured) · Hypothesis (and how to refute it) · Observation (on site, not after a release).
//
// Hook:  echo 'node path/to/third-patch.mjs' > .git/hooks/pre-commit   (or husky / lefthook / pre-commit framework)
// Exit 1 = blocked, with the reason and the template path. Exit 2 = not inside a git repository.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const hours = Number(opt('--hours', 72));
const threshold = Number(opt('--threshold', 2));
const diagDir = opt('--diagnosis-dir', 'docs/diagnosis');
const fixRe = new RegExp(opt('--fix-pattern', '^(fix|hotfix|patch)\\b'), 'i');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

try { git('rev-parse', '--is-inside-work-tree'); } catch {
  console.error('third-patch: not inside a git repository — run it from your project (it reads git history). See --help.');
  process.exit(2);
}

let files;
const fi = args.indexOf('--files');
if (fi >= 0) files = args.slice(fi + 1).filter((a) => !a.startsWith('--'));
else files = git('diff', '--cached', '--name-only', '--diff-filter=AM').split('\n').filter(Boolean);
if (!files.length) process.exit(0);

const since = `${hours} hours ago`;
const hot = [];
for (const f of files) {
  let log = '';
  try { log = git('log', '--follow', `--since=${since}`, '--format=%h %s', '--', f); } catch { continue; }
  const fixes = log.split('\n').filter((l) => l && fixRe.test(l.slice(l.indexOf(' ') + 1)));
  if (fixes.length >= threshold) hot.push({ f, fixes });
}
if (!hot.length) process.exit(0);

// diagnosis notes changed within the window (working tree mtime or a commit inside the window)
const SECTIONS = [/^#+\s*symptom/im, /^#+\s*hypothes/im, /^#+\s*observ/im];
const notes = [];
if (existsSync(diagDir)) {
  const cutoff = Date.now() - hours * 3600e3;
  for (const n of readdirSync(diagDir)) {
    const p = join(diagDir, n);
    if (!n.endsWith('.md') || !statSync(p).isFile()) continue;
    if (statSync(p).mtimeMs < cutoff) continue;
    notes.push({ p, text: readFileSync(p, 'utf8') });
  }
}
const covered = (f) => notes.find((n) => (n.text.includes(f) || n.text.includes(dirname(f) + '/')) && SECTIONS.every((re) => re.test(n.text)));

const blocked = hot.filter((h) => !covered(h.f));
if (!blocked.length) {
  for (const h of hot) console.log(`third-patch: ${h.f} is hot (${h.fixes.length} fixes in ${hours}h) — diagnosis found: ${covered(h.f).p}`);
  process.exit(0);
}
for (const h of blocked) {
  console.error(`third-patch: BLOCKED — ${h.f} already has ${h.fixes.length} fix commits in the last ${hours}h:`);
  for (const l of h.fixes.slice(0, 5)) console.error(`    ${l}`);
}
console.error(`
Write a diagnosis before patching again: ${diagDir}/<area>.md naming the file, with three sections —
  ## Symptom      what is measured to be wrong (number, log line, screenshot), not "it's broken"
  ## Hypothesis   the cause you believe, and the observation that would refute it
  ## Observation  what you checked on the running system (logs, DB, browser) BEFORE releasing anything
Then commit again. Emergency bypass: git commit --no-verify (and say why in the commit message).`);
process.exit(1);
