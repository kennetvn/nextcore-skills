#!/usr/bin/env node
// spec-check — is the thinking done before the drawing, and the validation done after the build? Zero dependencies.
//
//   node spec-check.mjs <spec.md | drawings-dir>... [--json] [--warn-only]
//
// Reads every spec.md (templates/spec.md shape). Depth follows the `Size:` line (TRIVIAL · SMALL · MEDIUM · LARGE ·
// PRODUCT_CHANGE · SYSTEM_CHANGE); MEDIUM and larger must carry discovery and, once built, a validation report.
//
// Checks
//   missing-spec               a drawing folder (*.dc.html, card.json or canvas.json) with no spec.md (warn) —
//                              without it the checker would call a folder of unspecified drawings "clean"
//   missing-size               no `Size:` line, or an unknown size
//   missing-product-discovery  MEDIUM+: Problem / Job to be done / Success criteria / User / Existing product empty
//   missing-flow-branch        MEDIUM+: user-flow branch empty (happy path + error = error; the others = warn;
//                              `N/A — reason` counts as filled)
//   missing-states             MEDIUM+: no state ticked in States
//   missing-responsive         MEDIUM+: responsive table missing or with empty cells
//   unresolved-assumption      an ASSUMPTION / HYPOTHESIS line with no `check:` saying how it will be verified
//   high-impact-unreviewed     `Impact: HIGH` with no "reviewed by" / "approved by" line
//   missing-validation         MEDIUM+ whose card.json says built/live/shipped, with no validation-report.md or an
//                              empty UX section (error) or empty business mechanism / measurement (warn; error ≥ LARGE)
//
// Exit 1 when an error exists, 0 otherwise (or always 0 with --warn-only).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const head = readFileSync(new URL(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
  console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
const asJson = args.includes('--json');
const warnOnly = args.includes('--warn-only');
const inputs = args.filter((a) => !a.startsWith('--'));
if (!inputs.length) {
  console.error('usage: spec-check.mjs <spec.md | drawings-dir>... [--json] [--warn-only]');
  process.exit(2);
}

const SIZES = ['TRIVIAL', 'SMALL', 'MEDIUM', 'LARGE', 'PRODUCT_CHANGE', 'SYSTEM_CHANGE'];
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next']);
const specs = [];
const drawingDirs = new Set(); // folders holding artboards (*.dc.html) or a card.json / canvas.json
const walk = (p) => {
  if (statSync(p).isFile()) {
    if (/(^|[\\/])spec\.md$/i.test(p)) specs.push(p);
    else if (/\.dc\.html$|(^|[\\/])(card|canvas)\.json$/i.test(p)) drawingDirs.add(dirname(p));
    return;
  }
  for (const n of readdirSync(p)) if (!SKIP.has(n)) walk(join(p, n));
};
for (const i of inputs) walk(i);

// ---------- parsing ----------
const norm = (h) => h.toLowerCase().split(/\s+[—(-]\s*|\s*\(/)[0].trim();
function sections(text) {
  const out = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^## (.+)$/);
    if (m) { cur = norm(m[1]); out.set(cur, []); continue; }
    if (cur) out.get(cur).push(line);
  }
  return out;
}
const PLACEHOLDER = /<[^<>]*[a-z…][^<>]*>/i;
/** Value written after "Label:" on a bullet line, or the whole line; '' when it is still the template. */
function lineValue(line) {
  const t = line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim();
  if (!t || t.startsWith('(') || t.startsWith('>') || PLACEHOLDER.test(t)) return '';
  const i = t.indexOf(':');
  return (i >= 0 ? t.slice(i + 1) : t).trim();
}
function tableRows(lines) {
  const rows = [];
  let header = true;
  for (const l of lines) {
    if (!l.trim().startsWith('|')) { header = true; continue; }
    if (/^\|\s*:?-{3,}/.test(l.trim())) continue;
    if (header) { header = false; continue; }
    rows.push(l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return rows;
}
function filled(lines) {
  const body = lines.join('\n').replace(/<!--[\s\S]*?-->/g, '').split('\n');
  if (tableRows(body).some((r) => r.slice(1).some((c) => c && !PLACEHOLDER.test(c)))) return true;
  return body.some((l) => !l.trim().startsWith('|') && !/^\s*-\s*\[[ x]\]/i.test(l) && lineValue(l));
}

// ---------- checks ----------
const findings = [];
const push = (file, rule, level, message) => findings.push({ file: relative(process.cwd(), file), rule, level, message });

for (const file of specs) {
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const sizeRaw = (text.match(/^Size:\s*([A-Z_]+)\s*$/m) || [])[1];
  const size = SIZES.indexOf(sizeRaw);
  if (size < 0) push(file, 'missing-size', 'error', `no valid "Size:" line — one of ${SIZES.join(' · ')} decides how deep the spec goes`);
  const big = size >= 2;
  const secs = sections(text);

  if (big) {
    for (const s of ['problem', 'job to be done', 'success criteria', 'user', 'existing product']) {
      if (!secs.has(s) || !filled(secs.get(s))) push(file, 'missing-product-discovery', 'error', `"${s}" is empty — ${sizeRaw} needs discovery before drawing (references/product-discovery.md)`);
    }
    const flow = secs.get('user flow');
    const BRANCHES = [['happy path', 'error'], ['error', 'error'], ['recovery', 'warn'], ['cancel', 'warn'], ['permission', 'warn'], ['expired', 'warn'], ['network', 'warn']];
    for (const [b, level] of BRANCHES) {
      const line = flow?.find((l) => l.replace(/^\s*-\s*/, '').toLowerCase().startsWith(b));
      if (!line || !lineValue(line)) push(file, 'missing-flow-branch', level, `user flow: "${b}" branch is empty — describe it or write "N/A — <reason>"`);
    }
    const states = secs.get('states') || [];
    if (!states.some((l) => /^\s*-\s*\[x\]/i.test(l))) push(file, 'missing-states', 'error', 'no state ticked — draw empty / loading / error / success (and rule out the rest with a reason)');
    const resp = [...secs].find(([k]) => k.startsWith('responsive'))?.[1];
    const rows = resp ? tableRows(resp) : [];
    if (!rows.some((r) => r.slice(1).some((c) => c))) push(file, 'missing-responsive', 'error', 'responsive table is empty — say what changes at phone / tablet / desktop');
    else for (const r of rows) if (r.slice(1).some((c) => !c)) push(file, 'missing-responsive', 'warn', `responsive: "${r[0]}" has an empty width — what happens to it there?`);
  }

  text.split('\n').forEach((l, i) => {
    if (l.startsWith('>') || !/\b(ASSUMPTION|HYPOTHESIS)\b/.test(l) || PLACEHOLDER.test(l) || /check\s*:/i.test(l)) return;
    if (/tag each|\*\*ASSUMPTION\*\*/i.test(l)) return; // template guidance lines
    push(file, 'unresolved-assumption', 'warn', `line ${i + 1}: "${l.trim().slice(0, 70)}" — add "check: <how it will be verified>"`);
  });

  if (/^Impact:\s*HIGH\b/m.test(text) && !/(reviewed|approved)\s+by\s*:?\s*\S/i.test(text)) {
    push(file, 'high-impact-unreviewed', 'warn', 'Impact: HIGH needs a second reviewer before code — add "Reviewed by: <agent or person>"');
  }

  const cardPath = join(dirname(file), 'card.json');
  let status = '';
  try { status = String(JSON.parse(readFileSync(cardPath, 'utf8'))?.built?.status || ''); } catch { /* no card */ }
  if (big && /^(built|live|shipped|done|in-production)$/i.test(status)) {
    const repPath = join(dirname(file), 'validation-report.md');
    if (!existsSync(repPath)) {
      push(file, 'missing-validation', 'error', `card.json says "${status}" but there is no validation-report.md — can the user finish the job? (references/validation.md)`);
    } else {
      const rep = sections(readFileSync(repPath, 'utf8').replace(/\r\n/g, '\n'));
      const ux = tableRows(rep.get('ux validation') || []);
      if (!ux.length || ux.some((r) => !r[1])) push(repPath, 'missing-validation', 'error', 'UX validation has empty results — walk the real page and fill every row');
      const biz = rep.get('business validation') || [];
      for (const k of ['expected mechanism', 'measurement required']) {
        const line = biz.find((l) => l.replace(/^\s*-\s*/, '').toLowerCase().startsWith(k));
        if (!line || !lineValue(line)) push(repPath, 'missing-validation', size >= 3 ? 'error' : 'warn', `business validation: "${k}" is empty`);
      }
    }
  }
}

// A drawing without a spec is the most common gap, and a checker that only reads specs would report it as clean.
const specDirs = new Set(specs.map((s) => dirname(s)));
const reported = new Set();
for (const d of drawingDirs) {
  const parent = dirname(d);
  if (specDirs.has(d) || specDirs.has(parent)) continue;
  const at = drawingDirs.has(parent) ? parent : /[\\/]project$/i.test(d) ? parent : d; // one finding per drawing
  if (reported.has(at)) continue;
  reported.add(at);
  push(join(at, 'spec.md'), 'missing-spec', 'warn', 'drawing has no spec.md — write Size first; MEDIUM+ needs problem, job, flow before artboards');
}

// ---------- report ----------
if (asJson) {
  console.log(JSON.stringify({ specs: specs.length, drawings: reported.size + specDirs.size, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.level === 'error' ? 'ERROR' : 'warn '}  ${f.file}  [${f.rule}] ${f.message}`);
  const errors = findings.filter((f) => f.level === 'error').length;
  console.log(`\nspec-check: ${specs.length} spec(s), ${reported.size} drawing(s) without one — ${findings.length} finding(s), ${errors} error(s)`);
}
process.exit(!warnOnly && findings.some((f) => f.level === 'error') ? 1 : 0);
