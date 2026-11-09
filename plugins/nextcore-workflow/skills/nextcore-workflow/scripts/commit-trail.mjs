#!/usr/bin/env node
// commit-trail — commit messages a reader can trust a month later: which issue, what was proven, what was measured.
// Zero deps.
//
// Why: across 400 commits × 3 repos of one product, the old "Why / Done / Files / Verified" template was followed by
// 5–9% of commits, while agents had converged on Problem / Root cause / Fix / Measured on their own. Fields a machine
// fills reached ~100%; fields left to conscience stayed under 35%. So this gate checks the reasoning fields only.
//
//   node commit-trail.mjs .git/COMMIT_EDITMSG                  # commit-msg hook: exit 1 with the reasons
//   node commit-trail.mjs --range origin/main..HEAD [--json]   # coverage report over history (report only)
//   node commit-trail.mjs --range origin/main..HEAD --strict   # CI: exit 1 when any commit in the range fails
//   [--no-issue]  do not require an issue reference
//   [--full fix,feat,perf,security]  types that need the full body
//
// Rules
//   subject        `type(scope): summary`, at most 72 characters, no trailing period
//   issue          `#12` or `owner/repo#12` in the subject, or an `Issue: #12` trailer        (skip with --no-issue)
//   fix            a `Root cause:` line that names the proven cause (or "unknown — hypothesis: …")
//   fix/feat/perf  a `Measured:` line with a command in backticks or a number. "tested", "works", "ok" are refused;
//                  `Measured: not run — <reason>` is accepted: an honest gap beats an invented result
// Light commits (docs, chore, style, test, refactor, ci, build) need the subject and the issue only.
// Merge, fixup!, squash!, amend! and `Revert "…"` messages are skipped.
//
// Hook:  printf '#!/bin/sh\nnode path/to/commit-trail.mjs "$1"\n' > .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg
// Exit 0 = ok · 1 = violations · 2 = bad usage or not inside a git repository.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const FULL = new Set(opt('--full', 'fix,feat,perf,security').split(',').map((s) => s.trim()));
const needIssue = !args.includes('--no-issue');
const TYPES = 'feat fix perf refactor docs chore test ci build style security release revert';

// Value of `Name:` plus continuation lines (indented or bullets) until a blank line or the next `Name:` field.
function field(lines, name) {
  const i = lines.findIndex((l) => new RegExp(`^${name}\\s*:`, 'i').test(l));
  if (i < 0) return null;
  const out = [lines[i].replace(new RegExp(`^${name}\\s*:\\s*`, 'i'), '')];
  for (const l of lines.slice(i + 1)) {
    if (!l.trim() || /^[A-Z][\w·\- ]{1,30}:\s/.test(l)) break;
    if (/^(\s+|- )/.test(l)) out.push(l.trim()); else break;
  }
  return out.join(' ').trim();
}

export function check(msg) {
  const lines = msg.replace(/\r/g, '').split('\n').filter((l) => !l.startsWith('#'));
  const subject = (lines[0] || '').trim();
  if (/^(Merge |fixup! |squash! |amend! |Revert ")/.test(subject)) return { subject, skipped: true, problems: [] };
  const problems = [];
  const m = subject.match(/^([a-z]+)(\([^)]*\))?!?: \S/);
  const type = m?.[1];
  if (!m || !TYPES.split(' ').includes(type)) problems.push(`subject: write "type(scope): summary" with a type from: ${TYPES}`);
  if (subject.length > 72) problems.push(`subject: ${subject.length} characters, keep it at most 72`);
  if (/\.$/.test(subject)) problems.push('subject: no trailing period');
  const body = lines.slice(1);
  const issueRe = /(^|[\s(:])([\w.-]+\/[\w.-]+)?#\d+\b/;
  if (needIssue && !issueRe.test(subject) && !issueRe.test(field(body, 'Issue') || '')) {
    problems.push('issue: name it in the subject ("fix(cart): #12 …") or add a trailer "Issue: #12"');
  }
  if (FULL.has(type)) {
    if (type === 'fix') {
      const cause = field(body, 'Root cause');
      if (!cause || cause.length < 8 || /^(unknown|n\/?a|-|tbd)\.?$/i.test(cause)) {
        problems.push('Root cause: missing — a fix states the proven cause (file:line), or "unknown — hypothesis: …"');
      }
    }
    const measured = field(body, 'Measured');
    if (measured === null) problems.push(`Measured: missing — a ${type} commit shows the command that was run and its real output`);
    else if (/^not run\b/i.test(measured)) {
      if (measured.length < 16) problems.push('Measured: "not run" needs the reason ("not run — needs the production mailbox")');
    } else if (!/`[^`]+`/.test(measured) && !/\d/.test(measured)) {
      problems.push(`Measured: "${measured.slice(0, 40)}" is not checkable — give the command in backticks and its number`);
    }
  }
  return { subject, type, skipped: false, problems };
}

const TEMPLATE = `fix(scope): #12 short summary in the imperative

Problem: <measured symptom — who saw it, how many>
Root cause: <the proven cause, file:line>             (fix)
Fix: <what changed>
Measured: \`<command>\` → <real output>                 (fix, feat, perf)
Risk·Rollback: <what is left> · git revert <sha>`;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });

if (args.includes('--range')) {
  const range = opt('--range');
  if (!range || range.startsWith('--')) { console.error('commit-trail: --range needs a revision range, e.g. origin/main..HEAD'); process.exit(2); }
  let raw;
  try { raw = git('log', '--format=%H%x00%B%x1e', range); } catch (e) {
    console.error(`commit-trail: git log ${range} failed — ${String(e.stderr || e.message).trim().split('\n')[0]}`);
    process.exit(2);
  }
  const rows = raw.split('\x1e').map((s) => s.replace(/^\n/, '')).filter(Boolean).map((s) => {
    const [sha, msg] = s.split('\x00');
    return { sha: sha.slice(0, 9), ...check(msg || '') };
  });
  const counted = rows.filter((r) => !r.skipped);
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const has = (r, p) => !r.problems.some((x) => x.startsWith(p));
  const fixes = counted.filter((r) => r.type === 'fix');
  const full = counted.filter((r) => FULL.has(r.type));
  const bad = counted.filter((r) => r.problems.length);
  const summary = {
    range, commits: rows.length, skipped: rows.length - counted.length,
    subject: pct(counted.filter((r) => has(r, 'subject')).length, counted.length),
    issue: needIssue ? pct(counted.filter((r) => has(r, 'issue')).length, counted.length) : 'not required',
    rootCause: pct(fixes.filter((r) => has(r, 'Root cause')).length, fixes.length),
    measured: pct(full.filter((r) => has(r, 'Measured')).length, full.length),
    passing: pct(counted.length - bad.length, counted.length),
  };
  if (args.includes('--json')) console.log(JSON.stringify({ ...summary, failing: bad.map(({ sha, subject, problems }) => ({ sha, subject, problems })) }, null, 2));
  else {
    console.log(`commit-trail ${range}: ${rows.length} commits (${summary.skipped} merge/revert skipped)`);
    console.log(`  subject ${summary.subject} · issue ${summary.issue} · fix with Root cause ${summary.rootCause} (${fixes.length}) · Measured ${summary.measured} (${full.length}) · passing ${summary.passing}`);
    for (const r of bad.slice(0, 20)) console.log(`  ${r.sha} ${r.subject.slice(0, 60)}\n      ${r.problems.join('\n      ')}`);
    if (bad.length > 20) console.log(`  … ${bad.length - 20} more (--json for all)`);
  }
  process.exit(args.includes('--strict') && bad.length ? 1 : 0);
}

const file = args.find((a, i) => !a.startsWith('--') && !['--full'].includes(args[i - 1]));
if (!file || !existsSync(file)) {
  console.error('commit-trail: give the commit message file (the commit-msg hook passes it as $1) or --range <a..b>. See --help.');
  process.exit(2);
}
const r = check(readFileSync(file, 'utf8'));
if (r.skipped || !r.problems.length) process.exit(0);
console.error(`commit-trail: BLOCKED — "${r.subject.slice(0, 72)}"\n  ${r.problems.join('\n  ')}\n\nShape that passes:\n${TEMPLATE}\n`);
process.exit(1);
