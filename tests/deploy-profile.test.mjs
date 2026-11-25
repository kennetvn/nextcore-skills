// deploy-profile-check: a matching profile passes; each kind of drift and every secret value fails. Zero dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = join(root, 'plugins/deploy-integration/skills/deploy-integration/scripts/deploy-profile-check.mjs');
const FIX = join(root, 'tests/fixtures/deploy/repo');
const run = (dir, ...a) => spawnSync(process.execPath, [CHECK, join(dir, 'deploy-profile.json'), ...a], { encoding: 'utf8' });

function withProfile(mutate) {
  const d = mkdtempSync(join(tmpdir(), 'dpc-'));
  cpSync(FIX, d, { recursive: true });
  const f = join(d, 'deploy-profile.json');
  const p = JSON.parse(readFileSync(f, 'utf8'));
  mutate(p);
  writeFileSync(f, JSON.stringify(p, null, 2));
  return run(d);
}

test('deploy-profile-check: a profile that matches its workflow passes (secrets in comments and GITHUB_TOKEN ignored)', () => {
  const r = run(FIX);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ok — 1 target\(s\) match/);
});

test('deploy-profile-check: every kind of drift from the workflow is reported', () => {
  const cases = [
    [(p) => p.targets[0].trigger.push.paths.pop(), /paths differ/],
    [(p) => { p.targets[0].trigger.push.branch = 'release'; }, /branch "release" not in workflow branches \[main\]/],
    [(p) => { p.targets[0].trigger.dispatch = false; }, /workflow_dispatch is present/],
    [(p) => { delete p.targets[0].trigger.push; }, /does not run|runs on push/],
    [(p) => p.targets[0].gha.secrets.push('EXTRA_KEY'), /gha\.secrets .* ≠ workflow secrets/],
    [(p) => { p.targets[0].gha.vars = []; }, /gha\.vars .* ≠ workflow vars/],
    [(p) => { p.targets[0].gha.name = 'Ship'; }, /gha\.name "Ship"/],
    [(p) => p.targets[0].gha.runsOn.push('gpu'), /runner label "gpu"/],
    [(p) => { p.targets[0].gha.workflow = '.github/workflows/nope.yml'; }, /workflow not found/],
  ];
  for (const [mutate, re] of cases) {
    const r = withProfile(mutate);
    assert.equal(r.status, 1, `${re}: expected exit 1\n${r.stdout}`);
    assert.match(r.stdout, re);
  }
});

test('deploy-profile-check: secret values are refused, secret names are fine', () => {
  const pem = ['-----BEGIN OPENSSH', 'PRIVATE KEY-----'].join(' ');
  const cases = [
    [(p) => { p.targets[0].host.password = 'correct horse'; }, /"password" holds a value/],
    [(p) => { p.targets[0].host.note = `${pem}\nabc`; }, /private key is pasted/],
    [(p) => { p.targets[0].host.note = `token ${'ghp_'}${'a'.repeat(36)}`; }, /token value/],
    [(p) => { p.targets[0].gha.secrets = ['not a name']; }, /holds a value/],
  ];
  for (const [mutate, re] of cases) {
    const r = withProfile(mutate);
    assert.equal(r.status, 1, `${re}: expected exit 1\n${r.stdout}`);
    assert.match(r.stdout, re);
  }
});

test('deploy-profile-check: shape — verify, rollback, channel, host for vps-ssh', () => {
  for (const [mutate, re] of [
    [(p) => { p.targets[0].verify = []; }, /verify missing/],
    [(p) => { delete p.targets[0].rollback; }, /rollback\.how missing/],
    [(p) => { p.targets[0].channel = 'ftp'; }, /channel must be one of/],
    [(p) => { p.targets[0].channel = 'vps-ssh'; delete p.targets[0].host; }, /vps-ssh needs host/],
    [(p) => { p.targets.push({ ...p.targets[0] }); }, /duplicate id/],
  ]) {
    const r = withProfile(mutate);
    assert.equal(r.status, 1, `${re}\n${r.stdout}`);
    assert.match(r.stdout, re);
  }
});

test('deploy-profile-check: --json and --help', () => {
  const r = spawnSync(process.execPath, [CHECK, join(FIX, 'deploy-profile.json'), '--json'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.deepEqual(JSON.parse(r.stdout), { ok: true, errors: [], warnings: [] });
  const h = spawnSync(process.execPath, [CHECK, '--help'], { encoding: 'utf8' });
  assert.equal(h.status, 0);
  assert.match(h.stdout, /deploy-profile-check \[deploy-profile\.json\]/);
});

test('deploy-integration: the template parses and holds no secret values', () => {
  const t = join(root, 'plugins/deploy-integration/skills/deploy-integration/templates/deploy-profile.example.json');
  const p = JSON.parse(readFileSync(t, 'utf8'));
  assert.equal(p.version, 1);
  const r = spawnSync(process.execPath, [CHECK, t, '--json'], { encoding: 'utf8' });
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.errors.filter((e) => e.target === 'profile'), [], 'no secret-value findings in the template');
  assert.ok(out.errors.every((e) => /workflow not found/.test(e.msg)), 'only the missing example workflow is reported');
});

test('nextcore-install: --skills deploy puts deploy-integration where the agent reads it', () => {
  const d = mkdtempSync(join(tmpdir(), 'dpi-'));
  const r = spawnSync(process.execPath, [join(root, 'tools/nextcore-install.mjs'), '--agent', 'claude', '--skills', 'deploy', '--dir', d], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(d, '.claude/skills/deploy-integration/SKILL.md')));
  assert.ok(existsSync(join(d, '.claude/skills/deploy-integration/scripts/deploy-profile-check.mjs')));
  const g = spawnSync(process.execPath, [join(root, 'tools/nextcore-install.mjs'), '--agent', 'generic', '--skills', 'deploy-integration', '--dir', d], { encoding: 'utf8' });
  assert.equal(g.status, 0, g.stderr);
  assert.ok(existsSync(join(d, '.nextcore/deploy-integration/SKILL.md')));
});
