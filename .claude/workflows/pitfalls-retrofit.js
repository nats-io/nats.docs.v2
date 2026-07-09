export const meta = {
  name: 'pitfalls-retrofit',
  description: 'Add concept-scoped Pitfalls sections (best/bad practice + runnable error handling) to all 4 finished Learn chapters, plus a Production checklist in each where-next',
  phases: [
    { title: 'Pitfalls', detail: 'per content page: research+add a ## Pitfalls section (+CLI handling snippets), review, fix' },
    { title: 'Checklists', detail: 'per chapter: consolidate a ## Production checklist into where-next' },
  ],
}

// ---------------------------------------------------------------------------
const ROOT = '.' // repo root — run from the repository checkout
const SPECS = ROOT + '/specs'

// Per-chapter config. Writers Read the chapter's design spec for the full
// lockfile / boundary / link-allow-list / pinned scenario — so per-chapter
// constraints are honored without duplicating them here.
const CH = {
  'core-nats': {
    dir: ROOT + '/learn/core-nats',
    cli: ROOT + '/static/examples/snippets/cli/learn/core-nats',
    spec: SPECS + '/2026-06-04-core-nats-deep-dive-design.md',
    scenario: 'Acme ORDERS world pre-JetStream (warehouse/notifications/analytics, inventory service, packers queue group, shipping.quote providers).',
    boundary: 'EPHEMERAL: no JetStream vocabulary (stream/consumer/ack/persisted/durable/redelivered). Persistence pitfalls -> link /learn/jetstream.',
    whereNext: 'where-next',
  },
  'jetstream': {
    dir: ROOT + '/learn/jetstream',
    cli: ROOT + '/static/examples/snippets/cli/learn/jetstream',
    spec: SPECS + '/2026-05-22-jetstream-deep-dive-design.md',
    scenario: 'Acme ORDERS stream + shipping/analytics consumers (pinned payload {"order_id":"ord_8w2k",...}).',
    boundary: 'Keep cluster/replication MECHANICS to a mention + link /learn/clustering; this is the JetStream chapter, so streams/consumers/acks ARE in scope.',
    whereNext: 'where-next',
  },
  'security': {
    dir: ROOT + '/learn/security',
    cli: ROOT + '/static/examples/snippets/cli/learn/security',
    spec: SPECS + '/2026-06-03-security-deep-dive-design.md',
    scenario: 'Acme accounts ORDERS/ANALYTICS, users order-svc/analytics-reader, operator ACME, auth-svc callout.',
    boundary: 'No fabricated /reference/security paths (none exist). Link to /concepts/security, sibling pages, /learn/clustering, /learn/deployment/hardening.',
    whereNext: 'where-next',
  },
  'topologies': {
    dir: ROOT + '/learn/topologies',
    cli: ROOT + '/static/examples/snippets/cli/learn/topologies',
    spec: SPECS + '/2026-06-03-topologies-deep-dive-design.md',
    scenario: 'Acme infra growth: dev n1 -> cluster east (n1-east..n3-east) -> super-cluster (+west) -> leaf factory-1. NATS URLs use nats:// scheme.',
    boundary: 'SHAPES not MECHANICS: RAFT/quorum/replication/placement pitfalls -> mention + link /learn/clustering, do not explain here.',
    whereNext: 'where-next',
  },
}

// Flat list of content pages (NOT index, NOT where-next) with a terse hint of
// the highest-value, concept-scoped pitfalls/error-scenarios for that page.
const PAGES = [
  // ---- core-nats ----
  { ch: 'core-nats', slug: 'publish-subscribe', hints: 'no interest = message silently discarded (at-most-once); >1MB default max_payload rejected; slow consumer gets cut off by the server; forgetting to flush before exit drops in-flight publishes.' },
  { ch: 'core-nats', slug: 'subjects-and-wildcards', hints: '> only valid as the last token; you cannot publish to a wildcard (publishers use fully-qualified subjects); over-broad orders.> subscriptions pull more than you want; reserved $ / _INBOX prefixes; whitespace not allowed in subjects.' },
  { ch: 'core-nats', slug: 'request-reply', hints: 'no timeout set = wait forever; timeout too short drops valid replies; no-responders (503) must be handled, not treated as a hang; doing slow work in the responder blocks throughput; assuming exactly one reply.' },
  { ch: 'core-nats', slug: 'queue-groups', hints: 'non-idempotent workers (a redelivery on a slow/cut member double-processes); a typo in the queue group name silently makes a SEPARATE group; expecting message ordering across members; one slow member; mixing queue + plain subs unintentionally.' },
  { ch: 'core-nats', slug: 'scatter-gather', hints: 'taking only the first reply when you wanted all; no deadline = hang waiting for replies that never come; not knowing how many responders exist; duplicate replies; gathering with request() (returns first) instead of an inbox subscription.' },
  // ---- jetstream ----
  { ch: 'jetstream', slug: 'why-a-stream', hints: 'reaching for a stream when plain pub/sub is enough (disk + leader + cleanup cost); assuming a stream changes delivery to subscribers (it does not).' },
  { ch: 'jetstream', slug: 'your-first-stream', hints: 'overlapping stream subjects causing a message to land in two streams; unlimited defaults (no MaxAge/MaxBytes) growing without bound; renaming/retention changes after data exists.' },
  { ch: 'jetstream', slug: 'publishing', hints: 'ignoring the PubAck (you do not know it was stored); no dedup window so retries double-store; treating "published" as "delivered".' },
  { ch: 'jetstream', slug: 'reading-back', hints: 'replaying a huge stream from seq 1 unintentionally; an ephemeral consumer disappearing mid-read; DeliverPolicy confusion (all vs new).' },
  { ch: 'jetstream', slug: 'your-first-consumer', hints: 'AckWait too low -> redelivery storms; forgetting to ack -> endless redelivery; double-ack errors; durable name reuse with a different config.' },
  { ch: 'jetstream', slug: 'filtering', hints: 'overlapping filter subjects across consumers; a filter that matches nothing (silent no delivery); expecting a filter to delete from the stream.' },
  { ch: 'jetstream', slug: 'acknowledgment', hints: 'nak without delay -> tight redelivery loop; never term-ing a poison message; MaxDeliver hit -> message dropped silently; AckWait vs processing time mismatch.' },
  { ch: 'jetstream', slug: 'pull-consumers', hints: 'MaxAckPending too low stalls throughput; fetch with no expiry blocks; not handling an empty fetch; batch too large for memory.' },
  { ch: 'jetstream', slug: 'worker-pool', hints: 'non-idempotent workers + redelivery; MaxAckPending caps total concurrency (a low value starves the pool); a crashed worker leaves in-flight messages until AckWait.' },
  { ch: 'jetstream', slug: 'priority-groups', hints: 'using failover (NOT implemented as of 2.14 — silently ignored); expecting multiple groups per consumer; unpin race; pinned client never releasing.' },
  { ch: 'jetstream', slug: 'pausing', hints: 'forgetting a paused consumer is paused (looks like a stall); pause time in the past = no-op; pausing does not stop publishers filling the stream.' },
  { ch: 'jetstream', slug: 'push-vs-pull', hints: 'choosing push for new work (pull is the modern default); push flow-control/slow-consumer pitfalls; deliver-group vs queue confusion.' },
  { ch: 'jetstream', slug: 'shaping-the-stream', hints: 'Discard=Old silently dropping oldest under load when you wanted backpressure; MaxAge vs MaxBytes interaction; per-subject limits forgotten.' },
  { ch: 'jetstream', slug: 'delivery-semantics', hints: 'trying to switch retention (Limits/Interest/WorkQueue) after data exists; WorkQueue requiring non-overlapping consumers; Interest retention deleting unacked-by-all.' },
  { ch: 'jetstream', slug: 'message-ttl', hints: 'TTL needs AllowMsgTTL enabled on the stream; per-message TTL vs MaxAge interaction; 2.11+ only; subject-delete-marker confusion.' },
  { ch: 'jetstream', slug: 'surviving-node-loss', hints: 'R1 = data loss on node loss (R3 is the prod floor); even replica counts; assuming a single-node demo shows failover; consumer not replicated.' },
  { ch: 'jetstream', slug: 'mirrors-and-sources', hints: 'expecting a mirror to be writable (it is read-only); source subject-filter surprises; mirror lag treated as real-time; cross-domain config.' },
  // ---- security ----
  { ch: 'security', slug: 'accounts-and-multitenancy', hints: 'no_auth_user opening the default account; forgetting the $SYS system account; assuming accounts share subjects (they are isolated); putting everything in $G.' },
  { ch: 'security', slug: 'authentication-basics', hints: 'plaintext passwords in config (use bcrypt); no auth at all in prod; committing credentials; token in connection URL leaking in logs.' },
  { ch: 'security', slug: 'decentralized-auth', hints: 'losing the operator seed (unrecoverable root of trust); confusing public nkey vs private seed; JWT expiry not planned; using account key instead of a scoped signing key.' },
  { ch: 'security', slug: 'operator-mode', hints: 'resolver misconfig so the server never sees account JWTs; forgetting nsc push after edits; leaking the .creds file; system account not set with nats-resolver.' },
  { ch: 'security', slug: 'authorization', hints: 'an allow-list silently closing off everything else; deny vs allow precedence surprises; forgetting _INBOX.> subscribe permission (breaks request-reply); over-broad > permissions.' },
  { ch: 'security', slug: 'cross-account', hints: 'export without a matching import (no traffic); private export missing an activation token; subject-remap-on-import confusion; service vs stream export mismatch.' },
  { ch: 'security', slug: 'encryption', hints: 'verify off = no client-cert checking; SSL vs TLS confusion; cert expiry; mTLS verify_and_map DN mismatch; per-connection-type TLS forgotten (cluster/leaf/gateway each need their own).' },
  { ch: 'security', slug: 'auth-callout', hints: 'auth service not isolated in its own account; the auth_users bypass list misused; unsigned/spoofable responses without xkey; callout latency/timeout; $SYS.REQ.USER.AUTH not protected.' },
  // ---- topologies ----
  { ch: 'topologies', slug: 'single-server', hints: 'running a single server in prod (SPOF); no monitoring port; assuming it scales vertically forever.' },
  { ch: 'topologies', slug: 'your-first-cluster', hints: 'an EVEN number of servers (no clean quorum for JetStream); a client given only one seed URL (no failover); route port exposed publicly; mismatched cluster names.' },
  { ch: 'topologies', slug: 'jetstream-in-a-cluster', hints: 'R1 streams in a cluster (no HA); even server count; assuming the meta leader and a stream leader are the same; placing all replicas in one failure domain (link /learn/clustering for placement).' },
  { ch: 'topologies', slug: 'super-clusters', hints: 'expecting routes to span regions (gateways do that); gateway only carries interest (no full propagation); chatty cross-region traffic without geo-affinity; mismatched gateway names.' },
  { ch: 'topologies', slug: 'leaf-nodes', hints: 'wrong account binding on the remote (traffic lands in the wrong account); inbound vs outbound confusion (leaf dials out); credentials missing on the remote; expecting JetStream to span the leaf without a domain.' },
  { ch: 'topologies', slug: 'putting-it-together', hints: 'address-space leaks between leaves; mixing shapes without isolation; assuming the same client code needs changes (it does not); over-engineering the topology before it is needed.' },
]

// ---------------------------------------------------------------------------
const WRITE_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['ch', 'slug', 'pitfalls', 'approxLinesAfter'],
  properties: {
    ch: { type: 'string' }, slug: { type: 'string' },
    pitfalls: { type: 'array', items: { type: 'string' } },
    snippetIds: { type: 'array', items: { type: 'string' } },
    cliFiles: { type: 'array', items: { type: 'string' } },
    approxLinesAfter: { type: 'number' },
    notes: { type: 'string' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['slug', 'pass', 'lockfileViolations', 'factErrors', 'badLinks', 'issues'],
  properties: {
    slug: { type: 'string' }, pass: { type: 'boolean' },
    lockfileViolations: { type: 'array', items: { type: 'string' } },
    factErrors: { type: 'array', items: { type: 'string' } },
    badLinks: { type: 'array', items: { type: 'string' } },
    issues: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { severity: { type: 'string' }, location: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } } },
  },
}

const MCP_HINT = 'Load nats-mcp tools to VERIFY each pitfall is real: ToolSearch("select:mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_adr,mcp__nats-mcp__find_equivalent,mcp__nats-mcp__get_repos_path"). Confirm error behaviors/defaults against nats-server / natscli rather than inventing them.'

function writePrompt(page) {
  const c = CH[page.ch]
  return [
    'You are ADDING a "## Pitfalls" section to one existing page of the NATS "' + page.ch + '" Learn deep dive. This is a retrofit — the page is already written and reviewed; you only ADD a section, you do NOT rewrite existing content.',
    '',
    'Page file: ' + c.dir + '/' + page.slug + '.md',
    '',
    'FIRST, Read for the chapter rules + voice (do not skip):',
    '  - Chapter design spec (use its wording lockfile, link allow-list, pinned scenario, voice rules): ' + c.spec,
    '  - The target page itself (match its voice; see what it already covers so you do not repeat): ' + c.dir + '/' + page.slug + '.md',
    '  - Project rules: ' + ROOT + '/CLAUDE.md',
    '',
    'CHAPTER SCENARIO: ' + c.scenario,
    'CHAPTER BOUNDARY: ' + c.boundary,
    '',
    'PITFALL FOCUS for this page (the concept-scoped gotchas to cover — verify each is real): ' + page.hints,
    '',
    MCP_HINT,
    '',
    'WHAT TO WRITE — a new "## Pitfalls" section. Cover the 2-4 highest-value, CONCEPT-SCOPED pitfalls for THIS page only (do not stray into other pages\' topics; link to a sibling page instead). For each pitfall:',
    '  - a short bold name, then 1-2 sentences on WHY it bites,',
    '  - a concrete do/not-that (the correct practice),',
    '  - and where the failure has a runnable form, ONE runnable handling example.',
    'Include AT LEAST ONE runnable handling example on this page where the topic supports it (e.g. handling a request timeout / no-responders, a >1MB rejection, a redelivery, an R1 warning via CLI). A runnable example = a nats-example div PLUS its CLI source file:',
    '    <div class="nats-example" data-type="learn-' + page.ch + '-' + page.slug + '-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>',
    '    and write ' + c.cli + '/' + page.slug + '/<snippet>.sh (starts with #!/bin/bash, real commands). The path dirs join with dashes to equal the data-type — verify.',
    'If a pitfall has no clean runnable form, a tight fenced code/config block or prose is fine.',
    '',
    'PLACEMENT: insert the "## Pitfalls" section immediately BEFORE the "## Where you are" heading. If there is no "## Where you are", insert before "## What is next"; if neither, insert before "## See also". Do NOT modify any existing section, frontmatter, or the existing NatsFlow div.',
    '',
    'CONSTRAINTS (from the chapter spec — honor exactly): the wording lockfile, the boundary above, and the link allow-list. Only link to allow-listed internal paths. Match the pinned scenario names/payload. Active voice, present tense, one idea per paragraph.',
    'LENGTH: keep the section tight (~25-55 lines). If adding it would push the whole page past ~460 source lines, cover only the 2 highest-impact pitfalls and leave the rest for the chapter Production checklist.',
    'OUTPUT HYGIENE: never write literal tool tags like </content> or </invoke> into the file.',
    '',
    'NOW: Read the spec + page + CLAUDE.md, verify the pitfalls via nats-mcp, Edit the page to insert the "## Pitfalls" section, and Write any CLI .sh files. Return the structured result (list the pitfall names, snippet ids, cli files, and the page line count after editing).',
  ].join('\n')
}

function reviewPrompt(page) {
  const c = CH[page.ch]
  return [
    'Adversarially review the "## Pitfalls" section just ADDED to ' + c.dir + '/' + page.slug + '.md (Read the page).',
    'Read the chapter spec for the exact rules: ' + c.spec,
    '',
    'Check and report every failure:',
    '1. EXISTING CONTENT UNTOUCHED — the only change should be a new "## Pitfalls" section (and possibly new CLI files). If prior sections/frontmatter/the NatsFlow div were altered or removed, flag it (high severity).',
    '2. WORDING LOCKFILE (per the spec) — flag banned terms.',
    '3. BOUNDARY — ' + c.boundary + ' Flag violations (e.g. wrong vocabulary, mechanics that belong to another chapter).',
    '4. FACTUAL ACCURACY — each pitfall must describe REAL NATS behavior/defaults. Verify suspicious claims via nats-mcp (load: ToolSearch("select:mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_adr")). Wrong defaults/flags/behaviors = factError. (E.g. priority-groups failover is NOT implemented as of 2.14.)',
    '5. LINK ALLOW-LIST (per spec) — flag any internal link not allowed for this chapter as a badLink.',
    '6. RUNNABLE EXAMPLES — every nats-example div has data-type="learn-' + page.ch + '-' + page.slug + '-<snippet>" AND a matching CLI .sh under ' + c.cli + '/' + page.slug + '/. Flag mismatches.',
    '7. PLACEMENT + LENGTH — section sits before "## Where you are"/"## What is next"/"## See also"; page is not absurdly long (>~470 lines) — flag if so.',
    '8. OUTPUT HYGIENE — flag any literal </content> or </invoke> tags.',
    '',
    'Return the structured verdict. pass=true ONLY if zero high-severity issues, zero lockfileViolations, zero factErrors, zero badLinks.',
  ].join('\n')
}

// ===========================================================================
phase('Pitfalls')
const results = await pipeline(
  PAGES,
  (page) => agent(writePrompt(page), { label: 'pitfalls:' + page.ch + '/' + page.slug, phase: 'Pitfalls', schema: WRITE_SCHEMA })
    .then((w) => ({ page, w })),
  (s1) => {
    if (!s1 || !s1.w) return null
    const { page } = s1
    return agent(reviewPrompt(page), { label: 'review:' + page.ch + '/' + page.slug, phase: 'Pitfalls', schema: REVIEW_SCHEMA, agentType: 'Explore' })
      .then((rev) => ({ page, rev }))
  },
  (s2) => {
    if (!s2) return null
    const { page, rev } = s2
    const c = CH[page.ch]
    const clean = rev && rev.pass &&
      (rev.issues || []).filter((i) => i.severity === 'high').length === 0 &&
      (rev.lockfileViolations || []).length === 0 &&
      (rev.factErrors || []).length === 0 &&
      (rev.badLinks || []).length === 0
    if (clean) return { ch: page.ch, slug: page.slug, status: 'clean' }
    return agent(
      'Apply these review fixes to the "## Pitfalls" section in ' + c.dir + '/' + page.slug + '.md. Read it, Edit only what is needed, do not damage existing content, honor the chapter spec (' + c.spec + ') lockfile/boundary/links, remove any leaked tool tags.\n\n' +
      'Lockfile: ' + JSON.stringify(rev.lockfileViolations || []) + '\nFact errors: ' + JSON.stringify(rev.factErrors || []) + '\nBad links: ' + JSON.stringify(rev.badLinks || []) + '\nIssues: ' + JSON.stringify(rev.issues || []),
      { label: 'fix:' + page.ch + '/' + page.slug, phase: 'Pitfalls' }
    ).then(() => ({ ch: page.ch, slug: page.slug, status: 'fixed' }))
  }
)

phase('Checklists')
const chapters = Object.keys(CH)
const checklists = await parallel(chapters.map((ch) => () => {
  const c = CH[ch]
  const slugs = PAGES.filter((p) => p.ch === ch).map((p) => p.slug)
  return agent(
    'Add a consolidated "## Production checklist" to ' + c.dir + '/' + c.whereNext + '.md for the "' + ch + '" Learn chapter.\n\n' +
    'Read these pages and pull the pitfalls each one now lists under its "## Pitfalls" heading: ' + slugs.map((s) => c.dir + '/' + s + '.md').join(', ') + '\n' +
    'Also Read the where-next page itself: ' + c.dir + '/' + c.whereNext + '.md, and the chapter spec for lockfile/link rules: ' + c.spec + '\n\n' +
    'Write a "## Production checklist" section (insert it BEFORE the "## See also" heading; if a Production checklist already exists, replace it). It is a scannable, grouped checklist: a short subgroup per topic page, each with 2-4 one-line checklist items (- [ ] ...) distilled from that page\'s Pitfalls, and a link to the page section, e.g. "see [Pitfalls](/learn/' + ch + '/<slug>#pitfalls)". Keep each item terse and action-oriented (the thing to DO). Honor the chapter wording lockfile and link allow-list (only allow-listed internal paths). Do not duplicate full prose — this is a checklist. No leaked tool tags.\n\n' +
    'After editing, confirm the page count and that only the Production checklist section was added/replaced.',
    { label: 'checklist:' + ch, phase: 'Checklists' }
  ).then(() => ({ ch, status: 'done' })).catch(() => ({ ch, status: 'failed' }))
}))

return {
  pages: results.filter(Boolean),
  pagesProcessed: results.filter(Boolean).length + '/' + PAGES.length,
  checklists,
}
