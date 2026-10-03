#!/usr/bin/env node
// design-review — one contact sheet per drawing for the three "squint" tests a senior designer runs by eye.
// Zero dependencies.
//
//   node design-review.mjs <drawings-dir> [--out design-review.html] [--shot review.png] [--width 1600]
//
// For every artboard it renders four views side by side:
//   distance 50% · distance 25%   the major hierarchy must still read when the board is small (distance test)
//   grayscale                     hierarchy must survive without colour (black-and-white test)
//   no decoration                 grayscale + no shadows, gradients, background images, text shadows, blur:
//                                 what is left must still have a clear order (hierarchy-without-decoration test)
// …plus the 5-second questions with the drawing's declared feature (card.json), for the reviewer to answer.
//
// --shot <png> also screenshots the sheet with a local Chrome/Edge/Chromium in headless mode (set CHROME_PATH
// if it is not found). Without it, open the HTML in any browser — or let an agent with browser tools look at it.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const VALUE_OPTS = new Set(['--out', '--shot', '--width']);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const root = args.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.has(args[i - 1]));
if (!root) {
  console.error('usage: design-review.mjs <drawings-dir> [--out design-review.html] [--shot review.png] [--width 1600]');
  process.exit(2);
}
const out = resolve(opt('--out', 'design-review.html'));
const shot = opt('--shot');
const sheetWidth = Number(opt('--width', 1600));

const isArtboard = (n) => /\.(dc\.)?html$/i.test(n);
function drawings(dir) {
  const here = readdirSync(dir);
  const found = here.some(isArtboard) || here.includes('canvas.json') ? [dir] : [];
  for (const n of here) {
    const p = join(dir, n);
    if (!n.startsWith('.') && !n.startsWith('_') && n !== 'node_modules' && statSync(p).isDirectory()) found.push(...drawings(p));
  }
  return found;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const VIEWS = [
  { id: 'd50', label: 'distance 50%', scale: 0.5, css: '' },
  { id: 'd25', label: 'distance 25%', scale: 0.25, css: '' },
  { id: 'gray', label: 'grayscale', scale: 0.25, css: 'html{filter:grayscale(1)}' },
  {
    id: 'bare', label: 'no decoration', scale: 0.25,
    // html (0,0,1) outranks * (0,0,0) at equal !important, so the page stays grayscale while children lose filters
    css: '*,*::before,*::after{box-shadow:none!important;text-shadow:none!important;background-image:none!important;backdrop-filter:none!important;filter:none!important} html{filter:grayscale(1)!important}',
  },
];

function boardsOf(dir) {
  const index = existsSync(join(dir, 'canvas.json')) ? JSON.parse(readFileSync(join(dir, 'canvas.json'), 'utf8')) : {};
  const boards = index.boards || Object.fromEntries((index.artboards || []).map((a) => [a.file, a]));
  const listed = (index.order || Object.keys(boards)).filter((f) => existsSync(join(dir, f)));
  const files = listed.length ? listed : readdirSync(dir).filter(isArtboard);
  return files.map((f) => {
    const src = readFileSync(join(dir, f), 'utf8');
    const b = boards[f] || {};
    const w = b.w || Number((src.match(/"\$preview"\s*:\s*\{\s*"width"\s*:\s*(\d+)/) || src.match(/\bwidth:\s*(\d+)px/) || [])[1]) || 1280;
    const h = b.h || Number((src.match(/"\$preview"\s*:\s*\{[^}]*"height"\s*:\s*(\d+)/) || src.match(/\bheight:\s*(\d+)px/) || [])[1]) || 800;
    // {{holes}} / <sc-for> are filled by the canvas runtime; outside it they show raw — say so instead of misleading
    const bound = /\{\{[\w.]+\}\}|<sc-for\b/.test(src);
    return { file: f, title: b.title || (src.match(/<title>([^<]*)<\/title>/) || [])[1] || f, w, h, src, dir, bound };
  });
}

// The artboard is inlined with srcdoc so the review styles can be injected; <base> keeps relative assets working.
function frame(board, view) {
  const base = `<base href="${esc(pathToFileURL(board.dir + '/').href)}">`;
  const style = view.css ? `<style>${view.css}</style>` : '';
  const doc = board.src.replace(/<head[^>]*>/i, (m) => `${m}${base}${style}`);
  const finalDoc = doc === board.src ? `${base}${style}${board.src}` : doc;
  const w = Math.round(board.w * view.scale);
  const h = Math.round(board.h * view.scale);
  return `<figure class="v"><div class="box" style="width:${w}px;height:${h}px"><iframe loading="lazy" title="${esc(board.title)} — ${view.label}" style="width:${board.w}px;height:${board.h}px;transform:scale(${view.scale})" srcdoc="${esc(finalDoc)}"></iframe></div><figcaption>${view.label}</figcaption></figure>`;
}

let boundCount = 0;
const sections = drawings(root).map((dir) => {
  const card = existsSync(join(dir, 'card.json')) ? JSON.parse(readFileSync(join(dir, 'card.json'), 'utf8')) : {};
  const boards = boardsOf(dir);
  if (!boards.length) return '';
  boundCount += boards.filter((b) => b.bound).length;
  const name = relative(process.cwd(), dir) || basename(dir);
  return `<section><h2>${esc(card.feature || name)}</h2><p class="meta">${esc(name)} · ${boards.length} artboard(s)${card.routes ? ' · ' + esc(card.routes.join(', ')) : ''}</p>
<details class="q"><summary>5-second test — answer from the 25% views only</summary><ol><li>Where am I?</li><li>What is this page for?</li><li>What is the single most important thing?</li><li>What should I do next?</li></ol><p>Any answer that needs the 50% view or colour ⇒ the hierarchy relies on decoration; fix type, spacing, grouping or position — not colour.</p></details>
${boards.map((b) => `<div class="board"><h3>${esc(b.title)} <span>${b.w}×${b.h}</span></h3>${b.bound ? '<p class="warn">Uses data bindings ({{…}} / &lt;sc-for&gt;) filled by the canvas runtime — text below is unbound. Judge layout and weight here; judge copy on the canvas.</p>' : ''}<div class="row">${VIEWS.map((v) => frame(b, v)).join('')}</div></div>`).join('\n')}</section>`;
}).filter(Boolean);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design review</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#14161a;--muted:#5a6270;--line:#d8dde4}
@media (prefers-color-scheme:dark){:root{--bg:#0e1014;--fg:#f2f4f7;--muted:#a7afba;--line:#2a2f37}}
body{margin:0;padding:24px;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;max-width:${sheetWidth}px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:18px;margin:32px 0 2px}h3{font-size:14px;margin:16px 0 8px}h3 span,.meta,figcaption{color:var(--muted);font-weight:400}
section{border-top:1px solid var(--line)}.row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
.v{margin:0}.box{overflow:hidden;border:1px solid var(--line);background:#fff}iframe{border:0;transform-origin:0 0;display:block;pointer-events:none}
figcaption{font-size:12px;margin-top:4px}.q{margin:8px 0;max-width:720px}.warn{margin:4px 0 8px;font-size:12px;color:#b45309}.q summary{cursor:pointer;font-weight:600}
</style></head><body><h1>Design review</h1><p class="meta">${sections.length} drawing(s) · views: distance 50% / 25% · grayscale · no decoration</p>
${sections.join('\n')}
</body></html>`;

writeFileSync(out, html);
console.log(`design-review: ${sections.length} drawing(s) → ${relative(process.cwd(), out)}` +
  (boundCount ? ` · ${boundCount} artboard(s) use canvas data bindings (shown unbound)` : ''));

if (shot) {
  const candidates = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const chrome = candidates.find((p) => existsSync(p));
  if (!chrome) {
    console.error('design-review: no Chrome/Edge/Chromium found for --shot (set CHROME_PATH); the HTML sheet was still written.');
    process.exit(1);
  }
  const height = Math.min(16000, 400 + sections.length * 1200);
  // CI containers (e.g. Ubuntu 24 runners) often can't start Chrome's sandbox; the page is a local file we wrote.
  const sandbox = process.env.CI ? ['--no-sandbox'] : [];
  const r = spawnSync(chrome, [...sandbox, '--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${sheetWidth + 48},${height}`,
    '--virtual-time-budget=4000', `--screenshot=${resolve(shot)}`, pathToFileURL(out).href], { encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(resolve(shot))) {
    console.error('design-review: screenshot failed —', (r.stderr || '').split('\n').slice(-3).join(' '));
    process.exit(1);
  }
  console.log(`design-review: screenshot → ${relative(process.cwd(), resolve(shot))}`);
}
