# Monitoring & Observability Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

> ## ⚠️ CONTINUITY OVERRIDE — authoritative, supersedes any naming below
>
> This chapter observes the **same physical cluster** as the done Topologies
> chapter. Use Topologies' exact names. Wherever this spec writes `n1`/`n2`/`n3`,
> the page MUST use **`n1-east`/`n2-east`/`n3-east`**; wherever it writes
> `orders-cluster`, the page MUST use the cluster name **`east`**. The HTTP
> monitoring port is **8222**. This override wins over any conflicting names below.

---

## 1. Goal

Land the **Monitoring & Observability** deep dive in the "Learn" section — the
Operate-half chapter that teaches a reader how to *watch* a running NATS
deployment: where the numbers come from, which ones matter, and how to turn them
into alerts and dashboards.

It uses the same Acme ORDERS world the four DONE chapters built — the 3-node
cluster, the `ORDERS` stream, the `shipping` pull consumer, the `analytics`
consumer — and observes it. The chapter does **not** add new infrastructure. It
adds a new lens on infrastructure that already exists.

The chapter answers four questions, one per content page:

- Where does server state come from on the wire? → the HTTP monitoring port `:8222`.
- How do I tell a stream and its consumers are healthy? → stream/consumer state and lag.
- How do I learn about events I did not poll for? → `$SYS` and JetStream advisories.
- How do I store, alert, and chart all of it? → Prometheus, Surveyor, Grafana.

### 1.1 The hard problem for this chapter: it is the FIRST Operate chapter

Monitoring is the entry point to the Operate half. The reader arrives knowing how
to *build* (Core NATS, JetStream, Security, Topologies) but not how to *run* in
production. The deep dive earns its place by being strictly about **observation**:

- This chapter = **what to watch and where it comes from.**
- The fix for what you observe (scale, back up, upgrade) = the relevant **Operate** chapter.
- The mechanics behind what you observe (RAFT, leader election) = **Clustering**.
- The exact field type of every metric = **Reference**.

If a paragraph tells the reader how to *change* the deployment in response to a
metric, it has crossed the boundary. Name the symptom, link the fix, move on.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Cluster/RAFT mechanics** behind leader election, quorum, placement →
  `/learn/clustering` (`raft-and-leaders`, `replication-and-r3`).
- **How to FIX what you observe** — backup/restore a lagging stream, scale a
  consumer pool, roll an upgrade → `/learn/backup-recovery`, `/learn/deployment`.
- **Exact metric field types, defaults, and full endpoint field lists** →
  `/reference/system/monitor/*`, `/reference/system/advisory`, `/reference/jetstream/api`.
- **Re-teaching what a stream/consumer/ack/lag IS** — assumed from
  `/learn/jetstream`. This chapter reads their *state*, it does not re-explain them.
- **Securing the monitoring port** (TLS, auth, system account access) → named in
  one Pitfall, taught in `/learn/security`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Propose one NEW NatsFlow scenario per content page that carries a genuine message/control flow (4 new). Reuse `jetStreamConsumersAnimated` on `jetstream-health` only if the new one is dropped. |
| Depth angle | **What to watch + where it comes from on the wire.** Every metric is traced to its source endpoint or subject. No "how to fix." |
| Running scenario | **The fully grown Acme ORDERS deployment** — the 3-node cluster, `ORDERS` stream, `shipping` + `analytics` consumers from the four DONE chapters. Observe it; add nothing. |
| Reader assumption | Has read JetStream and Topologies deep dives. Knows what a stream, consumer, ack, lag, and cluster are. New to running NATS in production. |
| Versioning | Unversioned, concepts only. Reference is the versioned, exhaustive layer. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/monitoring/` (served at `/learn/monitoring`). The sidebar
(`sidebars-learn.ts`) already lists all 6 pages in order — **no sidebar edit**:

```
learn/monitoring/
  index.md                       # 1 — chapter intro (sidebar_position: 1)
  monitoring-endpoints.md        # 2
  jetstream-health.md            # 3
  advisories-and-events.md       # 4
  prometheus-and-dashboards.md   # 5
  where-next.md                  # 6
```

Each stub currently has only `title` frontmatter + an H1 + a TODO comment. The
writer replaces the whole file with the full numbered frontmatter
(`id, title, sidebar_position, description`) and content per §5.

### 3.1 No cross-link edits required

Unlike Core NATS, this chapter adds no `:::tip` into `docs/concepts/`. There is
no monitoring concept primer to link from. (The JetStream `where-next` already
points to `/learn/monitoring`.)

### 3.2 URL stability

`/learn/monitoring/<page>` URLs are part of the spec.

---

## 4. Master scenario (PINNED — the grown Acme ORDERS deployment)

This is the SAME Acme order platform from the four DONE chapters, now at full
size, observed in production. **Add no new entities.** Same payload, byte-identical
everywhere:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Pinned entities (same names, every page — reuse, never rename):

| Layer | Entity | Used on page |
|---|---|---|
| Order subjects | `orders.created`, `orders.shipped`, `orders.cancelled`; regional `orders.us.created`, `orders.eu.created` | all |
| Core NATS | publisher `order-svc`; subscribers `warehouse`, `notifications`, `analytics`; `inventory` responder on `orders.inventory.check`; `packers` queue group | monitoring-endpoints (connz shows them) |
| JetStream | `ORDERS` stream capturing `orders.>`; `shipping` pull consumer; `analytics` consumer filtering `orders.shipped` | jetstream-health, advisories, prometheus |
| Security | operator `ACME`; account `ORDERS` (user `order-svc`); account `ANALYTICS` (user `analytics-reader`); export/import of `orders.shipped` | named in monitoring-endpoints (acc filter), prometheus (labels) |
| Topology | single server → 3-node cluster `n1`/`n2`/`n3` → supercluster → leaf nodes | monitoring-endpoints (routez), advisories (leader elected) |

**The observation story this chapter tells:** the `shipping` pull consumer falls
behind. The chapter watches that happen four ways — as `num_pending` on `/jsz`
(monitoring-endpoints), as lag computed from `LastSeq − Delivered.StreamSeq`
(jetstream-health), as a `max_deliver` advisory when a poison order exhausts its
deliveries (advisories-and-events), and as a `nats_consumer_num_pending` time
series climbing on a Grafana panel (prometheus-and-dashboards).

**Canonical lag snapshot used across pages (keep these numbers identical):**

```
Stream ORDERS:   LastSeq = 1000, Msgs = 1000, NumSubjects = 4
shipping consumer: Delivered.StreamSeq = 980, NumPending = 20,
                   NumAckPending = 5, NumRedelivered = 3
→ 20 orders waiting for delivery (lag)
→ 5 orders in-flight (delivered, not yet acked)
→ 3 redeliveries since the consumer was created
```

Rules: the deployment is the cluster from Topologies; the monitoring port is
`:8222` on each node; the Prometheus exporter runs **external** to NATS on
`:7777`. No page introduces a new stream, consumer, account, or subject. Carry
the session forward: a reader keeps the cluster running and queries it, then
attaches a subscription, then attaches an exporter, page by page.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four DONE chapters)

- Rust-book tone: welcoming, plain, second person. Active voice, present tense. No filler/hedging.
- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before its own paragraph.
- ≤2 NEW concepts per content page. A third is deferred to a later page or linked out.
- Teach what MATTERS; link Reference for the exhaustive knob list.
- Length 150–400 source lines per content page. `index`/`where-next` may run longer.

**Content page skeleton (mandatory order):**
frontmatter (`id, title, sidebar_position, description`) → intro → concept H2s
with embedded examples → `## Pitfalls` (2–4 concept-scoped gotchas, do/don't, one
runnable handling example; insert BEFORE `## Where you are`) → `## Where you are`
→ `## What is next` → `## See also` (≤3 links).

**index skeleton:** frontmatter (`id: index, sidebar_position: 1`) → intro →
"By the end you will have" → "Who this is for" → "How to read it" → `## Map`
table linking every page → `## Prerequisites`.

**where-next skeleton:** recap "the whole game" → "Where the details live now" →
`## Sibling deep dives` → `## Where you are` → `## Production checklist` (collects
every content page's Pitfalls action items, grouped per page with a link to that
page's `#pitfalls`) → `## See also`.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| monitoring endpoint | "monitoring endpoint" (the HTTP path) | "API", "monitoring API", "admin endpoint" |
| monitoring port | "the monitoring port `:8222`" | "admin port", "dashboard port", "stats port" |
| endpoint names | `/varz`, `/connz`, `/routez`, `/jsz`, `/healthz` (with leading slash, code font) | "the varz API", "varz call" |
| metric | "metric" (a single named number) | "stat", "counter" loosely, "datapoint" in prose |
| state | "stream state" / "consumer state" (the live numbers) | "stream stats", "status object" |
| lag | "lag" = messages a consumer has not yet been delivered (`num_pending`) | "backlog" loosely, "delay", "queue depth" |
| in-flight | "in-flight" = delivered but not yet acked (`num_ack_pending`) | "pending acks" in prose (use the field name only in code) |
| redelivery | "redelivery" / "redelivered" (`num_redelivered`) | "retry count" in prose |
| advisory | "advisory" = a transient JSON message on `$JS.EVENT.ADVISORY.*` | "alert", "notification", "log line" |
| system event | "system event" = a message on `$SYS.*` | "audit event", "sys message" |
| transient | "advisories are transient" (published once, not stored) | "ephemeral" (overloaded with consumers), "fire-and-forget" |
| health check | "health check" = a `/healthz` query with an answer of ok/error | "liveness probe" except one k8s framing mention |
| scrape | "scrape" = the exporter/Prometheus polling the endpoint | "poll" loosely, "harvest", "pull" (pull is a consumer term) |
| exporter | "the exporter" = prometheus-nats-exporter | "the agent", "the collector" (collector is its internal part) |
| time series | "time series" (what Prometheus stores) | "history", "log of metrics" |
| dashboard | "dashboard" = a Grafana view | "panel" for the whole board (a panel is one chart) |

**Field-name discipline:** field names like `num_pending`, `last_seq`,
`delivered.stream_seq`, `num_redelivered`, `total_connections`, `connections` are
written verbatim in `code font` when quoting wire JSON or CLI output. In prose,
use the locked English term ("lag", "in-flight", "redelivery") and introduce the
field name once in parentheses.

### 5.3 Boundary lockfile (banned cross-chapter vocabulary)

Do NOT teach, only name-and-link, these. Using any as if it belonged here is a defect.

- **RAFT / quorum / leader election / placement / peer set** — these explain
  *why* a leader changed; the advisory only *reports* it. Name the advisory,
  link `/learn/clustering`. Do not explain how an election runs.
- **"Fix it by …"** verbs: scale, resize, rebalance, back up, restore,
  snapshot, upgrade, roll, drain. The chapter observes; it never prescribes the
  repair. Link the Operate chapter that owns the fix.
- **Exact defaults and types** ("the default `max_deliver` is …", "`num_pending`
  is a uint64") — link `/reference/...`; do not assert the value.
- **Re-defining stream/consumer/ack/durable/pull/push** — assumed known. Use
  them; never spend a paragraph defining them. (The JetStream chapter owns those.)
- **Securing the port** beyond one Pitfall pointer — link `/learn/security`.

When the reader would want any of these, name the gap in one sentence and link out.

### 5.4 Reference handoff phrase (greppable)

Use this exact shape so a later grep can find every handoff:

> The full set of `/jsz` fields is documented in
> [Reference → jsz](/reference/system/monitor/jsz). We only need the lag fields here.

Each page ends with a **`## See also`** section: 1–3 links, hard max 3, drawn from §5.5.

### 5.5 VALID internal link targets (allow-list — only paths that resolve)

**Reference (verified present in the built reference tree):**

- `/reference/` (root)
- `/reference/system/monitor` (index)
- `/reference/system/monitor/varz`
- `/reference/system/monitor/connz`
- `/reference/system/monitor/routez`
- `/reference/system/monitor/jsz`
- `/reference/system/monitor/healthz`
- `/reference/system/monitor/subsz`
- `/reference/system/monitor/statsz`
- `/reference/system/advisory` (index)
- `/reference/system/advisory/client-connect`
- `/reference/system/advisory/client-disconnect`
- `/reference/system/metric/service-latency`
- `/reference/jetstream/api` (index)
- `/reference/jetstream/api/consumer`
- `/reference/jetstream/api/stream`
- `/reference/config/http_port`

**Concepts (existing pages only):**

- `/concepts/jetstream`, `/concepts/topologies`, `/concepts/security`, `/concepts/subjects`

**Learn siblings (REAL slugs only):**

- `/learn/monitoring/<slug>` — `index`, `monitoring-endpoints`, `jetstream-health`, `advisories-and-events`, `prometheus-and-dashboards`, `where-next`
- `/learn/jetstream` (+ `your-first-consumer`, `pull-consumers`, `acknowledgment`, `surviving-node-loss`, `worker-pool`)
- `/learn/topologies` (+ `your-first-cluster`, `jetstream-in-a-cluster`, `super-clusters`)
- `/learn/clustering` (+ `raft-and-leaders`, `replication-and-r3`)
- `/learn/security` (+ `authorization`, `accounts-and-multitenancy`)
- `/learn/services` (+ `observability`)
- `/learn/backup-recovery`
- `/learn/deployment`

> Note: there is **no** JetStream-advisory reference page. JetStream advisory
> links MUST point to `/reference/system/advisory` (the advisory index) or
> `/reference/jetstream/api`. Do NOT invent `/reference/jetstream/advisory/...`.

Do NOT invent any path outside this list. Every external tool (prometheus-nats-exporter,
nats-surveyor, Grafana) is referenced by name in prose or as a plain external URL
in a fenced block, never as an internal `/...` link.

---

## 6. Example pattern (matches `CLAUDE.md`)

This chapter mixes three snippet kinds:

1. **`nats-example` div** — for client-library-portable operations: reading
   consumer/stream state, subscribing to advisories. These have a genuine
   multi-language form (every client can call `consumer_info`).

   ```mdx
   <div class="nats-example"
        data-type="learn-monitoring-<slug>-<snippet>"
        data-languages="cli,js,go,python,java,rust,csharp"></div>
   ```

   Author the matching CLI source at
   `static/examples/snippets/cli/learn/monitoring/<slug>/<snippet>.sh`
   (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to form
   the `data-type`; they MUST match exactly. Commit every `.sh`.

2. **Plain fenced `bash`** — for things that are server-side, HTTP, or
   CLI-only: `curl http://localhost:8222/jsz`, `nats server check`,
   `nats server report`, `nats events`, server config blocks. No div — these have
   no client-library equivalent.

3. **Plain fenced output** — JSON snippets from an endpoint or CLI report, shown
   to read fields. Use the pinned lag snapshot numbers from §4.

The pinned ORDERS payload, entity names, and lag numbers are identical across
every page and language.

### 6.1 Proposed `nats-example` snippets (CLI source files to author)

| Page | `data-type` | CLI `.sh` path | Shows |
|---|---|---|---|
| jetstream-health | `learn-monitoring-jetstream-health-consumerState` | `cli/learn/monitoring/jetstream-health/consumerState.sh` | `nats consumer info ORDERS shipping` → lag/in-flight/redelivery fields |
| jetstream-health | `learn-monitoring-jetstream-health-streamState` | `cli/learn/monitoring/jetstream-health/streamState.sh` | `nats stream info ORDERS` → `LastSeq`, `Msgs`, subjects |
| advisories-and-events | `learn-monitoring-advisories-and-events-subscribeAdvisories` | `cli/learn/monitoring/advisories-and-events/subscribeAdvisories.sh` | subscribe `$JS.EVENT.ADVISORY.>` and read a `max_deliver` advisory |
| advisories-and-events | `learn-monitoring-advisories-and-events-persistAdvisories` | `cli/learn/monitoring/advisories-and-events/persistAdvisories.sh` | Pitfall fix: a durable subscriber that records advisories so none are missed |
| prometheus-and-dashboards | `learn-monitoring-prometheus-and-dashboards-checkConsumer` | `cli/learn/monitoring/prometheus-and-dashboards/checkConsumer.sh` | `nats server check consumer ORDERS shipping --pending-critical 100` (alert thresholds) |

CLI-only snippets (`/varz`, `/jsz`, `/connz`, `/routez`, `/healthz` curls;
`nats server report`; exporter launch; Prometheus/Grafana config) stay as plain
fenced `bash` — no div, no `.sh` file.

### 6.2 NatsFlow scenarios

This run maximizes animation. Each content page that carries a real flow gets a
NEW scenario (4 total). Embed with:

```mdx
<div class="nats-flow" data-scenario="<camelCaseName>Animated" data-width="600" data-height="350"></div>
```

| Page | Scenario | New or reuse |
|---|---|---|
| `monitoring-endpoints` | `monitoringEndpointsAnimated` | NEW |
| `jetstream-health` | `consumerLagAnimated` | NEW |
| `advisories-and-events` | `advisoryFlowAnimated` | NEW |
| `prometheus-and-dashboards` | `metricsScrapeAnimated` | NEW |
| `index`, `where-next` | — | none (no message flow to animate) |

Existing scenario eligible for reuse if a NEW one is cut: `jetStreamConsumersAnimated`
(on `jetstream-health`). All four NEW scenario specs are in §9.

NEVER reference a `data-scenario` name that is neither in §9 nor already wired —
it renders an error box.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running observation session. ≤2 NEW concepts each.

| # | Slug | NEW concepts (≤2) | stateIn → stateOut | Defers / links |
|---|---|---|---|---|
| 1 | `index` | (none — orientation) The chapter observes the grown ORDERS deployment four ways. Map of the five pages. | in: reader has the cluster + ORDERS stream + shipping/analytics consumers running from prior chapters. out: knows the four lenses (endpoints, JS health, advisories, dashboards) and which page owns each. | Fixing what you see → `/learn/backup-recovery`, `/learn/deployment`; mechanics → `/learn/clustering`. |
| 2 | `monitoring-endpoints` | (1) the HTTP monitoring port `:8222` serves on-demand JSON: `/varz` (server), `/connz` (clients), `/routez` (cluster routes); (2) every endpoint takes query params to filter/page (`?acc=ORDERS`, `?subscriptions=true`, `?sort=ByIdle&limit=10`), and `/jsz` exposes JetStream counts. | in: cluster running. out: reader can `curl` each node's `:8222`, read connection/route counts for ORDERS, and knows `/jsz` is the JetStream lens (detail on next page). NatsFlow `monitoringEndpointsAnimated`. | `/healthz` semantics → page 4? No — keep `/healthz` here as a third concept DEFERRED to a single short subsection that links `/reference/system/monitor/healthz`. Exact fields → `/reference/system/monitor/*`. |
| 3 | `jetstream-health` | (1) stream state (`Msgs`, `LastSeq`, `NumSubjects`) and consumer state (`num_pending`, `num_ack_pending`, `num_redelivered`, `delivered.stream_seq`, `ack_floor`); (2) **lag = `LastSeq − Delivered.StreamSeq`** — what "the shipping consumer is behind" means as a number, plus in-flight and redelivery. | in: can hit `/jsz`. out: reads `nats consumer info ORDERS shipping`, computes lag for the pinned snapshot (20 waiting, 5 in-flight, 3 redelivered), knows which field is which. NatsFlow `consumerLagAnimated`. | Why the consumer fell behind / how to scale it → `/learn/jetstream/worker-pool`, `/learn/deployment`. Exact field types → `/reference/jetstream/api/consumer`. |
| 4 | `advisories-and-events` | (1) advisories — transient JSON messages on `$JS.EVENT.ADVISORY.v1.<type>.<stream>.<consumer>` published once per event (`max_deliver`, `consumer_action`, `nak`); (2) system events on `$SYS.*` (`CONNECT`/`DISCONNECT`, the `STATSZ` heartbeat) and the leader-elected advisory you only *observe*, never explain. | in: knows the shipping consumer can exhaust deliveries. out: subscribes to `$JS.EVENT.ADVISORY.>`, sees a `max_deliver` advisory for `ORDERS.shipping`, knows advisories are not stored. NatsFlow `advisoryFlowAnimated`. | What a leader election IS → `/learn/clustering/raft-and-leaders`. Reacting to a max-deliver (DLQ pattern) → `/learn/jetstream/acknowledgment`. Schemas → `/reference/system/advisory`, `/reference/jetstream/api`. |
| 5 | `prometheus-and-dashboards` | (1) prometheus-nats-exporter scrapes `:8222` and re-exposes `/metrics` on `:7777` as time series (`nats_consumer_num_pending`, `nats_consumer_num_redelivered`, `nats_stream_messages`), labelled by `account`, `stream_name`, `consumer_name`; (2) the alerting + visualization layer — `nats server check` thresholds, nats-surveyor, Grafana dashboards reading the exporter. | in: knows the raw numbers and where they live. out: knows the production loop — exporter scrapes → Prometheus stores → Grafana charts → `nats server check` alerts. NatsFlow `metricsScrapeAnimated`. | Sizing/running the exporter & Prometheus → `/learn/deployment`. Service-latency metrics → `/learn/services/observability`. Exact metric names/types → `/reference/`. |
| 6 | `where-next` | (none) Recap the four lenses; "the whole game" = numbers come from endpoints, lag comes from consumer state, surprises come from advisories, history comes from the exporter. Production checklist collecting every page's Pitfalls. | in: reader has watched ORDERS four ways. out: a map of Operate siblings and Reference. | — |

**Concept-budget guardrails:**

- `monitoring-endpoints` keeps `/healthz` to a short DEFERRED subsection (link
  to `/reference/system/monitor/healthz`); the two taught concepts are
  endpoints-serve-JSON and query-params. `/jsz` is introduced only as "the
  JetStream lens, detailed next page."
- `jetstream-health` does NOT re-explain consumers/acks (assumed). It only reads
  their *state* and defines *lag* as a computed number.
- `advisories-and-events` treats leader-elected as an *observed* fact and links
  the mechanics out — it is not a third taught concept.

---

## 8. Research domains (fact pack — verified, fold in)

Source of truth (all verified February 2025, HEAD): `nats-server` monitoring
endpoints, `jsm.go` consumer/stream/advisory schemas, `natscli` server commands,
`prometheus-nats-exporter` collectors. The detailed fact pack supplied with this
task is the canonical input; the keys below map facts to pages.

| Key | Focus (fold into page) |
|---|---|
| `M_ENDPOINTS` | Monitoring port `:8222` (config `http_port`/`monitor`). `/varz` (server: version, connections vs total_connections, in/out msgs, slow_consumers, nested jetstream). `/connz` (per-conn cid, account, authorized_user, RTT, pending, subs; params `auth`, `subscriptions`, `state`, `sort`, `offset`/`limit`, `acc`, `cid`). `/routez` (cluster routes: rid, remote_id, RTT, pending; param `subscriptions`). `/jsz` (streams/consumers counts, meta leader; params `acc`, `accounts`, `streams`, `consumer`, `config`, `leader_only`). `/healthz` (ok/error, params `js-enabled-only`, `js-server-only`, `js-meta-only`, `account`/`stream`/`consumer`, `details`; 200 vs 503). → page monitoring-endpoints. |
| `M_JSHEALTH` | StreamState (`Msgs`, `Bytes`, `FirstSeq`/`LastSeq`, `NumSubjects=4`, `Consumers`). ConsumerInfo (`Delivered{consumer_seq,stream_seq}`, `AckFloor`, `NumAckPending`, `NumRedelivered`, `NumWaiting`, `NumPending`, `Paused`). **Lag = `stream.LastSeq − consumer.Delivered.StreamSeq`** (server reports `NumPending` for pull). Pinned snapshot: LastSeq 1000, Delivered 980, NumPending 20, NumAckPending 5, NumRedelivered 3. → page jetstream-health. |
| `M_ADVISORIES` | Subject `$JS.EVENT.ADVISORY.v1.<type>.<stream>.<consumer>`; wildcard `$JS.EVENT.ADVISORY.>`. Types: `max_deliver` (`io.nats.jetstream.advisory.v1.max_deliver`, fields stream/consumer/stream_seq/deliveries), `consumer_action` (create/delete), `nak`, `terminated`, `stream_leader_elected`/`consumer_leader_elected` (leader + replicas; OBSERVE only). System events on `$SYS`: `$SYS.ACCOUNT.{acc}.CONNECT`/`DISCONNECT`, `$SYS.SERVER.{id}.STATSZ` (30s heartbeat), `SHUTDOWN`/`LAMEDUCK`. Advisories are TRANSIENT — not stored in any stream. → page advisories-and-events. |
| `M_PROMETHEUS` | prometheus-nats-exporter (`-s http://localhost:8222`, serves `/metrics` on `:7777`, stateless, scrape on-demand). jsz collector metrics: `nats_jetstream_streams`, `nats_jetstream_consumers`, `nats_stream_messages`, `nats_stream_bytes`, `nats_consumer_num_pending`, `nats_consumer_num_redelivered`, `nats_consumer_num_ack_pending`, source/mirror lag. Labels: `server_id`, `server_name`, `cluster`, `account`/`account_name`, `stream_name`, `stream_leader`, `consumer_name`. nats-surveyor (wraps `nats server report`/`check`). Grafana community dashboards (Prometheus data source). → page prometheus-and-dashboards. |
| `M_CLI` | `nats server report jetstream [--json]`; `nats server check {jetstream,stream,consumer,meta,connection,server}` with thresholds (`--pending-critical`, `--redelivery-critical`, `--messages-warn/-critical`) and Nagios/Prometheus/JSON output; `nats events [--advisory-filter]`; `nats consumer info`, `nats stream info`. Direct `curl http://localhost:8222/<endpoint>?<params> | jq`. → all pages. |
| `M_PITFALLS` | The 5 verified production gotchas (§ below) — distribute across the four content pages and collect in where-next. |

### 8.1 Pitfalls allocation (each content page gets 2–3; where-next collects all)

- **monitoring-endpoints:**
  - *Connection flapping inflates `total_connections`* — alert on `connections`
    (active) not `total_connections` (lifetime); watch `slow_consumers`.
  - *`/jsz?accounts=true&streams=true&consumer=true` is slow at scale* — scope to
    `?acc=ORDERS`, page with `offset`/`limit`, or a scrape will time out.
  - *(pointer)* The monitoring port is unauthenticated by default — restrict it →
    `/learn/security`.
- **jetstream-health:**
  - *Pull-consumer lag (`num_pending`) is only fresh when a client fetches* — if
    the client crashed, the number is stale; cross-check `Delivered.StreamSeq`
    against `stream.LastSeq` yourself.
  - *In-flight (`num_ack_pending`) is not lag* — confusing the two hides a stuck
    handler; read both.
  - *A filtered consumer's `num_pending` counts only matching subjects* — empty
    pending does not mean an empty stream.
- **advisories-and-events:**
  - *Advisories are transient* — if you are not subscribed when the event fires,
    you never learn it happened; run a durable subscriber (the runnable fix).
  - *A `max_deliver` advisory is the only built-in signal a message was dropped* —
    JetStream has no dead-letter queue; subscribe or lose poison orders silently.
  - *(pointer)* A leader-elected advisory reports a flap; the *why* is
    `/learn/clustering`.
- **prometheus-and-dashboards:**
  - *`/healthz?js-server-only=true` checks only the local node* — it returns 200
    even with no cluster quorum; use `?js-meta-only=true` for the meta cluster.
  - *Set explicit `nats server check` thresholds* — defaults do not know your
    SLA; a check with no `--pending-critical` never fires.
  - *The exporter stores no history* — it is stateless; without Prometheus behind
    it you only ever see "now."

---

## 9. NatsFlow — NEW scenarios to build

Four new scenarios. Each needs name, page, and node/edge description. All names
end in `Animated`, camelCase. Add to `src/components/NatsFlow/scenarios/` and
register in `scenarios/index.ts` (both the camelCase and PascalCase exports, per
the existing pattern). Brand colors per `CLAUDE.md`.

1. **`monitoringEndpointsAnimated`** — page `monitoring-endpoints`.
   Nodes: a `nats CLI`/`curl` client, the cluster node `n1` exposing port `:8222`,
   and a small stack of endpoint cards (`/varz`, `/connz`, `/jsz`). Animated edges:
   client sends `GET /varz` → `n1` returns a JSON card; then `GET /connz?acc=ORDERS`
   → returns a list card; then `GET /jsz` → returns a streams/consumers card. Shows
   the synchronous request → on-demand JSON response cycle of the monitoring port.

2. **`consumerLagAnimated`** — page `jetstream-health`.
   Nodes: `order-svc` publisher, the `ORDERS` stream (a log with `LastSeq=1000`),
   the `shipping` consumer cursor at `Delivered=980`, and a `warehouse` worker.
   Animated edges: order-svc appends messages advancing `LastSeq`; the gap between
   `LastSeq` and the consumer cursor highlights as **lag = 20**; the worker
   fetches+acks, advancing the cursor and shrinking the gap; a failed message
   pulses back as a redelivery, ticking `NumRedelivered`. Shows lag, in-flight,
   and redelivery as positions on the log.

3. **`advisoryFlowAnimated`** — page `advisories-and-events`.
   Nodes: the `shipping` consumer, the JetStream layer inside `n2`, the subject
   `$JS.EVENT.ADVISORY.v1.max_deliver.ORDERS.shipping`, and a monitoring
   subscriber. Animated edges: a poison order is delivered repeatedly (deliveries
   tick 1→5); on hitting the limit the JetStream layer emits one advisory message
   onto the advisory subject; the monitoring subscriber receives it. A second,
   greyed edge shows a subscriber that connected *after* the event receiving
   nothing (advisories are transient). Shows once-per-event publication and the
   miss-if-not-subscribed property.

4. **`metricsScrapeAnimated`** — page `prometheus-and-dashboards`.
   Nodes: cluster node `:8222`, the exporter `:7777`, Prometheus, Grafana, and an
   alerting check. Animated edges: exporter sends `GET /jsz` to `:8222` on a
   scrape tick → receives JSON → transforms to `nats_consumer_num_pending{...}` on
   `/metrics`; Prometheus scrapes `:7777` and appends a point to a rising lag time
   series; Grafana queries Prometheus and a panel line climbs; the check fires
   CRIT when the series crosses the threshold. Shows the full scrape → store →
   chart → alert loop.

### 9.1 Reused scenarios

None required if all four new scenarios ship. If `consumerLagAnimated` is cut,
reuse `jetStreamConsumersAnimated` on `jetstream-health`.

---

## 10. Acceptance criteria

Chapter-wide:

- [ ] All 6 `/learn/monitoring/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is one of the four NEW scenarios (§9) or a
      wired reuse — no fabricated names.
- [ ] The four NEW NatsFlow scenarios are authored and registered in
      `scenarios/index.ts` (camelCase + PascalCase exports).
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Every internal link is in the §5.5 allow-list and resolves (special care:
      JetStream advisory links go to `/reference/system/advisory`, NOT an invented path).
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms.
- [ ] Boundary lockfile (§5.3) holds — no RAFT mechanics, no "fix it by" verbs,
      no asserted defaults, no re-defining stream/consumer/ack.
- [ ] Pinned entities and the canonical lag snapshot (§4) are byte-identical
      everywhere they appear.

Per page:

- [ ] ≤2 NEW concepts; `## Pitfalls` present (BEFORE `## Where you are`) with 2–4
      gotchas and ≥1 runnable handling example; one `## See also` (≤3 links).
- [ ] Content page order: frontmatter → intro → concept H2s → Pitfalls → Where
      you are → What is next → See also.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] `index` has the `## Map` table linking all 5 pages + `## Prerequisites`.
- [ ] `where-next` `## Production checklist` collects every content page's Pitfalls
      action items, grouped per page, each group linking `#pitfalls`.
- [ ] Every `nats-example` div (§6.1) has a matching committed CLI `.sh`;
      `data-type` matches the file path exactly; CLI is the default tab.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, `</parameter>`) in any file.

---

## 11. Out of scope

- Fixing what you observe (scaling, backup/restore, upgrades) — linked to Operate
  siblings, none taught here.
- RAFT / clustering internals behind leader-elected advisories — linked to `/learn/clustering`.
- Exact metric field types, defaults, and full endpoint field lists — linked to `/reference`.
- Securing the monitoring port beyond one Pitfall pointer — linked to `/learn/security`.
- Re-teaching stream/consumer/ack/lag definitions — assumed from `/learn/jetstream`.
- Versioned Learn content; translation; search tuning.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
