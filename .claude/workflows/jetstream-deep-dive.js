export const meta = {
  name: 'jetstream-deep-dive',
  description: 'Research + write 15 JetStream deep-dive Learn pages (+CLI snippets), review, verify continuity',
  phases: [
    { title: 'Research', detail: '10 fact-domains: dig nats-server, ADR-42/59, natscli, nats.go/nats.rs, schemas' },
    { title: 'Write+Review+Fix', detail: 'per page: write .md + CLI .sh, adversarial review, apply fixes' },
    { title: 'Continuity', detail: 'whole-chapter lockfile + scenario-state + link critic, then targeted fixes' },
  ],
}

// ---------------------------------------------------------------------------
// Shared paths
// ---------------------------------------------------------------------------
const ROOT = '.' // repo root — run from the repository checkout
const JS_DIR = ROOT + '/learn/jetstream'
const CLI_DIR = ROOT + '/static/examples/snippets/cli/learn/jetstream'
const SPEC = ROOT + '/specs/2026-05-22-jetstream-deep-dive-design.md'
const EXEMPLARS = [JS_DIR + '/why-a-stream.md', JS_DIR + '/your-first-stream.md', JS_DIR + '/publishing.md']

// ---------------------------------------------------------------------------
// The authoring contract every writer must obey (spec §5–6 distilled)
// ---------------------------------------------------------------------------
const CONTRACT = [
  'You are writing one page of the NATS "JetStream deep dive" Learn chapter (Rust-book style).',
  '',
  'BEFORE writing, Read these for voice + facts (do not skip):',
  '  - Design spec: ' + SPEC,
  '  - Three gold-standard already-written pages (match their voice EXACTLY): ' + EXEMPLARS.join(', '),
  '  - Project rules: ' + ROOT + '/CLAUDE.md',
  '',
  'RUNNING SCENARIO (pinned, identical across every page and language):',
  '  Stream ORDERS captures subjects orders.created, orders.shipped, orders.cancelled (subject filter orders.>).',
  '  Canonical message JSON shape: {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}',
  '  No page invents a different payload. Carry CLI session state forward (do not reset the stream).',
  '',
  'WORDING LOCKFILE (same word for same thing; NEVER use the banned terms):',
  '  stream (not "JetStream stream"/"topic"/"channel"); consumer (not "subscription"/"subscriber");',
  '  message (not "event"/"record" outside domain prose); ack — first intro as "acknowledgment", then "ack";',
  '  "pull consumer"/"push consumer" always two lowercase words; "Reference" for the reference docs section;',
  '  publish (not "send" — reserve send for core NATS); "stored in the stream" (not "saved"/"persisted").',
  '',
  'VOICE RULES (hard):',
  '  - ONE teaching thought per paragraph. If two ideas joined by "and", split them.',
  '  - Define-then-use: never use a term before its own paragraph in this or a prior page.',
  '  - <=2 NEW concepts per page. A third goes to a later page or to Reference.',
  '  - Active voice, present tense. NO filler ("it is important to note", "basically", "essentially", "simply").',
  '  - Length 150-400 source lines (frontmatter+prose+code). Hard cap 400; split-worthy content goes to Reference.',
  '',
  'FRONTMATTER (exact shape, match exemplars):',
  '  id: <slug>',
  '  title: "<NUM>. <Title>"   (e.g. "7. Acknowledgment")',
  '  sidebar_position: <POS>',
  '  description: <one line>',
  '  H1 in body is "# <NUM>. <Title>".',
  '',
  'EXAMPLE PATTERN (follow CLAUDE.md + spec §6):',
  '  - Default for any non-trivial snippet: an HTML div exactly like:',
  '      <div class="nats-example" data-type="learn-jetstream-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>',
  '  - For each nats-example div you emit, ALSO author the CLI source file so CLI renders today:',
  '      ' + CLI_DIR + '/<slug>/<snippet>.sh   (starts with #!/bin/bash, real nats CLI commands, committable).',
  '      The path dirs join with dashes to form the data-type: cli/learn/jetstream/<slug>/<snippet>.sh => learn-jetstream-<slug>-<snippet>. Verify this matches your div.',
  '  - CLI-ONLY commands (server start, nats stream info / consumer info output) = a plain fenced bash block, NOT a div and NOT a Tabs block. Use the bash language tag.',
  '  - If you ever hand-write a Tabs block: import Tabs/TabItem at top, groupId="lang", CLI TabItem FIRST with default, language order CLI,JS,Go,Python,Java,Rust,C#. Prefer the div over hand Tabs.',
  '',
  'REFERENCE HANDOFF (greppable, verbatim where applicable):',
  '  "The full set of <X> options is documented in [Reference -> <Path>](/reference/...). We use only <Y> here."',
  '  End every page with a "## See also" section: 1-3 reference/Learn links, HARD max 3.',
  '',
  'NAVIGATION: include a short "## Where you are" (recap state) near the end and a "## What is next" pointer to the next page, like the exemplars.',
  '',
  'ACCURACY: every CLI flag, config field name, default value, and header name MUST be verified against the research fact pack you are given (and, if unsure, against natscli / nats-server source via the nats-mcp tools). Do not invent flags. If the fact pack flags a feature as "not implemented" or version-bound, honor that exactly.',
].join('\n')

// ---------------------------------------------------------------------------
// Phase 1 — research fact domains
// ---------------------------------------------------------------------------
const RESEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['key', 'summary', 'cliCommands', 'configFields', 'gotchas', 'referencePaths'],
  properties: {
    key: { type: 'string' },
    summary: { type: 'string' },
    cliCommands: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { command: { type: 'string' }, explanation: { type: 'string' } } } },
    configFields: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { name: { type: 'string' }, type: { type: 'string' }, default: { type: 'string' }, meaning: { type: 'string' }, versionNote: { type: 'string' } } } },
    clientNotes: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { lang: { type: 'string' }, note: { type: 'string' } } } },
    gotchas: { type: 'array', items: { type: 'string' } },
    referencePaths: { type: 'array', items: { type: 'string' }, description: '/reference/... paths suitable for See-also links' },
    snippetIdeas: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { id: { type: 'string' }, description: { type: 'string' } } } },
  },
}

const MCP_HINT = 'Load and use the nats-mcp tools first: ToolSearch("select:mcp__nats-mcp__get_adr,mcp__nats-mcp__find_equivalent,mcp__nats-mcp__show_type,mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_schema,mcp__nats-mcp__get_repos_path"). Cross-check the natscli repo for EXACT CLI flag spellings and nats-server for field names/defaults. Pull client API specifics from nats.go and nats.rs. Cite ADRs by number where relevant.'

const DOMAINS = [
  { key: 'R_STREAMCFG', focus: 'Stream retention + limits. Retention policies Limits/Interest/WorkQueue (semantics + when each). Discard policy Old vs New. MaxAge, MaxBytes, MaxMsgs, MaxMsgsPerSubject, MaxMsgSize. Their defaults and what each does under pressure. The exact `nats stream add`/`nats stream edit` flags.' },
  { key: 'R_STORAGE_REPL', focus: 'Storage type File vs Memory (durability tradeoff). Replicas R1/R3/R5, RAFT, what "the stream has a leader" means for writes and reads, why R1 is dangerous and R3 is the prod floor. Consumer replicas + consumer memory storage and their implications. Exact replica/storage flags.' },
  { key: 'R_MIRRORS', focus: 'Stream mirrors and sources (read ADR-59). Mirror = exact read-only copy of one stream; sources = aggregate many streams into one. Use cases: read scaling, geo, aggregation, archiving. Config fields (mirror, sources, with filters/subject transforms). Exact CLI flags for creating a mirror/source.' },
  { key: 'R_TTL', focus: 'Per-message TTL. The Nats-TTL header, AllowMsgTTL stream setting, subject-delete-markers / SubjectDeleteMarkerTTL, interaction with MaxAge. Which server version introduced it (2.11+). Find the relevant ADR if one exists. Exact CLI/header usage.' },
  { key: 'R_ACK', focus: 'Consumer acknowledgment. The four client responses: ack, nak (with optional delay), term, in-progress — what each does. AckPolicy explicit/all/none. AckWait + redelivery timing. MaxDeliver + backoff arrays. ReplayPolicy instant vs original. DeliverPolicy all/last/new/by_start_sequence/by_start_time/last_per_subject. The durable cursor concept. Exact field names + CLI flags.' },
  { key: 'R_PULL', focus: 'Pull consumer mechanics. fetch (batch) vs consume (continuous) in client libraries. Pull request knobs: batch / max_messages, expires, max_bytes, idle heartbeat, no_wait. MaxAckPending as the in-flight ceiling and flow-control mechanism. How multiple pulling clients on ONE consumer share work. Exact field names + CLI (nats consumer next) flags.' },
  { key: 'R_PRIORITY', focus: 'Pull Consumer Priority Groups — READ ADR-42 in full. PriorityGroups + PriorityPolicy on ConsumerConfig (pull-only). Three policies: overflow (min_pending/min_ack_pending/failover), pinned_client (Nats-Pin-Id header, 423 responses, $JS.API.CONSUMER.UNPIN, PriorityTimeout), prioritized (priority 0-9 on pulls). CRITICAL: note that `failover` is NOT implemented as of NATS 2.14 (server silently ignores it). Client API in nats.go AND nats.rs AND natscli. Advisories (consumer_group_pinned/unpinned).' },
  { key: 'R_PAUSE', focus: 'Consumer pause/resume. The pause API ($JS.API.CONSUMER.PAUSE), PauseUntil timestamp, what pausing does (stops delivery, keeps consumer state + cursor), how to resume, the `nats consumer pause`/`resume` CLI. Which version introduced it. Use cases (maintenance, backpressure).' },
  { key: 'R_PUSHPULL', focus: 'Push vs pull consumers. What a push consumer is (DeliverSubject, flow control, idle heartbeat, deliver group). Why pull is the modern default/recommended. Current status of push consumers (deprecated? still supported?). When push still makes sense. Migration guidance.' },
  { key: 'R_FILTER_REPLAY', focus: 'Consumer subject filtering + replaying stored messages. FilterSubject (single) and FilterSubjects (multiple, server 2.10+). Subject transforms. Ephemeral vs durable consumers. Reading stored messages back with an ephemeral consumer from the start of the stream (DeliverPolicy all), with no acks. nats stream view / nats consumer next CLI. OrderedConsumer mention.' },
]

// ---------------------------------------------------------------------------
// Phase 2 — the 15 pages to write (3 are already done: why-a-stream/your-first-stream/publishing)
// ---------------------------------------------------------------------------
const PAGES = [
  { slug: 'reading-back', num: 4, pos: 5, title: 'Reading back the stream',
    teaches: 'Use an ephemeral consumer to replay everything stored, from the start, with no acks yet. Streams are not topics — you can re-read whenever.',
    stateIn: 'ORDERS has 3 stored orders (seq 1-3: two orders.created, one orders.shipped).', stateOut: 'Unchanged. Reader has replayed all 3 from the beginning.',
    needs: ['R_FILTER_REPLAY', 'R_ACK'],
    snippets: [{ id: 'replay', desc: 'ephemeral consumer reading all messages from start of stream, no ack' }],
    cli: [{ file: 'replay.sh', desc: 'nats stream view / ephemeral nats consumer reading ORDERS from seq 1' }],
    defers: 'DeliverPolicy variants + ordered consumers -> Reference: Consumer Configuration', visual: '' },

  { slug: 'your-first-consumer', num: 5, pos: 6, title: 'Your first consumer',
    teaches: 'Create a durable pull consumer `shipping` with explicit ack. The ack -> redeliver loop: a message stays in flight until acked, redelivered after a timeout if not. The durable cursor.',
    stateIn: '3 orders stored, no durable consumer.', stateOut: 'Durable pull consumer `shipping` exists on ORDERS, AckPolicy=explicit.',
    needs: ['R_ACK', 'R_PULL'],
    snippets: [{ id: 'pullAndAck', desc: 'pull one message from shipping consumer and ack it' }],
    cli: [{ file: 'create.sh', desc: 'nats consumer add ORDERS shipping --pull --ack=explicit' }, { file: 'next.sh', desc: 'nats consumer next ORDERS shipping --ack' }],
    defers: 'push consumers + every ack type -> Reference: Consumer API',
    visual: '<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="380"></div>' },

  { slug: 'filtering', num: 6, pos: 7, title: 'Filtering what you consume',
    teaches: 'Add an `analytics` consumer with filter orders.shipped. Two consumers read the same stream at independent positions. A filter is the cheap fan-out tool; consumers are independent views.',
    stateIn: '`shipping` consumer in play.', stateOut: 'Two consumers on ORDERS: `shipping` (all) and `analytics` (orders.shipped only).',
    needs: ['R_FILTER_REPLAY'],
    snippets: [{ id: 'createFiltered', desc: 'create analytics consumer with FilterSubject orders.shipped' }],
    cli: [{ file: 'create-filtered.sh', desc: 'nats consumer add ORDERS analytics --filter "orders.shipped" --pull' }],
    defers: 'multiple filter subjects + subject transform -> Reference: Consumer Configuration', visual: '' },

  { slug: 'acknowledgment', num: 7, pos: 8, title: 'Acknowledgment',
    teaches: 'TWO concepts only: (1) the four client responses — ack, nak (with delay), term, in-progress; (2) the server-side controls — AckWait, MaxDeliver, backoff. Mention AckPolicy (explicit/all/none) and ReplayPolicy briefly and defer detail to Reference.',
    stateIn: '`shipping` consumer, AckPolicy=explicit.', stateOut: 'Same consumer, now understood with AckWait + MaxDeliver + a poison-message (term) path.',
    needs: ['R_ACK'],
    snippets: [{ id: 'nakWithDelay', desc: 'process fails, nak with a delay so redelivery is backed off' }, { id: 'termPoison', desc: 'unprocessable message: term so it is never redelivered' }],
    cli: [{ file: 'ack-wait.sh', desc: 'nats consumer add/edit showing --ack=explicit --wait and --max-deliver' }],
    defers: 'exact ack reply protocol + every ack type -> Reference: Consumer API; backoff arrays -> Reference: Consumer Configuration', visual: '' },

  { slug: 'pull-consumers', num: 8, pos: 9, title: 'Pull consumers in depth',
    teaches: 'TWO concepts: (1) fetch (a batch now) vs consume (a continuous flow); (2) the knobs that bound a pull — batch size, expires, max_bytes, idle heartbeat — and MaxAckPending as the in-flight ceiling.',
    stateIn: '`shipping` consumer.', stateOut: 'Same. Reader can tune throughput vs latency on a pull consumer.',
    needs: ['R_PULL'],
    snippets: [{ id: 'fetchBatch', desc: 'fetch a batch of N with an expiry' }, { id: 'consumeContinuous', desc: 'continuous consume loop with ack' }],
    cli: [{ file: 'fetch.sh', desc: 'nats consumer next ORDERS shipping --count N' }],
    defers: 'no_wait + exact pull request fields -> Reference: Consumer API', visual: '' },

  { slug: 'worker-pool', num: 9, pos: 10, title: 'A pool of workers',
    teaches: 'Three workers pull from the SAME `shipping` consumer (share by name). Work distribution at the consumer level (contrast with core NATS queue groups). In-flight redelivery when a worker crashes mid-process. MaxAckPending caps total concurrency.',
    stateIn: 'one `shipping` consumer.', stateOut: 'three workers sharing `shipping`.',
    needs: ['R_PULL'],
    snippets: [{ id: 'worker', desc: 'a worker loop: pull, process, ack — run three copies' }],
    cli: [{ file: 'worker.sh', desc: 'loop calling nats consumer next ORDERS shipping --ack (run in 3 terminals)' }],
    defers: 'AckWait tuning + backoff arrays -> Reference: Consumer Configuration', visual: '' },

  { slug: 'priority-groups', num: 10, pos: 11, title: 'Priority groups',
    teaches: 'TWO concepts: (1) what a priority group is (PriorityGroups + PriorityPolicy on a pull consumer; every pull names its group); (2) the three policies and the problem each solves — overflow, pinned_client, prioritized. This page MAY reach 400 lines. MUST cite ADR-42.',
    stateIn: '`shipping` consumer + worker pool understood.', stateOut: 'A priority-group consumer demonstrated (overflow and pinned_client shown).',
    needs: ['R_PRIORITY', 'R_PULL'],
    snippets: [{ id: 'overflowPull', desc: 'overflow policy: a standby region pulls only above a min_pending threshold' }, { id: 'pinnedClient', desc: 'pinned_client policy: one active client, Nats-Pin-Id handling, failover to standby' }],
    cli: [{ file: 'priority-overflow.sh', desc: 'create consumer with --priority-policy overflow / group + a pull with min-pending (use exact natscli flags)' }, { file: 'priority-pinned.sh', desc: 'create pinned_client consumer + nats consumer unpin' }],
    defers: 'pinned/unpinned advisories + exact 423 protocol + PriorityGroupState fields -> Reference: Consumer API & JetStream Advisories',
    visual: '', mustCite: 'ADR-42', critical: 'The `failover` option is NOT implemented as of NATS 2.14 — the server silently ignores it. Present it as designed-but-not-yet-shipped, never as working. Multiple priority groups per consumer are not yet supported (one group only).' },

  { slug: 'pausing', num: 11, pos: 12, title: 'Pausing a consumer',
    teaches: 'TWO concepts: (1) pausing a consumer stops delivery until a timestamp while keeping all state and the cursor; (2) resuming. Use cases: maintenance windows, deliberate backpressure.',
    stateIn: '`shipping` consumer.', stateOut: '`shipping` paused until a time, then resumed.',
    needs: ['R_PAUSE'],
    snippets: [{ id: 'pauseResume', desc: 'pause a consumer until a timestamp, then resume' }],
    cli: [{ file: 'pause.sh', desc: 'nats consumer pause ORDERS shipping <until>' }, { file: 'resume.sh', desc: 'nats consumer resume ORDERS shipping' }],
    defers: 'exact PauseUntil API + pause advisory -> Reference: Consumer API', visual: '' },

  { slug: 'push-vs-pull', num: 12, pos: 13, title: 'Push vs pull',
    teaches: 'Mostly conceptual + a decision table. Pull is the modern default and why. What a push consumer is (DeliverSubject, server-driven flow control). When push still makes sense. Note push consumer status (legacy/maintained). Keep code light.',
    stateIn: '`shipping` is a pull consumer.', stateOut: 'No new scenario state. Reader can choose pull vs push deliberately.',
    needs: ['R_PUSHPULL'],
    snippets: [],
    cli: [{ file: 'push-create.sh', desc: 'nats consumer add with --target (push) for contrast — optional, CLI-only' }],
    defers: 'push flow control + deliver group -> Reference: Consumer Configuration', visual: '' },

  { slug: 'shaping-the-stream', num: 13, pos: 14, title: 'Shaping the stream',
    teaches: 'TWO concepts: (1) the size/age limits — MaxAge, MaxBytes, MaxMsgs; (2) Discard policy Old vs New, i.e. what happens when a limit is hit. Update ORDERS to 7-day retention. Limits make a stream a finite, managed resource.',
    stateIn: 'ORDERS with unlimited defaults.', stateOut: 'ORDERS capped: MaxAge 7 days (and a byte ceiling).',
    needs: ['R_STREAMCFG'],
    snippets: [{ id: 'setLimits', desc: 'set MaxAge/MaxBytes on ORDERS' }],
    cli: [{ file: 'set-limits.sh', desc: 'nats stream edit ORDERS --max-age=7d --max-bytes=...' }],
    defers: 'per-subject limits + MaxMsgsPerSubject -> Reference: Stream Configuration', visual: '' },

  { slug: 'delivery-semantics', num: 14, pos: 15, title: 'Delivery semantics',
    teaches: 'The three retention policies: Limits / Interest / WorkQueue. Pick one per archetype — audit log (Limits), fan-out (Interest), queue (WorkQueue). The trap of trying to switch retention after the fact. Conceptual; ORDERS stays Limits.',
    stateIn: 'ORDERS uses Limits retention.', stateOut: 'Conceptual only; ORDERS stays Limits.',
    needs: ['R_STREAMCFG'],
    snippets: [{ id: 'workQueueCreate', desc: 'create a WorkQueue stream for contrast (separate JOBS stream)' }],
    cli: [{ file: 'workqueue.sh', desc: 'nats stream add JOBS --retention=work for contrast' }],
    defers: 'stream republish + interest/mirror interactions -> Reference: Stream Configuration', visual: '' },

  { slug: 'message-ttl', num: 15, pos: 16, title: 'Per-message TTL',
    teaches: 'TWO concepts: (1) a per-message TTL via the Nats-TTL header makes individual messages expire ahead of the stream MaxAge; (2) the stream must opt in (AllowMsgTTL) and how TTL interacts with MaxAge. 2.11+ feature — state the version, defer specifics to Reference.',
    stateIn: 'ORDERS capped to 7-day MaxAge.', stateOut: 'ORDERS has AllowMsgTTL enabled; a short-lived message demonstrated expiring early.',
    needs: ['R_TTL'],
    snippets: [{ id: 'publishWithTtl', desc: 'publish a message with a Nats-TTL header' }],
    cli: [{ file: 'ttl-publish.sh', desc: 'enable AllowMsgTTL on ORDERS + nats pub with --header Nats-TTL' }],
    defers: 'subject-delete-marker TTL + exact header semantics -> Reference: JetStream Headers & Stream Configuration', visual: '' },

  { slug: 'surviving-node-loss', num: 16, pos: 17, title: 'Surviving node loss',
    teaches: 'TWO concepts: (1) replicas — R=1 is a single point of failure, R=3 is the production floor, and what "the stream has a leader" means for writes and reads; (2) storage durability — File vs Memory, plus consumer replicas/memory storage implications. A single-node demo cannot show R=3 failover — explain conceptually and link the Operate clustering chapter.',
    stateIn: 'ORDERS is R=1, File storage.', stateOut: 'Conceptual; reader knows how/why to set R=3 in a cluster.',
    needs: ['R_STORAGE_REPL'],
    snippets: [],
    cli: [{ file: 'set-replicas.sh', desc: 'nats stream edit ORDERS --replicas=3 (note: needs a 3-node cluster)' }],
    defers: 'placement + tags + account limits -> Operate: Clustering deep dive (/learn/clustering)', visual: '',
    crossLink: 'Link to /learn/clustering (Operate -> Clustering & Replication) for the working cluster walkthrough.' },

  { slug: 'mirrors-and-sources', num: 17, pos: 18, title: 'Mirrors and sources',
    teaches: 'TWO concepts: (1) a mirror is a read-only exact copy of one stream; (2) sources aggregate many streams into one. Use cases: read scaling, geo locality, aggregation, archiving. MUST cite ADR-59. Build an ORDERS-ARCHIVE mirror.',
    stateIn: 'ORDERS exists.', stateOut: 'An ORDERS-ARCHIVE mirror of ORDERS demonstrated.',
    needs: ['R_MIRRORS'],
    snippets: [{ id: 'createMirror', desc: 'create ORDERS-ARCHIVE as a mirror of ORDERS' }],
    cli: [{ file: 'mirror.sh', desc: 'nats stream add ORDERS-ARCHIVE --mirror ORDERS' }],
    defers: 'mirror/source filters + subject transforms + cross-domain -> Reference: Stream Configuration; DR usage -> Operate: Backup & Recovery (/learn/backup-recovery/mirrors-and-sources)',
    visual: '', mustCite: 'ADR-59' },

  { slug: 'where-next', num: 18, pos: 19, title: 'Where to go next',
    teaches: 'A short navigation page. Recap the mental model (stream + consumer + ack = the whole game). Point to sibling Learn chapters and Reference. This page MAY be shorter than 150 lines (80+ is fine).',
    stateIn: 'Whole chapter complete.', stateOut: 'None.',
    needs: [],
    snippets: [],
    cli: [],
    defers: '', visual: '',
    links: 'Point to: /learn/key-value, /learn/object-store, /learn/clustering, /learn/monitoring, /learn/backup-recovery, and the Reference root /reference/.' },
]

// ---------------------------------------------------------------------------
// Schemas for write / review
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
  required: ['slug', 'pass', 'lockfileViolations', 'issues', 'factErrors'],
  properties: {
    slug: { type: 'string' }, pass: { type: 'boolean' },
    lockfileViolations: { type: 'array', items: { type: 'string' } },
    factErrors: { type: 'array', items: { type: 'string' } },
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
    'Research NATS facts for the domain "' + d.key + '". Focus: ' + d.focus + '\n\n' + MCP_HINT +
    '\n\nAlso skim the legacy nats.docs content if present in the repos for wording, but treat code/ADRs as the source of truth. ' +
    'Return a precise, citeable fact sheet: exact CLI commands (real natscli flags), config field names with types/defaults, client-library notes (nats.go + nats.rs specifics), gotchas/footguns, /reference/... paths usable as See-also links, and snippet ideas. Be exhaustive and correct — downstream writers trust this verbatim.',
    { label: 'research:' + d.key, phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'Explore' }
  ).then((r) => (r ? { ...r, key: d.key } : null))
))

const pack = {}
for (const r of researchResults.filter(Boolean)) pack[r.key] = r
log('Research done: ' + Object.keys(pack).length + '/' + DOMAINS.length + ' fact sheets assembled')

phase('Write+Review+Fix')
const PAGE_TABLE = PAGES.map((p) => p.num + '. ' + p.title + ' (/learn/jetstream/' + p.slug + ')').join('\n')

const results = await pipeline(
  PAGES,
  // STAGE 1 — write the page + its CLI snippet files
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
      'file to write: ' + JS_DIR + '/' + page.slug + '.md',
      'title: "' + page.num + '. ' + page.title + '"',
      'sidebar_position: ' + page.pos,
      'TEACHES: ' + page.teaches,
      'SCENARIO STATE entering this page: ' + page.stateIn,
      'SCENARIO STATE leaving this page: ' + page.stateOut,
      'DEFERS TO REFERENCE: ' + (page.defers || '(nothing major)'),
      page.mustCite ? 'MUST cite ' + page.mustCite + ' by number in prose.' : '',
      page.critical ? 'CRITICAL ACCURACY NOTE: ' + page.critical : '',
      page.crossLink ? 'CROSS-LINK: ' + page.crossLink : '',
      page.links ? 'LINKS: ' + page.links : '',
      page.visual ? 'VISUAL: embed this NatsFlow div where it best fits: ' + page.visual : '',
      '',
      'nats-example divs to emit (one div + one CLI .sh file each):',
      page.snippets.length ? page.snippets.map((s) => '  - data-type="learn-jetstream-' + page.slug + '-' + s.id + '"  (' + s.desc + ')  => CLI file ' + CLI_DIR + '/' + page.slug + '/' + s.id + '.sh').join('\n') : '  (none — this page is conceptual / CLI-only)',
      page.cli.length ? '\nAdditional CLI .sh files to author (for div CLI rendering or CLI-only blocks):\n' + page.cli.map((c) => '  - ' + CLI_DIR + '/' + page.slug + '/' + c.file + '  (' + c.desc + ')').join('\n') : '',
      '',
      '=== VERIFIED FACT PACK (authoritative — do not contradict) ===',
      JSON.stringify(relevant, null, 1),
      '',
      'NOW: (1) Read the spec + 3 exemplars + CLAUDE.md. (2) Write the .md file with the Write tool. (3) Write each CLI .sh file (start with #!/bin/bash). Use ONLY verified flags from the fact pack. Return the structured result.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'write:' + page.slug, phase: 'Write+Review+Fix', schema: WRITE_SCHEMA })
  },
  // STAGE 2 — adversarial review of the written page
  (writeRes, page) => {
    if (!writeRes) return null
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      'Adversarially review the Learn page just written at ' + JS_DIR + '/' + page.slug + '.md (Read it).',
      'Also Read one exemplar for the target voice: ' + EXEMPLARS[0],
      '',
      'Check HARD against these and report every failure:',
      '1. WORDING LOCKFILE — flag any banned term: "JetStream stream"/"topic"/"channel" for stream; "subscription"/"subscriber" for consumer; "event"/"record" for message outside domain prose; "send" used for JetStream publish; "saved"/"persisted" for stored; "Pull-Consumer"/"PullConsumer" spellings; "the docs"/"the spec"/"the manual" for Reference.',
      '2. <=2 NEW concepts. List the concepts; if >2, flag it.',
      '3. "## See also" exists with 1-3 links, hard max 3.',
      '4. Frontmatter: id/title("' + page.num + '. ' + page.title + '")/sidebar_position(' + page.pos + ')/description present and correct.',
      '5. CLI examples: every nats-example div has data-type="learn-jetstream-' + page.slug + '-<snippet>" AND a matching CLI .sh under ' + CLI_DIR + '/' + page.slug + '/. CLI-only blocks use the bash tag. Any hand-written Tabs has CLI first + default + groupId="lang".',
      '6. LENGTH 150-400 lines (where-next may be 80+).',
      '7. SCENARIO STATE matches — entering: "' + page.stateIn + '"; leaving: "' + page.stateOut + '". Payload shape and ORDERS subjects must match the pinned scenario.',
      '8. FACTUAL ACCURACY vs the fact pack below — wrong flags, wrong defaults, invented fields, or (for priority-groups) presenting `failover` as working = factError.',
      page.mustCite ? '9. Must cite ' + page.mustCite + ' — flag if missing.' : '',
      '',
      '=== FACT PACK ===',
      JSON.stringify(relevant, null, 1),
      '',
      'Return the structured verdict. pass=true ONLY if zero high-severity issues, zero lockfile violations, zero factErrors.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'review:' + page.slug, phase: 'Write+Review+Fix', schema: REVIEW_SCHEMA, agentType: 'Explore' })
      .then((rev) => ({ rev, writeRes }))
  },
  // STAGE 3 — apply fixes if the review found problems
  (stage2, page) => {
    if (!stage2) return { slug: page.slug, status: 'write-failed' }
    const { rev, writeRes } = stage2
    const clean = rev && rev.pass && (rev.issues || []).filter((i) => i.severity === 'high').length === 0 && (rev.lockfileViolations || []).length === 0 && (rev.factErrors || []).length === 0
    if (clean) return { slug: page.slug, status: 'clean', path: writeRes.path, approxLines: writeRes.approxLines }
    const prompt = [
      'Apply these review fixes to ' + JS_DIR + '/' + page.slug + '.md (and its CLI files if a CLI issue is listed). Read the file, Edit it, keep the voice and the verified facts. Do not introduce lockfile violations.',
      '',
      'Lockfile violations: ' + JSON.stringify(rev.lockfileViolations || []),
      'Fact errors: ' + JSON.stringify(rev.factErrors || []),
      'Issues: ' + JSON.stringify(rev.issues || []),
      '',
      'After editing, briefly confirm what you changed.',
    ].join('\n')
    return agent(prompt, { label: 'fix:' + page.slug, phase: 'Write+Review+Fix' })
      .then((summary) => ({ slug: page.slug, status: 'fixed', path: writeRes.path, approxLines: writeRes.approxLines, fixSummary: summary }))
  }
)

phase('Continuity')
const written = results.filter(Boolean)
const critic = await agent(
  'You are the whole-chapter continuity critic for the JetStream Learn deep dive in ' + JS_DIR + '.\n' +
  'These pages were just written: ' + PAGES.map((p) => p.slug).join(', ') + '.\n' +
  'Plus three pre-existing pages: why-a-stream, your-first-stream, publishing.\n\n' +
  'Do these checks across the WHOLE chapter (use Grep/Read across ' + JS_DIR + '):\n' +
  '1. WORDING LOCKFILE — grep every page for banned terms (topic, channel, subscriber, subscription, "JetStream stream", "send" misused, persisted/saved, Pull-Consumer/PullConsumer). Report file + term + line.\n' +
  '2. SCENARIO CONTINUITY — the ORDERS stream + the pinned JSON payload + consumer names (shipping, analytics) must be consistent page to page; the carried CLI state must not contradict across pages (e.g. a page assuming a consumer that a later page only creates).\n' +
  '3. INTERNAL LINKS — every (/learn/...) and (/reference/...) link target looks sane and "## What is next" points to the correct next slug in the page order.\n' +
  'Return the structured punch list. Be specific (file + line + fix).',
  { label: 'critic:chapter', phase: 'Continuity', schema: CRITIC_SCHEMA, agentType: 'Explore' }
)

// Targeted fixes for any high-signal continuity/lockfile problems, one agent per affected file
const affected = new Set()
for (const h of (critic.lockfileHits || [])) if (h.file) affected.add(h.file)
for (const c of (critic.continuityIssues || [])) { const m = (c.fix || c.problem || '').match(/[\w-]+\.md/g); if (m) m.forEach((f) => affected.add(f)) }
const affectedList = [...affected]

let continuityFixes = []
if (affectedList.length) {
  log('Continuity critic flagged ' + affectedList.length + ' file(s); dispatching targeted fixes')
  continuityFixes = await parallel(affectedList.map((f) => () =>
    agent(
      'Fix continuity/lockfile problems in ' + JS_DIR + '/' + (f.includes('/') ? f.split('/').pop() : f) + '. Read it, apply only the relevant items below, preserve voice + verified facts, introduce no new lockfile violations.\n\n' +
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
  criticVerdict: critic.verdict,
  lockfileHits: critic.lockfileHits || [],
  continuityIssues: critic.continuityIssues || [],
  linkIssues: critic.linkIssues || [],
  continuityFilesFixed: affectedList,
}
