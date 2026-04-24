import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const SNIPPETS_ROOT = path.resolve('static/examples/snippets');
const METADATA_PATH = path.join(SNIPPETS_ROOT, 'metadata.json');

const LANG_INFO = {
  cli: { label: 'CLI', fence: 'bash' },
  js: { label: 'JavaScript/TypeScript', fence: 'javascript' },
  javascript: { label: 'JavaScript/TypeScript', fence: 'javascript' },
  go: { label: 'Go', fence: 'go' },
  python: { label: 'Python', fence: 'python' },
  java: { label: 'Java', fence: 'java' },
  rust: { label: 'Rust', fence: 'rust' },
  csharp: { label: 'C#/.NET', fence: 'csharp' },
};

const LANG_ORDER = ['cli', 'js', 'javascript', 'go', 'python', 'java', 'rust', 'csharp'];

let cache = null;

function loadExamples() {
  if (cache) return cache;
  const index = { byType: {} };
  if (!fs.existsSync(METADATA_PATH)) {
    cache = index;
    return index;
  }
  const meta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  const langs = meta.examples ?? {};
  for (const [lang, byType] of Object.entries(langs)) {
    for (const [type, info] of Object.entries(byType || {})) {
      if (!info?.path) continue;
      const filePath = path.join(SNIPPETS_ROOT, info.path);
      if (!fs.existsSync(filePath)) continue;
      const code = fs.readFileSync(filePath, 'utf8').replace(/\s+$/, '');
      (index.byType[type] ||= {})[lang] = code;
    }
  }
  cache = index;
  return index;
}

function orderedLanguages(requested, available) {
  const wanted = new Set(requested.map((l) => l.trim()).filter(Boolean));
  const seen = new Set();
  const out = [];
  for (const lang of LANG_ORDER) {
    if (!wanted.has(lang)) continue;
    const resolved = lang === 'js' ? 'javascript' : lang;
    if (seen.has(resolved)) continue;
    if (available[resolved] || available[lang]) {
      out.push(resolved);
      seen.add(resolved);
    }
  }
  return out;
}

function buildReplacement(type, languages) {
  const examples = loadExamples();
  const available = examples.byType[type] ?? {};
  const langs = orderedLanguages(languages, available);
  if (langs.length === 0) {
    return [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [{ type: 'text', value: `_No code examples available for "${type}"._` }],
      },
    ];
  }
  const nodes = [];
  for (const lang of langs) {
    const info = LANG_INFO[lang] ?? { label: lang, fence: lang };
    const code = available[lang] ?? available[lang === 'javascript' ? 'js' : lang];
    if (!code) continue;
    nodes.push({
      type: 'element',
      tagName: 'h4',
      properties: {},
      children: [{ type: 'text', value: info.label }],
    });
    nodes.push({
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [
        {
          type: 'element',
          tagName: 'code',
          properties: { className: [`language-${info.fence}`] },
          children: [{ type: 'text', value: code }],
        },
      ],
    });
  }
  return nodes;
}

export default function rehypeNatsExample() {
  return (tree) => {
    const replacements = [];
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.tagName !== 'div') return;
      const classes = node.properties?.className ?? [];
      if (!classes.includes('nats-example')) return;
      const type = node.properties?.dataType;
      if (!type) return;
      const languagesAttr = node.properties?.dataLanguages ?? 'cli,go,rust';
      const requested = String(languagesAttr).split(',');
      const replacement = buildReplacement(type, requested);
      replacements.push({ parent, index, replacement });
    });
    for (const { parent, index, replacement } of replacements.reverse()) {
      parent.children.splice(index, 1, ...replacement);
    }
  };
}
