// Stand-in for the GitHub CLI used by tests (NEXTCORE_GH=<this file>). State lives in the JSON file $FAKE_GH_STATE:
// { repo, login, labels: [{name}], issues: { "<n>": { body, state, comments: [{id, body, created_at, user}], labels, assignees } },
//   nextId, calls: [] }. $FAKE_GH_RACE=1 makes the next comment POST lose: a rival claim lands one second earlier.
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.env.FAKE_GH_STATE;
const s = JSON.parse(readFileSync(file, 'utf8'));
const a = process.argv.slice(2);
const save = () => writeFileSync(file, JSON.stringify(s, null, 1));
const print = (o) => { process.stdout.write(JSON.stringify(o)); save(); process.exit(0); };
s.calls.push(a.join(' '));

if (a[0] === 'repo') { process.stdout.write(s.repo); save(); process.exit(0); }
if (a[0] !== 'api') { process.stderr.write(`fake gh: unsupported ${a[0]}`); process.exit(1); }
if (a[1] === 'user') print({ login: s.login });
if (a[1] === 'graphql') { s.pinned = true; print({ data: {} }); }

let method = 'GET';
const rest = a.slice(1);
if (rest[0] === '-X') { method = rest[1]; rest.splice(0, 2); }
const [path, ...flags] = rest;
const f = {};
for (let i = 0; i < flags.length; i += 2) {
  const [k, ...v] = flags[i + 1].split('=');
  const key = k.replace('[]', '');
  f[key] = k.endsWith('[]') ? [...(f[key] || []), v.join('=')] : v.join('=');
}
const url = new URL(path, 'https://x/');
const parts = url.pathname.split('/').filter(Boolean); // repos o r ...
const page = Number(url.searchParams.get('page') || 1);
const issue = (n) => s.issues[n] || (s.issues[n] = { body: '', state: 'open', comments: [], labels: [], assignees: [] });
const now = () => new Date(Date.now() + (s.skew || 0)).toISOString();

if (parts[3] === 'labels' && parts.length === 4) {
  if (method === 'GET') print(page === 1 ? s.labels : []);
  s.labels.push({ name: f.name, color: f.color }); print({ name: f.name });
}
if (parts[3] === 'issues' && parts.length === 4) {
  if (method === 'GET') {
    const want = url.searchParams.get('labels');
    print(Object.entries(s.issues).filter(([, i]) => i.state === 'open' && i.labels.includes(want)).map(([n]) => ({ number: Number(n) })));
  }
  const n = String(Math.max(0, ...Object.keys(s.issues).map(Number)) + 1);
  Object.assign(issue(n), { title: f.title, body: f.body, labels: f.labels || [] });
  print({ number: Number(n), node_id: `I_${n}` });
}
if (parts[3] === 'issues' && parts[4] === 'comments') { // DELETE repos/o/r/issues/comments/<id>
  for (const i of Object.values(s.issues)) i.comments = i.comments.filter((c) => String(c.id) !== parts[5]);
  print({});
}
const it = issue(parts[4]);
if (parts.length === 5) {
  if (method === 'PATCH') Object.assign(it, f);
  print({ number: Number(parts[4]), body: it.body, state: it.state });
}
if (parts[5] === 'comments') {
  if (method === 'GET') print(it.comments.slice((page - 1) * 100, page * 100));
  if (process.env.FAKE_GH_RACE) {
    const until = new Date(Date.now() + 36e5).toISOString();
    it.comments.push({ id: s.nextId++, user: { login: 'rival' }, created_at: new Date(Date.now() - 1000).toISOString(), body: `<!-- issue-claim ${JSON.stringify({ op: 'claim', by: 'rival', until })} -->` });
  }
  const c = { id: s.nextId++, user: { login: s.login }, created_at: now(), body: f.body };
  it.comments.push(c); print(c);
}
if (parts[5] === 'labels') {
  if (method === 'POST') it.labels = [...new Set([...it.labels, ...f.labels])];
  else it.labels = it.labels.filter((l) => l !== decodeURIComponent(parts[6]));
  print({});
}
if (parts[5] === 'assignees') {
  it.assignees = method === 'POST' ? [...new Set([...it.assignees, ...f.assignees])] : it.assignees.filter((x) => !f.assignees.includes(x));
  print({});
}
process.stderr.write(`fake gh: unhandled ${method} ${path}`); process.exit(1);
