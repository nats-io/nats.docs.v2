import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const SCENARIO_DIR = path.resolve('src/components/NatsFlow/scenarios');

const FALLBACKS = {
  toggleableSubscribers:
    'Interactive demo: a publisher sends messages to NATS while you toggle subscribers on and off. Inactive subscribers receive nothing.',
  queueGroupAnimated:
    'Animated queue group: a publisher emits messages; NATS load-balances each message to exactly one worker in the queue group.',
  publishSubscribeAnimated:
    'Animated publish/subscribe: a publisher emits messages; NATS delivers a copy to every matching subscriber.',
  subjectsWildcardAnimated:
    'Animated subject wildcards: messages on different subjects (orders.us.created, orders.eu.created, …) are routed by matching wildcard subscriptions.',
  publishAckAnimated:
    'Animated PubAck flow: a publisher sends a message to the server; the server’s listener matches the subject, the stream stores the message and assigns a sequence number, and the server returns a PubAck with the stream name and sequence.',
  wildcardComparison:
    'Side-by-side comparison of single-token (*) and multi-token (>) wildcard subject matching.',
};

const TITLES = {
  publishSubscribe: 'Publish / Subscribe',
  requestReply: 'Request / Reply',
  requestReplyScatterGather: 'Request / Reply — scatter-gather',
  requestReplyQueueGroup: 'Request / Reply with queue group',
  queueGroup: 'Queue group',
  fanOut: 'Fan-out',
  fanIn: 'Fan-in',
  toggleableSubscribers: 'Toggleable subscribers',
  queueGroupAnimated: 'Queue group (animated)',
  publishSubscribeAnimated: 'Publish / Subscribe (animated)',
  subjectsWildcardAnimated: 'Subject wildcards (animated)',
  publishAckAnimated: 'Publish and PubAck (animated)',
  wildcardComparison: 'Wildcard comparison',
};

const cache = new Map();

function readScenarioFile(name) {
  for (const ext of ['.ts', '.tsx']) {
    const p = path.join(SCENARIO_DIR, `${name}${ext}`);
    if (fs.existsSync(p)) return { path: p, source: fs.readFileSync(p, 'utf8') };
  }
  return null;
}

function parseScenario(name) {
  if (cache.has(name)) return cache.get(name);
  const file = readScenarioFile(name);
  if (!file) {
    const fallback = { description: FALLBACKS[name] ?? null, edges: [] };
    cache.set(name, fallback);
    return fallback;
  }
  const src = file.source;

  let description = null;
  const descMatch = src.match(/description\s*:\s*(['"`])([\s\S]*?)\1/);
  if (descMatch) description = descMatch[2];

  const labels = new Map();
  const nodeRe = /id\s*:\s*(['"])([^'"]+)\1[\s\S]*?label\s*:\s*(['"`])([^'"`]+)\3/g;
  let m;
  while ((m = nodeRe.exec(src)) !== null) {
    if (!labels.has(m[2])) labels.set(m[2], m[4]);
  }

  const edges = [];
  const edgeRe =
    /source\s*:\s*(['"])([^'"]+)\1\s*,\s*target\s*:\s*(['"])([^'"]+)\3([\s\S]*?)(?=\{\s*id\s*:|\]\s*,?\s*\}?\s*;?)/g;
  while ((m = edgeRe.exec(src)) !== null) {
    const source = m[2];
    const target = m[4];
    const tail = m[5] ?? '';
    const labelMatch = tail.match(/label\s*:\s*(['"`])([^'"`]+)\1/);
    edges.push({ source, target, label: labelMatch ? labelMatch[2] : null });
  }

  const finalDescription = description ?? FALLBACKS[name] ?? null;
  if (!description && !(name in FALLBACKS)) {
    console.warn(
      `[rehype-nats-flow] Scenario "${name}" (${file.path}) has no top-level description and no FALLBACKS entry. Markdown output will be generic.`,
    );
  }
  const parsed = {
    description: finalDescription,
    edges: edges.map((e) => ({
      source: labels.get(e.source) ?? e.source,
      target: labels.get(e.target) ?? e.target,
      label: e.label,
    })),
  };
  cache.set(name, parsed);
  return parsed;
}

function buildReplacement(scenarioName) {
  const title = TITLES[scenarioName] ?? scenarioName;
  const parsed = parseScenario(scenarioName);

  const children = [];
  children.push({
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [
      { type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: `Message flow — ${title}:` }] },
      { type: 'text', value: ' ' + (parsed.description ?? 'Interactive NATS flow diagram.') },
    ],
  });

  if (parsed.edges.length > 0) {
    const items = parsed.edges.map((e) => {
      const label = e.label ? ` (subject: ${e.label})` : '';
      return {
        type: 'element',
        tagName: 'li',
        properties: {},
        children: [{ type: 'text', value: `${e.source} → ${e.target}${label}` }],
      };
    });
    children.push({ type: 'element', tagName: 'ul', properties: {}, children: items });
  }
  return children;
}

export default function rehypeNatsFlow() {
  return (tree) => {
    const replacements = [];
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (node.tagName !== 'div') return;
      const classes = node.properties?.className ?? [];
      if (!classes.includes('nats-flow')) return;
      const scenario = node.properties?.dataScenario;
      if (!scenario) return;
      replacements.push({ parent, index, replacement: buildReplacement(scenario) });
    });
    for (const { parent, index, replacement } of replacements.reverse()) {
      parent.children.splice(index, 1, ...replacement);
    }
  };
}
