// Deterministic consistency checker for the Learn deep dives.
// Scans all learn/*.md, verifies internal links, nats-example div<->.sh,
// data-scenario validity, cluster naming, and structure conventions.
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHAPTERS = ['core-nats','services','resilient-clients','key-value','object-store','jetstream','clustering','monitoring','backup-recovery','deployment','security','topologies','mqtt'];
const NEW = ['services','resilient-clients','key-value','object-store','clustering','monitoring','backup-recovery','deployment'];

const problems = [];
const add = (cat, file, msg) => problems.push({ cat, file, msg });

// ---- gather all learn md files ----
const mdFiles = [];
for (const ch of CHAPTERS) {
  const dir = join(ROOT, 'learn', ch);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.md')) mdFiles.push(join('learn', ch, f));
}

// ---- valid data-scenario names from the loader's actual registry ----
// client-module.tsx assigns window.NatsFlow: top-level PascalCase animated
// components (data-scenario uses the camelCase form) plus a nested
// `scenarios` map of static scenarios keyed by their exact data-scenario name.
const reg = readFileSync(join(ROOT, 'src/plugins/nats-flow/client-module.tsx'), 'utf8');
const exported = new Set();
for (const m of reg.matchAll(/^\s*([A-Za-z0-9_]+):\s*module\./gm)) {
  const name = m[1];
  exported.add(name);
  exported.add(name.charAt(0).toLowerCase() + name.slice(1)); // camelCase data-scenario
}

// ---- helper: does an internal doc/reference path resolve? ----
function pathResolves(p) {
  p = p.split('#')[0].replace(/\/$/, '');
  if (p === '' ) return true;
  if (p.startsWith('/learn/')) {
    const rest = p.slice('/learn/'.length);
    const parts = rest.split('/');
    if (parts.length === 1) return existsSync(join(ROOT, 'learn', parts[0], 'index.md'));
    return existsSync(join(ROOT, 'learn', parts[0], parts[1] + '.md'));
  }
  if (p.startsWith('/concepts/')) {
    const rest = p.slice('/concepts/'.length);
    return existsSync(join(ROOT, 'docs/concepts', rest + '.md')) ||
           existsSync(join(ROOT, 'docs/concepts', rest, 'index.md'));
  }
  if (p === '/reference' || p.startsWith('/reference/')) {
    const rest = p === '/reference' ? '' : p.slice('/reference/'.length);
    const base = join(ROOT, 'build/reference', rest);
    return existsSync(base) || existsSync(base + '.md') ||
           existsSync(join(ROOT, 'build/reference', rest, 'index.html'));
  }
  if (p.startsWith('/')) {
    // other site routes — check build/
    return existsSync(join(ROOT, 'build', p.slice(1))) || existsSync(join(ROOT, 'build', p.slice(1) + '.html'));
  }
  return true; // external or relative — skip
}

for (const rel of mdFiles) {
  const full = join(ROOT, rel);
  const txt = readFileSync(full, 'utf8');
  const ch = rel.split('/')[1];
  const slug = rel.split('/')[2].replace(/\.md$/, '');
  const isNew = NEW.includes(ch);

  // 1) internal links
  for (const m of txt.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const target = m[1];
    if (!pathResolves(target)) add('LINK', rel, `unresolved link ${target}`);
  }

  // 2) nats-example div <-> .sh (only when the div declares a cli tab)
  for (const m of txt.matchAll(/<div class="nats-example"[^>]*>/g)) {
    const tag = m[0];
    const dt = (tag.match(/data-type="([^"]+)"/) || [])[1];
    if (!dt) { add('DIV', rel, 'nats-example div without data-type'); continue; }
    if (!dt.startsWith('learn-')) { add('DIV', rel, `data-type not learn-*: ${dt}`); continue; }
    // careful: chapter names contain dashes (resilient-clients), so reconstruct from known path instead
    const expected = `static/examples/snippets/cli/learn/${ch}/${slug}/`;
    // snippet name = portion after learn-<ch>-<slug>-
    const prefix = `learn-${ch}-${slug}-`;
    if (!dt.startsWith(prefix)) { add('DIV', rel, `data-type ${dt} does not match page prefix ${prefix}`); continue; }
    // client-only examples (data-languages without "cli") need no committed .sh
    const langs = (tag.match(/data-languages="([^"]+)"/) || [])[1];
    if (langs && !langs.split(',').map(s => s.trim()).includes('cli')) continue;
    const snip = dt.slice(prefix.length);
    const shPath = join(ROOT, expected, snip + '.sh');
    if (!existsSync(shPath)) add('DIV', rel, `missing CLI .sh for data-type ${dt} (expected ${expected}${snip}.sh)`);
  }

  // 3) data-scenario validity
  for (const m of txt.matchAll(/class="nats-flow"\s+data-scenario="([^"]+)"/g)) {
    const sc = m[1];
    if (!exported.has(sc)) add('SCENARIO', rel, `unknown data-scenario "${sc}"`);
  }

  // 4) cluster naming in chapters that describe the east cluster
  if (['clustering','monitoring','deployment','backup-recovery'].includes(ch)) {
    // flag bare n1/n2/n3 (not followed by -east) and orders-cluster
    const bareN = txt.match(/`n[1-4]`(?!-east)/g);
    if (bareN) add('NAMING', rel, `bare server name(s) ${[...new Set(bareN)].join(',')} — expected n*-east`);
    if (/orders-cluster/.test(txt)) add('NAMING', rel, `uses "orders-cluster" — expected cluster name "east"`);
  }

  // 5) structure
  const isIndex = slug === 'index';
  const isWhereNext = slug === 'where-next';
  if (!isIndex && !isWhereNext) {
    if (!/##\s+Pitfalls/.test(txt)) add('STRUCT', rel, 'content page missing "## Pitfalls"');
    if (!/##\s+Where you are/.test(txt) && isNew) add('STRUCT', rel, 'content page missing "## Where you are"');
  }
  if (isWhereNext && isNew) {
    if (!/##\s+Production checklist/.test(txt)) add('STRUCT', rel, 'where-next missing "## Production checklist"');
  }
  if (!/^---[\s\S]*?sidebar_position:/m.test(txt)) add('STRUCT', rel, 'missing sidebar_position in frontmatter');

  // 6) hygiene
  if (/<\/content>|<\/invoke>|antml:/.test(txt)) add('HYGIENE', rel, 'leaked tool-call tag');
}

// ---- report ----
const byCat = {};
for (const p of problems) (byCat[p.cat] ||= []).push(p);
const cats = Object.keys(byCat).sort();
console.log(`\n=== CONSISTENCY REPORT: ${problems.length} issues across ${mdFiles.length} pages ===\n`);
for (const c of cats) {
  console.log(`--- ${c} (${byCat[c].length}) ---`);
  for (const p of byCat[c]) console.log(`  ${p.file}: ${p.msg}`);
  console.log('');
}
if (problems.length === 0) console.log('CLEAN — no deterministic issues found.');
