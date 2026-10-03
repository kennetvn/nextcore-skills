#!/usr/bin/env node
// token-audit — check a CSS design-token file the way a browser would see it. Zero dependencies.
//
//   node token-audit.mjs <tokens.css> [--src <dir>]... [--pair fg:bg]... [--json] [--warn-only]
//
// Checks
//   contrast      WCAG 2.x contrast of text tokens on the backgrounds they are meant for, in EVERY theme
//                 (light, [data-theme=dark], .dark, prefers-color-scheme: dark). Pairs come from naming
//                 conventions (X-fg on X, X-ink on X-soft, ink/text on bg/surface…) plus --pair a:b.
//                 < 3:1 = error, < 4.5:1 = warn (fine only for ≥24px / bold ≥18.7px text).
//   dark-missing  a near-white / near-black colour token with no dark-theme value: it will be invisible
//                 (or blinding) in dark mode. Only reported when the file has a dark theme at all.
//   undefined-var var(--x) used in --src files with no definition anywhere and no fallback.
//
// Exit 1 when an error exists (CI / pre-commit), 0 otherwise.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.flatMap((a, i) => (args[i - 1] === name ? [a] : []));
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const srcDirs = flag('--src');
const extraPairs = flag('--pair').map((p) => p.split(':').map((s) => s.trim().replace(/^--/, '')));
const tokenFiles = args.filter((a, i) => !a.startsWith('--') && !['--src', '--pair'].includes(args[i - 1]));
if (!tokenFiles.length) {
  console.error('usage: token-audit.mjs <tokens.css> [--src <dir>] [--pair fg:bg] [--json] [--warn-only]');
  process.exit(2);
}

// ---------- parsing ----------
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Walk CSS blocks; return [{ theme, props: Map<name, value> }]. Theme = 'light' | 'dark' | null (ignored). */
function themedBlocks(css) {
  const out = [];
  const stack = [];
  let selStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      stack.push({ selector: css.slice(selStart, i).trim(), start: i + 1 });
      selStart = i + 1;
    } else if (ch === '}') {
      const top = stack.pop();
      selStart = i + 1;
      if (!top) continue;
      const chain = [...stack.map((s) => s.selector), top.selector].join(' ');
      const body = css.slice(top.start, i).replace(/\{[^{}]*\}/g, ''); // drop nested rule bodies
      const props = new Map();
      for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) props.set(m[1], m[2].trim());
      if (!props.size) continue;
      const dark = /data-theme\s*=\s*["']?dark|\.dark\b|prefers-color-scheme\s*:\s*dark/.test(chain);
      const root = /(^|[\s,(])(:root|html|body|\.light|\[data-theme[^\]]*\]|@theme)/.test(chain);
      out.push({ theme: dark ? 'dark' : root ? 'light' : null, props });
    } else if (ch === ';' && !stack.length) {
      selStart = i + 1;
    }
  }
  return out;
}

// ---------- colour maths ----------
function parseColor(v) {
  v = v.trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (k) => parseInt(h.slice(k, k + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  if (v === 'white' || v === '#fff') return { r: 255, g: 255, b: 255, a: 1 };
  if (v === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  return null;
}
const over = (c, bg) => ({ r: c.r * c.a + bg.r * (1 - c.a), g: c.g * c.a + bg.g * (1 - c.a), b: c.b * c.a + bg.b * (1 - c.a), a: 1 });
const lum = ({ r, g, b }) => {
  const f = (x) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ---------- build themes ----------
const SIGIL = new Map(); // SCSS `$` / LESS `@` tokens keep their own sigil in reports
const tok = (n) => `${SIGIL.get(n) || '--'}${n}`;
const light = new Map();
const dark = new Map();
let hasDark = false;
for (const f of tokenFiles) {
  const css = stripComments(readFileSync(f, 'utf8'));
  // SCSS `$name: value;` / LESS `@name: value;` at the top level are tokens too (light theme)
  if (/\.(scss|sass|less)$/i.test(f)) {
    const top = css.replace(/\{[^{}]*\}/g, '');
    for (const m of top.matchAll(/^\s*([$@])([a-zA-Z][\w-]*)\s*:\s*([^;\n]+?)\s*(?:!default)?\s*;/gm)) {
      light.set(m[2], m[3].trim());
      SIGIL.set(m[2], m[1]);
    }
  }
  for (const blk of themedBlocks(css)) {
    if (blk.theme === 'light') for (const [k, v] of blk.props) light.set(k, v);
    if (blk.theme === 'dark') {
      hasDark = true;
      for (const [k, v] of blk.props) dark.set(k, v);
    }
  }
}
const themes = { light, ...(hasDark ? { dark: new Map([...light, ...dark]) } : {}) };

/** Resolve var() chains inside one theme; returns a colour or null. */
function resolve(theme, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = theme.get(name);
  if (!raw) return null;
  const ref = raw.match(/^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (ref) return resolve(theme, ref[1], seen) ?? (ref[2] ? parseColor(ref[2]) : null);
  const sassRef = raw.match(/^[$@]([a-zA-Z][\w-]*)$/);
  if (sassRef) return resolve(theme, sassRef[1], seen);
  return parseColor(raw);
}

// ---------- pairs by convention ----------
const names = [...light.keys()];
const has = (n) => light.has(n);
const pairs = new Map(); // "fg|bg" -> reason
const add = (fg, bg, why) => has(fg) && has(bg) && !pairs.has(`${fg}|${bg}`) && pairs.set(`${fg}|${bg}`, why);
for (const n of names) {
  let m = n.match(/^(.*)-(fg|foreground|on)$/);
  if (m) add(n, m[1], 'X-fg on X');
  m = n.match(/^(.*)-ink$/);
  if (m) add(n, `${m[1]}-soft`, 'X-ink on X-soft');
}
const prefixes = new Set(names.map((n) => (n.match(/^([a-z]+-)/) || ['', ''])[1]));
for (const p of prefixes) {
  const texts = ['ink', 'ink-soft', 'ink-muted', 'text', 'text-muted', 'foreground', 'fg'].map((s) => p + s).filter(has);
  const grounds = ['bg', 'background', 'surface', 'cream', 'card', 'canvas', 'base'].map((s) => p + s).filter(has);
  for (const t of texts) for (const g of grounds) add(t, g, 'text on surface');
}
for (const [fg, bg] of extraPairs) {
  if (!has(fg) || !has(bg)) console.error(`token-audit: --pair ${fg}:${bg} — token not found`);
  else pairs.set(`${fg}|${bg}`, '--pair');
}

// ---------- checks ----------
const findings = [];
const push = (rule, level, where, message) => findings.push({ rule, level, where, message });

for (const [key, why] of pairs) {
  const [fg, bg] = key.split('|');
  for (const [tname, theme] of Object.entries(themes)) {
    const b = resolve(theme, bg);
    const f = resolve(theme, fg);
    if (!b || !f) continue;
    const base = tname === 'dark' ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
    const bb = b.a < 1 ? over(b, base) : b;
    const r = ratio(f.a < 1 ? over(f, bb) : f, bb);
    if (r < 4.5) {
      push('contrast', r < 3 ? 'error' : 'warn', `${tname}: ${tok(fg)} on ${tok(bg)}`,
        `${r.toFixed(2)}:1 (${why}) — needs 4.5:1 for body text${r >= 3 ? ', 3:1 only for large text' : ''}`);
    }
  }
}

if (hasDark) {
  for (const n of names) {
    if (dark.has(n)) continue;
    const c = resolve(light, n);
    // -fg / -on tokens sit on a coloured fill, not on the page, so they do not vanish in dark mode.
    if (!c || c.a < 1 || /^var\(/.test(light.get(n)) || /-(fg|on|foreground)$|^(.*-)?(white|black)$/.test(n)) continue;
    const L = lum(c);
    if (L > 0.8 || L < 0.02) push('dark-missing', 'warn', tok(n), `${light.get(n)} has no dark-theme value — near-${L > 0.8 ? 'white' : 'black'} colours vanish or glare in dark mode`);
  }
}

if (srcDirs.length) {
  const defined = new Set([...light.keys(), ...dark.keys()]);
  const dynamic = new Set();
  const uses = [];
  const EXT = new Set(['.css', '.scss', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.html', '.astro']);
  const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage']);
  const walk = function* (p) {
    if (statSync(p).isFile()) return yield p;
    for (const n of readdirSync(p)) if (!SKIP.has(n) && !n.startsWith('.')) yield* walk(join(p, n));
  };
  for (const d of srcDirs) {
    for (const file of walk(d)) {
      if (!EXT.has(extname(file))) continue;
      const text = stripComments(readFileSync(file, 'utf8'));
      for (const m of text.matchAll(/--([a-zA-Z][\w-]*)\s*:/g)) defined.add(m[1]);
      // set from JS: next/font `variable: "--font-x"`, style={{ '--x': … }}, setProperty('--x', …)
      for (const m of text.matchAll(/["'`]--([a-zA-Z][\w-]*)["'`]/g)) defined.add(m[1]);
      // generated families: `--color-${key}` (chart libraries) ⇒ every --color-* counts as defined
      for (const m of text.matchAll(/--([a-zA-Z][\w-]*-)\$\{/g)) dynamic.add(m[1]);
      for (const m of text.matchAll(/var\(\s*--([a-zA-Z][\w-]*)\s*([,)])/g)) if (m[2] === ')') uses.push({ file, name: m[1], idx: m.index, text });
    }
  }
  const seen = new Set();
  for (const u of uses) {
    if (defined.has(u.name) || [...dynamic].some((p) => u.name.startsWith(p))) continue;
    const line = u.text.slice(0, u.idx).split('\n').length;
    const k = `${u.file}:${u.name}`;
    if (seen.has(k)) continue;
    seen.add(k);
    push('undefined-var', 'error', `${relative(process.cwd(), u.file)}:${line}`, `var(--${u.name}) is defined nowhere and has no fallback — it resolves to nothing`);
  }
}

// ---------- report ----------
if (asJson) {
  console.log(JSON.stringify({ tokens: light.size, darkTokens: dark.size, pairsChecked: pairs.size, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.level === 'error' ? 'ERROR' : 'warn '}  [${f.rule}] ${f.where}\n        ${f.message}`);
  const errors = findings.filter((f) => f.level === 'error').length;
  console.log(`\ntoken-audit: ${light.size} tokens (${dark.size} with a dark value), ${pairs.size} text/background pairs × ${Object.keys(themes).length} theme(s) — ${findings.length} finding(s), ${errors} error(s)`);
}
process.exit(!warnOnly && findings.some((f) => f.level === 'error') ? 1 : 0);
