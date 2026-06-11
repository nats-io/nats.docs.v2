export const meta = {
  name: 'learn-proofread',
  description: 'Sentence-by-sentence proofread + correction of every Learn page (all index/content/where-next), stale-state language first',
  phases: [{ title: 'Proofread', detail: 'one agent per page: read every sentence, fix in place' }],
}

// EVERY page in each chapter (index + content + where-next).
const CHAPTER_PAGES = {
  'core-nats': ['index','publish-subscribe','subjects-and-wildcards','request-reply','queue-groups','scatter-gather','where-next'],
  'services': ['index','your-first-service','endpoints-and-groups','discovery','observability','scaling','where-next'],
  'resilient-clients': ['index','connecting','reconnection','drain-and-shutdown','slow-consumers','request-reply-resilience','tls-and-auth','where-next'],
  'jetstream': ['index','why-a-stream','your-first-stream','publishing','reading-back','your-first-consumer','filtering','acknowledgment','pull-consumers','worker-pool','priority-groups','pausing','push-vs-pull','shaping-the-stream','delivery-semantics','message-ttl','surviving-node-loss','mirrors-and-sources','where-next'],
  'key-value': ['index','your-first-bucket','watching','history-and-revisions','ttl-and-limits','under-the-hood','where-next'],
  'object-store': ['index','your-first-object','chunking','metadata-and-links','watching-and-listing','under-the-hood','where-next'],
  'topologies': ['index','single-server','your-first-cluster','jetstream-in-a-cluster','super-clusters','leaf-nodes','putting-it-together','where-next'],
  'security': ['index','accounts-and-multitenancy','authentication-basics','decentralized-auth','operator-mode','authorization','cross-account','encryption','auth-callout','where-next'],
  'clustering': ['index','forming-a-cluster','raft-and-leaders','replication-and-r3','placement','scaling-and-peers','where-next'],
  'monitoring': ['index','monitoring-endpoints','jetstream-health','advisories-and-events','prometheus-and-dashboards','where-next'],
  'backup-recovery': ['index','stream-backup-restore','mirrors-and-sources','disaster-recovery','config-and-jwt-backup','where-next'],
  'deployment': ['index','sizing-and-resources','kubernetes','config-management','rolling-upgrades','hardening','where-next'],
}

const PAGES = [{ file: 'learn/index.md', ch: '(landing)', slug: 'index' }]
for (const ch of Object.keys(CHAPTER_PAGES))
  for (const slug of CHAPTER_PAGES[ch]) PAGES.push({ file: `learn/${ch}/${slug}.md`, ch, slug })
log(`Proofreading ${PAGES.length} pages`)

const GROUND_TRUTH = `
GROUND TRUTH — the Learn section is COMPLETE. All 12 deep dives exist and are fully written:
  Develop: Core NATS, Services, Resilient Clients, JetStream, Key-Value Store, Object Store.
  Operate: Topologies, Security, Clustering & Replication, Monitoring & Observability, Backup & Recovery, Deployment & Upgrades.
There is NO unfinished/"coming soon" chapter. Every chapter root /learn/<chapter>/ and its pages exist.
Pinned scenario (byte-identical everywhere): Acme ORDERS. Payload
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"};
subjects orders.created/shipped/cancelled; cluster "east" with servers n1-east/n2-east/n3-east
(client 4222, route 6222, monitor 8222); stream ORDERS (R3); accounts ORDERS (user order-svc) +
ANALYTICS (user analytics-reader); operator ACME; KV bucket INVENTORY; object bucket INVOICES;
services OrderInventory (orders.inventory.check) + shipping (shipping.quote); DR mirror ORDERS_DR.`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'fixes', 'stillSuspect'],
  properties: {
    file: { type: 'string' },
    staleStateFound: { type: 'boolean', description: 'true if any "coming soon / planned / to be written / stub" style language was found and fixed' },
    fixes: { type: 'array', items: { type: 'string' }, description: 'one short line per fix applied' },
    stillSuspect: { type: 'array', items: { type: 'string' }, description: 'anything you could not safely fix (needs human eyes)' },
  },
}

phase('Proofread')

const results = await parallel(PAGES.map((p) => () => agent(
  `Proofread and CORRECT ${p.file} sentence by sentence. Auto-apply fixes with Edit/Write — do not just report.

${GROUND_TRUTH}

Read the ENTIRE page top to bottom, every sentence. Fix, in place:

1. [HIGHEST PRIORITY] STALE-STATE / INCOMPLETENESS language. Any sentence implying a chapter, page, or feature is planned / "coming later" / forthcoming / "to be written" / "not yet written/covered" / a stub / "scaffolded" / "in a later cycle" / "this section is new" / "the X chapter (once written)" — when it actually EXISTS. Rewrite forward references to other deep dives as things that EXIST ("see the [X deep dive](/learn/x)"), never as future work. Delete or rewrite any "Coming later" / "Planned" roadmap framing. Fix any WRONG chapter/page count (e.g. "across eleven chapters"); prefer "across the chapter" over asserting a number you cannot verify from the page itself.

2. Grammar, spelling, punctuation, capitalization, subject-verb agreement, garbled or run-on sentences, doubled words, and broken Markdown/MDX (malformed links, headings, code fences, list/table rows, stray characters).

3. Voice: active voice, present tense, no filler/hedging, one teaching thought per paragraph; consistent with the rest of the chapter.

4. Factual + internal consistency against the pinned scenario above (names, payload, ports, cluster names). Fix contradictions.

RULES:
- CONSERVATIVE: change only genuine defects. Do NOT rewrite correct, clear prose; preserve headings, structure, meaning, and the page's voice.
- Do not introduce links to non-existent targets (only paths that resolve); do not add a nats-example div without its committed CLI .sh.
- No leaked tool-call tags; keep valid MDX so the build stays green.

Return {file, staleStateFound, fixes, stillSuspect}.`,
  { label: `proof:${p.ch}/${p.slug}`, phase: 'Proofread', schema: SCHEMA }
)))

const ok = results.filter(Boolean)
const withFixes = ok.filter(r => (r.fixes || []).length)
const stale = ok.filter(r => r.staleStateFound)
const suspects = ok.flatMap(r => (r.stillSuspect || []).map(s => `${r.file}: ${s}`))
log(`Proofread ${ok.length}; pages fixed ${withFixes.length}; stale-state fixed on ${stale.length}; open suspects ${suspects.length}`)
return {
  reviewed: ok.length,
  pagesFixed: withFixes.length,
  staleStateFiles: stale.map(r => r.file),
  totalFixes: ok.reduce((n, r) => n + (r.fixes || []).length, 0),
  suspects,
}
