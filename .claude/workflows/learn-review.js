export const meta = {
  name: 'learn-review',
  description: 'Deep source-verified review (nats-mcp + old docs) of every deep-dive content page, then apply accuracy/completeness/quality improvements',
  phases: [
    { title: 'Review', detail: 'verify each page vs nats-server/clients/ADRs + old docs + tech-writing rules' },
    { title: 'Improve', detail: 'apply genuine fixes: accuracy, missing content, quality (conservative)' },
  ],
}

// chapter -> content slugs (index + where-next excluded from this deep pass).
const CONTENT = {
  'core-nats': ['publish-subscribe','subjects-and-wildcards','request-reply','queue-groups','scatter-gather'],
  'services': ['your-first-service','endpoints-and-groups','discovery','observability','scaling'],
  'resilient-clients': ['connecting','reconnection','drain-and-shutdown','slow-consumers','request-reply-resilience','tls-and-auth'],
  'key-value': ['your-first-bucket','watching','history-and-revisions','ttl-and-limits','under-the-hood'],
  'object-store': ['your-first-object','chunking','metadata-and-links','watching-and-listing','under-the-hood'],
  'jetstream': ['why-a-stream','your-first-stream','publishing','reading-back','your-first-consumer','filtering','acknowledgment','pull-consumers','worker-pool','priority-groups','pausing','push-vs-pull','shaping-the-stream','delivery-semantics','message-ttl','surviving-node-loss','mirrors-and-sources'],
  'clustering': ['forming-a-cluster','raft-and-leaders','replication-and-r3','placement','scaling-and-peers'],
  'monitoring': ['monitoring-endpoints','jetstream-health','advisories-and-events','prometheus-and-dashboards'],
  'backup-recovery': ['stream-backup-restore','mirrors-and-sources','disaster-recovery','config-and-jwt-backup'],
  'deployment': ['sizing-and-resources','kubernetes','config-management','rolling-upgrades','hardening'],
  'security': ['accounts-and-multitenancy','authentication-basics','decentralized-auth','operator-mode','authorization','cross-account','encryption','auth-callout'],
  'topologies': ['single-server','your-first-cluster','jetstream-in-a-cluster','super-clusters','leaf-nodes','putting-it-together'],
}

const SPEC = {
  'core-nats': 'specs/2026-06-04-core-nats-deep-dive-design.md',
  'jetstream': 'specs/2026-05-22-jetstream-deep-dive-design.md',
  'security': 'specs/2026-06-03-security-deep-dive-design.md',
  'topologies': 'specs/2026-06-03-topologies-deep-dive-design.md',
  'services': 'specs/2026-06-05-services-deep-dive-design.md',
  'resilient-clients': 'specs/2026-06-05-resilient-clients-deep-dive-design.md',
  'key-value': 'specs/2026-06-05-key-value-deep-dive-design.md',
  'object-store': 'specs/2026-06-05-object-store-deep-dive-design.md',
  'clustering': 'specs/2026-06-05-clustering-deep-dive-design.md',
  'monitoring': 'specs/2026-06-05-monitoring-deep-dive-design.md',
  'backup-recovery': 'specs/2026-06-05-backup-recovery-deep-dive-design.md',
  'deployment': 'specs/2026-06-05-deployment-deep-dive-design.md',
}

// Which nats-mcp repos matter per chapter (a hint; the agent may widen).
const REPOS = {
  'core-nats': 'nats-server, natscli, nats.go, nats.rs',
  'services': 'nats.go (micro), nats.js, natscli (nats micro), nats-server ($SRV), ADR-32',
  'resilient-clients': 'nats.go/nats.js/nats.py/nats.net/nats.rs (Connect/reconnect/drain/pending), nats-server (lame duck, slow consumer)',
  'key-value': 'nats.go (jetstream/kv), jsm.go, natscli (nats kv), nats-server ($KV), ADR-8/ADR-20',
  'object-store': 'nats.go (objectstore), jsm.go, natscli (nats object), nats-server ($O), ADR-20',
  'jetstream': 'nats-server (jetstream), jsm.go, natscli, nats.go, ADRs',
  'clustering': 'nats-server (raft.go, route.go, jetstream_cluster.go), natscli, ADRs',
  'monitoring': 'nats-server (monitor.go, events.go), prometheus-nats-exporter, nats-surveyor, natscli, get_schema for $JS.EVENT/$SYS',
  'backup-recovery': 'natscli (stream backup/restore), jsm.go (snapshot), nats-server, nsc/jwt',
  'deployment': 'nack, k8s (helm), nats-server (reload/lame duck/limits), natscli',
  'security': 'nats-server (auth), nsc, jwt, nkeys, ADR-26/ADR-14',
  'topologies': 'nats-server (route/gateway/leafnode), natscli',
}

const TW_RULES = `
TECH-WRITING RULES (this site's voice + verified best practice):
- Rust-book tone: welcoming, plain, second person; active voice, present tense; one teaching thought per paragraph; define-then-use; <=2 NEW concepts per content page.
- Teach what MATTERS; hand the exhaustive knob list to Reference (don't dump every flag). Keep examples runnable and realistic (pinned Acme ORDERS world).
- Diataxis: a deep-dive page is tutorial/how-to+explanation — it should DO and EXPLAIN, link out for reference detail; don't let pure reference tables creep in.
- Match the Concepts pages' voice (read one, e.g. docs/concepts/jetstream.md) but go DEEPER and runnable than the primer.
- Accuracy is paramount: every flag, default, CLI command, API name, error code, and version requirement must be correct against current source.
`

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['accuracy', 'missing', 'quality', 'verdict'],
  properties: {
    verdict: { type: 'string', enum: ['solid', 'minor-fixes', 'needs-work'] },
    accuracy: {
      type: 'array', description: 'technical inaccuracies / outdated facts, each verified against a named source',
      items: { type: 'object', additionalProperties: false, required: ['severity','detail','source'],
        properties: { severity: { type: 'string', enum: ['blocker','major','minor'] },
          detail: { type: 'string', description: 'what is wrong + the CORRECT fact + the exact fix' },
          source: { type: 'string', description: 'repo:file / ADR id / docs.nats.io URL that proves it' } } },
    },
    missing: {
      type: 'array', description: 'important content a reader needs that is absent (within page scope/boundary)',
      items: { type: 'object', additionalProperties: false, required: ['severity','detail'],
        properties: { severity: { type: 'string', enum: ['major','minor'] },
          detail: { type: 'string', description: 'what to add + why it matters + where; keep teach-what-matters (link knobs to reference)' },
          source: { type: 'string' } } },
    },
    quality: {
      type: 'array', description: 'writing-quality / voice / structure defects',
      items: { type: 'object', additionalProperties: false, required: ['severity','detail'],
        properties: { severity: { type: 'string', enum: ['major','minor'] },
          detail: { type: 'string', description: 'the defect + the fix' } } },
    },
  },
}

const IMPROVE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'applied', 'summary'],
  properties: {
    file: { type: 'string' },
    applied: { type: 'number' },
    pitfallsChanged: { type: 'boolean', description: 'true if the ## Pitfalls items changed (where-next checklist may need sync)' },
    newSnippets: { type: 'array', items: { type: 'string' }, description: 'any new CLI .sh paths created' },
    summary: { type: 'string', description: 'one-line per change applied' },
  },
}

// Flatten work list.
const PAGES = []
for (const ch of Object.keys(CONTENT)) for (const slug of CONTENT[ch]) PAGES.push({ ch, slug })
log(`Deep review of ${PAGES.length} content pages across ${Object.keys(CONTENT).length} chapters`)

phase('Review')

const results = await pipeline(
  PAGES,
  // Stage 1 — REVIEW (read-only, source-verified)
  (p) => agent(
    `Deep, source-verified review of learn/${p.ch}/${p.slug}.md. Do NOT edit — only report findings.

Read the page and its spec ${SPEC[p.ch]} (for scope, boundary, wording lockfile, and intended depth).

${TW_RULES}

VERIFY EVERY TECHNICAL CLAIM against real source. Load nats-mcp tools via ToolSearch
("select:mcp__nats-mcp__find_equivalent,mcp__nats-mcp__show_type,mcp__nats-mcp__read_file,mcp__nats-mcp__search_code,mcp__nats-mcp__get_adr,mcp__nats-mcp__get_schema,mcp__nats-mcp__list_files") and check this page's facts against: ${REPOS[p.ch]}. ALSO WebFetch the OLD docs at https://docs.nats.io for this topic to catch anything important the page omits or states differently. Check: CLI flags + subcommands, config field names + defaults, client API method names (cross-check >=2 languages), behavior/semantics, error codes/strings, version requirements, and that every command/example would actually run.

Produce three finding lists:
1. accuracy — anything wrong, outdated, or unverifiable, each with the CORRECT fact and a citing source (repo:file / ADR / docs.nats.io URL).
2. missing — important mechanisms, pitfalls, defaults, or examples a reader genuinely needs that the page omits, WITHIN the page's scope and boundary (respect the spec's boundary lockfile; teach-what-matters, link knobs to reference rather than dumping them). Compare against the old docs' coverage and the source.
3. quality — voice/structure/tech-writing defects (define-then-use violations, >2 new concepts, passive/filler, inaccurate or non-runnable examples, drift from the Concepts voice, missing/!weak Pitfalls).

Set verdict: solid (no real issues) | minor-fixes | needs-work. Be precise and conservative — only flag REAL issues, not preferences. Return the structured object.`,
    { label: `review:${p.ch}/${p.slug}`, phase: 'Review', agentType: 'Explore', schema: REVIEW_SCHEMA }
  ).then(r => ({ review: r, p })),
  // Stage 2 — IMPROVE (apply, conservative)
  (rp, p) => {
    const r = rp && rp.review
    if (!r) return { file: `learn/${p.ch}/${p.slug}.md`, applied: 0, summary: 'review failed' }
    const all = [
      ...(r.accuracy || []).map(i => `[ACCURACY/${i.severity}] ${i.detail}${i.source ? ` (src: ${i.source})` : ''}`),
      ...(r.missing || []).map(i => `[MISSING/${i.severity}] ${i.detail}${i.source ? ` (src: ${i.source})` : ''}`),
      ...(r.quality || []).map(i => `[QUALITY/${i.severity}] ${i.detail}`),
    ]
    if (!all.length) return { file: `learn/${p.ch}/${p.slug}.md`, applied: 0, summary: 'solid — no changes' }
    return agent(
      `Apply improvements to learn/${p.ch}/${p.slug}.md. Spec (scope/boundary/lockfile/link allow-list): ${SPEC[p.ch]}.

FINDINGS (from a source-verified review):
${all.map((s, n) => `${n + 1}. ${s}`).join('\n')}

RULES:
- Apply every ACCURACY blocker/major (fix the fact to match source). Apply MISSING items that genuinely help a reader, and QUALITY fixes — but be CONSERVATIVE: do NOT rewrite prose that is already correct and clear; preserve the page's voice, structure, and the spec's wording/boundary lockfile.
- Keep <=2 new concepts per page — if adding one would exceed, link out instead of teaching it.
- Any NEW nats-example div needs its matching CLI .sh at static/examples/snippets/cli/learn/${p.ch}/${p.slug}/<snippet>.sh (data-type must dash-equal the path). Any new link must be a real, resolving path (prefer the spec's allow-list; /reference/* must exist).
- Do not bloat: aim to stay within ~+30% length; teach-what-matters, link the rest to Reference.
- No leaked tool-call tags. Keep Docusaurus/MDX valid.
- If you change the "## Pitfalls" items, set pitfallsChanged=true so the chapter where-next checklist can be re-synced.

Use Edit/Write. Return {file, applied, pitfallsChanged, newSnippets, summary}.`,
      { label: `improve:${p.ch}/${p.slug}`, phase: 'Improve', schema: IMPROVE_SCHEMA }
    )
  }
)

const ok = results.filter(Boolean)
const changed = ok.filter(r => r.applied > 0)
const pitfalls = changed.filter(r => r.pitfallsChanged).map(r => r.file)
const snippets = changed.flatMap(r => r.newSnippets || [])
log(`Reviewed ${ok.length} pages; improved ${changed.length}; pitfalls changed on ${pitfalls.length}; new snippets ${snippets.length}`)
return {
  reviewed: ok.length,
  improved: changed.length,
  pitfallsChangedFiles: pitfalls,
  newSnippets: snippets,
  changedFiles: changed.map(r => ({ file: r.file, applied: r.applied, summary: r.summary })),
}
