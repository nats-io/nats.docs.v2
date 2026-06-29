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
    'Animated PubAck flow: a publisher sends a message to a subject; the ORDERS stream accepts it (it listens on orders.>), stores it and assigns a sequence number, then returns a PubAck with the stream name and sequence.',
  jetStreamPipelineAnimated:
    'Animated JetStream pipeline: a producer publishes into the ORDERS stream, where each message gets a fixed stream sequence; one consumer then reads the stored messages in order, advancing its own consumer sequence, and hands each to a client. The stream sequence is the message\'s position in the log; the consumer sequence is how many messages this consumer has read.',
  consumerServerSideAnimated:
    'Architecture diagram: the NATS server contains two entities, the ORDERS stream (the stored messages) and the billing consumer (a server-side cursor over the stream). A separate client application connects from outside the server: it pulls messages from the consumer and receives them. The stored messages and the read position both live on the server, not in the client.',
  doubleAckAnimated:
    'Plain ack versus double ack. In both, the server (the consumer) delivers a message to the client and the client sends an ack back. With a plain ack the client moves on the instant it sends the ack (fire-and-forget). With a double ack the ack is a request: the client waits for the server to confirm the ack landed before treating the message as done.',
  redeliveryOrderAnimated:
    'Redelivery is in delivery order, not stream order. A consumer delivers messages 1 through 5; the client acks 1, 2, 4, and 5 but skips 3. While 3 sits unacked an Ack Wait timer fills; when it completes the server redelivers message 3, so it arrives after 4 and 5 — out of stream order — and the client acks it that second time, before the consumer continues with message 6.',
  twoConsumersAnimated:
    'Two consumers read one ORDERS stream from independent positions. The billing consumer has no filter and delivers every order; the analytics consumer filters to orders.shipped and delivers only the shipped messages, skipping orders.created. Each keeps its own cursor, so reading from one never moves the other: billing advances through all six messages and reaches #6, while analytics has delivered only the two shipped orders and sits at #5. The stream keeps one shared copy of every message and serves each consumer from its own position.',
  ackResponsesAnimated:
    'The four responses shown as consequences on a real stream of deliveries. The consumer delivers message #1 and the client acks it, so the consumer hands over the next message, #2. The client naks #2 and the same message is redelivered immediately; the retry is then acked and delivery moves on to #3. The client terms #3: it is dropped and turns red, and the next message, #4, is delivered at once. For #4 the client sends in-progress, which is not a final answer — it refills the Ack Wait window to keep the slow message in flight — then finally acks it and moves on to #5. In short: ack advances to the next message, nak redelivers the same message immediately, term drops the message and advances to the next, and in-progress extends the Ack Wait window.',
  wildcardComparison:
    'Side-by-side comparison of single-token (*) and multi-token (>) wildcard subject matching.',
  workerPoolAnimated:
    'Several workers share one pull consumer. The ORDERS stream holds a backlog of stored orders and the single shipping consumer has one read position that sweeps through them. Each order is handed to exactly one worker, rotating round-robin across the workers that are asking, so three workers end up with an even share. Acked orders stay in the stream — the workers share a read position, not the messages.',
  crashRedeliveryAnimated:
    'One order is delivered to a worker that crashes before it acks. The order stays in progress on the shipping consumer while the AckWait timer runs; the server can\'t see the crash, only the missing ack. When AckWait elapses the server redelivers the same order to a surviving worker, which ships it and acks. The order is handled exactly once even though the first worker failed.',
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
  jetStreamPipelineAnimated: 'Producer, stream, and consumer (animated)',
  consumerServerSideAnimated: 'A consumer is server-side (animated)',
  doubleAckAnimated: 'Plain ack vs double ack (animated)',
  redeliveryOrderAnimated: 'Out-of-order redelivery (animated)',
  twoConsumersAnimated: 'Two consumers, separate positions (animated)',
  ackResponsesAnimated: 'The four ack responses (animated)',
  wildcardComparison: 'Wildcard comparison',
  workerPoolAnimated: 'Workers sharing one consumer (animated)',
  crashRedeliveryAnimated: 'Crash mid-message, then redelivery (animated)',
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
