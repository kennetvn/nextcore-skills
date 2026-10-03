#!/usr/bin/env node
// slop-check — find mechanical "AI slop" tells in UI source files. Zero dependencies.
//
//   node slop-check.mjs [paths...] [--json] [--warn-only] [--ignore <substring>]...
//
// Exit code 1 when an ERROR-level finding exists (use in CI / pre-commit), 0 otherwise.
// Colour literals are allowed inside token blocks (:root, [data-theme], @theme, .dark, .light, html)
// and in files whose name contains "token", "theme" or "variables".

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const ignores = args.flatMap((a, i) => (args[i - 1] === '--ignore' ? [a] : []));
const roots = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--ignore');
if (!roots.length) roots.push('.');

const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const MARKUP_EXT = new Set(['.tsx', '.jsx', '.html', '.vue', '.svelte', '.astro']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage', '.turbo', 'vendor']);
const TOKEN_FILE = /token|theme|variables/i;
const TOKEN_SELECTOR = /(^|[\s,])(:root|html|\.dark|\.light|\[data-theme[^\]]*\])\s*$|@theme\b/;

// Each rule: id, level, which files, regex, short advice. `scope: 'all'` = style + markup.
const RULES = [
  { id: 'color-literal', level: 'error', scope: 'style', re: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi, tokenAware: true, advice: 'hex outside tokens — use var(--…)' },
  { id: 'rgb-literal', level: 'warn', scope: 'style', re: /\b(?:rgba?|hsla?)\(\s*\d/gi, tokenAware: true, advice: 'prefer a token (shadow/overlay tokens too)' },
  { id: 'color-literal', level: 'error', scope: 'markup', re: /(?:color|background|bg|border|fill|stroke|shadow|gradient)(?!\s*=)[^;\n]{0,40}?#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi, advice: 'hex outside tokens — use var(--…)' },
  { id: 'purple-gradient', level: 'warn', scope: 'all', re: /gradient\([^)]*\b(purple|violet|indigo|fuchsia)\b|\b(?:from|via)-(?:purple|violet|indigo|fuchsia)-\d{2,3}\b/gi, advice: 'default AI gradient — use brand tokens' },
  { id: 'transition-all', level: 'error', scope: 'all', re: /transition(?:-property)?\s*:\s*all\b|\btransition-all\b/g, advice: 'list the properties you animate' },
  { id: 'break-all', level: 'error', scope: 'all', re: /word-break\s*:\s*break-all|\bbreak-all\b/g, advice: 'cuts identifiers in half — widen the box or shrink text' },
  { id: 'grid-1fr', level: 'warn', scope: 'style', re: /grid-template-columns\s*:[^;{}]*?(?<!minmax\(\s*0\s*,\s*)\b1fr\b/g, advice: '1fr = minmax(auto,1fr) → horizontal scroll; write minmax(0,1fr)' },
  { id: 'italic-heading', level: 'warn', scope: 'style', re: /h[1-6][^{}]*\{[^}]*font-style\s*:\s*italic/g, advice: 'emphasise with weight/colour of the same font' },
  { id: 'italic-heading', level: 'warn', scope: 'markup', re: /<h[1-6]\b[^>]*>[^<]*<(?:em|i)\b/g, advice: 'emphasise with weight/colour of the same font' },
  { id: 'emoji-icon', level: 'warn', scope: 'markup', re: /\p{Extended_Pictographic}️?/gu, advice: 'use an icon set, not emoji' },
  { id: 'placeholder-data', level: 'error', scope: 'markup', re: /(?<!placeholder\s*=\s*["'{`][^"'`\n]{0,60})(?:lorem ipsum|\bjohn doe\b|\bjane (?:doe|smith)\b|nguy[eễ]n v[aă]n [ab]\b|\bacme (?:inc|corp)\b)/gi, advice: 'use realistic sample data (a format hint inside placeholder="…" is fine)' },
  // "Design > code": odd pixel spacing (7px, 11px) or an off-scale negative margin (-26px) is usually a patch
  // over a layout problem. On-scale negatives (-4, -8, -16) are legitimate bleeds; 1px/2px hairlines are fine.
  {
    id: 'pixel-patch', level: 'warn', scope: 'style',
    re: /(?:^|[;{\s])(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(?:-[a-z-]+)?\s*:([^;{}]*)/g,
    test: (m) => [...m[1].matchAll(/(?<![\d.\w])(-?)(\d+)px/g)].some(([, neg, n]) => (+n >= 3 && +n % 2 === 1) || (neg && +n >= 2 && +n % 4 !== 0)),
    advice: 'off-scale spacing looks like a pixel patch — fix the layout or use the spacing scale',
  },
  { id: 'round-number', level: 'warn', scope: 'markup', re: />[^<{}]*?(?<![\d.,])(?:[1-9]0{3,}|[1-9]0{0,2}[.,]000)(?![\d.,])[^<{}]*</g, advice: 'organic numbers read as real (1,247 not 1,000)' },
];

// Blank out comments but keep newlines, so line numbers stay correct.
function stripComments(text, isStyle) {
  const keepNl = (m) => m.replace(/[^\n]/g, ' ');
  let out = text.replace(/\/\*[\s\S]*?\*\//g, keepNl);
  if (!isStyle) out = out.replace(/<!--[\s\S]*?-->/g, keepNl).replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + keepNl(m.slice(p.length)));
  // var(--token, <fallback>) is a token use: blank the fallback so its literal is not reported.
  out = out.replace(/var\(\s*--[\w-]+\s*,((?:[^()]|\([^()]*\))*)\)/g, (m, fb) => m.replace(fb, keepNl(fb)));
  return out;
}

// Character ranges inside CSS token blocks (any enclosing selector matches TOKEN_SELECTOR).
function tokenRanges(css) {
  const ranges = [];
  const stack = [];
  let selStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      const selector = css.slice(selStart, i).trim();
      stack.push({ isToken: TOKEN_SELECTOR.test(selector), start: i });
      selStart = i + 1;
    } else if (ch === '}') {
      const top = stack.pop();
      if (top && top.isToken && !stack.some((s) => s.isToken)) ranges.push([top.start, i]);
      selStart = i + 1;
    } else if (ch === ';') {
      selStart = i + 1;
    }
  }
  return ranges;
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function* walk(path) {
  const st = statSync(path);
  if (st.isFile()) return yield path;
  for (const name of readdirSync(path)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    yield* walk(join(path, name));
  }
}

const findings = [];
for (const root of roots) {
  for (const file of walk(root)) {
    const ext = extname(file).toLowerCase();
    const isStyle = STYLE_EXT.has(ext);
    if (!isStyle && !MARKUP_EXT.has(ext)) continue;
    if (ignores.some((s) => file.includes(s))) continue;
    const raw = readFileSync(file, 'utf8');
    const text = stripComments(raw, isStyle);
    const tokenFile = TOKEN_FILE.test(basename(file));
    const ranges = isStyle ? tokenRanges(text) : [];
    const inToken = (idx) => ranges.some(([a, b]) => idx > a && idx < b);
    for (const rule of RULES) {
      if (rule.scope !== 'all' && rule.scope !== (isStyle ? 'style' : 'markup')) continue;
      if (rule.tokenAware && tokenFile) continue;
      for (const m of text.matchAll(rule.re)) {
        if (rule.tokenAware && inToken(m.index)) continue;
        if (rule.test && !rule.test(m)) continue;
        const line = lineOf(text, m.index);
        const snippet = raw.split('\n')[line - 1].trim().slice(0, 120);
        findings.push({ file: relative(process.cwd(), file), line, rule: rule.id, level: rule.level, advice: rule.advice, snippet });
      }
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  for (const f of findings) console.log(`${f.level === 'error' ? 'ERROR' : 'warn '}  ${f.file}:${f.line}  [${f.rule}] ${f.advice}\n        ${f.snippet}`);
  const byRule = findings.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] || 0) + 1), acc), {});
  const errors = findings.filter((f) => f.level === 'error').length;
  console.log(`\nslop-check: ${findings.length} finding(s), ${errors} error(s)` + (findings.length ? ' — ' + Object.entries(byRule).map(([k, v]) => `${k} ${v}`).join(' · ') : ''));
}
process.exit(!warnOnly && findings.some((f) => f.level === 'error') ? 1 : 0);
