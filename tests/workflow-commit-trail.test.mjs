// commit-trail: tested both ways — a bad message must be blocked naming the field, a good one must pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tool = join(root, 'plugins/nextcore-workflow/skills/nextcore-workflow/scripts/commit-trail.mjs');
const run = (a, cwd = tmpdir()) => spawnSync(process.execPath, [tool, ...a], { cwd, encoding: 'utf8' });
const msg = (text) => { const f = join(mkdtempSync(join(tmpdir(), 'ct-')), 'COMMIT_EDITMSG'); writeFileSync(f, text); return f; };

const GOOD_FIX = `fix(cart): #12 keep the coupon when the cart is re-priced

Problem: 41 of 300 checkouts on 03/11 lost the coupon after changing quantity
Root cause: reprice() rebuilds lines from the catalog and drops line.coupon (src/cart.ts:88)
Fix:
  - carry coupon through reprice()
Measured: \`npm test -- cart\` → 18/18; replayed the 41 carts, 41 keep the coupon
Risk·Rollback: none known · git revert <sha>
`;

test('commit-trail: a full fix message passes; the same message without its fields is blocked naming each one', () => {
  assert.equal(run([msg(GOOD_FIX)]).status, 0, run([msg(GOOD_FIX)]).stderr);
  const r = run([msg('fix: change polling.\n')]);
  assert.equal(r.status, 1);
  for (const field of ['issue:', 'Root cause:', 'Measured:', 'trailing period']) assert.match(r.stderr, new RegExp(field));
  assert.match(r.stderr, /Shape that passes/);
});

test('commit-trail: "Measured: tested" is refused, "not run — <reason>" is accepted, a number or a command passes', () => {
  const base = 'feat(mail): #7 read customer replies into the ticket\n\nFix: IMAP job\n';
  assert.match(run([msg(`${base}Measured: tested\n`)]).stderr, /not checkable/);
  assert.equal(run([msg(`${base}Measured: works\n`)]).status, 1);
  assert.equal(run([msg(`${base}Measured: not run\n`)]).status, 1, '"not run" without a reason');
  assert.equal(run([msg(`${base}Measured: not run — needs the production mailbox and its secret\n`)]).status, 0);
  assert.equal(run([msg(`${base}Measured: \`vitest tickets\` green\n`)]).status, 0);
  assert.equal(run([msg(`${base}Measured:\n  - 128/128 tests, tsc 0 errors\n`)]).status, 0, 'value on a continuation line');
});

test('commit-trail: light commits need only subject + issue; merges and reverts are skipped; --no-issue', () => {
  assert.equal(run([msg('docs(readme): #9 fix the install command\n')]).status, 0);
  assert.equal(run([msg('chore: bump\n\nIssue: #9\n')]).status, 0, 'issue as a trailer');
  assert.match(run([msg('docs: tidy\n')]).stderr, /issue:/);
  assert.equal(run([msg('docs: tidy\n'), '--no-issue']).status, 0);
  assert.equal(run([msg("Merge branch 'x'\n")]).status, 0);
  assert.equal(run([msg('Revert "fix: x"\n')]).status, 0);
  assert.match(run([msg(`fix(x): #3 ${'a'.repeat(70)}\n`)]).stderr, /keep it at most 72/);
  assert.match(run([msg('update stuff #3\n')]).stderr, /type\(scope\): summary/);
});

test('commit-trail: --range reports coverage per field; --strict fails only when something fails', () => {
  const d = mkdtempSync(join(tmpdir(), 'ct-repo-'));
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 'a@example.invalid'); g('config', 'user.name', 'a'); g('config', 'commit.gpgsign', 'false');
  const commit = (m) => { writeFileSync(join(d, 'f'), m); g('add', 'f'); g('commit', '-q', '--no-verify', '-m', m); };
  commit('chore: #1 init');
  const base = g('rev-parse', 'HEAD').trim();
  commit(GOOD_FIX);
  commit('fix: change polling');
  commit('docs(readme): #2 typo');
  const r = run(['--range', `${base}..HEAD`, '--json'], d);
  assert.equal(r.status, 0, 'report only without --strict');
  const o = JSON.parse(r.stdout);
  assert.equal(o.commits, 3);
  assert.equal(o.rootCause, '50%', 'one of two fixes names its cause');
  assert.equal(o.issue, '67%');
  assert.equal(o.failing.length, 1);
  assert.match(o.failing[0].subject, /change polling/);
  assert.equal(run(['--range', `${base}..HEAD`, '--strict'], d).status, 1);
  assert.equal(run(['--range', `${base}..HEAD~1`, '--strict'], d).status, 1);
  assert.equal(run(['--range', `${base}..HEAD~2`, '--strict'], d).status, 0, 'only the good fix in range');
  assert.equal(run(['--range', 'nope..HEAD'], d).status, 2);
});
