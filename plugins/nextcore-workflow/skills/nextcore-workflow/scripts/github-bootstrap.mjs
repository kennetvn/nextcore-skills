#!/usr/bin/env node
// github-bootstrap — turn a GitHub repo into the agents' workbench: standard labels, issue forms, a PR template and one
// pinned "Decision inbox" issue. Idempotent: re-running adds only what is missing and never overwrites your files.
//
// Why: agents that report in chat leave nothing the next session (or the human) can read. With labels for status and
// priority, forms that ask for "done when", and one inbox for questions, every claim, handoff and decision lands on
// GitHub where the next agent starts.
//
//   github-bootstrap                 # apply to the repo of the current directory
//   github-bootstrap --dry-run       # print the plan; reads GitHub, writes nothing
//   github-bootstrap --files-only    # only write .github/ templates, no network
//   [--repo owner/name] [--no-inbox] [--json]
//
// Labels: status:todo · status:in-progress · status:blocked · status:review · needs-human · p0..p3 · bug · task ·
// lesson · decision-inbox. Files: .github/ISSUE_TEMPLATE/{bug,task,lesson}.yml, .github/pull_request_template.md
// (written into the current directory; commit them yourself). Needs the GitHub CLI (gh), signed in, except --files-only.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dry = args.includes('--dry-run');
const filesOnly = args.includes('--files-only');
const die = (msg) => { console.error(`github-bootstrap: ${msg}`); process.exit(1); };

function gh(a, soft = false) {
  const fake = process.env.NEXTCORE_GH;
  const r = fake ? spawnSync(process.execPath, [fake, ...a], { encoding: 'utf8' }) : spawnSync('gh', a, { encoding: 'utf8' });
  if (r.error) die(r.error.code === 'ENOENT' ? 'GitHub CLI (gh) not found — install it and run `gh auth login`, or use --files-only' : r.error.message);
  if (r.status !== 0) {
    if (soft) return null;
    die(`gh ${a.slice(0, 4).join(' ')} failed: ${(r.stderr || r.stdout).trim().split('\n')[0]}`);
  }
  return r.stdout.trim();
}
const api = (a, soft) => { const o = gh(['api', ...a], soft); return o ? JSON.parse(o) : null; };

export const LABELS = [
  ['status:todo', 'ededed', 'Ready to pick up'],
  ['status:in-progress', '0e8a16', 'Claimed — see the latest claim comment'],
  ['status:blocked', 'b60205', 'Waiting on something named in a comment'],
  ['status:review', 'fbca04', 'Done, waiting for verification'],
  ['needs-human', 'd93f0b', 'Needs OTP / real money / a business decision — answer in the Decision inbox'],
  ['p0', 'b60205', 'Production down or money wrong'],
  ['p1', 'd93f0b', 'Users blocked'],
  ['p2', 'fbca04', 'Should do this week'],
  ['p3', 'c5def5', 'When idle'],
  ['bug', 'd73a4a', 'Measured symptom'],
  ['task', '1d76db', 'Planned work with "done when"'],
  ['lesson', '5319e7', 'Something learned that should become a rule or a check'],
  ['decision-inbox', '000000', 'The one pinned issue where agents ask the human'],
];

const FILES = {
  '.github/ISSUE_TEMPLATE/bug.yml': `name: Bug
description: A symptom you measured
labels: [bug, status:todo]
body:
  - type: textarea
    id: symptom
    attributes:
      label: Measured symptom
      description: The number, where you read it, the query or command. A title states only what was measured.
    validations: { required: true }
  - type: textarea
    id: repro
    attributes:
      label: How to reproduce
  - type: textarea
    id: done
    attributes:
      label: Done when
      description: Checklist. Closing with an unchecked item requires "→ moved to #n" on it.
      value: "- [ ] "
    validations: { required: true }
`,
  '.github/ISSUE_TEMPLATE/task.yml': `name: Task
description: Planned work, sized to one working day or less
labels: [task, status:todo]
body:
  - type: textarea
    id: why
    attributes:
      label: Why
      description: The problem and who has it.
    validations: { required: true }
  - type: dropdown
    id: size
    attributes:
      label: Size
      options: [TRIVIAL, SMALL, MEDIUM, LARGE]
  - type: textarea
    id: done
    attributes:
      label: Done when
      description: At most 8 checks; more means split it into child issues.
      value: "- [ ] "
    validations: { required: true }
  - type: textarea
    id: out
    attributes:
      label: Out of scope
`,
  '.github/ISSUE_TEMPLATE/lesson.yml': `name: Lesson
description: Something an agent or a person learned the hard way
labels: [lesson]
body:
  - type: textarea
    id: happened
    attributes:
      label: What happened (with numbers)
    validations: { required: true }
  - type: textarea
    id: cause
    attributes:
      label: Root cause
  - type: textarea
    id: rule
    attributes:
      label: Rule, and the check that enforces it
      description: Seen twice ⇒ a rule; machine-checkable ⇒ a test or a hook.
`,
  '.github/pull_request_template.md': `Closes #

## What changed
-

## Evidence
<!-- command + output: tests, HTTP status, a measured number -->

## Moved elsewhere
<!-- unfinished items → #issue -->
`,
};

const INBOX_TITLE = 'Decision inbox';
const INBOX_BODY = `The one place agents ask the human. Agents never ask in random comments or chat.

Only three things come here: **OTP / MFA / personal secrets**, **real money**, **pure business decisions**.
Everything technical the agent decides, records its assumption on the issue, and continues.

Each question is one comment: what · why it needs you · options · the agent's recommendation · the issue it blocks.
Answer by replying; the agent removes \`needs-human\` from the blocked issue when it reads your answer.`;

const plan = { repo: null, labels: [], files: [], kept: [], inbox: null };

for (const [p, text] of Object.entries(FILES)) {
  if (existsSync(p)) { plan.kept.push(p); continue; }
  plan.files.push(p);
  if (!dry) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); }
}

if (!filesOnly) {
  plan.repo = opt('--repo') || gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
  const have = new Set();
  for (let page = 1; ; page++) {
    const batch = api([`repos/${plan.repo}/labels?per_page=100&page=${page}`]);
    batch.forEach((l) => have.add(l.name.toLowerCase()));
    if (batch.length < 100) break;
  }
  for (const [name, color, description] of LABELS) {
    if (have.has(name)) continue;
    plan.labels.push(name);
    if (!dry) api(['-X', 'POST', `repos/${plan.repo}/labels`, '-f', `name=${name}`, '-f', `color=${color}`, '-f', `description=${description}`]);
  }
  if (!args.includes('--no-inbox')) {
    const open = api([`repos/${plan.repo}/issues?labels=decision-inbox&state=open&per_page=5`]);
    if (open.length) plan.inbox = { action: 'kept', number: open[0].number };
    else if (dry) plan.inbox = { action: 'create' };
    else {
      const issue = api(['-X', 'POST', `repos/${plan.repo}/issues`, '-f', `title=${INBOX_TITLE}`, '-f', `body=${INBOX_BODY}`, '-f', 'labels[]=decision-inbox']);
      const pinned = gh(['api', 'graphql', '-f', 'query=mutation($id:ID!){pinIssue(input:{issueId:$id}){issue{number}}}', '-f', `id=${issue.node_id}`], true);
      plan.inbox = { action: 'created', number: issue.number, pinned: pinned !== null };
    }
  }
}

if (args.includes('--json')) { console.log(JSON.stringify(plan)); process.exit(0); }
const verb = dry ? 'would add' : 'added';
const lines = [
  `${dry ? 'plan for' : 'bootstrapped'} ${plan.repo || 'local files only'}`,
  `  files: ${plan.files.length ? `${verb} ${plan.files.join(', ')}` : 'nothing new'}${plan.kept.length ? ` · kept yours: ${plan.kept.join(', ')}` : ''}`,
];
if (!filesOnly) lines.push(`  labels: ${plan.labels.length ? `${verb} ${plan.labels.length} (${plan.labels.join(', ')})` : 'all present'}`);
if (plan.inbox) lines.push(`  inbox: ${plan.inbox.action === 'kept' ? `already #${plan.inbox.number}` : plan.inbox.action === 'create' ? 'would create + pin "Decision inbox"' : `created #${plan.inbox.number}${plan.inbox.pinned ? ' (pinned)' : ' (pin it by hand: 3 pins max per repo)'}`}`);
if (plan.files.length && !dry) lines.push('  next: commit .github/ with an issue number in the message');
console.log(lines.join('\n'));
