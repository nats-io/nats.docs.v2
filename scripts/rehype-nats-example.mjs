import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import { parse as acornParse } from 'acorn';

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
  c: { label: 'C', fence: 'c' },
};

const LANG_ORDER = ['cli', 'js', 'javascript', 'go', 'python', 'java', 'rust', 'csharp', 'c'];

const TABS_COMPONENT = '__NatsExampleTabs';
const TAB_ITEM_COMPONENT = '__NatsExampleTabItem';
const CODE_BLOCK_COMPONENT = '__NatsExampleCodeBlock';
const IMPORT_SOURCE = `import ${TABS_COMPONENT} from '@theme/Tabs';\nimport ${TAB_ITEM_COMPONENT} from '@theme/TabItem';\nimport ${CODE_BLOCK_COMPONENT} from '@theme/CodeBlock';`;

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

// HAST <pre><code class="language-X"> — used by the llms-txt pipeline which
// serializes back to Markdown (it picks up the language- class and emits
// a fenced block).
function codeBlockHastNode(code, fence) {
  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: { className: [`language-${fence}`] },
        children: [{ type: 'text', value: code }],
      },
    ],
  };
}

// MDX JSX <CodeBlock language="X"> — used by the main docs pipeline so
// Docusaurus's theme component handles Prism, copy button, dark/light theming.
function codeBlockJsxNode(code, fence) {
  return {
    type: 'mdxJsxFlowElement',
    name: CODE_BLOCK_COMPONENT,
    attributes: [{ type: 'mdxJsxAttribute', name: 'language', value: fence }],
    children: [{ type: 'text', value: code }],
  };
}

function buildTabsReplacement(type, languages) {
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
  const items = [];
  langs.forEach((lang, i) => {
    const info = LANG_INFO[lang] ?? { label: lang, fence: lang };
    const code = available[lang] ?? available[lang === 'javascript' ? 'js' : lang];
    if (!code) return;
    const attributes = [
      { type: 'mdxJsxAttribute', name: 'value', value: lang },
      { type: 'mdxJsxAttribute', name: 'label', value: info.label },
    ];
    if (i === 0) attributes.push({ type: 'mdxJsxAttribute', name: 'default', value: null });
    items.push({
      type: 'mdxJsxFlowElement',
      name: TAB_ITEM_COMPONENT,
      attributes,
      children: [codeBlockJsxNode(code, info.fence)],
    });
  });
  return [
    {
      type: 'mdxJsxFlowElement',
      name: TABS_COMPONENT,
      attributes: [{ type: 'mdxJsxAttribute', name: 'groupId', value: 'lang' }],
      children: items,
    },
  ];
}

// Markdown-only flat replacement (h4 + pre/code) for the llms-txt pipeline,
// which serializes to Markdown — MDX JSX nodes don't round-trip to Markdown.
function buildFlatReplacement(type, languages) {
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
    nodes.push(codeBlockHastNode(code, info.fence));
  }
  return nodes;
}

function getMdxAttr(node, name) {
  if (!node.attributes) return undefined;
  for (const attr of node.attributes) {
    if (attr.type !== 'mdxJsxAttribute') continue;
    if (attr.name === name) {
      return typeof attr.value === 'string' ? attr.value : undefined;
    }
  }
  return undefined;
}

function buildImportNode() {
  // Shape matches Docusaurus's own mdxjsEsm construction in
  // @docusaurus/mdx-loader/lib/remark/toc/utils.js: empty value (estree is
  // the source of truth), explicit Program + sourceType.
  const program = acornParse(IMPORT_SOURCE, { ecmaVersion: 'latest', sourceType: 'module' });
  program.sourceType = 'module';
  return { type: 'mdxjsEsm', value: '', data: { estree: program } };
}

function alreadyImported(tree) {
  let found = false;
  for (const child of tree.children ?? []) {
    if (child.type !== 'mdxjsEsm') continue;
    if (typeof child.value === 'string' && child.value.includes(TABS_COMPONENT)) {
      found = true;
      break;
    }
  }
  return found;
}

export default function rehypeNatsExample() {
  return (tree) => {
    const replacements = [];
    let usedJsx = false;

    // Case 1: HAST element <div class="nats-example"> — appears in the
    // llms-txt pipeline (Markdown output, no JSX). Emit flat h4 + pre/code.
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.tagName !== 'div') return;
      const classes = node.properties?.className ?? [];
      if (!classes.includes('nats-example')) return;
      const type = node.properties?.dataType;
      if (!type) return;
      const languagesAttr = node.properties?.dataLanguages ?? 'cli,go,rust';
      const requested = String(languagesAttr).split(',');
      replacements.push({ parent, index, replacement: buildFlatReplacement(type, requested) });
    });

    // Case 2: mdxJsxFlowElement — appears in the main docs MDX pipeline
    // (Docusaurus's rehype-raw passes mdxJsxFlowElement through untouched).
    // Emit Docusaurus Tabs/TabItem for proper interactive tab UI.
    visit(tree, (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.type !== 'mdxJsxFlowElement') return;
      if (node.name !== 'div') return;
      const classAttr = getMdxAttr(node, 'class') ?? getMdxAttr(node, 'className');
      if (!classAttr || !classAttr.split(/\s+/).includes('nats-example')) return;
      const type = getMdxAttr(node, 'data-type');
      if (!type) return;
      const languagesAttr = getMdxAttr(node, 'data-languages') ?? 'cli,go,rust';
      const requested = languagesAttr.split(',');
      replacements.push({ parent, index, replacement: buildTabsReplacement(type, requested) });
      usedJsx = true;
    });

    for (const { parent, index, replacement } of replacements.reverse()) {
      parent.children.splice(index, 1, ...replacement);
    }

    if (usedJsx && !alreadyImported(tree)) {
      tree.children.unshift(buildImportNode());
    }
  };
}
