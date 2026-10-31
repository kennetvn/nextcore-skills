// issue-claim + github-bootstrap against a stand-in gh (tests/fixtures/fake-gh.mjs). No network, no GitHub account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'plugins/nextcore-workflow/skills/nextcore-workflow/scripts');
const fakeGh = join(root, 'tests/fixtures/fake-gh.mjs');

function world(issues = {}, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'gh-'));
  const state = join(dir, 'state.json');
  writeFileSync(state, JSON.stringify({ repo: 'acme/shop', login: 'dev', labels: [], issues, nextId: 1000, calls: [], ...extra }));
  const run = (tool, a, env = {}) => spawnSync(process.execPath, [join(scripts, `${tool}.mjs`), ...a], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, NEXTCORE_GH: fakeGh, FAKE_GH_STATE: state, ISSUE_CLAIM_AS: '', ...env },
  });
  return { dir, run, state: () => JSON.parse(readFileSync(state, 'utf8')) };
}
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const claimComment = (id, by, untilMs, ageMs = 60e3, op = 'claim', extra = {}) => ({
  id, user: { login: by }, created_at: iso(-ageMs), body: `<!-- issue-claim ${JSON.stringify({ op, by, until: iso(untilMs), ...extra })} -->`,
});
const blank = () => ({ body: '', state: 'open', comments: [], labels: [], assignees: [] });

test('issue-claim: claims a free issue — comment with expiry, status label, assignee', () => {
  const w = world({ 12: blank() });
  const r = w.run('issue-claim', ['claim', '12', '--as', 'agent-a', '--ttl', '2h', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.equal(o.by, 'agent-a');
  assert.ok(Math.abs(Date.parse(o.until) - Date.now() - 2 * 36e5) < 60e3);
  const i = w.state().issues[12];
  assert.match(i.comments[0].body, /"op":"claim","by":"agent-a"/);
  assert.deepEqual(i.labels, ['status:in-progress']);
  assert.deepEqual(i.assignees, ['dev']);
  assert.equal(w.run('issue-claim', ['status', '12']).status, 3, 'status exits 3 while held');
});

test('issue-claim: a live claim by someone else blocks; an expired one does not', () => {
  const w = world({ 12: { ...blank(), comments: [claimComment(1, 'agent-b', 36e5)] }, 13: { ...blank(), comments: [claimComment(2, 'agent-b', -60e3, 5 * 36e5)] } });
  const r = w.run('issue-claim', ['claim', '12', '--as', 'agent-a']);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /claimed by agent-b .*--force-with-lease 1/);
  assert.equal(w.state().issues[12].comments.length, 1, 'a blocked claim posts nothing');
  assert.equal(w.run('issue-claim', ['claim', '13', '--as', 'agent-a']).status, 0, 'expired claim is free');
});

test('issue-claim: --force-with-lease takes over only the claim you read', () => {
  const w = world({ 12: { ...blank(), comments: [claimComment(1, 'agent-b', 36e5, 120e3), claimComment(5, 'agent-c', 36e5, 60e3, 'claim', { lease: 1 })] } });
  const stale = w.run('issue-claim', ['claim', '12', '--as', 'agent-a', '--force-with-lease', '1']);
  assert.equal(stale.status, 2);
  assert.match(stale.stdout, /lease 1 is stale: the live claim is comment 5 by agent-c/);
  const ok = w.run('issue-claim', ['claim', '12', '--as', 'agent-a', '--force-with-lease', '5', '--json']);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(w.run('issue-claim', ['status', '12']).stdout, /claimed by agent-a/);
});

test('issue-claim: two claims in the same second — the later one deletes itself', () => {
  const w = world({ 12: blank() });
  const r = w.run('issue-claim', ['claim', '12', '--as', 'agent-a'], { FAKE_GH_RACE: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /lost the race: #12 is claimed by rival/);
  const i = w.state().issues[12];
  assert.equal(i.comments.length, 1, 'own losing comment removed');
  assert.deepEqual(i.labels, [], 'loser does not label');
});

test('issue-claim: only the holder renews or releases; release clears label and assignee', () => {
  const w = world({ 12: blank() });
  w.run('issue-claim', ['claim', '12', '--as', 'agent-a', '--ttl', '30m']);
  assert.equal(w.run('issue-claim', ['release', '12', '--as', 'agent-b']).status, 2);
  assert.equal(w.run('issue-claim', ['renew', '12', '--as', 'agent-b']).status, 2);
  const renew = w.run('issue-claim', ['renew', '12', '--as', 'agent-a', '--ttl', '3h', '--json']);
  assert.equal(renew.status, 0);
  const st = JSON.parse(w.run('issue-claim', ['status', '12', '--json']).stdout);
  assert.ok(Date.parse(st.until) - Date.now() > 2.9 * 36e5, 'renew moved the expiry');
  assert.equal(w.run('issue-claim', ['release', '12', '--as', 'agent-a']).status, 0);
  const i = w.state().issues[12];
  assert.deepEqual([i.labels, i.assignees], [[], []]);
  assert.equal(w.run('issue-claim', ['status', '12']).status, 0, 'free after release');
});

test('issue-claim: release --close refuses unchecked items that name no issue they moved to', () => {
  const w = world({ 12: { ...blank(), body: '## Done when\n- [x] api\n- [ ] docs\n- [ ] perf → moved to #40\n' } });
  w.run('issue-claim', ['claim', '12', '--as', 'a']);
  const r = w.run('issue-claim', ['release', '12', '--as', 'a', '--close']);
  assert.equal(r.status, 3);
  assert.match(r.stdout, /1 unchecked item\(s\)[\s\S]*- \[ \] docs/);
  assert.equal(w.state().issues[12].state, 'open');
  const s = w.state(); s.issues[12].body = s.issues[12].body.replace('- [ ] docs', '- [ ] docs → moved to #41');
  writeFileSync(join(w.dir, 'state.json'), JSON.stringify(s));
  assert.equal(w.run('issue-claim', ['release', '12', '--as', 'a', '--close']).status, 0);
  assert.equal(w.state().issues[12].state, 'closed');
});

test('issue-claim: bad input answers in one line, no stack trace', () => {
  const w = world();
  for (const a of [['grab', '12'], ['claim', 'x'], ['claim', '12', '--ttl', 'soon']]) {
    const r = w.run('issue-claim', a);
    assert.equal(r.status, 1, a.join(' '));
    assert.match(r.stderr, /^issue-claim: /);
    assert.doesNotMatch(r.stderr, /\n\s+at /);
  }
});

test('github-bootstrap: --dry-run reads GitHub and writes nothing', () => {
  const w = world({}, { labels: [{ name: 'bug' }, { name: 'P1' }] });
  const r = w.run('github-bootstrap', ['--dry-run', '--json']);
  assert.equal(r.status, 0, r.stderr);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.labels.length, 11, 'existing bug and p1 (any case) are skipped');
  assert.ok(!plan.labels.includes('p1'));
  assert.deepEqual(plan.inbox, { action: 'create' });
  assert.equal(plan.files.length, 4);
  assert.ok(!existsSync(join(w.dir, '.github')), 'dry-run wrote files');
  assert.ok(!w.state().calls.some((c) => / -X (POST|PATCH|DELETE) |graphql/.test(` ${c} `)), 'dry-run must not write to GitHub');
});

test('github-bootstrap: applies once, second run changes nothing, never overwrites your file', () => {
  const w = world();
  mkdirSync(join(w.dir, '.github'), { recursive: true });
  writeFileSync(join(w.dir, '.github/pull_request_template.md'), 'mine');
  const r = w.run('github-bootstrap', ['--json']);
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(r.stdout);
  assert.equal(p.labels.length, 13);
  assert.deepEqual(p.kept, ['.github/pull_request_template.md']);
  assert.equal(readFileSync(join(w.dir, '.github/pull_request_template.md'), 'utf8'), 'mine');
  assert.match(readFileSync(join(w.dir, '.github/ISSUE_TEMPLATE/task.yml'), 'utf8'), /Done when/);
  assert.equal(p.inbox.action, 'created');
  assert.equal(p.inbox.pinned, true);
  const again = JSON.parse(w.run('github-bootstrap', ['--json']).stdout);
  assert.deepEqual([again.labels, again.files, again.inbox.action], [[], [], 'kept']);
  assert.equal(Object.keys(w.state().issues).length, 1, 'one inbox issue, not two');
});

test('github-bootstrap: --files-only needs no gh at all', () => {
  const w = world();
  const r = w.run('github-bootstrap', ['--files-only'], { NEXTCORE_GH: join(w.dir, 'missing.mjs') });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(w.dir, '.github/ISSUE_TEMPLATE/bug.yml')));
});
