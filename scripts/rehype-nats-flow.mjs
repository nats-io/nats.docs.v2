import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const SCENARIO_DIR = path.resolve('src/components/NatsFlow/scenarios');

const FALLBACKS = {
  directGetAnimated:
    'Direct Get reads one message by sequence from any copy of a replicated stream, not only the leader. ORDERS is replicated across three servers — a leader and two replicas, each holding a full copy. A reader fires a stream of Direct Gets, each for a different sequence number; every read is answered by whichever copy serves it — sometimes the leader, sometimes a replica — and a per-server tally shows the read load spreading across all three.',
  batchGetAnimated:
    'Batch Direct Get returns many messages over a single request, and any copy of a replicated stream can serve it. ORDERS is replicated across three servers — a leader and two replicas. Three batches run in turn, each served by a different copy, so batch reads spread across all three. Within a batch the serving copy streams the messages back one after another, each carrying a Nats-Num-Pending header that counts down — 2, then 1, then 0 on the last message — so the reader knows the batch is complete.',
  subjectTransformAnimated:
    "A stream's subject transform rewrites the subject a message is stored under. Messages arrive on ingest.<customer>; as each passes through the transform orders.{{partition(3,1)}}.{{wildcard(1)}}, its subject is rewritten — the customer token is hashed into one of three buckets and carried into the new subject. The same customer always hashes to the same bucket, so acme and globex both land in bucket 1 while hooli goes to 0 and wayne to 2, which lets consumers split the load by bucket.",
  messageTtlAnimated:
    "Three stored messages with different lifespans on one timeline, with a 'now' marker sweeping left to right. orders.cancelled carries a 1-hour per-message TTL and expires first, well before the stream's 7-day MaxAge. orders.created has no TTL, so it lives until MaxAge. orders.schema carries Nats-TTL: never and outlives even MaxAge. The earlier deadline always wins — except never, which has no deadline at all.",
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
  priorityOverflowAnimated:
    'Overflow priority policy. A near worker (us-east) pulls with no threshold and always drains the ORDERS backlog; a far worker (us-west) pulls with a min_pending threshold and is served only while the backlog sits above it. A burst pushes the backlog over the line so us-west takes the overflow, and once the backlog falls back under, us-west goes idle again.',
  priorityPinnedAnimated:
    'Pinned_client priority policy. The server pins one worker and sends it every message while the others stand by. The pinned worker goes quiet; once PinnedTTL elapses the server pins a standby instead and stamps its messages with a new Nats-Pin-Id, and the old worker\'s next pull carrying the stale id comes back 423 — it clears the id and rejoins the standby pool.',
  priorityPrioritizedAnimated:
    'Prioritized priority policy. Three regions pull at priority 0, 1 and 2. The server serves the lowest priority that is currently pulling, with no delay: us-east (0) gets everything while it pulls; the moment it goes quiet the work falls to us-west (1), then eu-west (2); when us-east returns the work snaps straight back to priority 0.',
  limitsRetentionAnimated:
    'Limits retention. A consumer reads and acks every order in the ORDERS stream, and each one stays in place — acking never removes a message here. Only a limit (MaxAge, MaxBytes, or MaxMsgs) removes one. The read cursor sweeps the stored messages while all of them remain.',
  interestRetentionAnimated:
    'Interest retention, both behaviors. When an order is published on orders.shipped, a subject both consumers subscribe to, it is stored and removed once every consumer has acked it. When an order is published on orders.archived, a subject no consumer subscribes to, it is dropped the instant it is published — no interest, nothing stored.',
  workQueueRetentionAnimated:
    'WorkQueue retention. Each order is delivered to exactly one worker; the first ack removes it for everyone, so the stream drains back to empty. Workers take turns: an order is published, one worker pulls and acks it, and the message is gone.',
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
  priorityOverflowAnimated: 'Overflow priority policy (animated)',
  priorityPinnedAnimated: 'Pinned-client priority policy (animated)',
  priorityPrioritizedAnimated: 'Prioritized priority policy (animated)',
  limitsRetentionAnimated: 'Limits retention — acks keep the message (animated)',
  interestRetentionAnimated: 'Interest retention — all-ack and no-interest (animated)',
  workQueueRetentionAnimated: 'WorkQueue retention — first ack drains it (animated)',
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
