#!/usr/bin/env node
// design-card — measure every drawing so it can say what it is and whether it matches the brand. Zero deps.
//
//   node design-card.mjs <drawings-dir> --tokens <tokens.css> [--fonts "Inter,Fraunces"] [--app <src/app>]
//                        [--min-token 85] [--json] [--strict]
//
// A "drawing" is a folder of artboards (*.dc.html or *.html) — e.g. one Claude Design canvas exported to the
// repo. Optional files inside it:
//   canvas.json  Claude Design index ({ boards: { "Main.dc.html": { w, h, title } } }) — gives sizes + titles
//   card.json    what a human declares: { "feature", "routes": ["/settings"], "why", "built": { "status", "files" } }
//
// Measured for each drawing
//   devices     artboard widths → desktop ≥1024 · tablet 600–1023 · phone ≤599
//   states      empty · loading · error · success, found in artboard names/titles (English + Vietnamese)
//   colour DNA  share of colour literals in the artboards that are real token values (+ var(--…) uses)
//   type DNA    font families used vs the allowed list
//   routes      every declared route exists: --app (Next.js app/ or pages/ router) or --routes (Laravel
//               routes/web.php, or a plain list, one path per line — {id} :id <id> [id] are wildcards; works for
//               Django, Rails, WordPress… e.g. `php artisan route:list` or `rails routes` saved to a file)
// --strict exits 1 when any drawing fails a check (CI gate for "no approval while the card is orange").

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const VALUE_OPTS = new Set(['--tokens', '--fonts', '--app', '--routes', '--min-token']);
const root = args.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.has(args[i - 1]));
const tokensFile = opt('--tokens');
const fonts = new Set((opt('--fonts', '') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const appDir = opt('--app');
const routesFile = opt('--routes');
const minToken = Number(opt('--min-token', 85));
const asJson = args.includes('--json');
const strict = args.includes('--strict');
if (!root) {
  console.error('usage: design-card.mjs <drawings-dir> --tokens <tokens.css> [--fonts "A,B"] [--app <dir>] [--routes <file>] [--json] [--strict]');
  process.exit(2);
}

const GENERIC_FONTS = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'ui-monospace', 'ui-sans-serif', 'ui-serif',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'inherit', 'initial', 'georgia', 'arial', 'helvetica', 'helvetica neue']);
const NEUTRAL = new Set(['#fff', '#ffffff', '#000', '#000000']);
const STATES = {
  empty: /empty|blank|no (?:data|results?)|zero|rỗng|trống|chưa có|không có|0 kết quả/i,
  loading: /loading|skeleton|spinner|fetching|đang tải|đang gửi|đang đếm|đang tìm/i,
  error: /error|fail|invalid|offline|lỗi|thất bại|không tải được/i,
  success: /success|done|saved|sent|toast|confirm|thành công|đã (?:gửi|lưu|chép|duyệt|tạo)/i,
};

// ---- token colours (any theme) ----
const norm = (h) => {
  h = h.toLowerCase();
  return h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h.slice(0, 7);
};
const tokenHex = new Set();
if (tokensFile) {
  const css = readFileSync(tokensFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/(?:--|\$|@)[\w-]+\s*:\s*(#[0-9a-f]{3,8})\b/gi)) tokenHex.add(norm(m[1])); // CSS vars, SCSS, LESS
}

// ---- routes (segments; '*' = one dynamic segment, '**' = catch-all) ----
const routes = [];
const seg = (s) => (/^\[\[?\.\.\./.test(s) ? '**' : /^(\[.*\]|\{.*\}|:.+|<.*>)$/.test(s) ? '*' : s);
if (appDir && existsSync(appDir)) {
  const pagesRouter = basename(appDir) === 'pages';
  const walk = (d, segs) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) {
        if (n === 'node_modules' || n.startsWith('_') || n.startsWith('.') || (pagesRouter && n === 'api')) continue;
        walk(p, n.startsWith('(') || n.startsWith('@') ? segs : [...segs, seg(n)]);
      } else if (!pagesRouter && /^page\.(t|j)sx?$/.test(n)) {
        routes.push(segs);
      } else if (pagesRouter && /\.(t|j)sx?$/.test(n) && !n.startsWith('_')) {
        const name = n.replace(/\.(t|j)sx?$/, '');
        routes.push(name === 'index' ? segs : [...segs, seg(name)]);
      }
    }
  };
  walk(appDir, []);
}
if (routesFile && existsSync(routesFile)) {
  const text = readFileSync(routesFile, 'utf8');
  // Laravel routes/web.php, or any list with one path per line (`php artisan route:list`, `rails routes`, Django…)
  const paths = /\.php$/.test(routesFile)
    ? [...text.matchAll(/Route::(?:get|post|put|patch|delete|any|match|view|resource|inertia)\s*\(\s*(?:\[[^\]]*\]\s*,\s*)?['"]([^'"]+)['"]/g)].map((m) => m[1])
    : text.split(/\r?\n/).map((l) => (l.match(/(?:^|\s)(\/[^\s]*)/) || [])[1]).filter(Boolean);
  for (const p of paths) routes.push(p.split(/[?#]/)[0].split('/').filter(Boolean).map(seg));
}
const routeExists = (u) => {
  const segs = u.split(/[?#]/)[0].split('/').filter(Boolean);
  return routes.some((r) => {
    const star = r.indexOf('**');
    if (star >= 0) return segs.length >= star && r.slice(0, star).every((s, i) => s === '*' || s === segs[i]);
    return r.length === segs.length && r.every((s, i) => s === '*' || s === segs[i] || seg(segs[i]) === '*');
  });
};

// ---- drawings ----
const isArtboard = (n) => /\.(dc\.)?html$/i.test(n);
function drawings(dir) {
  const here = readdirSync(dir);
  const out = [];
  if (here.some(isArtboard) || here.includes('canvas.json')) out.push(dir);
  for (const n of here) {
    const p = join(dir, n);
    if (!n.startsWith('.') && !n.startsWith('_') && n !== 'node_modules' && statSync(p).isDirectory()) out.push(...drawings(p));
  }
  return out;
}

function measure(dir) {
  const index = existsSync(join(dir, 'canvas.json')) ? JSON.parse(readFileSync(join(dir, 'canvas.json'), 'utf8')) : {};
  // older canvas format: artboards: [{ file, w, h, title }]
  const boards = index.boards || Object.fromEntries((index.artboards || []).map((a) => [a.file, a]));
  // with an index, only the boards it lists are drawings (other .html files are exports, notes, snapshots)
  const listed = Object.keys(boards).filter((f) => existsSync(join(dir, f)));
  const files = listed.length ? listed : readdirSync(dir).filter(isArtboard);
  const card = existsSync(join(dir, 'card.json')) ? JSON.parse(readFileSync(join(dir, 'card.json'), 'utf8')) : {};
  const widths = [];
  const labels = [];
  let lits = 0, onToken = 0, varUses = 0;
  const offToken = new Set();
  const usedFonts = new Set();
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    const b = boards[f] || {};
    const w = b.w ?? Number((src.match(/"\$preview"\s*:\s*\{\s*"width"\s*:\s*(\d+)/) || src.match(/<div[^>]*style="[^"]*\bwidth:\s*(\d+)px/) || [])[1]);
    if (w) widths.push(w);
    labels.push(f, b.title || '', (src.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
    for (const m of src.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
      const h = norm(m[0]);
      if (NEUTRAL.has(h)) continue;
      lits++;
      if (tokenHex.has(h)) onToken++; else offToken.add(h);
    }
    varUses += (src.match(/var\(--/g) || []).length;
    for (const m of src.matchAll(/family=([A-Za-z+]+)/g)) usedFonts.add(m[1].replace(/\+/g, ' ').toLowerCase());
    for (const m of src.matchAll(/font-family\s*:\s*([^;"}]+)/gi)) {
      // only the first family is the intended one; the rest of the stack is fallback
      const name = m[1].split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
      if (name && !name.startsWith('var(')) usedFonts.add(name);
    }
  }
  const label = labels.join(' ');
  const devices = { desktop: widths.some((w) => w >= 1024), tablet: widths.some((w) => w >= 600 && w < 1024), phone: widths.some((w) => w < 600) || /\b3[6-9]\d\b|mobile|phone|điện thoại/i.test(label) };
  const states = Object.fromEntries(Object.entries(STATES).map(([k, re]) => [k, re.test(label)]));
  const total = lits + varUses;
  const tokenShare = total ? Math.round((100 * (onToken + varUses)) / total) : 100;
  const badFonts = fonts.size ? [...usedFonts].filter((f) => !fonts.has(f) && !GENERIC_FONTS.has(f)) : [];
  const routeChecks = (card.routes || []).map((u) => ({ route: u, exists: appDir || routesFile ? routeExists(u) : null }));
  const problems = [];
  if (!files.length) problems.push('no artboards');
  if (!devices.phone) problems.push('no phone artboard');
  if (!devices.tablet) problems.push('no tablet artboard');
  for (const [k, v] of Object.entries(states)) if (!v) problems.push(`no ${k} state`);
  if (tokensFile && tokenShare < minToken) problems.push(`colours ${tokenShare}% on token (< ${minToken}%)`);
  if (badFonts.length) problems.push(`off-brand font: ${badFonts.join(', ')}`);
  for (const r of routeChecks) if (r.exists === false) problems.push(`route ${r.route} has no page`);
  if (!card.feature) problems.push('card.json: no feature declared');
  return {
    drawing: relative(process.cwd(), dir) || basename(dir), artboards: files.length, widths: [...new Set(widths)].sort((a, b) => a - b),
    devices, states, colour: { tokenShare, offToken: [...offToken].slice(0, 6) }, fonts: { used: [...usedFonts], offBrand: badFonts },
    routes: routeChecks, feature: card.feature || null, why: card.why || null, built: card.built || null, problems,
  };
}

const cards = drawings(root).map(measure).filter((c) => c.artboards);
if (asJson) {
  console.log(JSON.stringify(cards, null, 2));
} else {
  const ok = (b) => (b ? '✓' : '·');
  for (const c of cards) {
    console.log(`${c.problems.length ? '✗' : '✓'} ${c.drawing}  — ${c.feature || '(no feature declared)'}`);
    console.log(`    ${c.artboards} artboards · widths ${c.widths.join('/') || '?'} · desktop ${ok(c.devices.desktop)} tablet ${ok(c.devices.tablet)} phone ${ok(c.devices.phone)}`);
    console.log(`    states: empty ${ok(c.states.empty)} loading ${ok(c.states.loading)} error ${ok(c.states.error)} success ${ok(c.states.success)} · colour ${c.colour.tokenShare}% on token · fonts ${c.fonts.offBrand.length ? 'OFF: ' + c.fonts.offBrand.join(', ') : 'ok'}`);
    if (c.problems.length) console.log(`    → ${c.problems.join(' · ')}`);
  }
  const pass = cards.filter((c) => !c.problems.length).length;
  console.log(`\ndesign-card: ${cards.length} drawing(s), ${pass} pass, ${cards.length - pass} need work`);
}
process.exit(strict && cards.some((c) => c.problems.length) ? 1 : 0);
