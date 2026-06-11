export const meta = {
  name: 'learn-natsflow',
  description: 'Author 31 new animated NatsFlow scenario components for the Learn deep dives',
  phases: [{ title: 'Draft', detail: 'one self-contained <Name>Animated.tsx per scenario' }],
}

// camelCase file/data-scenario derives from the PascalCase component name.
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1)

const SCENARIOS = [
  ['ServiceRequestAnimated', 'services/your-first-service. Nodes: publisher `order-svc`, a `server` (NATS), a `service` node `OrderInventory` (endpoint "check"). order-svc publishes the canonical order to `orders.inventory.check` -> NATS routes to the endpoint (queue group `q`) -> handler runs -> a reply flows back along the reply subject. Shows request-reply wrapped by the micro framework (named endpoint + default queue group).'],
  ['ServiceEndpointsAnimated', 'services/endpoints-and-groups. Nodes: a client, a `server`, one `service` with TWO endpoints: `check` (`orders.inventory.check`) and a grouped `quote` (`shipping.quote`). A request to orders.inventory.check lights the check endpoint; a request to shipping.quote lights the grouped endpoint. Shows multiple endpoints + group subject-prefix routing in one service.'],
  ['ServiceDiscoveryAnimated', 'services/discovery. Nodes: a client, a `server`, three `service` instances `id1`/`id2`/`id3` of `OrderInventory`. Stage 1: client publishes `$SRV.INFO.OrderInventory` -> NATS fans to all three -> each replies with its INFO. Stage 2 (targeted): client -> `$SRV.STATS.OrderInventory.id2` -> only id2 replies. Shows broadcast discovery vs targeted instance query.'],
  ['ServiceStatsAnimated', 'services/observability. Nodes: a client, a `server`, one `service` endpoint with a visible stats counter (num_requests, num_errors). Several requests arrive and the counter ticks up; one request errors so num_errors++. Final stage: client -> `$SRV.STATS.OrderInventory` -> service replies with accumulated stats. Shows stats accumulating live then read back.'],
  ['ServiceScalingAnimated', 'services/scaling. Nodes: a client, a `server` (queue-group selector), FIVE `service` instances of OrderInventory sharing queue group `q`. Request 1 to `orders.inventory.check` -> NATS selects id3 -> reply; request 2 -> NATS selects id1 -> reply; highlight the chosen instance each round. Shows queue-group load balancing across N instances with no coordinator.'],
  ['ConnectHandshakeAnimated', 'resilient-clients/connecting. Nodes: a publisher `order-svc` (client) and a `server`. Sequenced edges: TCP connect -> server INFO frame -> client CONNECT frame (carrying credentials) -> server +OK. A final branch shows -ERR (rejected). Two visible end states: CONNECTED vs rejected.'],
  ['ReconnectBackoffAnimated', 'resilient-clients/reconnection. Nodes: a publisher client (state RECONNECTING) and a server pool `n1`/`n2`/`n3` (generic pool, NOT -east). Stages: failed dial to n1 (red) -> wait+jitter pause -> dial cycles to n2 -> +OK (green) -> queued publishes in the reconnect buffer flush along an edge to n2. Shows backoff + pool cycling + buffered-publish flush.'],
  ['DrainVsCloseAnimated', 'resilient-clients/drain-and-shutdown. Two side-by-side flows app -> connection -> subscriptions -> `server`. Close() path: in-flight messages dropped immediately on socket teardown (red). Drain() path: UNSUB sent, last in-flight messages animate into handlers, pending publishes flush, then close (green). Contrast the two outcomes.'],
  ['SlowConsumerAnimated', 'resilient-clients/slow-consumers. Nodes: a fast publisher `order-svc`, a `server`, a subscriber `warehouse` with a visible pending buffer. Messages animate into the buffer faster than the handler drains it; once the pending limit is crossed, the overflow message animates to a drop (red) and an async-error edge (SlowConsumer) fires back to the subscriber app.'],
  ['RequestRetryAnimated', 'resilient-clients/request-reply-resilience. Nodes: requester `order-svc`, a `server`, an `inventory` responder on `orders.inventory.check`. Stage 1: request out, times out (no reply edge) -> backoff pulse -> retry -> reply returns (green). Stage 2 (separate branch): immediate no-responders 503 returned when no responder exists. Shows timeout+retry vs the instant 503.'],
  ['TlsAuthHandshakeAnimated', 'resilient-clients/tls-and-auth. Nodes: a client `order-svc` and a `server` holding a cert. Sequenced edges: TLS handshake -> client validates the server cert against the CA -> CONNECT carrying order-svc credentials -> +OK (green). A branch shows auth-failure -ERR (red, rejected path).'],
  ['KvWatchAnimated', 'key-value/watching. Nodes: a subscriber `warehouse-dashboard` (watcher), the backing `server` labelled KV_INVENTORY, an ephemeral ordered consumer. Stages: (1) watch opens -> ordered consumer (last-per-subject) created; (2) stream replays the current value of every key as the initial snapshot; (3) an end-of-initial-data nil marker flows back; (4) a fresh `put widget-blue 41` flows live to the watcher. Shows snapshot-then-live + the EOI signal.'],
  ['KvCasRetryAnimated', 'key-value/history-and-revisions. Nodes: a `service` (inventory) and a `server` (KV_INVENTORY). Stages: (1) get `widget-blue` -> revision 7; (2) update expecting revision 7; (3) a concurrent writer bumps the key to revision 8; (4) the service update is rejected on revision mismatch (red); (5) the service re-gets revision 8 and retries -> accepted (green). Shows optimistic concurrency: rejected write + retry loop.'],
  ['KvTtlExpiryAnimated', 'key-value/ttl-and-limits. Nodes: a `service` (inventory), the `server` (KV_INVENTORY), a watcher `warehouse-dashboard`. Timeline stages: (1) `create flash-sale 99 --ttl 30m`; (2) clock advances past the TTL; (3) the server places a marker with reason MaxAge; (4) the watcher receives it as a purge/delete operation. Shows per-key expiry and how a watcher learns a value is gone.'],
  ['ObjectPutGetAnimated', 'object-store/your-first-object. Nodes: publisher `order-svc`, a `server` labelled INVOICES (a metadata subject + chunk subjects), a subscriber `warehouse`. Put: order-svc publishes N chunk messages then one metadata message. Get: warehouse reads the metadata, then the chunks in order, reassembles, and verifies the SHA-256 digest (green check). Shows put = chunks-then-meta, get = meta-then-chunks-then-verify.'],
  ['ObjectWatchSyncAnimated', 'object-store/watching-and-listing. Nodes: writer `order-svc`, a `server` (INVOICES metadata subject), watcher `analytics`. order-svc puts `invoice-`, `label-`, and `packing-slip-` objects (metadata updates); analytics watch receives each metadata update in order, then issues a SEPARATE get for the actual bytes. Shows real-time metadata-only updates plus the follow-up data fetch.'],
  ['ObjectRollupAnimated', 'object-store/under-the-hood. Nodes: a client, a `server` labelled OBJ_INVOICES (backing stream). The client puts the same object name twice; each metadata publish carries the `Nats-Rollup` header; the stream applies rollup, keeping only the latest metadata message and purging the prior one (it fades out). Shows why a re-put leaves one current ObjectInfo, not a history.'],
  ['ClusterGossipAnimated', 'clustering/forming-a-cluster. Three `server` nodes `n1-east`/`n2-east`/`n3-east`. Stages: n1-east opens an EXPLICIT (configured) route to n2-east; n2-east returns an INFO message listing its known peers; n1-east learns n3-east from that INFO and opens an IMPLICIT (gossip-learned) route to n3-east. Edges labelled "explicit route", "INFO (gossip)", "implicit route" show the full mesh completing itself from one seed.'],
  ['RaftElectionAnimated', 'clustering/raft-and-leaders. Three `server` nodes `n1-east`/`n2-east`/`n3-east` as RAFT peers, all Follower. The leader heartbeat stops; n2-east election timer fires -> n2-east becomes Candidate, increments the term, sends VoteRequest to n1-east and n3-east; both reply Vote; n2-east reaches quorum (2/3) -> Leader, resumes heartbeats. Edges "VoteRequest"/"Vote"/"heartbeat"; node labels animate Follower->Candidate->Leader plus the new term.'],
  ['R3ReplicationAnimated', 'clustering/replication-and-r3. A publisher `order-svc` plus three `server` peers `n1-east`/`n2-east`/`n3-east`; n1-east is the stream leader. order-svc publishes `orders.created` to n1-east; n1-east writes its WAL and sends AppendEntry to n2-east and n3-east; n2-east acks first so n1-east has quorum (itself + n2-east) and COMMITS; the commit index rides the next heartbeat so n2-east/n3-east APPLY to their stream store. Edges "publish"/"AppendEntry"/"ack"/"commit (quorum 2/3)"/"apply". The flagship animation.'],
  ['PeerScalingAnimated', 'clustering/scaling-and-peers. Three existing `server` peers `n1-east`/`n2-east`/`n3-east` plus a fourth empty `server` `n4-east` joining. Leader proposes AddPeer, replicates to quorum, broadcasts the new peer set; n4-east opens a CATCHUP stream and pulls missing entries from the leader until its lag is zero. A second beat shows peer-remove: leader proposes RemovePeer, commits, and the removed peer drops its RAFT subscriptions. Edges "AddPeer"/"catchup"/"lag->0"/"RemovePeer".'],
  ['MonitoringEndpointsAnimated', 'monitoring/monitoring-endpoints. Nodes: a client (nats CLI/curl), a cluster `server` `n1-east` exposing port :8222, and endpoint result cards (/varz, /connz, /jsz). Sequenced edges: client GET /varz -> JSON response card; GET /connz?acc=ORDERS -> JSON; GET /jsz -> JSON. Shows the synchronous request -> on-demand JSON response cycle of the monitoring port.'],
  ['ConsumerLagAnimated', 'monitoring/jetstream-health. Nodes: publisher `order-svc`, the ORDERS stream log (a `server` node, LastSeq 1000), the `shipping` consumer cursor at Delivered 980, a worker `warehouse`. Edges: publisher appends advancing LastSeq; the gap to the cursor highlights as lag=20; worker fetch+ack advances the cursor shrinking the gap; a failed message pulses back as a redelivery, ticking NumRedelivered. Shows lag, in-flight, and redelivery as positions on the log.'],
  ['AdvisoryFlowAnimated', 'monitoring/advisories-and-events. Nodes: the `shipping` consumer, the JetStream layer in `server` `n2-east`, a subject node `$JS.EVENT.ADVISORY...max_deliver.ORDERS.shipping`, and a monitoring subscriber. A poison order is redelivered (deliveries 1->5); on hitting the limit the JetStream layer emits ONE advisory message; the subscriber receives it. A greyed edge shows a later-joining subscriber receiving nothing. Shows once-per-event publication + the transient miss-if-not-subscribed property.'],
  ['MetricsScrapeAnimated', 'monitoring/prometheus-and-dashboards. Nodes: a cluster `server` :8222, an exporter :7777, Prometheus, Grafana, and an alerting check. Edges: exporter GET /jsz -> JSON -> transforms to `nats_consumer_num_pending` on /metrics; Prometheus scrapes :7777 appending to a rising lag time series; Grafana queries Prometheus and a panel line climbs; the check fires CRIT on threshold crossing. Shows scrape -> store -> chart -> alert.'],
  ['StreamSnapshotAnimated', 'backup-recovery/stream-backup-restore. Nodes: the ORDERS stream (`server`), a backup client, an inbox deliver_subject, an off-site backup store (`subscriber`). Edges: snapshot request -> config/state response -> S2-tar chunks streaming to the inbox with a flow-control ack per chunk -> `backup.json` + `stream.tar.s2` land in the store. Shows chunked pull with backpressure.'],
  ['MirrorDRAnimated', 'backup-recovery/mirrors-and-sources. Nodes: site1 (`server`, ORDERS primary), site2 (`server`, ORDERS_DR mirror), publisher `order-svc`. order-svc writes to ORDERS; messages replicate continuously to ORDERS_DR with a visible Lag counter trending toward 0. Replication-as-DR picture, no promotion yet.'],
  ['MirrorFailoverAnimated', 'backup-recovery/disaster-recovery. Nodes: site1 (`server`, failing), site2 (`server`, ORDERS_DR), publisher `order-svc`, consumers. Stages: site1 goes dark (red) -> lag check on ORDERS_DR reaches 0 -> mirror promoted to a writable ORDERS -> order-svc and consumers redirect to site2 (green). Shows the promotion + redirect sequence.'],
  ['CrdReconcileAnimated', 'deployment/kubernetes. Nodes: admin/kubectl (client), the NACK controller (`service`), the Kubernetes API/etcd (`server`), and a `nats-0`/`nats-1`/`nats-2` cluster. Edges: admin applies a Stream CRD (ORDERS, R3) -> controller watches the CRD -> controller calls the JetStream API on the cluster -> cluster creates the R3 stream across nats-0..2 -> controller writes .status back to the CRD. Second beat: stream deleted by hand -> controller detects drift -> recreates it. Shows declarative, self-healing lifecycle.'],
  ['ConfigReloadAnimated', 'deployment/config-management. Nodes: a ConfigMap/config file, the config reloader sidecar (`service`), the nats-server process (`server`), cluster peers, a connected client `order-svc`. Edges: config file changes -> reloader detects (inotify) -> reloader sends SIGHUP to nats-server -> nats-server reloads in place -> the client connection STAYS OPEN (no reconnect, green) -> peers see updated server info. Shows zero-downtime config reload.'],
  ['LameDuckUpgradeAnimated', 'deployment/rolling-upgrades. Nodes: a Kubernetes/operator (client), `nats-0` (entering lame-duck), `nats-1`/`nats-2` (`server`), a client `warehouse`. Edges: operator signals SIGUSR2 to nats-0 -> nats-0 broadcasts INFO ldm:true to clients -> nats-0 transfers Raft leadership to nats-1 -> JetStream rebalances ORDERS replicas off nats-0 -> warehouse reconnects to nats-1 -> nats-0 restarts on the new version and rejoins as a NON-leader. Shows graceful, in-order rolling upgrade (non-leaders first, meta-leader last is the payoff).'],
]

const TEMPLATE_GUIDANCE = `
You are authoring ONE self-contained animated NatsFlow scenario as a React/TSX component.

FIRST read the canonical template in full and copy its structure exactly:
  src/components/NatsFlow/scenarios/clusterMeshAnimated.tsx
(For a message/request flow rather than servers, also skim
  src/components/NatsFlow/scenarios/jetStreamConsumersAnimated.tsx for pacing.)

HARD STRUCTURE (mirror the template precisely):
- Imports: React {useEffect,useState} from "react"; { Background, MarkerType, ReactFlow, ReactFlowProvider } from "@xyflow/react"; "@xyflow/react/dist/style.css"; the node components you use from "../nodes" (available: PublisherNode, SubscriberNode, ServiceNode, ServerNode); { AnimatedEdge } from "../edges".
- const nodeTypes = { publisher: PublisherNode, subscriber: SubscriberNode, service: ServiceNode, server: ServerNode } (include only the ones you use).
- const edgeTypes = { animated: AnimatedEdge }.
- A small palette using the BRAND colors: MSG/active = "#27AAE1" (blue), idle = "#94a3b8" (gray), success/commit = "#34A574" (green), failure = "#ef4444" (red), accent navy = "#375C93", lime = "#8DC63F".
- A Stage union type + STAGE_ORDER array + STAGE_DURATION_MS (per-stage 2500-5000ms) + CAPTION map (one clear sentence per stage explaining the mechanism).
- An Inner component (props { width=600, height=400 }) with useState<Stage> and a useEffect setTimeout that advances STAGE_ORDER[(idx+1)%len] and loops forever (clear the timeout on cleanup).
- Build \`const nodes: any[]\` and \`const edges: any[]\` from the current stage. Edges: { id, source, target, type:"animated", animated:true, markerEnd:{type:MarkerType.ArrowClosed}, style?:{opacity}, data:{ color, label?, labelColor?, animated:<true only on the active stage>, interval:1500 } }. Idle edges gray + animated:false; the active edge for the current stage gets MSG/active color + animated:true. Dim/grayscale nodes that are "down" via style { opacity, filter, transition }.
- Render: a stage stepper (buttons mapping STAGE_ORDER, calling setStage; highlight the active one), then the ReactFlow diagram in a bordered box (copy the ReactFlow props from the template: fitView, nodesDraggable=false, etc., proOptions hideAttribution:true, <Background/>), then a caption line "<n>/<total> {CAPTION[stage]}".
- Export EXACTLY: \`export function <COMPONENT>(props: { width?: number; height?: number }) { return (<ReactFlowProvider><<COMPONENT>Inner {...props} /></ReactFlowProvider>); }\` — the public component wraps the Inner in ReactFlowProvider.

RULES:
- Determinism: NO Math.random(), NO Date.now(), no new Date(). Drive everything off the stage timer (the template does this).
- Use the EXACT entity names from the scenario description (server names, subjects, the canonical Acme ORDERS world). Keep node labels short.
- Self-contained: do NOT import any other scenario file. ~180-320 lines.
- Write ONLY the component file. Do NOT touch index.ts, client-module.tsx, global.d.ts, or the loader — they are already wired for your component name.
- No leaked tool-call XML tags anywhere in the file. Valid TSX that passes \`tsc\` (typed loosely with any[] for nodes/edges like the template).
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'component', 'lines'],
  properties: {
    file: { type: 'string' },
    component: { type: 'string' },
    lines: { type: 'number' },
  },
}

phase('Draft')

const results = await parallel(SCENARIOS.map(([comp, desc]) => () =>
  agent(
    `${TEMPLATE_GUIDANCE}

COMPONENT NAME (export exactly this): ${comp}
WRITE TO (exact path): src/components/NatsFlow/scenarios/${lc(comp)}.tsx
data-scenario the page will use: ${lc(comp)}

SCENARIO TO ANIMATE:
${desc}

Build the stage machine so the animation tells this story clearly, one mechanism per stage, looping. Use the Write tool to create the file, then return {file, component, lines}.`,
    { label: `tsx:${lc(comp)}`, phase: 'Draft', schema: SCHEMA }
  )
))

const ok = results.filter(Boolean)
log(`NatsFlow components written: ${ok.length}/${SCENARIOS.length}`)
return { written: ok.map(r => r.file), count: ok.length }
