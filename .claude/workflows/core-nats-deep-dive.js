export const meta = {
  name: 'core-nats-deep-dive',
  description: 'Research + write 7 Core NATS deep-dive Learn pages (+CLI snippets, reusing existing NatsFlow scenarios), review, verify continuity',
  phases: [
    { title: 'Research', detail: '6 fact-domains: nats-server subject matching/no-responders, natscli pub/sub/req, client _INBOX/request-many, example sweep' },
    { title: 'Write+Review+Fix', detail: 'per page: write .md + CLI .sh, adversarial review, apply fixes' },
    { title: 'Continuity', detail: 'whole-chapter lockfile + JetStream-boundary + scenario-state + link-allowlist critic, then targeted fixes' },
  ],
}

// ---------------------------------------------------------------------------
// Shared paths
// ---------------------------------------------------------------------------
const ROOT = '.' // repo root — run from the repository checkout
const CN_DIR = ROOT + '/learn/core-nats'
const CLI_DIR = ROOT + '/static/examples/snippets/cli/learn/core-nats'
const SPEC = ROOT + '/specs/2026-06-04-core-nats-deep-dive-design.md'
const EXEMPLARS = [
  ROOT + '/learn/jetstream/why-a-stream.md',
  ROOT + '/learn/jetstream/your-first-stream.md',
  ROOT + '/learn/jetstream/publishing.md',
]

// Existing, already-wired NatsFlow scenarios this chapter may embed (NO new ones)
const ALLOWED_SCENARIOS = ['publishSubscribeAnimated', 'subjectsWildcardAnimated', 'requestReply', 'queueGroupAnimated', 'requestReplyScatterGather', 'fanOut', 'fanIn', 'publishSubscribe']

// ---------------------------------------------------------------------------
// The authoring contract (spec §4-6 distilled)
// ---------------------------------------------------------------------------
const CONTRACT = [
  'You are writing one page of the NATS "Core NATS" Learn chapter (Rust-book style, the Develop-half FOUNDATION deep dive). It expands the /concepts pub-sub/subjects/request-reply/queue-groups primers into one runnable walkthrough.',
  '',
  'BEFORE writing, Read these for voice + facts (do not skip):',
  '  - Design spec (authoritative): ' + SPEC,
  '  - The concept page(s) you are expanding (go DEEPER than these; do not duplicate): ' + ROOT + '/docs/concepts/{pub-sub-basics,subjects,request-reply,queue-groups}.md',
  '  - Three gold-standard already-written JetStream pages (match their VOICE exactly): ' + EXEMPLARS.join(', '),
  '  - Project rules: ' + ROOT + '/CLAUDE.md',
  '',
  'ADDED VALUE OVER CONCEPTS (this is the whole point): concepts say WHAT a pattern is; this chapter shows HOW it works on the wire (interest graph, _INBOX, no-responders/503, at-most-once, queue+wildcard, multi-reply gathering) PLUS one runnable Acme ORDERS session built up page by page. If a paragraph would sit verbatim in the concept primer, it is too shallow — add the mechanism, the runnable step, or the trade-off.',
  '',
  'RUNNING SCENARIO (pinned, identical across every page) — the Acme ORDERS world BEFORE it adds JetStream (pure ephemeral pub/sub):',
  '  Order subjects: orders.created, orders.shipped, orders.cancelled (+ regional orders.us.created / orders.eu.created on the wildcards page).',
  '  Subscriber services: warehouse, notifications, analytics.',
  '  Request-reply: an inventory service answering on orders.inventory.check.',
  '  Queue group: a pool of packers sharing queue group name "packers" on orders.created.',
  '  Scatter-gather: three shipping-quote providers answering on shipping.quote.',
  '  Canonical payload (same as the other chapters): {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}',
  '  One local nats-server (topology is a different chapter). No persistence, acks, or reconnection anywhere. Carry the session forward; add subscribers/services as the chapter progresses. Never invent a different payload or service name.',
  '',
  'BOUNDARY (hard) — Core NATS is EPHEMERAL and at-most-once. Do NOT teach (only name the gap + link out):',
  '  persistence/durability/redelivery/"survive a restart" -> /learn/jetstream; reconnection/drain/slow-consumers -> /learn/resilient-clients;',
  '  geo-affinity of queue groups across regions -> /learn/topologies/super-clusters; the Services framework -> /learn/services; subject permissions -> /learn/security.',
  '',
  'WORDING LOCKFILE (same word for same thing; NEVER the banned terms):',
  '  subject (NOT "topic"/"channel"); publish/subscribe (NOT "send"/"listen" for pub/sub); message (NOT "event"/"packet"/"record");',
  '  publisher/subscriber (NOT "producer"/"consumer" — consumer is a JetStream term); client = the connecting app;',
  '  "queue group" two words, shared name = "queue group name" (NOT "queue"/"channel"/"worker group"/"consumer group");',
  '  "single-token wildcard" for * and "multi-token wildcard" for > after intro (NOT "star"/"greater-than" in body);',
  '  inbox / _INBOX for the reply subject (NOT "callback subject"/"return channel"); request-reply hyphenated;',
  '  at-most-once (define once; NOT "best-effort"/"unreliable" loosely); scatter-gather hyphenated; "no responders" for the no-responder error.',
  'BOUNDARY LOCKFILE (critical): do NOT use JetStream vocabulary as if it applied to core NATS — no "stream"/"consumer"/"ack"/"persisted"/"stored"/"durable"/"redelivered"/"exactly-once". Name the gap and link to /learn/jetstream instead.',
  '',
  'VOICE RULES (hard):',
  '  - ONE teaching thought per paragraph. If two ideas are joined by "and", split them.',
  '  - Define-then-use: never use a term before its own paragraph in this or a prior page.',
  '  - <=2 NEW concepts per page. A third goes to a later page or is linked out.',
  '  - Active voice, present tense. NO filler ("it is important to note", "basically", "essentially", "simply").',
  '  - Length 150-400 source lines. index and where-next may be 80+.',
  '',
  'FRONTMATTER (exact shape, match exemplars):',
  '  id: <slug>',
  '  title: "<NUM>. <Title>"   (content pages, e.g. "3. Request-reply"); the index page uses title: "Core NATS Deep Dive".',
  '  sidebar_position: <POS>',
  '  description: <one line>',
  '  H1 in body equals the title.',
  '',
  'EXAMPLE PATTERN (Core NATS is the most CLIENT-LIBRARY chapter — the nats-example div is the DEFAULT):',
  '  - Use a nats-example div for every real pub/sub/request/queue snippet:',
  '      <div class="nats-example" data-type="learn-core-nats-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>',
  '  - For EACH div, ALSO author the CLI source so CLI renders today:',
  '      ' + CLI_DIR + '/<slug>/<snippet>.sh   (starts with #!/bin/bash, real nats commands, committable).',
  '      Path dirs join with dashes to form the data-type: cli/learn/core-nats/<slug>/<snippet>.sh => learn-core-nats-<slug>-<snippet>. Verify it matches your div.',
  '  - "Try it in two terminals" demos and nats-server startup are plain fenced bash blocks (no div).',
  '  - If you ever hand-write a Tabs block: import Tabs/TabItem, groupId="lang", CLI TabItem FIRST with default, order CLI,JS,Go,Python,Java,Rust,C#. Prefer the div.',
  '',
  'NATSFLOW (REUSE ONLY — do NOT author new scenarios). Embed with <div class="nats-flow" data-scenario="<NAME>" data-width="600" data-height="350"></div>. The ONLY valid names: ' + ALLOWED_SCENARIOS.join(', ') + '. Using any other name renders an error box.',
  '',
  'VALID INTERNAL LINKS (allow-list):',
  '  Reference: /reference/protocols/client, /reference/ (root).',
  '  Concepts: /concepts/pub-sub-basics, /concepts/subjects, /concepts/request-reply, /concepts/queue-groups, /concepts/jetstream, /concepts/topologies, /concepts/security, /concepts/what-is-nats.',
  '  Learn siblings: /learn/core-nats/<slug>; /learn/jetstream (+ /learn/jetstream/why-a-stream); /learn/services (+ /learn/services/your-first-service); /learn/resilient-clients (+ reconnection, slow-consumers); /learn/topologies/super-clusters; /learn/security.',
  '  NEVER invent a path outside this list.',
  '',
  'REFERENCE HANDOFF (greppable): "The wire-level PUB/SUB/MSG protocol is documented in [Reference](/reference/protocols/client). We only need the behavior here."',
  'End every page with a "## See also" section: 1-3 links from the allow-list, HARD max 3.',
  '',
  'NAVIGATION: include a short "## Where you are" (recap session state) near the end and a "## What is next" pointer WITH a clickable link to the next page.',
  '',
  'OUTPUT HYGIENE: write ONLY the file content. Never include literal tool tags like </content> or </invoke> anywhere in the .md or .sh files.',
  '',
  'ACCURACY: every CLI flag, default (e.g. 1 MB max_payload), wildcard rule, and the no-responders/503 behavior MUST be verified against the research fact pack (and if unsure, against nats-server/natscli source via nats-mcp tools). Do not invent flags.',
].join('\n')

// ---------------------------------------------------------------------------
// Phase 1 — research fact domains
// ---------------------------------------------------------------------------
const RESEARCH_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['key', 'summary', 'cliCommands', 'configFields', 'gotchas', 'referencePaths'],
  properties: {
    key: { type: 'string' },
    summary: { type: 'string' },
    cliCommands: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { command: { type: 'string' }, explanation: { type: 'string' } } } },
    configFields: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { name: { type: 'string' }, type: { type: 'string' }, default: { type: 'string' }, meaning: { type: 'string' }, versionNote: { type: 'string' } } } },
    clientNotes: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { lang: { type: 'string' }, note: { type: 'string' } } } },
    gotchas: { type: 'array', items: { type: 'string' } },
    referencePaths: { type: 'array', items: { type: 'string' }, description: 'allow-list internal paths usable as See-also' },
    exampleLinks: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { url: { type: 'string' }, shows: { type: 'string' } } }, description: 'hidden/runnable examples found in nats-io/synadia orgs + nats-by-example' },
    snippetIdeas: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { id: { type: 'string' }, description: { type: 'string' } } } },
  },
}

const MCP_HINT = 'Load and use the nats-mcp tools first: ToolSearch("select:mcp__nats-mcp__find_equivalent,mcp__nats-mcp__show_type,mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_repos_path"). Cross-check nats-server for EXACT behavior (subject matching, no-responders/503, max_payload default), natscli for exact nats pub/sub/req/reply flags, and nats.go/nats.rs for _INBOX + request-many specifics. Read /reference/protocols/client in this repo (docs-reference/protocols/client.md) for the wire handoff. ALSO WebSearch/WebFetch the nats-io, synadia-io, synadia-labs, ConnectEverything orgs + natsbyexample.com for canonical core-pattern examples — return URLs + what each shows.'

const DOMAINS = [
  { key: 'C_PUBSUB', focus: 'Pub/sub mechanics: the in-memory interest graph, fire-and-forget, at-most-once delivery, "message discarded if no interest", the max_payload default (1 MB) and how the server enforces/errors on oversize, flush/round-trip semantics. Exact nats pub / nats sub flags.' },
  { key: 'C_SUBJECTS', focus: 'Subjects: dot-delimited tokens, hierarchy, the * wildcard (matches EXACTLY one token) and the > wildcard (matches ONE OR MORE tokens, only allowed at the END), wildcards are subscriber-side only, allowed characters + case sensitivity, reserved prefixes ($SYS/$JS/$KV/$O/$SRV and _INBOX), trie-based matching, why subjects are essentially free. Exact nats sub wildcard usage.' },
  { key: 'C_REQREPLY', focus: 'Request-reply: the _INBOX reply-subject mechanism (modern per-request inbox vs the older muxed inbox), request()/respond() across clients, request timeouts, and the no-responders detection (the server returns a 503 / no-responder status immediately when nothing subscribes). Request headers. Exact nats req / nats reply flags.' },
  { key: 'C_QUEUE', focus: 'Queue groups: queue-subscribe semantics, one message to exactly one (randomly chosen) member, the app-defined queue group name, mixing a queue group with plain subscribers on the same subject (plain subs still get every message), dynamic membership (join/leave with no config), queue group + wildcard interaction. Exact nats sub --queue flag.' },
  { key: 'C_SCATTER', focus: 'Scatter-gather: when a request has multiple responders and NO queue group, every responder replies; gathering multiple replies by subscribing to the inbox yourself and collecting by count or deadline (not taking just the first). request-many helper patterns in clients (nats.go, nats.rs, orbit). The nats req --replies flag. Fan-in aggregation.' },
  { key: 'C_RESOURCES', focus: 'Hidden-examples sweep ONLY. Use WebSearch/WebFetch across nats-io, synadia-io, synadia-labs, ConnectEverything orgs + natsbyexample.com. Find canonical runnable examples for pub/sub, request-reply, queue groups, scatter-gather / request-many. Return a curated list of URLs with a one-line note on what each shows and which slug it helps. Do not invent URLs.' },
]

// ---------------------------------------------------------------------------
// Phase 2 — the 7 pages
// ---------------------------------------------------------------------------
const PAGES = [
  { slug: 'index', num: 0, pos: 1, title: 'Core NATS Deep Dive', isIndex: true,
    teaches: 'What Core NATS is — the ephemeral foundation — and the five patterns the chapter builds (pub/sub -> subjects -> request-reply -> queue groups -> scatter-gather) on the Acme ORDERS app before it adds persistence. The chapter map and what the reader builds.',
    stateIn: 'Nothing built.', stateOut: 'Reader has the mental map and page list.',
    needs: ['C_PUBSUB'], snippets: [], cli: [],
    defers: 'persistence -> /learn/jetstream',
    visual: '<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>',
    links: 'Point forward to the content pages and to /concepts/pub-sub-basics. Mirror the JetStream index.md shape.' },

  { slug: 'publish-subscribe', num: 1, pos: 2, title: 'Publish-subscribe',
    teaches: 'TWO concepts: (1) fire-and-forget publish — a copy reaches every interested subscriber, and nobody (the message is discarded) if there is no interest; (2) at-most-once delivery and the 1 MB default max payload. Run the ORDERS publisher + warehouse/notifications/analytics subscribers.',
    stateIn: 'A local nats-server running, nothing subscribed.', stateOut: 'The ORDERS publisher and three service subscribers exchange messages over core pub/sub.',
    needs: ['C_PUBSUB'],
    snippets: [{ id: 'publish', desc: 'publish an order to orders.created with the canonical payload' }, { id: 'subscribe', desc: 'subscribe as the warehouse service to orders.created (and note orders.> for all)' }],
    cli: [{ file: 'publish.sh', desc: 'nats pub orders.created with the canonical payload' }, { file: 'subscribe.sh', desc: 'nats sub orders.created (the warehouse service)' }],
    defers: 'durability + redelivery -> /learn/jetstream; wire protocol -> /reference/protocols/client',
    visual: '<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>' },

  { slug: 'subjects-and-wildcards', num: 2, pos: 3, title: 'Subjects & wildcards',
    teaches: 'TWO concepts: (1) subjects are dot-delimited tokens forming a hierarchy; (2) subscriber wildcards — * matches exactly one token, > matches one-or-more tokens and only at the end. Add regional orders.us.* subscribers. Note reserved $/_INBOX prefixes and that subjects are essentially free.',
    stateIn: 'Pub/sub on flat orders.* subjects.', stateOut: 'Regional subjects (orders.us.created etc.) subscribed via wildcards.',
    needs: ['C_SUBJECTS'],
    snippets: [{ id: 'wildcard-single', desc: 'subscribe to orders.*.created to catch every region (single-token wildcard)' }, { id: 'wildcard-multi', desc: 'subscribe to orders.> to catch the whole hierarchy (multi-token wildcard)' }],
    cli: [{ file: 'wildcard-single.sh', desc: 'nats sub "orders.*.created"' }, { file: 'wildcard-multi.sh', desc: 'nats sub "orders.>"' }],
    defers: 'subject-based security -> /learn/security; interest routing across servers -> /learn/topologies/super-clusters',
    visual: '<div class="nats-flow" data-scenario="subjectsWildcardAnimated" data-width="700" data-height="450"></div>' },

  { slug: 'request-reply', num: 3, pos: 4, title: 'Request-reply',
    teaches: 'TWO concepts: (1) the _INBOX mechanism — the client subscribes to a unique reply subject and includes it with the request, the responder replies to it; (2) request timeouts and the no-responders (503) signal that fires immediately when nothing is subscribed. Build the inventory service answering on orders.inventory.check. One line on request headers.',
    stateIn: 'Pub/sub and wildcards understood.', stateOut: 'An inventory service answers request-reply calls; the reader understands inboxes, timeouts, and no-responders.',
    needs: ['C_REQREPLY'],
    snippets: [{ id: 'respond', desc: 'the inventory service: subscribe to orders.inventory.check and respond to each request' }, { id: 'request', desc: 'send a request to orders.inventory.check with a timeout and read the reply' }],
    cli: [{ file: 'reply.sh', desc: 'nats reply orders.inventory.check (the inventory service)' }, { file: 'request.sh', desc: 'nats req orders.inventory.check with the order payload and a timeout' }],
    defers: 'request headers detail -> /reference/; the Services framework -> /learn/services',
    visual: '<div class="nats-flow" data-scenario="requestReply" data-width="800" data-height="350"></div>' },

  { slug: 'queue-groups', num: 4, pos: 5, title: 'Queue groups',
    teaches: 'TWO concepts: (1) a queue group — subscribers sharing a queue group name, where each message goes to exactly one (randomly chosen) member; (2) a queue group coexists with plain subscribers on the same subject (plain subs still get every message), and membership is dynamic. Add a packers pool (queue group name "packers") on orders.created.',
    stateIn: 'One subscriber per service.', stateOut: 'A packers queue group load-balances orders.created while analytics still sees every message as a plain subscriber.',
    needs: ['C_QUEUE'],
    snippets: [{ id: 'queue-subscribe', desc: 'subscribe to orders.created in the "packers" queue group (run several copies to see load balancing)' }],
    cli: [{ file: 'queue-subscribe.sh', desc: 'nats sub orders.created --queue packers (run in several terminals)' }],
    defers: 'geo-affinity across regions -> /learn/topologies/super-clusters; durable work queues -> /learn/jetstream',
    visual: '<div class="nats-flow" data-scenario="queueGroupAnimated" data-width="600" data-height="350"></div>' },

  { slug: 'scatter-gather', num: 5, pos: 6, title: 'Scatter-gather',
    teaches: 'TWO concepts: (1) one request fanned out to many responders (NO queue group) yields many replies; (2) gathering them — subscribe to the inbox yourself and collect replies by count or deadline instead of taking the first. Query three shipping-quote providers on shipping.quote and pick the cheapest.',
    stateIn: 'Request-reply (single reply) understood.', stateOut: 'Three shipping-quote providers answer one request; the client gathers all replies within a deadline.',
    needs: ['C_SCATTER', 'C_REQREPLY'],
    snippets: [{ id: 'provider', desc: 'a shipping-quote provider: reply to shipping.quote with a quote (run three with different prices)' }, { id: 'gather', desc: 'send one request to shipping.quote and collect all replies until a deadline, then pick the cheapest' }],
    cli: [{ file: 'provider.sh', desc: 'nats reply shipping.quote with a quote (run three)' }, { file: 'gather.sh', desc: 'nats req shipping.quote --replies 3 (or a deadline) to gather multiple replies' }],
    defers: 'request-many client helpers -> /reference/; aggregation services -> /learn/services',
    visual: '<div class="nats-flow" data-scenario="requestReplyScatterGather" data-width="800" data-height="450"></div>' },

  { slug: 'where-next', num: 6, pos: 7, title: 'Where to go next',
    teaches: 'A short navigation page. Recap: subjects + interest + reply subjects + queue groups = all of core NATS. The one thing core does NOT do is remember — that is JetStream. Point to JetStream, Services, Resilient Clients, Topologies, Security, and Reference. May be shorter than 150 lines (80+ is fine).',
    stateIn: 'Whole chapter complete.', stateOut: 'None.',
    needs: [], snippets: [], cli: [], defers: '', visual: '',
    links: 'Point to: /learn/jetstream (+ /learn/jetstream/why-a-stream), /learn/services, /learn/resilient-clients, /learn/topologies/super-clusters, /learn/security, /reference/protocols/client, and /concepts/pub-sub-basics.' },
]

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const WRITE_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['slug', 'path', 'snippetIds', 'cliFiles', 'conceptsIntroduced', 'approxLines'],
  properties: {
    slug: { type: 'string' }, path: { type: 'string' },
    snippetIds: { type: 'array', items: { type: 'string' } },
    cliFiles: { type: 'array', items: { type: 'string' } },
    conceptsIntroduced: { type: 'array', items: { type: 'string' } },
    approxLines: { type: 'number' },
    notes: { type: 'string' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['slug', 'pass', 'lockfileViolations', 'issues', 'factErrors', 'badLinks', 'boundaryViolations'],
  properties: {
    slug: { type: 'string' }, pass: { type: 'boolean' },
    lockfileViolations: { type: 'array', items: { type: 'string' } },
    factErrors: { type: 'array', items: { type: 'string' } },
    badLinks: { type: 'array', items: { type: 'string' }, description: 'links outside the allow-list / fabricated paths' },
    boundaryViolations: { type: 'array', items: { type: 'string' }, description: 'places the page teaches JetStream/persistence/resilience/geo as if it were core NATS, or uses JetStream vocabulary, or references a non-existent data-scenario' },
    issues: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { severity: { type: 'string' }, location: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } } },
  },
}
const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['continuityIssues', 'lockfileHits', 'linkIssues', 'verdict'],
  properties: {
    continuityIssues: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { pages: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } } },
    lockfileHits: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { file: { type: 'string' }, term: { type: 'string' }, line: { type: 'string' } } } },
    linkIssues: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
  },
}

// ===========================================================================
// RUN
// ===========================================================================
phase('Research')
const researchResults = await parallel(DOMAINS.map((d) => () =>
  agent(
    'Research NATS core-messaging facts for the domain "' + d.key + '". Focus: ' + d.focus + '\n\n' + MCP_HINT +
    '\n\nTreat legacy nats.docs prose as a hint only; nats-server source + the client protocol reference + official tool docs are the source of truth. ' +
    'Return a precise, citeable fact sheet: exact behavior + defaults, exact CLI flags, client-library notes (nats.go/nats.rs _INBOX + request-many), gotchas, See-also link candidates (allow-list paths), real example URLs you retrieved, and snippet ideas. Be exhaustive and correct — downstream writers trust this verbatim.',
    { label: 'research:' + d.key, phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'Explore' }
  ).then((r) => (r ? { ...r, key: d.key } : null))
))
const pack = {}
for (const r of researchResults.filter(Boolean)) pack[r.key] = r
log('Research done: ' + Object.keys(pack).length + '/' + DOMAINS.length + ' fact sheets assembled')

// ---------------------------------------------------------------------------
phase('Write+Review+Fix')
const PAGE_TABLE = PAGES.map((p) => p.num + '. ' + p.title + ' (/learn/core-nats/' + p.slug + ')').join('\n')

const results = await pipeline(
  PAGES,
  // STAGE 1 — write
  (page) => {
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      CONTRACT,
      '',
      '=== FULL CHAPTER PAGE LIST (for correct cross-links / "what is next") ===',
      PAGE_TABLE,
      '',
      '=== THIS PAGE ===',
      'slug: ' + page.slug,
      'file to write: ' + CN_DIR + '/' + page.slug + '.md',
      page.isIndex ? 'title: "Core NATS Deep Dive" (index page — mirror learn/jetstream/index.md shape; list the content pages and what the reader builds)' : 'title: "' + page.num + '. ' + page.title + '"',
      'sidebar_position: ' + page.pos,
      'TEACHES: ' + page.teaches,
      'SESSION STATE entering this page: ' + page.stateIn,
      'SESSION STATE leaving this page: ' + page.stateOut,
      'DEFERS / LINKS OUT: ' + (page.defers || '(nothing major)'),
      page.links ? 'LINKS: ' + page.links : '',
      page.visual ? 'VISUAL: embed this EXISTING NatsFlow scenario where it best fits:\n' + page.visual : '',
      '',
      'nats-example divs to emit (one div + one CLI .sh each):',
      page.snippets.length ? page.snippets.map((s) => '  - data-type="learn-core-nats-' + page.slug + '-' + s.id + '"  (' + s.desc + ')  => CLI file ' + CLI_DIR + '/' + page.slug + '/' + s.id + '.sh').join('\n') : '  (none — this page is conceptual)',
      page.cli.length ? '\nCLI .sh files to author:\n' + page.cli.map((c) => '  - ' + CLI_DIR + '/' + page.slug + '/' + c.file + '  (' + c.desc + ')').join('\n') : '',
      '',
      '=== VERIFIED FACT PACK (authoritative — do not contradict) ===',
      JSON.stringify(relevant, null, 1),
      '',
      'NOW: (1) Read the spec + the relevant concept page(s) + 3 JetStream exemplars + CLAUDE.md. (2) Write the .md with the Write tool (go DEEPER than concepts; nats-example divs for client snippets; reuse only the listed existing NatsFlow scenario). (3) Write each CLI .sh (start with #!/bin/bash, real commands). Respect the EPHEMERAL boundary (no JetStream vocabulary). Stay inside the link allow-list. No leaked tool tags. Return the structured result.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'write:' + page.slug, phase: 'Write+Review+Fix', schema: WRITE_SCHEMA })
  },
  // STAGE 2 — review
  (writeRes, page) => {
    if (!writeRes) return null
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      'Adversarially review the Learn page just written at ' + CN_DIR + '/' + page.slug + '.md (Read it).',
      'Also Read one exemplar for the target voice: ' + EXEMPLARS[0],
      'Also Read the matching concept page to ensure the deep dive is DEEPER, not a duplicate: ' + ROOT + '/docs/concepts/',
      '',
      'Check HARD and report every failure:',
      '1. WORDING LOCKFILE — flag any banned term: topic/channel for subject; send/listen for publish/subscribe; producer/consumer for publisher/subscriber; "queue"/"worker group"/"consumer group" for queue group; callback-subject for inbox; star/greater-than in body for the wildcards; event/packet for message.',
      '2. BOUNDARY — flag (as boundaryViolation) any place the page TEACHES persistence/durability/redelivery/reconnection/geo-affinity/services-framework instead of naming the gap + linking out, OR uses JetStream vocabulary (stream/consumer/ack/persisted/stored/durable/redelivered/exactly-once) as if it applied to core NATS, OR embeds a data-scenario NOT in this set: ' + ALLOWED_SCENARIOS.join(', ') + '.',
      '3. DEPTH — flag (as an issue) if the page reads like the concept primer (no added mechanism/runnable step/trade-off beyond /concepts).',
      '4. <=2 NEW concepts. List them; if >2, flag it.',
      '5. "## See also" exists with 1-3 links.',
      '6. LINK ALLOW-LIST — flag ANY internal link not in: /reference/protocols/client, /reference/ root; /concepts/{pub-sub-basics,subjects,request-reply,queue-groups,jetstream,topologies,security,what-is-nats}; /learn/core-nats/<slug>, /learn/jetstream(+why-a-stream), /learn/services(+your-first-service), /learn/resilient-clients(+reconnection,slow-consumers), /learn/topologies/super-clusters, /learn/security.',
      '7. Frontmatter: id/title/sidebar_position(' + page.pos + ')/description present and correct' + (page.isIndex ? ' (title "Core NATS Deep Dive").' : ' (title "' + page.num + '. ' + page.title + '").'),
      '8. EXAMPLES: each nats-example div has data-type="learn-core-nats-' + page.slug + '-<snippet>" AND a matching CLI .sh under ' + CLI_DIR + '/' + page.slug + '/. Two-terminal demos are plain bash blocks. Any hand Tabs has CLI first + default + groupId="lang".',
      '9. LENGTH 150-400 lines (index/where-next may be 80+).',
      '10. SCENARIO STATE matches — entering: "' + page.stateIn + '"; leaving: "' + page.stateOut + '". Service names (warehouse/notifications/analytics, inventory, packers, shipping-quote) + the acme-co payload match the pinned scenario.',
      '11. FACTUAL ACCURACY vs the fact pack below — wrong flags, wrong max_payload default, wrong wildcard rules, or wrong no-responders behavior = factError.',
      '12. OUTPUT HYGIENE — flag any literal </content> or </invoke> or other tool tags in the file.',
      '',
      '=== FACT PACK ===',
      JSON.stringify(relevant, null, 1),
      '',
      'Return the structured verdict. pass=true ONLY if zero high-severity issues, zero lockfile violations, zero factErrors, zero badLinks, zero boundaryViolations.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'review:' + page.slug, phase: 'Write+Review+Fix', schema: REVIEW_SCHEMA, agentType: 'Explore' })
      .then((rev) => ({ rev, writeRes }))
  },
  // STAGE 3 — fix
  (stage2, page) => {
    if (!stage2) return { slug: page.slug, status: 'write-failed' }
    const { rev, writeRes } = stage2
    const clean = rev && rev.pass &&
      (rev.issues || []).filter((i) => i.severity === 'high').length === 0 &&
      (rev.lockfileViolations || []).length === 0 &&
      (rev.factErrors || []).length === 0 &&
      (rev.badLinks || []).length === 0 &&
      (rev.boundaryViolations || []).length === 0
    if (clean) return { slug: page.slug, status: 'clean', path: writeRes.path, approxLines: writeRes.approxLines }
    const prompt = [
      'Apply these review fixes to ' + CN_DIR + '/' + page.slug + '.md (and its CLI files if a CLI issue is listed). Read the file, Edit it, keep the voice and verified facts. Introduce no new lockfile violations, no links outside the allow-list, no JetStream vocabulary, and no data-scenario outside the allowed set. Remove any leaked tool tags.',
      '',
      'Lockfile violations: ' + JSON.stringify(rev.lockfileViolations || []),
      'Boundary violations: ' + JSON.stringify(rev.boundaryViolations || []),
      'Fact errors: ' + JSON.stringify(rev.factErrors || []),
      'Bad links: ' + JSON.stringify(rev.badLinks || []),
      'Issues: ' + JSON.stringify(rev.issues || []),
      '',
      'After editing, briefly confirm what you changed.',
    ].join('\n')
    return agent(prompt, { label: 'fix:' + page.slug, phase: 'Write+Review+Fix' })
      .then((summary) => ({ slug: page.slug, status: 'fixed', path: writeRes.path, approxLines: writeRes.approxLines, fixSummary: summary }))
  }
)

// ---------------------------------------------------------------------------
phase('Continuity')
const written = results.filter(Boolean)
const critic = await agent(
  'You are the whole-chapter continuity critic for the Core NATS Learn deep dive in ' + CN_DIR + '.\n' +
  'Pages: ' + PAGES.map((p) => p.slug).join(', ') + '.\n\n' +
  'Do these checks across the WHOLE chapter (use Grep/Read across ' + CN_DIR + '):\n' +
  '1. WORDING LOCKFILE — grep every page for banned terms (topic/channel, send/listen for pub/sub, producer/consumer, "queue"/"worker group"/"consumer group" for queue group, callback-subject).\n' +
  '2. BOUNDARY — grep for JetStream vocabulary used as if it were core NATS (stream/consumer/ack/persisted/stored/durable/redelivered/exactly-once), and for any data-scenario name NOT in {' + ALLOWED_SCENARIOS.join(', ') + '}. Report file + line.\n' +
  '3. SCENARIO CONTINUITY — the Acme ORDERS world is consistent: subjects orders.created/shipped/cancelled (+ orders.us.* on the wildcards page), services warehouse/notifications/analytics, inventory service on orders.inventory.check, packers queue group, shipping.quote providers, acme-co payload; no page assuming a service a later page only introduces.\n' +
  '4. INTERNAL LINKS — every (/learn/...), (/concepts/...), (/reference/...) target is in the allow-list, and each "## What is next" has a clickable link to the correct next slug (index->publish-subscribe->subjects-and-wildcards->request-reply->queue-groups->scatter-gather->where-next).\n' +
  '5. OUTPUT HYGIENE — grep for any literal </content> or </invoke> tags in the pages and report them.\n' +
  'Return the structured punch list. Be specific (file + line + fix).',
  { label: 'critic:chapter', phase: 'Continuity', schema: CRITIC_SCHEMA, agentType: 'Explore' }
)

const affected = new Set()
for (const h of (critic.lockfileHits || [])) if (h.file) affected.add(h.file)
for (const c of (critic.continuityIssues || [])) { const m = (c.fix || c.problem || c.pages || '').match(/[\w-]+\.md/g); if (m) m.forEach((f) => affected.add(f)) }
const affectedList = [...affected]

let continuityFixes = []
if (affectedList.length) {
  log('Continuity critic flagged ' + affectedList.length + ' file(s); dispatching targeted fixes')
  continuityFixes = await parallel(affectedList.map((f) => () =>
    agent(
      'Fix continuity/lockfile/link/boundary/hygiene problems in ' + CN_DIR + '/' + (f.includes('/') ? f.split('/').pop() : f) + '. Read it, apply only the relevant items below, preserve voice + verified facts, introduce no new lockfile violations, no links outside the allow-list, no JetStream vocabulary, and remove any leaked tool tags.\n\n' +
      'Lockfile hits: ' + JSON.stringify((critic.lockfileHits || []).filter((h) => (h.file || '').includes(f.replace('.md', '')))) + '\n' +
      'Continuity issues mentioning it: ' + JSON.stringify((critic.continuityIssues || []).filter((c) => (JSON.stringify(c)).includes(f.replace('.md', '')))) + '\n' +
      'Link issues: ' + JSON.stringify(critic.linkIssues || []),
      { label: 'fix:' + f, phase: 'Continuity' }
    )
  ))
}

return {
  pagesWritten: written.map((w) => ({ slug: w.slug, status: w.status, lines: w.approxLines })),
  researchDomains: Object.keys(pack),
  natsflow: 'reused existing scenarios (no new components)',
  criticVerdict: critic.verdict,
  lockfileHits: critic.lockfileHits || [],
  continuityIssues: critic.continuityIssues || [],
  linkIssues: critic.linkIssues || [],
  continuityFilesFixed: affectedList,
}
