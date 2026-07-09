export const meta = {
  name: 'topologies-deep-dive',
  description: 'Research + write 8 Topologies deep-dive Learn pages (+CLI snippets +5 NatsFlow scenarios), review, verify continuity',
  phases: [
    { title: 'Research', detail: '8 fact-domains: nats-server cluster/gateway/leafnode + natscli + protocol refs + synadia example sweep' },
    { title: 'NatsFlow', detail: 'author 5 animated topology scenarios, wire the 5 files, typecheck' },
    { title: 'Write+Review+Fix', detail: 'per page: write .md + CLI .sh, adversarial review, apply fixes' },
    { title: 'Continuity', detail: 'whole-chapter lockfile + scenario-state + link-allowlist + boundary critic, then targeted fixes' },
  ],
}

// ---------------------------------------------------------------------------
// Shared paths
// ---------------------------------------------------------------------------
const ROOT = '.' // repo root — run from the repository checkout
const TOPO_DIR = ROOT + '/learn/topologies'
const CLI_DIR = ROOT + '/static/examples/snippets/cli/learn/topologies'
const SPEC = ROOT + '/specs/2026-06-03-topologies-deep-dive-design.md'
const NF_DIR = ROOT + '/src/components/NatsFlow'
const EXEMPLARS = [
  ROOT + '/learn/jetstream/why-a-stream.md',
  ROOT + '/learn/jetstream/your-first-stream.md',
  ROOT + '/learn/jetstream/surviving-node-loss.md',
]

// ---------------------------------------------------------------------------
// The authoring contract every page-writer must obey (spec §4-6 distilled)
// ---------------------------------------------------------------------------
const CONTRACT = [
  'You are writing one page of the NATS "Topologies" Learn chapter (Rust-book style, an Operate-half deep dive). It expands the short /concepts/topologies primer into a runnable walkthrough.',
  '',
  'BEFORE writing, Read these for voice + facts (do not skip):',
  '  - Design spec (authoritative): ' + SPEC,
  '  - The concept page you are expanding (reuse its framing/vocabulary): ' + ROOT + '/docs/concepts/topologies.md',
  '  - Three gold-standard already-written JetStream pages (match their VOICE exactly; content differs): ' + EXEMPLARS.join(', '),
  '  - Project rules: ' + ROOT + '/CLAUDE.md',
  '',
  'RUNNING SCENARIO (pinned, identical across every page) — the Acme infra GROWTH story. The application never changes; the deployment grows:',
  '  Dev: one server n1 on localhost.',
  '  Production cluster `east`: 3 servers n1-east, n2-east, n3-east (client ports 4222/4223/4224, route port 6222+).',
  '  Super-cluster: second cluster `west` (n1-west, n2-west, n3-west) joined to `east` by gateways.',
  '  Edge: leaf node factory-1 bridging to the `east` cluster, serving local edge clients.',
  '  The workload is always the ORDERS system: publishing orders.* and consuming the ORDERS stream. Canonical payload (same as JetStream/Security): {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}',
  '  Never rename a server or invent a different payload. Carry config/server state forward; state each transition explicitly (dev -> cluster -> super-cluster -> leaf).',
  '',
  'BOUNDARY (hard): Topologies teaches the SHAPES and WIRING (routes, gateways, leaf remotes). It does NOT re-teach RAFT, quorum math, replication internals, or placement — those belong to the Clustering & Replication chapter (/learn/clustering). Mention them in one sentence and LINK OUT; never explain the mechanics here.',
  '',
  'WORDING LOCKFILE (same word for same thing; NEVER the banned terms):',
  '  server = a nats-server process (NOT "broker"/"instance"/"box"/"daemon"); "node" ONLY in "leaf node" (a cluster member is a "server", never a "node");',
  '  cluster (NOT "ensemble"/"group of brokers"); route = the server<->server cluster connection (NOT "link"/"peer connection");',
  '  gateway = the cluster<->cluster connection (NOT "bridge"/"peering"/"interconnect"); super-cluster HYPHENATED (NOT "supercluster", except once to define it);',
  '  leaf node then "leaf" (NOT "satellite"/"edge server"/"spoke"); "full mesh" for routes (NOT "ring"/"fully connected graph");',
  '  client = the connecting app; subject (NOT "topic"/"channel"); publish/subscribe (NOT "send"/"listen");',
  '  stream/consumer/replica carry from JetStream (NOT "JetStream stream"/"subscriber" for consumer); JetStream "domain" for the leaf term (NOT "realm"/"zone").',
  '',
  'VOICE RULES (hard):',
  '  - ONE teaching thought per paragraph. If two ideas are joined by "and", split them.',
  '  - Define-then-use: never use a term before its own paragraph in this or a prior page.',
  '  - <=2 NEW concepts per page. A third goes to a later page or is linked out.',
  '  - Active voice, present tense. NO filler ("it is important to note", "basically", "essentially", "simply").',
  '  - Length 150-400 source lines. Hard cap 400. index and where-next may be 80+.',
  '',
  'FRONTMATTER (exact shape, match exemplars):',
  '  id: <slug>',
  '  title: "<NUM>. <Title>"   (content pages, e.g. "2. Your first cluster"); the index page uses title: "Topologies Deep Dive".',
  '  sidebar_position: <POS>',
  '  description: <one line>',
  '  H1 in body equals the title.',
  '',
  'EXAMPLE PATTERN (topologies is CONFIG/CLI-HEAVY):',
  '  - Server config (nats.conf with cluster {}/gateway {}/leafnodes {} blocks), nats-server startup, and "nats server ..." inspection output are CLI/CONFIG-ONLY:',
  '      use a PLAIN fenced block. `conf` for config, `bash` for shell. NO nats-example div. Show runnable local multi-server setups (different ports) as inline bash/conf the reader can copy-paste.',
  '  - Use a nats-example div ONLY for a snippet with a genuine client-library form (e.g. connecting with multiple seed URLs and observing reconnect/failover, or publishing/consuming across the topology):',
  '      <div class="nats-example" data-type="learn-topologies-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>',
  '  - For EACH nats-example div, ALSO author the CLI source file so CLI renders today:',
  '      ' + CLI_DIR + '/<slug>/<snippet>.sh   (starts with #!/bin/bash, real nats/nats-server commands, committable).',
  '      Path dirs join with dashes to form the data-type: cli/learn/topologies/<slug>/<snippet>.sh => learn-topologies-<slug>-<snippet>. Verify it matches your div.',
  '  - Additional CLI-only .sh files requested below also start with #!/bin/bash and use real commands.',
  '  - If you ever hand-write a Tabs block: import Tabs/TabItem at top, groupId="lang", CLI TabItem FIRST with default, order CLI,JS,Go,Python,Java,Rust,C#. Prefer the div.',
  '',
  'VALID INTERNAL LINKS (allow-list — topologies DOES have a reference handoff; the protocol pages exist):',
  '  Reference: /reference/protocols/route, /reference/protocols/gateway, /reference/protocols/leafnode, /reference/protocols/client, /reference/jetstream/api/meta, /reference/jetstream/api/stream, /reference/jetstream/api/consumer, /reference/ (root).',
  '  Concepts: /concepts/topologies, /concepts/jetstream, /concepts/security, /concepts/subjects, /concepts/pub-sub-basics, /concepts/queue-groups, /concepts/request-reply, /concepts/what-is-nats.',
  '  Learn siblings: /learn/topologies/<slug>; /learn/clustering and its pages (forming-a-cluster, raft-and-leaders, replication-and-r3, placement, scaling-and-peers); /learn/jetstream and pages (surviving-node-loss, mirrors-and-sources); /learn/security and its pages; /learn/deployment and its pages (kubernetes, rolling-upgrades, hardening, sizing-and-resources); /learn/monitoring.',
  '  NEVER invent a path outside this list. RAFT/replication detail lives at /learn/clustering, NOT a fabricated /reference/clustering path.',
  '',
  'REFERENCE HANDOFF (greppable): "The wire-level detail of <X> is documented in [Reference](/reference/protocols/<...>). We only need <Y> here."',
  'End every page with a "## See also" section: 1-3 links from the allow-list, HARD max 3.',
  '',
  'NAVIGATION: include a short "## Where you are" (recap deployment state) near the end and a "## What is next" pointer (with a clickable link to the next page) like the exemplars.',
  '',
  'ACCURACY: every config field, port, CLI flag, and monitoring endpoint MUST be verified against the research fact pack you are given (and if unsure, against nats-server/natscli source via nats-mcp tools). Do not invent fields. Honor any version-bound note exactly.',
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
    referencePaths: { type: 'array', items: { type: 'string' }, description: 'allow-list internal paths usable as See-also (esp /reference/protocols/*)' },
    exampleLinks: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { url: { type: 'string' }, shows: { type: 'string' } } }, description: 'hidden/runnable examples found in nats-io/synadia orgs + nats-by-example' },
    snippetIdeas: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { id: { type: 'string' }, description: { type: 'string' } } } },
  },
}

const MCP_HINT = 'Load and use the nats-mcp tools first: ToolSearch("select:mcp__nats-mcp__get_adr,mcp__nats-mcp__find_equivalent,mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_repos_path"). Cross-check nats-server for EXACT config field names/defaults (cluster/gateway/leafnodes blocks), natscli for exact "nats server ..." inspection commands, and read the /reference/protocols/* pages in this repo (docs-reference/protocols/) for the wire-level handoff. ALSO use WebSearch/WebFetch to sweep the nats-io, synadia-io, synadia-labs, and ConnectEverything GitHub orgs plus natsbyexample.com for hidden, runnable topology examples (cluster/super-cluster/leaf configs, docker-compose/k8s) — return their URLs and what each demonstrates.'

const DOMAINS = [
  { key: 'T_SINGLE', focus: 'Single server. Minimal nats.conf, server_name, client port (4222), monitoring http_port (8222), running nats-server -c, embedding, when one server is enough (dev/embedded/small) and its single-point-of-failure ceiling. Exact field names + a minimal config.' },
  { key: 'T_CLUSTER', focus: 'Clustering. The cluster {} block (name, listen, routes), full-mesh routes, route gossip/seed routes, client reconnect + server discovery (advertised connect URLs, no_advertise, client_advertise). EXACT steps + config to run 3 local servers on different ports (4222/4223/4224 + route 6222/6223/6224) forming one cluster. Reference: /reference/protocols/route.' },
  { key: 'T_JS_CLUSTER', focus: 'JetStream in a cluster, TOPOLOGY LEVEL ONLY. The meta group/leader and stream/consumer assignment; R3/R5 num_replicas; why a quorum needs an ODD server count; stream leader vs meta leader; the cluster fields shown by nats stream info / nats server report jetstream. EXPLICITLY DEFER RAFT internals to /learn/clustering. Reference: /reference/jetstream/api/meta.' },
  { key: 'T_SUPERCLUSTER', focus: 'Super-clusters / gateways. The gateway {} block (name, listen, gateways: [{name, url}]), how gateways differ from routes (interest-only propagation, optimistic mode, no full mesh of subscriptions), geo-affinity for queue groups + RTT, when to span regions. EXACT config to join two clusters. Reference: /reference/protocols/gateway.' },
  { key: 'T_LEAF', focus: 'Leaf nodes. The leafnodes {} block on the hub + remotes: [{urls, credentials, account}] on the leaf; the OUTBOUND connection model; how interest bridges across the leaf; account binding on the hub; hub vs leaf perspective; JetStream domain config for a leaf. EXACT config for a leaf attaching to a cluster. Reference: /reference/protocols/leafnode.' },
  { key: 'T_COMPOSITE', focus: 'Combining shapes at massive scale: clusters + gateways + leaf nodes together, address-space isolation behind leaves, mixing patterns, decision guidance (which shape for which need). Pull real combined-topology examples from nats-by-example + synadia deployment writeups.' },
  { key: 'T_OPS', focus: 'Operational glue for inspecting a topology: server_name, ports, config reload (SIGHUP / nats-server --signal reload), monitoring endpoints /varz /routez /gatewayz /leafz /jsz, and the natscli commands nats server list / nats server report / nats server check / nats server info. EXACT command spellings + what each shows.' },
  { key: 'T_RESOURCES', focus: 'Hidden-examples sweep ONLY. Use WebSearch/WebFetch across nats-io, synadia-io, synadia-labs, ConnectEverything GitHub orgs and natsbyexample.com. Find runnable cluster/super-cluster/leaf example configs, docker-compose and k8s topology examples, and leaf-at-edge writeups. Return a curated list of URLs with a one-line note on what each shows and which slug it helps. Do not invent URLs — only links you actually retrieved.' },
]

// ---------------------------------------------------------------------------
// Phase 2 — five NEW animated NatsFlow topology scenarios
// ---------------------------------------------------------------------------
const NF_CONTRACT = [
  'You are authoring ONE new animated NatsFlow scenario (a React/TSX component) for the NATS docs site. This one visualizes a server TOPOLOGY (servers connected by routes/gateways/leaf links, with some clients).',
  '',
  'BEFORE writing, Read these to learn the exact API (do not skip):',
  '  - ' + NF_DIR + '/scenarios/jetStreamContrastAnimated.tsx   (primary model: toggle state + setTimeout sequencing + ReactFlowProvider)',
  '  - ' + NF_DIR + '/scenarios/jetStreamConsumersAnimated.tsx  (second model: server + multiple nodes + animated edges)',
  '  - ' + NF_DIR + '/types.ts                                  (NatsFlowScenario, AnimatedEdgeData, NatsNodeData)',
  '  - ' + NF_DIR + '/nodes/index.ts and the node components     (available node `type` values: publisher, subscriber, service, server)',
  '  - ' + NF_DIR + '/edges/                                     (the AnimatedEdge; edge data: color, animated, label, delay, interval)',
  '',
  'HARD REQUIREMENTS:',
  '  - Use ONLY node types publisher | subscriber | service | server. Servers are the main building block here; clients are publisher/subscriber nodes. Use type:"animated" edges with markerEnd ArrowClosed; label route/gateway/leaf edges.',
  '  - Self-contained, no new deps. Use React state + setTimeout to sequence steps (like jetStreamContrastAnimated). Wrap the inner component in <ReactFlowProvider>.',
  '  - Export EXACTLY: export function <ComponentName>(props: { width?: number; height?: number }) { ... }',
  '  - Match the visual frame of the exemplars (bordered box, optional caption/status text below, optional small step buttons). Default width 640, height 400.',
  '  - Use the pinned topology names where relevant (servers n1-east/n2-east/n3-east, cluster east/west, leaf factory-1).',
  '  - Write ONLY your own new file. Do NOT edit index.ts, client-module.tsx, global.d.ts, or the loader — a separate wiring step does that.',
].join('\n')

const SCENARIOS = [
  { comp: 'SingleToClusterAnimated', data: 'singleToClusterAnimated', file: 'singleToClusterAnimated.tsx',
    shows: 'Motivate growth. Start with ONE server and a few clients connected. A toggle ("Single" vs "Cluster") that, when switched, splits into THREE servers in a full mesh as the clients redistribute across them. Caption explains the single server is a single point of failure; the cluster survives a loss.' },
  { comp: 'ClusterMeshAnimated', data: 'clusterMeshAnimated', file: 'clusterMeshAnimated.tsx',
    shows: 'A 3-server full mesh (n1-east, n2-east, n3-east) joined by route edges, each server with a client. Animate a message published on one server reaching a subscriber on another VIA a route. Then a server fails (dim it) and its client RECONNECTS to a surviving server (re-draw the client edge). Caption per stage.' },
  { comp: 'SuperClusterAnimated', data: 'superClusterAnimated', file: 'superClusterAnimated.tsx',
    shows: 'Two clusters drawn as two groups: east (a couple of servers) and west, joined by a single GATEWAY edge. Animate geo-affinity: a request in east is served by a LOCAL worker and stays inside east; only when there is no local interest does a message cross the gateway to west. Caption explains gateways carry only traffic with interest on the other side.' },
  { comp: 'LeafNodeAnimated', data: 'leafNodeAnimated', file: 'leafNodeAnimated.tsx',
    shows: 'A hub cluster (one or two servers) and a leaf server factory-1 with its own edge clients. Show the leaf opening an OUTBOUND connection UP to the hub (arrow from leaf to hub). Then animate interest bridging BOTH ways: a message from a hub client reaching a factory-1 edge client, and an edge client message reaching the hub. Caption: the leaf connects out, so it can live anywhere with outbound access.' },
  { comp: 'MassiveScaleAnimated', data: 'massiveScaleAnimated', file: 'massiveScaleAnimated.tsx',
    shows: 'The composite Acme picture: two clusters (east, west) joined by gateways, each fanning out to one or two leaf nodes that each have edge clients. Lightly animate some traffic flowing. Keep it readable (a small but representative graph). Caption: same client code everywhere; shapes compose.' },
]

// ---------------------------------------------------------------------------
// Phase 3 — the 8 pages
// ---------------------------------------------------------------------------
const PAGES = [
  { slug: 'index', num: 0, pos: 1, title: 'Topologies Deep Dive', isIndex: true,
    teaches: 'What this chapter is and who it is for. Tell the Acme growth story (one server -> cluster -> super-cluster -> leaf) and that the SAME app code runs on every shape. Give the chapter map and what the reader builds.',
    stateIn: 'Nothing deployed.', stateOut: 'Reader has the mental map and page list.',
    needs: ['T_SINGLE'], snippets: [], cli: [], defers: '',
    visual: '<div class="nats-flow" data-scenario="singleToClusterAnimated" data-width="640" data-height="400"></div>',
    links: 'Point forward to the content pages and to /concepts/topologies. Mirror the JetStream index.md shape.' },

  { slug: 'single-server', num: 1, pos: 2, title: 'Single server',
    teaches: 'TWO concepts: (1) the simplest deployment is one nats-server process that clients connect to directly; (2) when one server is enough (dev, embedded, small services) and its single-point-of-failure ceiling. Start Acme dev server n1 with a minimal config.',
    stateIn: 'Nothing deployed.', stateOut: 'Acme runs one dev server n1; reader knows its limits.',
    needs: ['T_SINGLE', 'T_OPS'],
    snippets: [{ id: 'connect', desc: 'connect to the single server n1 and publish orders.created with the canonical payload' }],
    cli: [{ file: 'start.sh', desc: 'minimal nats.conf (server_name, port 4222, http_port 8222) shown inline; this .sh starts nats-server -c' }, { file: 'connect.sh', desc: 'nats pub orders.created with the canonical payload against localhost:4222' }],
    defers: 'embedding + full client options -> /reference/protocols/client and /reference/ root',
    visual: '' },

  { slug: 'your-first-cluster', num: 2, pos: 3, title: 'Your first cluster',
    teaches: 'TWO concepts: (1) a cluster is servers joined by routes into a full mesh; (2) clients connect to any server and reconnect/failover to another when one dies (server discovery via advertised URLs). Stand up n1-east/n2-east/n3-east locally with cluster {} + routes.',
    stateIn: 'One dev server.', stateOut: 'A 3-server cluster `east` (n1-east/n2-east/n3-east) running locally; a client survives a server loss.',
    needs: ['T_CLUSTER', 'T_OPS'],
    snippets: [{ id: 'failover', desc: 'connect with all three seed URLs, publish, kill one server, watch the client reconnect and keep publishing' }],
    cli: [{ file: 'cluster-config.sh', desc: 'three nats.conf files (or one templated) with cluster {} + routes shown inline; this .sh starts the 3 servers on 4222/4223/4224' }, { file: 'server-report.sh', desc: 'nats server report / nats server list against the cluster to show the 3 members' }],
    defers: 'route wire protocol -> /reference/protocols/route; RAFT/quorum/placement -> /learn/clustering',
    visual: '<div class="nats-flow" data-scenario="clusterMeshAnimated" data-width="640" data-height="400"></div>' },

  { slug: 'jetstream-in-a-cluster', num: 3, pos: 4, title: 'JetStream in a cluster',
    teaches: 'TWO concepts: (1) JetStream in a cluster adds a meta layer with its own leader that manages stream/consumer assignment; (2) a replicated stream (R3) needs an ODD number of servers for a quorum, and each stream has a leader where its writes land. Make ORDERS an R3 stream on `east`. DO NOT explain RAFT internals — defer to /learn/clustering.',
    stateIn: 'A 3-server `east` cluster.', stateOut: 'ORDERS is an R3 stream on `east`; reader knows what changes for JetStream at the topology level.',
    needs: ['T_JS_CLUSTER', 'T_CLUSTER'],
    snippets: [{ id: 'r3-stream', desc: 'create or update ORDERS as a 3-replica stream and show nats stream info cluster fields (leader + replicas)' }],
    cli: [{ file: 'r3-stream.sh', desc: 'nats stream add/edit ORDERS --replicas=3 + nats stream info showing the leader and peers' }, { file: 'js-report.sh', desc: 'nats server report jetstream showing the meta leader and stream placement' }],
    defers: 'RAFT, quorum math, replication, placement -> /learn/clustering (raft-and-leaders, replication-and-r3, placement); meta API -> /reference/jetstream/api/meta; durability story -> /learn/jetstream/surviving-node-loss',
    visual: '' },

  { slug: 'super-clusters', num: 4, pos: 5, title: 'Super-clusters',
    teaches: 'TWO concepts: (1) a super-cluster joins clusters with gateways, which carry only traffic that has interest on the other side; (2) geo-affinity keeps queue-group and request traffic local, crossing a gateway only when needed. Join `east` <-> `west` with gateway {} config.',
    stateIn: 'A single `east` cluster.', stateOut: 'A super-cluster spanning `east` + `west`, gateways joining them, traffic staying local by default.',
    needs: ['T_SUPERCLUSTER'],
    snippets: [{ id: 'geo-affinity', desc: 'a queue subscriber in each region; publish in east and show it is served locally (only crosses the gateway when east has no worker)' }],
    cli: [{ file: 'gateway-config.sh', desc: 'gateway {} blocks for east and west shown inline; this .sh starts both clusters joined as a super-cluster' }],
    defers: 'gateway wire protocol -> /reference/protocols/gateway; queue-group recap -> /concepts/queue-groups',
    visual: '<div class="nats-flow" data-scenario="superClusterAnimated" data-width="640" data-height="400"></div>' },

  { slug: 'leaf-nodes', num: 5, pos: 6, title: 'Leaf nodes',
    teaches: 'TWO concepts: (1) a leaf node is a server that opens an OUTBOUND connection to a remote NATS system and bridges subject interest, so it can run anywhere with outbound access; (2) the leaf binds to an account on the hub and its local clients stay hidden behind it. Attach factory-1 to `east` with leafnodes {} + a remote. One line on JetStream domains.',
    stateIn: 'A super-cluster (east + west).', stateOut: 'Leaf node factory-1 bridges to `east`; its edge clients exchange ORDERS traffic with the hub.',
    needs: ['T_LEAF', 'T_RESOURCES'],
    snippets: [{ id: 'leaf-bridge', desc: 'an edge client on factory-1 subscribes; a hub client publishes orders.shipped; show it bridging across the leaf link' }],
    cli: [{ file: 'leaf-config.sh', desc: 'hub leafnodes {} listen block + leaf remotes {urls, account, credentials} shown inline; this .sh starts the hub + the factory-1 leaf' }],
    defers: 'leafnode wire protocol -> /reference/protocols/leafnode; leaf authentication -> /learn/security; JetStream over a leaf (mirrors/sources + domains) -> /learn/jetstream/mirrors-and-sources',
    visual: '<div class="nats-flow" data-scenario="leafNodeAnimated" data-width="640" data-height="400"></div>' },

  { slug: 'putting-it-together', num: 6, pos: 7, title: 'Putting it together',
    teaches: 'Compose everything: clusters + gateways + leaf nodes = massive scale, with address-space isolation behind leaves, and the same client code everywhere. The full Acme picture. Mostly synthesis; keep to <=2 genuinely new ideas (composition + isolation).',
    stateIn: 'east + west super-cluster with a factory-1 leaf.', stateOut: 'The full Acme topology, understood as composable shapes.',
    needs: ['T_COMPOSITE', 'T_RESOURCES'],
    snippets: [],
    cli: [{ file: 'topology-overview.sh', desc: 'nats server list / nats server report across the whole deployment to show clusters, gateways, and leaves at once' }],
    defers: 'deployment specifics (k8s, rolling upgrades) -> /learn/deployment; scaling peers -> /learn/clustering/scaling-and-peers',
    visual: '<div class="nats-flow" data-scenario="massiveScaleAnimated" data-width="640" data-height="400"></div>' },

  { slug: 'where-next', num: 7, pos: 8, title: 'Where to go next',
    teaches: 'A short navigation page. Recap: same binary, same client code, four composable shapes (single, cluster, super-cluster, leaf). Point to the Clustering chapter (mechanics), Deployment, Monitoring, Security (leaf auth), and the protocol references. May be shorter than 150 lines (80+ is fine).',
    stateIn: 'Whole chapter complete.', stateOut: 'None.',
    needs: [], snippets: [], cli: [], defers: '', visual: '',
    links: 'Point to: /learn/clustering, /learn/deployment, /learn/monitoring, /learn/security, /learn/jetstream/surviving-node-loss, /reference/protocols/route, /reference/protocols/gateway, /reference/protocols/leafnode, and /concepts/topologies.' },
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
    boundaryViolations: { type: 'array', items: { type: 'string' }, description: 'places the page explains RAFT/quorum/replication/placement mechanics instead of linking out' },
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
const NF_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['component', 'path', 'ok'],
  properties: { component: { type: 'string' }, path: { type: 'string' }, ok: { type: 'boolean' }, notes: { type: 'string' } },
}
const TYPECHECK_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['passed'],
  properties: { passed: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
}

// ===========================================================================
// RUN
// ===========================================================================
phase('Research')
const researchResults = await parallel(DOMAINS.map((d) => () =>
  agent(
    'Research NATS topology facts for the domain "' + d.key + '". Focus: ' + d.focus + '\n\n' + MCP_HINT +
    '\n\nTreat legacy nats.docs prose as a hint only; nats-server source + the reference protocol pages + official tool docs are the source of truth. ' +
    'Return a precise, citeable fact sheet: exact config field names with types/defaults, exact CLI/nats-server commands, ports, monitoring endpoints, gotchas/footguns, See-also link candidates (allow-list paths, especially /reference/protocols/*), real example URLs you actually retrieved, and snippet ideas. Be exhaustive and correct — downstream writers trust this verbatim.',
    { label: 'research:' + d.key, phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'Explore' }
  ).then((r) => (r ? { ...r, key: d.key } : null))
))
const pack = {}
for (const r of researchResults.filter(Boolean)) pack[r.key] = r
log('Research done: ' + Object.keys(pack).length + '/' + DOMAINS.length + ' fact sheets assembled')

// ---------------------------------------------------------------------------
phase('NatsFlow')
const nfAuthored = await parallel(SCENARIOS.map((s) => () =>
  agent(
    NF_CONTRACT + '\n\n=== YOUR SCENARIO ===\n' +
    'Component name (export this exactly): ' + s.comp + '\n' +
    'File to write: ' + NF_DIR + '/scenarios/' + s.file + '\n' +
    'What it must show: ' + s.shows + '\n\n' +
    'Write the .tsx file now with the Write tool. Return the structured result (ok=true only if the file compiles in your head against the exemplar API).',
    { label: 'nf:' + s.comp, phase: 'NatsFlow', schema: NF_SCHEMA }
  )
))
log('NatsFlow components authored: ' + nfAuthored.filter(Boolean).filter((r) => r.ok).length + '/' + SCENARIOS.length)

// ONE serial agent wires all five into the 4 shared files (avoids parallel edit conflicts)
const wireList = SCENARIOS.map((s) => '  - component ' + s.comp + ' (file ./scenarios/' + s.file.replace('.tsx', '') + ', data-scenario "' + s.data + '")').join('\n')
await agent(
  'Wire five NEW animated NatsFlow scenarios into the loader so they render from markdown. The component .tsx files already exist in ' + NF_DIR + '/scenarios/.\n\n' +
  'Scenarios to register:\n' + wireList + '\n\n' +
  'Edit these FOUR files, following the EXACT pattern already used for jetStreamContrastAnimated / jetStreamConsumersAnimated (Read each file first, then add the new entries alongside the existing ones):\n' +
  '1. ' + NF_DIR + '/scenarios/index.ts — add an `export { <Comp> } from \'./<file>\';` line for each.\n' +
  '2. ' + ROOT + '/src/plugins/nats-flow/client-module.tsx — in the `window.NatsFlow = { ... }` object add `<Comp>: module.<Comp>,` for each (next to JetStreamConsumersAnimated).\n' +
  '3. ' + ROOT + '/src/types/global.d.ts — add an import type alias for each (e.g. `<Comp> as <Comp>Component`) and a `<Comp>: typeof <Comp>Component;` line in the Window NatsFlow interface.\n' +
  '4. ' + ROOT + '/static/js/nats-flow-loader.js — (a) add each <Comp> to the destructuring `const { ... } = components;`, and (b) add a `if (scenarioName === \'<data>\') { ... render <Comp> ... }` special-case branch mirroring the jetStreamConsumersAnimated branch exactly.\n\n' +
  'CRITICAL: all four files must agree, especially global.d.ts (both the import alias AND the Window interface entry) — a missing global.d.ts entry breaks typecheck. Be surgical: only ADD lines, do not remove or reorder existing entries. After editing, confirm the four files and the exact identifiers you added.',
  { label: 'nf:wire', phase: 'NatsFlow' }
)

// Typecheck gate (the project has ~15 PRE-EXISTING errors in gitignored static/examples/snippets/javascript/*.js — IGNORE those; only NatsFlow/wiring errors count)
let tc = await agent(
  'Run `cd ' + ROOT + ' && npm run typecheck` and report. IMPORTANT: ignore any errors under static/examples/snippets/ (they are pre-existing, gitignored, out of scope). If there are errors in the five new NatsFlow scenario files (' + SCENARIOS.map((s) => s.file).join(', ') + ') or the four wiring files (scenarios/index.ts, client-module.tsx, global.d.ts, nats-flow-loader.js), fix ONLY those and re-run until clean or twice tried. Return passed=true only if there are no errors OUTSIDE static/examples/snippets/.',
  { label: 'nf:typecheck', phase: 'NatsFlow', schema: TYPECHECK_SCHEMA }
)
if (tc && !tc.passed) {
  log('Typecheck still flagging in-scope errors; one more targeted attempt')
  tc = await agent(
    'npm run typecheck still has IN-SCOPE errors in ' + ROOT + ' (ignore static/examples/snippets/). Errors: ' + JSON.stringify(tc.errors || []) + '\nFix the NatsFlow scenario/wiring files only, then re-run and report. Do not touch unrelated files.',
    { label: 'nf:typecheck-2', phase: 'NatsFlow', schema: TYPECHECK_SCHEMA }
  )
}
log('NatsFlow typecheck (in-scope): ' + (tc && tc.passed ? 'PASS' : 'still has errors — flagged in final report'))

// ---------------------------------------------------------------------------
phase('Write+Review+Fix')
const PAGE_TABLE = PAGES.map((p) => p.num + '. ' + p.title + ' (/learn/topologies/' + p.slug + ')').join('\n')

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
      'file to write: ' + TOPO_DIR + '/' + page.slug + '.md',
      page.isIndex ? 'title: "Topologies Deep Dive" (index page — mirror learn/jetstream/index.md shape; tell the growth story, list the content pages and what the reader builds)' : 'title: "' + page.num + '. ' + page.title + '"',
      'sidebar_position: ' + page.pos,
      'TEACHES: ' + page.teaches,
      'DEPLOYMENT STATE entering this page: ' + page.stateIn,
      'DEPLOYMENT STATE leaving this page: ' + page.stateOut,
      'DEFERS / LINKS OUT: ' + (page.defers || '(nothing major)'),
      page.links ? 'LINKS: ' + page.links : '',
      page.visual ? 'VISUAL: embed this NatsFlow div where it best fits (it is already wired):\n' + page.visual : '',
      '',
      'nats-example divs to emit (ONLY genuine client-library snippets; one div + one CLI .sh each):',
      page.snippets.length ? page.snippets.map((s) => '  - data-type="learn-topologies-' + page.slug + '-' + s.id + '"  (' + s.desc + ')  => CLI file ' + CLI_DIR + '/' + page.slug + '/' + s.id + '.sh').join('\n') : '  (none — this page is conceptual / config-only)',
      page.cli.length ? '\nCLI .sh files to author (server config + multi-server startup go in INLINE conf/bash blocks in the .md; these .sh files run/demonstrate them):\n' + page.cli.map((c) => '  - ' + CLI_DIR + '/' + page.slug + '/' + c.file + '  (' + c.desc + ')').join('\n') : '',
      '',
      '=== VERIFIED FACT PACK (authoritative — do not contradict) ===',
      JSON.stringify(relevant, null, 1),
      '',
      'NOW: (1) Read the spec + the concept page + 3 JetStream exemplars + CLAUDE.md. (2) Write the .md with the Write tool (inline conf/bash for config + multi-server setup; nats-example divs only for true client snippets). (3) Write each CLI .sh (start with #!/bin/bash, real commands). Respect the SHAPES-NOT-MECHANICS boundary. Stay inside the link allow-list. Return the structured result.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'write:' + page.slug, phase: 'Write+Review+Fix', schema: WRITE_SCHEMA })
  },
  // STAGE 2 — review
  (writeRes, page) => {
    if (!writeRes) return null
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      'Adversarially review the Learn page just written at ' + TOPO_DIR + '/' + page.slug + '.md (Read it).',
      'Also Read one exemplar for the target voice: ' + EXEMPLARS[0],
      '',
      'Check HARD and report every failure:',
      '1. WORDING LOCKFILE — flag any banned term: broker/instance/box/daemon for server; "node" for a cluster member (must be "server"; "node" only in "leaf node"); ensemble for cluster; bridge/peering for gateway; "supercluster" unhyphenated; satellite/"edge server"/spoke for leaf; link/peer-connection for route; topic/channel for subject; send/listen for publish/subscribe.',
      '2. BOUNDARY — flag any place the page EXPLAINS RAFT, quorum math, replication internals, or placement mechanics instead of mentioning + linking to /learn/clustering. That is a boundaryViolation.',
      '3. <=2 NEW concepts. List them; if >2, flag it.',
      '4. "## See also" exists with 1-3 links.',
      '5. LINK ALLOW-LIST — flag ANY internal link not in the allow-list (Reference: /reference/protocols/{route,gateway,leafnode,client}, /reference/jetstream/api/{meta,stream,consumer}, /reference/ root; Concepts: topologies/jetstream/security/subjects/pub-sub-basics/queue-groups/request-reply/what-is-nats; Learn: /learn/topologies/<slug>, /learn/clustering(+pages), /learn/jetstream(+surviving-node-loss,mirrors-and-sources), /learn/security(+pages), /learn/deployment(+pages), /learn/monitoring). A fabricated /reference/clustering|cluster|topology/... path is a badLink.',
      '6. Frontmatter: id/title/sidebar_position(' + page.pos + ')/description present and correct' + (page.isIndex ? ' (title "Topologies Deep Dive").' : ' (title "' + page.num + '. ' + page.title + '").'),
      '7. EXAMPLES: server config + multi-server startup are INLINE conf/bash blocks (NOT a div, NOT Tabs). Each nats-example div has data-type="learn-topologies-' + page.slug + '-<snippet>" AND a matching CLI .sh under ' + CLI_DIR + '/' + page.slug + '/. Any hand Tabs has CLI first + default + groupId="lang".',
      '8. LENGTH 150-400 lines (index/where-next may be 80+).',
      '9. SCENARIO STATE matches — entering: "' + page.stateIn + '"; leaving: "' + page.stateOut + '". Server names (n1, n1-east/n2-east/n3-east, east/west clusters, factory-1) + the acme-co payload match the pinned scenario.',
      '10. FACTUAL ACCURACY vs the fact pack below — wrong config fields, wrong ports, invented flags/endpoints, or wrong defaults = factError.',
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
      'Apply these review fixes to ' + TOPO_DIR + '/' + page.slug + '.md (and its CLI files if a CLI issue is listed). Read the file, Edit it, keep the voice and the verified facts. Introduce no new lockfile violations, no links outside the allow-list, and no RAFT/replication mechanics (link to /learn/clustering instead).',
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
  'You are the whole-chapter continuity critic for the Topologies Learn deep dive in ' + TOPO_DIR + '.\n' +
  'Pages: ' + PAGES.map((p) => p.slug).join(', ') + '.\n\n' +
  'Do these checks across the WHOLE chapter (use Grep/Read across ' + TOPO_DIR + '):\n' +
  '1. WORDING LOCKFILE — grep every page for banned terms (broker/instance/daemon, "node" as a cluster member, ensemble, bridge/peering for gateway, "supercluster" unhyphenated, satellite/spoke/"edge server", link/peer-connection for route, topic/channel, send/listen). Report file + term + line.\n' +
  '2. BOUNDARY — grep for pages that explain RAFT/quorum/replication/placement MECHANICS rather than linking to /learn/clustering. Report them.\n' +
  '3. SCENARIO CONTINUITY — the growth story must be consistent: dev server n1 -> cluster east (n1-east/n2-east/n3-east) -> super-cluster (east+west) -> leaf factory-1; the acme-co ORDERS payload; no page assuming a stage a later page only builds.\n' +
  '4. INTERNAL LINKS — every (/learn/...), (/concepts/...), (/reference/...) target is in the allow-list (NO fabricated /reference/clustering|topology paths), and each "## What is next" has a clickable link to the correct next slug in page order (index->single-server->your-first-cluster->jetstream-in-a-cluster->super-clusters->leaf-nodes->putting-it-together->where-next).\n' +
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
      'Fix continuity/lockfile/link/boundary problems in ' + TOPO_DIR + '/' + (f.includes('/') ? f.split('/').pop() : f) + '. Read it, apply only the relevant items below, preserve voice + verified facts, introduce no new lockfile violations, no links outside the allow-list, and no RAFT/replication mechanics.\n\n' +
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
  natsflow: { authored: nfAuthored.filter(Boolean).map((r) => r.component), typecheckPassed: !!(tc && tc.passed), typecheckErrors: (tc && tc.errors) || [] },
  criticVerdict: critic.verdict,
  lockfileHits: critic.lockfileHits || [],
  continuityIssues: critic.continuityIssues || [],
  linkIssues: critic.linkIssues || [],
  continuityFilesFixed: affectedList,
}
