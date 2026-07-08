export const meta = {
  name: 'learn-specs',
  description: 'Research + author design specs for the 8 remaining Learn deep-dive chapters',
  phases: [
    { title: 'Research', detail: 'per-chapter fact pack from nats-server/clients/ADRs/old docs' },
    { title: 'Spec', detail: 'author committable design spec per chapter from the locked template' },
  ],
}

// ---------------------------------------------------------------------------
// Pinned world — the Acme ORDERS scenario, shared across every Learn chapter.
// ---------------------------------------------------------------------------
const WORLD = `
PINNED RUNNING SCENARIO (identical across all Learn chapters — never invent a new world):
Acme order platform. Canonical message payload, byte-identical everywhere:
  {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
Order subjects: orders.created, orders.shipped, orders.cancelled (regional: orders.us.created, orders.eu.created).
Established entities from the 4 DONE chapters (reuse, do not rename):
- Core NATS: publisher order-svc; subscribers warehouse, notifications, analytics; inventory responder on orders.inventory.check; packers queue group on orders.created; three shipping.quote providers (scatter-gather).
- JetStream: ORDERS stream capturing orders.> ; shipping pull consumer; analytics consumer filtering orders.shipped.
- Security: operator ACME; account ORDERS with user order-svc; account ANALYTICS with user analytics-reader; ORDERS exports stream orders.shipped, ANALYTICS imports it.
- Topologies: single server -> 3-node cluster (n1/n2/n3) -> supercluster (gateways) -> leaf nodes; the ORDERS infra growth story.
`

// ---------------------------------------------------------------------------
// Per-chapter config. continuity = how THIS chapter extends the pinned world.
// ---------------------------------------------------------------------------
const CHAPTERS = [
  {
    key: 'services', dir: 'learn/services', half: 'Develop',
    title: 'Services',
    pages: ['index','your-first-service','endpoints-and-groups','discovery','observability','scaling','where-next'],
    repos: 'nats.go (micro pkg), nats.js (services), nats.py, nats.net, nats.java, orbit.* ; natscli (nats micro / nats service); nats-server ($SRV.* ); ADRs (ADR-32 service API)',
    continuity: `Formalize the core-NATS request-reply responders into the NATS micro Services framework. The core "inventory" responder on orders.inventory.check becomes a proper Service (name OrderInventory, kind "order-inventory", versioned) with endpoints + groups. A second "shipping" service answers shipping.quote. Same ORDERS payload. Service discovery/stats ride $SRV.PING/INFO/STATS. Scaling = run N instances; the framework load-balances via the built-in queue group automatically.`,
    boundary: `Request-reply mechanics themselves -> /learn/core-nats/request-reply (link, do not re-teach). Persistence/streams -> /learn/jetstream. Connection resilience (reconnect/drain) -> /learn/resilient-clients. Security of service subjects -> /learn/security. This chapter = the micro framework layered on request-reply + queue groups.`,
  },
  {
    key: 'resilient-clients', dir: 'learn/resilient-clients', half: 'Develop',
    title: 'Resilient Clients',
    pages: ['index','connecting','reconnection','drain-and-shutdown','slow-consumers','request-reply-resilience','tls-and-auth','where-next'],
    repos: 'nats.go, nats.js, nats.py, nats.net, nats.java, nats.rs, nats.c (Connect options, reconnect, drain, slow-consumer/pending-limits, async errors); nats-server (PING/PONG, lame duck, ErrSlowConsumer, max_payload, write deadline); natscli',
    continuity: `Make the ORDERS app's CLIENT connections production-grade. The order-svc publisher and the JetStream consumers, hardened: connect options, reconnection + buffering, drain vs close on shutdown, slow-consumer / pending limits, request-reply resilience (timeout, no-responders 503, retry/backoff), and consuming TLS + auth credentials. Same payload + subjects.`,
    boundary: `Server-side topology / why a server went away -> /learn/topologies + /learn/clustering. How auth/TLS is CONFIGURED on the server -> /learn/security (this chapter only CONSUMES creds + CA). JetStream consumer redelivery semantics -> /learn/jetstream/acknowledgment. This chapter = the client connection lifecycle.`,
  },
  {
    key: 'key-value', dir: 'learn/key-value', half: 'Develop',
    title: 'Key-Value Store',
    pages: ['index','your-first-bucket','watching','history-and-revisions','ttl-and-limits','under-the-hood','where-next'],
    repos: 'nats.go (jetstream/kv), nats.js (kv), nats.py, nats.net, nats.java, nats.rs; jsm.go (KV); natscli (nats kv); nats-server ($KV.* streams); ADR-8 (KV), ADR-20',
    continuity: `KV built on JetStream. Pinned bucket INVENTORY: keys are SKUs (e.g. widget-blue), values are stock counts the inventory service reads/decrements. watching = live stock updates; history-and-revisions = optimistic concurrency (CAS on a decrement via update-with-revision); ttl-and-limits = per-key TTL + bucket limits; under-the-hood = the bucket IS a stream named KV_INVENTORY on subjects $KV.INVENTORY.>.`,
    boundary: `Stream/consumer fundamentals -> /learn/jetstream (KV is a stream; link, summarize). Large blobs -> /learn/object-store. This chapter = the KV abstraction and its stream backing.`,
  },
  {
    key: 'object-store', dir: 'learn/object-store', half: 'Develop',
    title: 'Object Store',
    pages: ['index','your-first-object','chunking','metadata-and-links','watching-and-listing','under-the-hood','where-next'],
    repos: 'nats.go (jetstream/objectstore), nats.js (os), nats.py, nats.net, nats.java, nats.rs; jsm.go (ObjectStore); natscli (nats object); nats-server ($O.* streams); ADR-20 (Object Store)',
    continuity: `Object Store built on JetStream. Pinned bucket INVOICES storing invoice/label blobs for orders, e.g. object invoice-ord_8w2k.pdf. your-first-object = put/get; chunking = a large file split across stream messages then reassembled; metadata-and-links = description/headers + links/aliases; watching-and-listing = list objects + watch for new ones; under-the-hood = bucket IS a stream OBJ_INVOICES on $O.INVOICES.> (chunk + meta subjects).`,
    boundary: `Stream fundamentals -> /learn/jetstream (link, summarize). Small structured values -> /learn/key-value. This chapter = the object abstraction and its chunked stream backing.`,
  },
  {
    key: 'clustering', dir: 'learn/clustering', half: 'Operate',
    title: 'Clustering & Replication',
    pages: ['index','forming-a-cluster','raft-and-leaders','replication-and-r3','placement','scaling-and-peers','where-next'],
    repos: 'nats-server (server/raft.go, route.go, jetstream_cluster.go, opts cluster{}/routes, peer-remove); natscli (nats server raft / report); jsm.go; ADRs on JetStream clustering / RAFT; raft thesis only as background',
    continuity: `The MECHANISM behind the topologies cluster — this is exactly what /learn/topologies deferred ("defer RAFT to /learn/clustering"). The same 3-node ORDERS cluster (n1/n2/n3). forming-a-cluster = routes + cluster{} block + gossip; raft-and-leaders = RAFT groups (meta group + per-asset groups), the meta leader, stream leader, elections, terms; replication-and-r3 = R3 quorum, how a write commits, what consistency you get; placement = tags + cluster placement + preferred leader; scaling-and-peers = peer add/remove, stream/consumer migration, nats server raft peer-remove.`,
    boundary: `Cluster SHAPES and when to use them -> /learn/topologies (link). JetStream single-page intro to replicas -> /learn/jetstream/surviving-node-loss (link, go deeper here). Gateways/superclusters across clusters -> /learn/topologies/super-clusters. This chapter = how a cluster reaches agreement and replicates.`,
  },
  {
    key: 'monitoring', dir: 'learn/monitoring', half: 'Operate',
    title: 'Monitoring & Observability',
    pages: ['index','monitoring-endpoints','jetstream-health','advisories-and-events','prometheus-and-dashboards','where-next'],
    repos: 'nats-server (server/monitor.go: varz/connz/routez/jsz/healthz/subsz, server/events.go advisories); prometheus-nats-exporter; nats-surveyor; natscli (nats server check / report / events); jsm.go advisories; get_schema for $JS.EVENT.* and $SYS advisories',
    continuity: `Observe the running ORDERS deployment (the cluster + ORDERS stream + shipping/analytics consumers). monitoring-endpoints = the HTTP monitoring port :8222 (varz, connz, routez, jsz, healthz); jetstream-health = stream/consumer state + the shipping consumer falling behind (lag, num_pending, redelivered); advisories-and-events = $SYS and $JS.EVENT.ADVISORY.* (max-deliver reached, leader elected, consumer created); prometheus-and-dashboards = prometheus-nats-exporter + nats-surveyor + Grafana.`,
    boundary: `Cluster/RAFT mechanics -> /learn/clustering. How to FIX what you observe (backup, scaling, upgrades) -> the relevant Operate chapter. Exact metric field types -> /reference. This chapter = what to watch and where it comes from.`,
  },
  {
    key: 'backup-recovery', dir: 'learn/backup-recovery', half: 'Operate',
    title: 'Backup & Recovery',
    pages: ['index','stream-backup-restore','mirrors-and-sources','disaster-recovery','config-and-jwt-backup','where-next'],
    repos: 'natscli (nats stream backup / restore — snapshots); jsm.go (snapshot API); nats-server (stream snapshot/restore, mirror/source); nsc/jwt (operator+account JWT + nkeys backup); ADRs on snapshots',
    continuity: `Protect the ORDERS data + identity. stream-backup-restore = nats stream backup/restore snapshots of ORDERS; mirrors-and-sources = a cross-site mirror of ORDERS for DR (ops/DR angle — the MECHANISM lives in /learn/jetstream/mirrors-and-sources, link it, do not duplicate); disaster-recovery = a runbook (lose a site, restore from snapshot or promote a mirror); config-and-jwt-backup = back up server config + the ACME operator/account JWTs + nkeys from the Security chapter.`,
    boundary: `Mirror/source MECHANISM -> /learn/jetstream/mirrors-and-sources (link). The auth/JWT model itself -> /learn/security/operator-mode (link; here we only back the keys up). Replication (R3) is not a backup -> /learn/clustering. This chapter = backup + restore procedures.`,
  },
  {
    key: 'deployment', dir: 'learn/deployment', half: 'Operate',
    title: 'Deployment & Upgrades',
    pages: ['index','sizing-and-resources','kubernetes','config-management','rolling-upgrades','hardening','where-next'],
    repos: 'nack (JetStream controller CRDs), k8s (nats helm chart), nats-server (config reload SIGHUP, lame duck / -lame_duck, signals, limits); natscli (nats server); ADRs on lame duck',
    continuity: `Run the ORDERS cluster in production. sizing-and-resources = CPU/RAM/disk/file-descriptors for the ORDERS stream load; kubernetes = the nats Helm chart + nack controller (Stream/Consumer CRDs) for a StatefulSet ORDERS cluster; config-management = config includes, SIGHUP reload, secrets; rolling-upgrades = lame-duck mode + upgrade order (upgrade non-meta-leaders first, step the meta leader last); hardening = TLS everywhere + auth + limits (ties /learn/security/encryption).`,
    boundary: `The auth MODEL -> /learn/security. Cluster/RAFT mechanics -> /learn/clustering. What to watch after deploy -> /learn/monitoring. This chapter = getting it running, configured, and upgraded safely.`,
  },
]

// The done core-nats spec is the canonical template every spec must mirror.
const TEMPLATE_PATH = 'specs/2026-06-04-core-nats-deep-dive-design.md'

const VOICE = `
VOICE (hard rules, identical to the 4 done chapters — read 2 done pages to absorb it):
- Rust-book tone: welcoming, plain, second person. Active voice, present tense. No filler/hedging.
- One teaching thought per paragraph. Define-then-use: never use a term before the paragraph that defines it.
- <=2 NEW concepts per content page; a third is deferred/linked out.
- Teach what MATTERS, link /reference for the exhaustive knob list (greppable handoff: "the full set ... is documented in [Reference](/reference/)").
- Content page skeleton: numbered title frontmatter (id,title,sidebar_position,description) -> intro -> concept H2s with embedded examples -> "## Pitfalls" (2-4 concept-scoped gotchas, do/don't, one runnable handling example; insert BEFORE "## Where you are") -> "## Where you are" -> "## What is next" -> "## See also" (<=3 links).
- index page: frontmatter (id:index, sidebar_position:1) -> intro -> "By the end you will have" -> "Who this is for" -> "How to read it" -> "## Map" table linking every page -> "## Prerequisites".
- where-next page: recap "the whole game" -> "Where the details live now" -> "## Sibling deep dives" -> "## Where you are" -> "## Production checklist" (collects every page's Pitfalls action items, grouped per page with a link to that page's #pitfalls) -> "## See also".
- Length 150-400 source lines per content page; index/where-next may run longer.
`

const EXAMPLES = `
EXAMPLE / VISUAL RULES (match CLAUDE.md):
- Almost every real, multi-language snippet uses a nats-example div:
  <div class="nats-example" data-type="learn-<chapter>-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>
  with a matching committed CLI source at static/examples/snippets/cli/learn/<chapter>/<slug>/<snippet>.sh
  (path dirs join with dashes to equal data-type — they MUST match exactly).
- Server config, CLI-only ops commands, and "run it in two terminals" demos are plain fenced bash/conf blocks (no div).
- NatsFlow: this run MAXIMIZES animation. Propose a NEW animated scenario for every page that carries a genuine message/control flow (cap ~1-3 per chapter); reuse an existing scenario only when it already fits. Embed with
  <div class="nats-flow" data-scenario="<camelCaseName>Animated" data-width="600" data-height="350"></div>
  Each proposed scenario needs: name, page, and a 1-2 sentence description of what flows (nodes + animated edges). Do NOT use NatsFlow for pure config/API-syntax/static-architecture (CLAUDE.md). Existing scenarios you may reuse: publishSubscribeAnimated, subjectsWildcardAnimated, requestReply, queueGroupAnimated, requestReplyScatterGather, jetStreamContrastAnimated, jetStreamConsumersAnimated, singleToClusterAnimated, clusterMeshAnimated, superClusterAnimated, leafNodeAnimated, massiveScaleAnimated, centralizedAuthAnimated, decentralizedAuthAnimated, authCalloutAnimated.
`

const SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['specPath','natsflowScenarios','linkAllowList','pageCount','notes'],
  properties: {
    specPath: { type: 'string', description: 'path to the written spec file' },
    natsflowScenarios: {
      type: 'array',
      description: 'NEW animated scenarios this chapter needs (exclude reuse-of-existing)',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','page','description'],
        properties: {
          name: { type: 'string', description: 'camelCase ending in Animated, e.g. serviceDiscoveryAnimated' },
          page: { type: 'string', description: 'slug it embeds on' },
          description: { type: 'string', description: 'nodes + animated edges + what message/control flow it shows' },
        },
      },
    },
    reusedScenarios: { type: 'array', items: { type: 'string' }, description: 'existing scenario names reused' },
    linkAllowList: { type: 'array', items: { type: 'string' }, description: 'every internal link path the chapter is allowed to use' },
    pageCount: { type: 'number' },
    notes: { type: 'string', description: 'open questions / continuity risks for the human reviewer' },
  },
}

const FACT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['factPack'],
  properties: { factPack: { type: 'string', description: 'the full verified fact pack markdown' } },
}

phase('Research')

const results = await pipeline(
  CHAPTERS,
  // Stage 1 — research (read-only Explore agent: nats-mcp + web)
  (ch) => agent(
    `You are a NATS source researcher. Produce a VERIFIED fact pack for the "${ch.title}" Learn deep-dive chapter (${ch.pages.length} pages: ${ch.pages.join(', ')}).

${WORLD}

THIS CHAPTER extends the world as: ${ch.continuity}
BOUNDARY (link, do NOT teach): ${ch.boundary}

SOURCES — verify every mechanism, flag, default, and error against real source. Use the nats-mcp tools (load via ToolSearch "select:mcp__nats-mcp__find_equivalent,mcp__nats-mcp__show_type,mcp__nats-mcp__read_file,mcp__nats-mcp__search_code,mcp__nats-mcp__get_adr,mcp__nats-mcp__get_schema,mcp__nats-mcp__list_files") across: ${ch.repos}. Also WebFetch the OLD docs at https://docs.nats.io and examples at https://natsbyexample.com for canonical patterns and CLI usage. Cross-check at least 2 client languages for any client-facing API.

RETURN a markdown fact pack with these sections, one per page where relevant:
1. Per-page MECHANISMS — for each page slug, the 1-2 core concepts and exactly how they work on the wire / in the server (cite repo:file or ADR id). Distinguish "teach this" from "knob -> link to reference".
2. KEY COMMANDS — real \`nats\` CLI invocations for this chapter (verified flags), and the equivalent client API name in nats.go + one other language.
3. PITFALLS — 2-4 real gotchas per chapter (the kind that bite in production), each with the correct handling.
4. CANONICAL EXAMPLES — real URLs from nats-io / synadia-io / ConnectEverything / synadia-labs / natsbyexample that show these patterns. Real URLs only — never invent one. Note which page each helps.
5. CONTINUITY CHECK — confirm the pinned entities above are the right fit, and flag anything that would force inventing a new entity.
6. NATSFLOW CANDIDATES — which pages carry a message/control flow worth animating, and what flows (nodes + edges).

Be precise and dense. This pack is the sole source of truth for the writer. Do not write prose pages — return facts.`,
    { label: `research:${ch.key}`, phase: 'Research', agentType: 'Explore', schema: FACT_SCHEMA }
  ),
  // Stage 2 — author the design spec from the locked template + fact pack
  (fact, ch) => agent(
    `You are a NATS docs architect. Write the DESIGN SPEC for the "${ch.title}" Learn deep-dive chapter.

FIRST read the canonical template spec and absorb its exact section structure and depth: ${TEMPLATE_PATH}. Mirror its sections (Goal incl. the overlap-with-concepts framing if relevant; Non-goals/boundary; Decisions table; Files & sidebar plumbing; Master scenario PINNED; Voice & wording lockfile + boundary lockfile; Example pattern + NatsFlow list; Page-by-page outline table with stateIn/stateOut and <=2 concepts each; Research domains / fact pack; Acceptance criteria; Out of scope).

ALSO read these two DONE pages to lock voice + structure: learn/jetstream/your-first-stream.md and learn/jetstream/where-next.md. And read this chapter's current stub pages under ${ch.dir}/ to see slugs/titles already scaffolded.

${WORLD}
THIS CHAPTER extends the world as: ${ch.continuity}
BOUNDARY (link, do NOT teach): ${ch.boundary}
${VOICE}
${EXAMPLES}

VERIFIED FACT PACK (sole source of truth — fold the facts, commands, pitfalls, example URLs into the spec):
${fact.factPack}

CRITICAL CONSTRAINTS:
- Pages are fixed by the sidebar (no sidebar edits, no new/removed pages): ${ch.pages.join(', ')}.
- The spec MUST contain a Wording lockfile (same word for same thing) AND a Boundary lockfile (banned cross-chapter vocabulary).
- The spec MUST contain a VALID internal-link allow-list: only paths that resolve. Allowed families: /reference/ and /reference/<real>; /concepts/<real> (existing: intro, what-is-nats, pub-sub-basics, subjects, request-reply, queue-groups, jetstream, security, topologies, ecosystem, getting-started); /learn/<chapter> and /learn/<chapter>/<slug> for REAL sibling slugs only. Do NOT invent paths. The done chapters are core-nats, jetstream, security, topologies; sibling new chapters are services, resilient-clients, key-value, object-store, clustering, monitoring, backup-recovery, deployment.
- Pin the SAME payload + entities as the world above. Carry the running session forward page to page.
- Bake in the standing convention: every content page has "## Pitfalls"; where-next has "## Production checklist".
- NatsFlow: list every NEW scenario to build (name/page/description) and every existing scenario reused.

WRITE the spec to: specs/2026-06-05-${ch.key}-deep-dive-design.md
Use the Write tool. Do NOT leak any tool-call XML tags into the file. Then return the structured summary.`,
    { label: `spec:${ch.key}`, phase: 'Spec', schema: SPEC_SCHEMA }
  )
)

const ok = results.filter(Boolean)
log(`Specs written: ${ok.length}/${CHAPTERS.length}`)
const allNew = ok.flatMap(r => (r.natsflowScenarios || []).map(s => `${s.name} (${s.page}): ${s.description}`))
log(`New NatsFlow scenarios proposed: ${allNew.length}`)

return {
  specs: ok.map(r => r.specPath),
  natsflowScenarios: ok.flatMap(r => r.natsflowScenarios || []),
  reused: ok.flatMap(r => r.reusedScenarios || []),
  linkAllowLists: ok.map(r => ({ count: r.pageCount, links: r.linkAllowList })),
  notes: ok.map(r => r.notes),
}
