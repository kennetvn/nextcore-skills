// Two-way test: every rule must fire on fixtures/bad, nothing may fire on fixtures/good.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', 'skills', 'nextcore-design', 'scripts', 'slop-check.mjs');
const scan = (dir) => JSON.parse(execFileSync(process.execPath, [script, join(here, 'fixtures', dir), '--json', '--warn-only'], { encoding: 'utf8' }));

const expected = ['color-literal', 'rgb-literal', 'purple-gradient', 'transition-all', 'break-all', 'grid-1fr', 'italic-heading', 'emoji-icon', 'placeholder-data', 'round-number'];
const bad = new Set(scan('bad').map((f) => f.rule));
const missing = expected.filter((r) => !bad.has(r));
const good = scan('good');

if (missing.length) console.error('FAIL — rules that did not fire on bad fixtures:', missing.join(', '));
if (good.length) console.error('FAIL — false positives on good fixtures:\n' + good.map((f) => `  ${f.file}:${f.line} [${f.rule}] ${f.snippet}`).join('\n'));
if (missing.length || good.length) process.exit(1);
console.log(`ok — ${expected.length}/${expected.length} rules fire on bad, 0 findings on good`);
