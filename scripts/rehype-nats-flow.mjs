import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const SCENARIO_DIR = path.resolve('src/components/NatsFlow/scenarios');

const FALLBACKS = {
  asyncOrderingAnimated:
    "Async publishing doesn't wait for each PubAck before sending the next order, so publishes can finish out of order. The server numbers five orders as they land, but order 3's ack fails. Nothing is resent on its own — order 3 is simply missing until your code re-publishes it. By the time the retry runs, orders 4, 5, and 6 are already stored, so the re-published order 3 lands last, at sequence 7. An async publish you never check is a lost write, and a late retry reorders the stream.",
  atomicBatchAnimated:
    'An atomic batch commits all of its messages together or none at all. You open a batch and the server stages each message — nothing is visible in ORDERS yet. Add the second and third and all three sit in the staging buffer, still uncommitted. On commit, the whole batch lands in ORDERS at once, at sequences 1, 2, and 3, visible together and never half-written. If the batch is abandoned, every staged message is discarded and ORDERS is unchanged.',
  fastIngestAnimated:
    'Fast ingest raises publish throughput by acking batches of messages instead of every one. The server starts slow, acking each message while it gauges the load, then widens its window so one ack covers two messages, then four — fewer acks, higher throughput. The trade-off shows when a message is dropped in flight: it is never acked, so it leaves a gap the client has to notice for itself.',
  nodeLossAnimated:
    "A stream's replication factor decides whether it survives a server loss. R=1 keeps one copy on one server; R=3 keeps three copies across three servers. When a server goes down, the R=1 stream had no second copy, so it is gone, while the R=3 stream still holds a majority of its copies and keeps serving through the loss.",
  leaderFailoverAnimated:
    'A replicated stream keeps one leader that takes writes and copies them to its followers. The leader copies each write to followers n2 and n3; once two of the three hold it — a majority — the PubAck returns and the order is safe. When the leader fails, the followers elect n2 as the new leader and writes resume, with no acked order lost.',
  deleteMessageAnimated:
    "Deleting a message removes one sequence without renumbering the rest. ORDERS holds five messages, #1 through #5. The server overwrites sequence 3 — its bytes can't be read back — but the surrounding sequences keep their numbers, so a gap opens at 3. New orders keep arriving; the next one lands at #6, never reusing 3.",
  discardNewAnimated:
    'With Discard New, a full stream rejects new writes instead of dropping old ones. Orders flow toward a stream already at its message limit; each new order is rejected with maximum messages exceeded, and the messages already stored are left untouched. The publisher feels the limit as a failed publish rather than silent data loss.',
  discardOldAnimated:
    'With Discard Old (the default), a full stream makes room by dropping its oldest message. Orders flow toward a stream at its limit; each new order is stored while the oldest is discarded to fit, so the publish always succeeds and the stream holds a moving window of the most recent messages.',
  leafNodeAnimated:
    'A leaf node extends a hub cluster to the edge over a single outbound connection. The hub is cluster east (n1-east, n2-east); the leaf, factory-1, dials in. Once connected, interest flows across the link both ways, so a hub client and an edge client behind the leaf can reach each other as if they were on one system, while the leaf keeps its own local connections.',
  massiveScaleAnimated:
    'The composed Acme topology in one view: clusters east and west, each three servers, joined into a super-cluster, with a leaf node on the edge. It shows how the layers stack — routes inside each cluster, gateways between clusters, and a leaf link to the edge — so one message can reach any client without any single layer spanning the whole system.',
  maxAgeAnimated:
    'MaxAge expires messages once they pass an age limit, no matter how full the stream is. Orders arrive a couple a day against a 7-day window; each order lives until it reaches 7 days old, then the server discards it, while everything still inside the window stays. The stream holds a rolling seven days of orders rather than a fixed count.',
  maxMsgsAnimated:
    'MaxMsgs caps how many messages a stream keeps. The stream is full at MaxMsgs=5, so each new order discards the oldest to fit; the count stays at five and the stream holds only the most recent orders.',
  mirrorCopyAnimated:
    'A mirror keeps its own copy of another stream by continuously pulling from it. ORDERS already holds five orders and a publisher keeps adding more; the mirror copies faster than the publisher writes, so its lag falls until it catches up. Once caught up, each new order is mirrored the moment it lands and the lag stays at zero.',
  purgeStreamAnimated:
    'Purging empties a stream but never rewinds its sequence counter. ORDERS holds five messages, first sequence 1; a purge removes all five, the stream stays, and its first sequence is now 6. The next publish lands at #6, not #1 — purge clears the data, not the numbering.',
  sequenceGapAnimated:
    "Sequence numbers are assigned once and never reused, so a deletion leaves a permanent gap. Sequence 2 was deleted earlier, so ORDERS holds 1, 3, 4, and 5 with a hole at 2. New orders don't backfill the hole: the next one lands at #6, the next number up.",
  sourcesMergeAnimated:
    'A sourced stream pulls from several upstreams at once into one. ALL-ORDERS sources from US, EU, and APAC; each upstream keeps its own order, and across them the messages interleave by arrival time, so one stream carries the merged flow of all three regions.',
  superClusterAnimated:
    "Two clusters joined by gateways form a super-cluster. Clusters east and west, three servers each, connect over gateway links; a message published in one cluster crosses a single gateway to reach interested clients in the other, so the two clusters act as one system while each stream's data stays in its home cluster.",
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
  accountIsolationAnimated:
    'Two accounts on one server, ORDERS and ANALYTICS. order-svc publishes orders.shipped inside ORDERS: the subscriber in the same account receives it, while analytics-reader — subscribed to the identical subject string inside ANALYTICS — receives nothing. An account is an isolated subject space; the same subject name in two accounts is two different subjects.',
  crossAccountExportAnimated:
    'The two accounts from the previous page, now with one deliberate opening: ORDERS exports orders.shipped and ANALYTICS imports it. A publish on orders.shipped is delivered twice — to the subscriber inside ORDERS and, across the account boundary, to analytics-reader. A second publish on orders.created, a subject that was never exported, is delivered inside ORDERS only. One named subject crosses; everything else stays isolated.',
  resolverPushAnimated:
    "Operator mode in two beats. First, nats auth account push sends the ORDERS account JWT — signed by operator ACME — to the server over the SYSTEM account, and acme-1 stores it in its resolver directory next to the preloaded SYSTEM JWT. Then order-svc connects with a creds file: it presents its user JWT and signs the server's challenge, the server verifies the user JWT against the stored ORDERS JWT and ORDERS against the one trusted operator key, and the client is admitted. Account JWTs live on the server; user JWTs never do.",
  tlsFirstHandshakeAnimated:
    "Two connection timelines side by side. In the default handshake the server's INFO line — version and connect URLs — crosses the wire in plaintext, and only then does the link upgrade to TLS before credentials flow. With handshake_first, TLS runs before any protocol byte, so the INFO arrives already encrypted, the way an HTTPS server behaves. Credentials are encrypted in both modes; the plaintext INFO in the first lane is exactly what TLS-first removes.",
  centralizedAuthAnimated:
    'Centralized authentication. The server holds the full user list in its own config file. Clients connect and present credentials: order-svc matches an entry in the list and is admitted; an intruder with credentials the list does not contain is rejected. The server decides alone, from its config — it never consults an external service.',
  decentralizedAuthAnimated:
    "The operator-account-user trust chain at connect time. Operator ACME signs the ORDERS account JWT, and ORDERS signs the order-svc user JWT. The client presents its user JWT and signs the server's challenge with its seed; the server verifies the user JWT against the stored ORDERS account JWT and verifies ORDERS against the one operator key it trusts. Two signature checks up the chain, and the client is admitted — the server never stores a user list.",
  authCalloutAnimated:
    'Auth callout, one connection through. A client connects to the server with an external credential. The server does not consult its own user list; it publishes a signed authorization request on $SYS.REQ.USER.AUTH. The external auth-svc receives it, verifies the credential its own way, and replies with a signed user JWT that places the client into an account. The server verifies the reply and admits the client as that user — the admission decision was made outside the server.',
  configReloadAnimated:
    'A config change flows from file to reloaded server without dropping a connection. A new nats.conf is written — a ConfigMap update or an on-disk edit. The reloader sidecar, watching the file with inotify, sees the change and sends SIGHUP to the nats-server process, which re-reads and applies the new config in place, with no restart. The order-svc client connection stays open the whole time, and the server gossips its updated INFO to its cluster peers.',
  lameDuckUpgradeAnimated:
    'A single node draining gracefully during a rolling upgrade. The operator sends SIGUSR2 to nats-0 to enter lame-duck mode; nats-0 broadcasts an updated INFO with ldm:true so connected clients learn it is leaving, hands its Raft leadership to nats-1, and lets JetStream rebalance the ORDERS replicas onto nats-1 and nats-2 at full replication. Drained, nats-0 closes connections gracefully and the warehouse client reconnects to nats-1 without losing a message; nats-0 restarts on the new version and rejoins as a non-leader. Upgrade the followers first, the meta-leader last.',
  crdReconcileAnimated:
    "The NACK control loop reconciling a Stream CRD, then self-healing drift. An admin runs kubectl apply on a Stream CRD describing ORDERS with 3 replicas, storing the desired state in the Kubernetes API. The NACK controller watches the API, sees the new resource, and calls the JetStream API on the NATS cluster to create the R3 ORDERS stream across nats-0, nats-1, and nats-2, then writes the result back to the CRD's .status. When someone deletes the stream by hand, reality drifts from the declared state; the controller detects the deletion on its next reconcile and recreates the R3 stream automatically.",
  jetStreamContrastAnimated:
    'Core NATS versus JetStream for a subscriber that goes offline. In Core mode, messages published while the client is offline reach the server and go nowhere; when the client returns, only new messages arrive. In JetStream mode the stream stores what the client missed — the pending count climbs while it is offline and drains back as the stream replays every missed message once the client reconnects.',
  jetStreamConsumersAnimated:
    "Three consumers read one 8-message stream from independent positions. Inventory, Email, and Analytics each start at a different point and move at their own speed, and each keeps its own cursor — one consumer catching up never moves another's position. The stream holds a single shared copy of every message and serves each consumer from where it left off.",
  kvWatchAnimated:
    'A KV watch is snapshot-then-live. The warehouse-dashboard opens a watch on KV_INVENTORY, which creates an ephemeral ordered consumer over the backing stream. The current value of every key replays first as the initial snapshot; a nil end-of-initial-data marker signals the watcher is caught up; from then on each fresh put streams through live.',
  kvCasRetryAnimated:
    'Optimistic concurrency on the KV bucket KV_INVENTORY. The inventory service gets widget-blue and reads revision 7, then sends an update that only applies if the key is still at revision 7. A concurrent writer commits first and bumps widget-blue to revision 8, so the compare-and-set is rejected on the revision mismatch. The service re-gets widget-blue at revision 8, reapplies its change with the fresh revision, and this update is accepted. No write is lost and the service never holds a lock.',
  kvTtlExpiryAnimated:
    'A per-key TTL expiring on its own, seen by a watcher. The inventory service writes flash-sale=99 to KV_INVENTORY with a 30-minute per-key TTL. The clock advances past 30 minutes, the value ages out, and the server places a marker on flash-sale with reason MaxAge. warehouse-dashboard, watching the bucket, receives that marker as a purge operation and learns the value is gone, without any service deleting it.',
  monitoringEndpointsAnimated:
    'The HTTP monitoring port on :8222 serves several endpoints, each answered on demand. A client (nats or curl) issues a GET against n1-east, and the server returns JSON from the matching endpoint: /varz for server and config state, /connz for connections, /jsz for JetStream. Each endpoint lights up only when it is queried — the data is gathered per request, not streamed.',
  advisoryFlowAnimated:
    'A poison message on the shipping consumer is redelivered up to its limit — try 1 through 5. When the last attempt fails, JetStream on n2-east publishes one advisory on $JS.EVENT.ADVISORY.MAX_DELIVERIES.ORDERS.shipping. A monitor subscribed before the event receives it in real time; a subscriber that joins afterward sees nothing, because advisories are plain messages, not stored history.',
  consumerLagAnimated:
    'The ORDERS stream is a log with a LastSeq, and the shipping consumer keeps a Delivered cursor; lag is the gap between them. order-svc appends orders and LastSeq climbs while the cursor trails behind, so the gap turns red. The consumer fetches a batch to the warehouse worker and acks it, the cursor advances, and the gap shrinks green. An unacked message is redelivered.',
  metricsScrapeAnimated:
    "A metrics pipeline in four steps. A Prometheus exporter scrapes the cluster's monitoring port at :8222 with GET /jsz and re-exposes the JSON as Prometheus metric text on :7777. Prometheus stores the samples, Grafana queries them into a chart, and a threshold check below Prometheus fires a CRIT alert when consumer lag climbs past its limit.",
  objectPutGetAnimated:
    'The Object Store splits a large object into chunks. Writing to the INVOICES bucket, order-svc streams four chunk messages and then a metadata message. Reading it back, the warehouse receives the metadata first, then the chunks, and reassembles them in order; a digest check over the reassembled bytes turns green when it verifies.',
  objectRollupAnimated:
    'A client puts the same object name twice into an Object Store backed by the OBJ_INVOICES stream. Each metadata publish carries a Nats-Rollup header, so when the second put lands the stream keeps only the latest ObjectInfo (seq #2) and purges the prior one (seq #1). A re-put leaves one current record, not a history.',
  objectWatchSyncAnimated:
    'A watch on the INVOICES object store is metadata-then-bytes. order-svc puts an object; the watch pushes a metadata-only update to the analytics watcher, which then issues a separate get to fetch the actual bytes. The update tells the watcher what changed; the bytes come only when it asks for them.',
  connectHandshakeAnimated:
    'The NATS client connect handshake, one frame at a time. order-svc opens a TCP connection; the server sends its INFO frame; the client replies with a CONNECT frame carrying its credentials; the server confirms with PONG and the client is connected. The rejected branch shows the same exchange ending in -ERR authorization violation.',
  drainVsCloseAnimated:
    'Close versus drain, shown side by side over the same orders.* subscription. On the top row Close() tears the connection down at once — in-flight messages and pending publishes are dropped. On the bottom row Drain() sends an unsubscribe first, lets the last delivered messages run through the handler, flushes pending work, and only then closes the connection cleanly.',
  reconnectBackoffAnimated:
    'A publisher loses its server and reconnects. Its dial to n1 comes back connection refused, so the client waits out a backoff delay and dials the next server in its pool, n2, which accepts the connection. Messages buffered while it was disconnected then flush to n2, and the dead link to n1 fades.',
  requestRetryAnimated:
    'Two outcomes for a request. When the inventory responder is present but slow, the first request times out with no reply, the client waits a backoff, retries, and the retry gets a reply. When no responder is subscribed at all, the server returns a no-responders 503 immediately instead of leaving the caller to wait for a timeout.',
  slowConsumerAnimated:
    'A fast publisher outruns a slow subscriber. order-svc keeps pushing orders while the warehouse handler drains its pending buffer too slowly; the buffer fills to its limit, the next message cannot be buffered and is dropped, and the server raises a SlowConsumer error back to that subscriber.',
  tlsAuthHandshakeAnimated:
    "TLS and authentication end to end. order-svc completes a TLS handshake with the server, checks the server's certificate against its trusted CA, then sends a CONNECT frame carrying credentials. The server confirms with PONG on success; the rejected branch ends in -ERR authorization violation.",
  serviceRequestAnimated:
    "A single request to a micro service. order-svc sends a request on orders.inventory.check; NATS routes it to the OrderInventory service's check endpoint, which belongs to queue group q. The handler runs and its reply travels back through NATS to the caller's _INBOX. To the client it is an ordinary request/reply.",
  serviceEndpointsAnimated:
    'One service exposes two endpoints, and the request subject picks which one runs. A request to orders.inventory.check reaches the check endpoint directly. The quote endpoint sits inside a shipping group, so its subject is prefixed to shipping.quote — the group adds a subject prefix in front of the endpoints it holds.',
  serviceDiscoveryAnimated:
    'Service discovery, broadcast then targeted. A discovery request fans out from the client to all three OrderInventory instances, and each replies with its INFO. A second request addressed to one instance by its id reaches only that instance, id2, and only it replies with STATS. The same service subjects serve both the broadcast and the point-to-point query.',
  serviceStatsAnimated:
    'The service framework keeps a live stats counter for the OrderInventory service. As requests are handled, num_requests climbs; one request fails and num_errors ticks up alongside it. A read on $SRV.STATS returns the accumulated counters — the framework tracks them automatically, without the handler keeping its own.',
  serviceScalingAnimated:
    'Five OrderInventory instances share the queue group q and all subscribe to orders.inventory.check. Each request is delivered to exactly one instance, and across rounds the server spreads the requests over different members. Adding instances to the same queue group scales the service with no change on the client side.',
  clusterGossipAnimated:
    "n1-east boots as the seed and waits. n2-east and n3-east each boot and dial their one explicit route to n1-east, and each pair exchanges an INFO frame carrying the peer's address. n1-east now knows both joiners, so on the next INFO exchange it tells n2-east about n3-east; n2-east has no route to n3-east yet, so it opens one — an implicit route that completes the mesh. Each server needed only a single seed address; gossip discovered the rest.",
  raftElectionAnimated:
    "A three-peer RAFT group whose leader sends a heartbeat each term. The leader stops — a crash, a hang, or a network cut — so its heartbeat no longer arrives. A follower's election timer fires, so it becomes a candidate, increments the term to T5, votes for itself, and asks the other peers for their votes. Each peer grants at most one vote per term, so once the candidate collects a quorum — two of three — it becomes leader and starts sending heartbeats in the new term, and the others return to being followers.",
  r3ReplicationAnimated:
    "One write through an R=3 stream group. order-svc publishes orders.created to the leader n1-east, which appends the entry to its own log (write WAL) and sends an AppendEntry to the two followers n2-east and n3-east. Each follower writes the entry and replies with an ack. The write commits the instant a quorum — the leader plus one follower — holds it, so the PubAck can return; the third peer applies the entry a moment later. Every peer applies committed entries in the same order, so all three copies converge on the identical log.",
  peerScalingAnimated:
    "Growing and shrinking the ORDERS group. A fourth server, n4-east, is added and streams the entries it is missing (catchup) until its lag reaches zero and stream info shows it current; while it holds no history it cannot win an election, so you do not rely on it as a data-bearing replica until it is caught up. Later a peer is removed: the meta leader re-places its replica onto another server and the dropped peer lets go of its RAFT subscriptions while the rest keep serving.",
  streamSnapshotAnimated:
    "Backing up the ORDERS stream with nats stream backup. The backup client sends a snapshot request to the ORDERS stream and opens an ephemeral inbox to receive the data. The server answers with the stream's config and state, then drains its store as an S2-compressed tar archive and streams stream.tar.s2 to the inbox as a sequence of chunks. The client returns a flow-control ack per chunk; the server keeps a window of unacknowledged chunks in flight and uses the acks as backpressure so a slow disk or link can't be overrun. When the last chunk is acked, backup.json (config and state) and stream.tar.s2 (the messages) land in the off-site backup store.",
  mirrorDRAnimated:
    'Replication as a steady-state DR picture, with no promotion. order-svc publishes to ORDERS on site1, which holds the authoritative copy. ORDERS_DR on site2 is a mirror that pulls new messages across the link continuously, with no client involvement. A lag counter — how many messages ORDERS_DR is behind ORDERS — trends toward zero as the mirror works through the backlog. When lag reaches 0, ORDERS_DR holds a complete, up-to-date copy and site2 stands ready as a hot standby while site1 still serves all traffic.',
  mirrorFailoverAnimated:
    "Disaster-recovery failover in five stages. site1 owns the writable ORDERS stream while ORDERS_DR on site2 mirrors every message across the WAN. site1 goes dark, taking the primary and its clients with it; only the ORDERS_DR mirror survives. Before failing over, an operator checks the mirror's lag and waits until ORDERS_DR reports zero messages behind. The mirror is then promoted — reconfigured into a standalone, writable ORDERS stream on site2 — and order-svc and the consumers reconnect to site2 and resume from where the mirror left off.",
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
  accountIsolationAnimated: 'Account isolation (animated)',
  crossAccountExportAnimated: 'One subject across the account boundary (animated)',
  resolverPushAnimated: 'Push an account, then connect (animated)',
  tlsFirstHandshakeAnimated: 'Default vs TLS-first handshake (animated)',
  centralizedAuthAnimated: 'Centralized authentication (animated)',
  decentralizedAuthAnimated: 'The trust chain at connect time (animated)',
  authCalloutAnimated: 'Auth callout flow (animated)',
  jetStreamContrastAnimated: 'Core NATS vs JetStream (animated)',
  jetStreamConsumersAnimated: 'Consumers with independent cursors (animated)',
  kvWatchAnimated: 'KV watch — snapshot then live (animated)',
  kvCasRetryAnimated: 'KV compare-and-swap retry (animated)',
  kvTtlExpiryAnimated: 'KV per-key TTL expiry (animated)',
  monitoringEndpointsAnimated: 'Monitoring endpoints (animated)',
  advisoryFlowAnimated: 'Advisory on max deliveries (animated)',
  consumerLagAnimated: 'Consumer lag (animated)',
  metricsScrapeAnimated: 'Metrics scrape pipeline (animated)',
  objectPutGetAnimated: 'Object put and get (animated)',
  objectRollupAnimated: 'Object rollup keeps one record (animated)',
  objectWatchSyncAnimated: 'Object watch and sync (animated)',
  connectHandshakeAnimated: 'Connect handshake (animated)',
  drainVsCloseAnimated: 'Drain vs close (animated)',
  reconnectBackoffAnimated: 'Reconnect with backoff (animated)',
  requestRetryAnimated: 'Request timeout and retry (animated)',
  slowConsumerAnimated: 'Slow consumer (animated)',
  tlsAuthHandshakeAnimated: 'TLS and auth handshake (animated)',
  serviceRequestAnimated: 'Service request / reply (animated)',
  serviceEndpointsAnimated: 'Service endpoints (animated)',
  serviceDiscoveryAnimated: 'Service discovery (animated)',
  serviceStatsAnimated: 'Service stats (animated)',
  serviceScalingAnimated: 'Scaling a service with a queue group (animated)',
  clusterGossipAnimated: 'One seed grows into a full mesh (animated)',
  raftElectionAnimated: 'A follower wins a leader election (animated)',
  r3ReplicationAnimated: 'A write commits by quorum (animated)',
  peerScalingAnimated: 'Add a peer, then remove one (animated)',
  streamSnapshotAnimated: 'Stream snapshot streaming (animated)',
  mirrorDRAnimated: 'Mirror as a hot standby (animated)',
  mirrorFailoverAnimated: 'Promote a mirror on site loss (animated)',
  configReloadAnimated: 'Config reload without a reconnect (animated)',
  lameDuckUpgradeAnimated: 'Lame-duck drain during a rolling upgrade (animated)',
  crdReconcileAnimated: 'NACK reconcile and self-heal (animated)',
  asyncOrderingAnimated: 'A late async retry lands out of order (animated)',
  atomicBatchAnimated: 'An atomic batch commits all-or-nothing (animated)',
  fastIngestAnimated: 'Fast ingest widens its ack window (animated)',
  nodeLossAnimated: 'R=3 survives losing one server (animated)',
  leaderFailoverAnimated: 'A follower takes over when the leader fails (animated)',
  batchGetAnimated: 'Batch Direct Get over one request (animated)',
  deleteMessageAnimated: 'Deleting a message leaves a gap (animated)',
  directGetAnimated: 'Direct Get reads from any replica (animated)',
  discardNewAnimated: 'Discard New rejects writes when full (animated)',
  discardOldAnimated: 'Discard Old drops the oldest when full (animated)',
  leafNodeAnimated: 'A leaf node extends a hub to the edge (animated)',
  massiveScaleAnimated: 'The composed Acme topology (animated)',
  maxAgeAnimated: 'MaxAge expires messages by age (animated)',
  maxMsgsAnimated: 'MaxMsgs keeps a fixed message count (animated)',
  messageTtlAnimated: 'Per-message TTL versus MaxAge (animated)',
  mirrorCopyAnimated: 'A mirror catches up and stays current (animated)',
  mqttBridgeAnimated: 'An MQTT topic becomes a NATS subject (animated)',
  mqttRetainedAnimated: 'A retained message serves late subscribers (animated)',
  purgeStreamAnimated: 'Purge clears data, not the counter (animated)',
  sequenceGapAnimated: 'A deletion leaves a permanent gap (animated)',
  sourcesMergeAnimated: 'Sources merge many streams into one (animated)',
  subjectTransformAnimated: "A stream's subject transform (animated)",
  superClusterAnimated: 'Two clusters join into a super-cluster (animated)',
  topologiesClusterMesh: 'One seed grows into a full mesh (animated)',
  topologiesSingleServer: 'A single server topology (animated)',
  wsLeafNodeAnimated: 'A leaf node joins its hub over WebSocket (animated)',
  wsUpgradeAnimated: 'One connection upgrades from HTTP to NATS (animated)',
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
