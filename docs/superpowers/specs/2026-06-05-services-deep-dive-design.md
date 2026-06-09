# Services Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Services** deep dive in the "Learn" section — the Develop-half
chapter that teaches the NATS **micro** Services framework: the thin layer that
turns a hand-rolled request-reply responder into a named, versioned, discoverable
service with built-in load balancing and observability.

It sits **above** the Core NATS deep dive. Core NATS taught request-reply and
queue groups as raw mechanisms. This chapter does not re-teach them — it shows
the framework that wires them together for you, so a responder gains discovery
(`$SRV.PING`/`INFO`/`STATS`), per-endpoint stats, and N-instance scaling without
new infrastructure.

### 1.1 The hard problem for this chapter: overlap with Core NATS

The Services framework is **built on** request-reply + queue groups, which the
Core NATS deep dive already covers in full. The danger is re-teaching those
mechanisms. The split is sharp:

- **Core NATS** = how request-reply and queue groups work on the wire
  (`_INBOX`, no-responders, one-message-to-one-member).
- **Services deep dive** = the framework layered on top — `AddService`,
  endpoints, groups, the `$SRV` discovery verbs, per-endpoint stats, and "run N
  instances and the framework load-balances them for you."

If a paragraph would explain *how request-reply itself works*, it belongs in
`/learn/core-nats/request-reply`. Link to it; do not restate it. The deep dive
earns its place by teaching only what the framework adds, against one runnable
Acme ORDERS session that promotes the Core NATS `inventory` responder into a
real `OrderInventory` service.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Request-reply mechanics** (`_INBOX`, reply subjects, no-responders/503,
  timeouts) → `/learn/core-nats/request-reply`. The framework rides on them; we
  assume them.
- **Queue group mechanics** (one message to one member, dynamic membership) →
  `/learn/core-nats/queue-groups`. The framework's default queue group `"q"` is
  the same thing; we say so and link out.
- **Persistence / streams / service state durability** → `/learn/jetstream`.
  Services are ephemeral request-reply responders; they store nothing.
- **Connection resilience** (reconnect, drain on shutdown beyond the framework's
  `Stop()`, slow consumers, error handlers) → `/learn/resilient-clients`.
- **Security of `$SRV` subjects, account isolation, cross-account exports of
  services** → `/learn/security`.
- **Server-side service-latency advisories / tracing** → `/learn/monitoring`.
- **Multi-tenant service prefixes across leaf nodes / gateways** →
  `/learn/topologies`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Propose new NatsFlow scenarios for every page with genuine message/control flow; reuse only where an existing scenario already fits. |
| Depth angle | **Framework mechanics + one runnable narrative.** Teach only what micro adds over request-reply + queue groups; build one Acme ORDERS session across the chapter. |
| Running scenario | **The Acme ORDERS world** — the Core NATS `inventory` responder becomes the `OrderInventory` service; a second `ShippingQuote` service joins. Same payload, same subjects. |
| Reader assumption | Has read (or can read) the Core NATS deep dive — comfortable with request-reply and queue groups. New to the micro framework. |
| Versioning | Unversioned, concepts only. Exact config knobs handed off to Reference. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/services/` (served at `/learn/services`). The sidebar
(`sidebars-learn.ts`, lines 53–60) already lists all 7 pages in order — **no
sidebar edit, no new or removed pages**:

```
learn/services/
  index.md                  # 1 — chapter intro
  your-first-service.md     # 2
  endpoints-and-groups.md   # 3
  discovery.md              # 4
  observability.md          # 5
  scaling.md                # 6
  where-next.md             # 7
```

The stub pages currently carry only `title:` frontmatter and a TODO comment.
Replace each stub wholesale with the full page (numbered title, full
frontmatter) per §5.

### 3.1 Frontmatter (exact, per page)

Each content page uses the numbered-title convention from the JetStream chapter:

```yaml
---
id: <slug>
title: "N. Human title"
sidebar_position: N
description: <one line>
---
```

| Slug | `id` | `title` | `sidebar_position` |
|---|---|---|---|
| `index` | `index` | `Services` | `1` |
| `your-first-service` | `your-first-service` | `2. Your first service` | `2` |
| `endpoints-and-groups` | `endpoints-and-groups` | `3. Endpoints and groups` | `3` |
| `discovery` | `discovery` | `4. Discovery` | `4` |
| `observability` | `observability` | `5. Observability` | `5` |
| `scaling` | `scaling` | `6. Scaling` | `6` |
| `where-next` | `where-next` | `7. Where to go next` | `7` |

(The `index` page uses `sidebar_position: 1` and an unnumbered `title: Services`,
matching the JetStream/Security index convention.)

### 3.2 URL stability

`/learn/services/<slug>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme ORDERS world, with Services)

This is the SAME Acme order platform from every other Learn chapter. This chapter
takes the **request-reply responders** the reader already met in Core NATS and
formalizes them into the micro framework. No new world. Byte-identical payload
everywhere:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Pinned entities (same names, every page — reuse, never rename):

| Role | Name(s) | Source chapter | Used on page |
|---|---|---|---|
| Order subjects | `orders.created`, `orders.shipped`, `orders.cancelled` | Core NATS | context |
| Regional subjects | `orders.us.created`, `orders.eu.created` | Core NATS | context |
| Inventory responder → **service** | `OrderInventory` service (kind `"order-inventory"`), endpoint `check` on subject `orders.inventory.check`, queue group `"q"` | promotes Core NATS `inventory` responder | your-first-service, endpoints-and-groups, discovery, observability, scaling |
| Shipping providers → **service** | `ShippingQuote` service, endpoint `quote` on subject `shipping.quote` | promotes Core NATS three `shipping.quote` providers | endpoints-and-groups (second service / groups) |
| Service caller | `order-svc` (the publisher from Core NATS) acts as the requesting **client** | Core NATS | all |
| Discovery / stats subjects | `$SRV.PING`, `$SRV.INFO`, `$SRV.STATS` (+ `.<name>` and `.<name>.<id>` variants) | NEW (framework) | discovery, observability, scaling |

**Promotion mapping (state it once on `your-first-service`, then assume):**

- Core NATS `inventory` responder on `orders.inventory.check` → `OrderInventory`
  service, `Version: "1.0.0"`, single endpoint `check`, default queue group
  `"q"`. Behavior identical to the raw responder; it just gains a name, a
  version, discovery, and stats.
- Core NATS three `shipping.quote` scatter-gather providers → `ShippingQuote`
  service. Used on `endpoints-and-groups` to show a second service and the group
  prefix. (Scatter-gather *semantics* stay in Core NATS; here it is just a second
  named endpoint.)

Rules: the deployment is a single local `nats-server` (topology is a different
chapter). No page introduces persistence, acks, streams, or reconnection. Carry
the session forward: the reader keeps the `OrderInventory` service running and
adds a second endpoint, a second instance, a discovery query, a stats query as
the chapter progresses. Never invent a different payload, service name, or
subject.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- Rust-book tone: welcoming, plain, second person. Active voice, present tense.
  No filler, no hedging.
- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before the paragraph that defines it.
- ≤2 NEW concepts per content page. A third is deferred to a later page or
  linked out.
- Teach what matters; hand the exhaustive knob list to Reference with the
  greppable phrase in §5.3.
- Length 150–400 source lines per content page. `index`/`where-next` may run
  longer.

**Content page skeleton (mandatory order):**

1. Numbered-title frontmatter (§3.1)
2. `# N. Title`
3. Intro (1–3 short paragraphs — what this page adds, where the session is)
4. Concept H2 sections with embedded examples (≤2 new concepts)
5. `## Pitfalls` — 2–4 concept-scoped gotchas, do/don't framing, **one runnable
   handling example** (`nats-example` div); inserted **BEFORE** `## Where you are`
6. `## Where you are` — what the reader now has running
7. `## What is next` — one-line pointer to the next page
8. `## See also` — ≤3 links from the §5.4 allow-list

**`index` page skeleton:** frontmatter (`id: index`, `sidebar_position: 1`) →
intro → "By the end you will have" → "Who this is for" → "How to read it" →
`## Map` (table linking every page) → `## Prerequisites`.

**`where-next` page skeleton:** recap "the whole game" → "Where the details live
now" → `## Sibling deep dives` → `## Where you are` → `## Production checklist`
(collects every page's Pitfalls action items, grouped per page, each group
linking to that page's `#pitfalls`) → `## See also`.

### 5.2 Wording lockfile (same word for same thing)

| Term | Use | Don't use |
|---|---|---|
| service | the micro service instance | "microservice" (the word "micro" only names the framework/import), "server", "daemon" |
| Services framework / micro | the framework | "service mesh", "RPC framework", "service bus" |
| endpoint | a named handler on a subject | "route", "method", "operation", "API" |
| group | an endpoint subject-prefix namespace | "namespace" alone, "module", "package" |
| handler | the function that processes a request | "callback" (OK once when describing the signature), "listener" |
| request / respond | the verbs | "call"/"return"; "RPC" only as a one-time framing aside |
| service ID | the per-instance auto-generated NUID | "instance name", "uuid", "guid" |
| service name | the `Name` field, shared by all instances of a kind | "service id", "kind" in prose (kind is metadata only) |
| version | the SemVer `Version` field | "release", "tag" |
| metadata | the immutable string map | "labels", "annotations", "tags" |
| queue group | the load-balancing group; the default name is `"q"` | "queue", "worker group", "consumer group", "load balancer" |
| discovery | learning what services exist via `$SRV` verbs | "service registry", "lookup", "DNS" |
| PING / INFO / STATS | the three discovery verbs (uppercase) | "ping/info/stats" lowercase in prose, "health check" for PING |
| instance | one running copy of a service (one service ID) | "replica", "node", "pod", "worker" |
| scale / scaling | running more instances | "sharding", "clustering" (clustering is a topology term) |
| service error | a response carrying `Nats-Service-Error` + `Nats-Service-Error-Code` | "exception", "fault", "failure" loosely |
| stats | per-endpoint counters (requests, errors, processing time) | "metrics" (OK once when pointing to monitoring), "telemetry" |

**Boundary lockfile (critical — banned cross-chapter vocabulary):**

- Do NOT teach request-reply internals: avoid explaining `_INBOX`, reply
  subjects, or no-responders/503 as if new. Name them once and link to
  `/learn/core-nats/request-reply`.
- Do NOT use JetStream vocabulary as if it applied here: no "stream", "consumer"
  (the JetStream cursor sense), "ack", "persisted", "stored", "durable",
  "redelivered", "exactly-once". A service is at-most-once request-reply. When
  the reader wants durability, name the gap and link `/learn/jetstream`.
- Do NOT teach security: no "account", "operator", "JWT", "export/import" as
  mechanisms. When `$SRV` isolation comes up, link `/learn/security`.
- Do NOT teach clustering/topology: no "RAFT", "leader", "gateway", "leaf node"
  mechanics. Scaling here is "run N instances on one server"; cross-region
  placement links `/learn/topologies`.

### 5.3 Reference handoff phrase (greppable)

> The full set of service configuration fields and their valid ranges is
> documented in [Reference](/reference/). We only need the behavior here.

For the wire protocol of the discovery verbs:

> The `$SRV.PING`/`INFO`/`STATS` wire format and JSON response schemas are
> documented in [Reference](/reference/). We only need the behavior here.

Each page ends with a `## See also` section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (allow-list)

Only paths in this list may appear. Do NOT invent paths.

- **Reference:** `/reference/` (root), `/reference/protocols/client`
- **Concepts:** `/concepts/request-reply`, `/concepts/queue-groups`,
  `/concepts/subjects`, `/concepts/jetstream`, `/concepts/security`,
  `/concepts/topologies`, `/concepts/what-is-nats`
- **Learn — this chapter:** `/learn/services`,
  `/learn/services/your-first-service`, `/learn/services/endpoints-and-groups`,
  `/learn/services/discovery`, `/learn/services/observability`,
  `/learn/services/scaling`, `/learn/services/where-next`
  (and the per-page `#pitfalls` anchors)
- **Learn — Core NATS (done):** `/learn/core-nats`,
  `/learn/core-nats/request-reply`, `/learn/core-nats/queue-groups`,
  `/learn/core-nats/scatter-gather`, `/learn/core-nats/subjects-and-wildcards`
- **Learn — JetStream (done):** `/learn/jetstream`
- **Learn — Security (done):** `/learn/security`
- **Learn — Topologies (done):** `/learn/topologies`
- **Learn — sibling new chapters:** `/learn/resilient-clients`,
  `/learn/monitoring`, `/learn/key-value`

If a needed target is not on this list, link `/reference/` and name the gap in
prose instead of inventing a path.

---

## 6. Example pattern (matches `CLAUDE.md`)

The Services framework is a client-library feature: nearly every snippet has a
genuine multi-language form, so the `nats-example` div is the DEFAULT here.

- Use a `nats-example` div for every real service/endpoint/group/discovery/stats
  snippet:

  ```mdx
  <div class="nats-example"
       data-type="learn-services-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/services/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path directories join with dashes to
  form the `data-type`; they MUST match exactly.
- `nats-server` startup, "run it in two terminals" demos, and pure CLI ops
  commands (`nats service serve`, `nats service request`, `nats service info`,
  `nats service stats`) are plain fenced `bash` blocks (no div) when they are
  CLI-only operations rather than multi-language API calls.
- The pinned ORDERS payload, service names (`OrderInventory`, `ShippingQuote`),
  subjects, and version (`1.0.0`) are identical across every page and language.

### 6.1 Planned `nats-example` snippet inventory (one CLI `.sh` per div)

Author each CLI source under
`static/examples/snippets/cli/learn/services/<slug>/<snippet>.sh` and commit it.
The `data-type` is `learn-services-<slug>-<snippet>`.

| Page | snippet | What the example shows |
|---|---|---|
| your-first-service | `addService` | Create `OrderInventory` v1.0.0 with one endpoint `check` on `orders.inventory.check`; handler parses order, responds. |
| your-first-service | `requestService` | Client sends the canonical order payload to `orders.inventory.check`, prints the response. |
| your-first-service | `validateInput` | Pitfall: handler `json.Unmarshal`s `req.Data()`; on failure responds with a service error (400). |
| endpoints-and-groups | `addGroup` | Add a second endpoint inside a group prefix; show subject = `{group}.{endpoint}`. |
| endpoints-and-groups | `secondService` | Create `ShippingQuote` service with endpoint `quote` on `shipping.quote`. |
| endpoints-and-groups | `customQueueGroup` | Endpoint with `WithEndpointQueueGroup` override (the one-knob example). |
| discovery | `discoverInfo` | Send `$SRV.INFO.OrderInventory`, print the INFO response (endpoints listed). |
| discovery | `targetInstance` | Send `$SRV.STATS.OrderInventory.<id>` to one specific instance. |
| observability | `serviceStats` | Query `$SRV.STATS.OrderInventory`; show num_requests / num_errors / processing time. |
| observability | `serviceError` | Handler returns a service error so `num_errors` and `last_error` increment. |
| scaling | `runInstances` | Start a second instance of `OrderInventory` (same name/version, new ID). |
| scaling | `stopService` | Graceful `Stop()` / drain on shutdown. |
| where-next | (none) | Navigation page; no new snippets. |
| index | (none) | Map page; no new snippets. |

CLI-only ops shown as plain fenced bash (no div): `nats service list`,
`nats service info OrderInventory`, `nats service stats OrderInventory`,
`nats service ping`, and the `nats-server` startup line.

---

## 7. NatsFlow scenarios

This run **maximizes animation**. Propose one new scenario per page that carries
a genuine message/control flow. Embed with:

```mdx
<div class="nats-flow" data-scenario="<camelCaseName>Animated" data-width="600" data-height="350"></div>
```

NEVER embed a `data-scenario` that is not built — it renders an error box.

### 7.1 NEW scenarios to build (cap respected: 5)

| # | Name | Page | Flow (nodes + animated edges) |
|---|---|---|---|
| 1 | `serviceRequestAnimated` | your-first-service | Nodes: client `order-svc`, NATS, `OrderInventory` service (one endpoint `check`). Edges: client publishes order to `orders.inventory.check` → NATS routes to the endpoint's queue subscription → handler runs → response flows back to the client's reply subject. Shows request-reply *with the framework wrapper* (named endpoint, queue group `"q"`). |
| 2 | `serviceEndpointsAnimated` | endpoints-and-groups | Nodes: client, NATS, one service exposing two endpoints — `check` (subject `orders.inventory.check`) and a grouped `quote` (subject `shipping.quote`). Edges: a request to `orders.inventory.check` lights the `check` endpoint; a request to `shipping.quote` lights the grouped endpoint. Shows endpoints + group subject prefix routing within one service. |
| 3 | `serviceDiscoveryAnimated` | discovery | Nodes: client, NATS, three `OrderInventory` instances (IDs id1/id2/id3). Edges: client publishes `$SRV.INFO.OrderInventory` → NATS fans to all three instances → each replies with its INFO (name + id + endpoints) → client collects three responses. Then a single edge: client → `$SRV.STATS.OrderInventory.id2` → only id2 replies. Shows broadcast discovery vs. targeted instance query. |
| 4 | `serviceStatsAnimated` | observability | Nodes: client, NATS, one service endpoint with a stats counter. Edges: several requests arrive → endpoint handler runs (timer animates) → per-request the counter ticks (num_requests++, processing_time accumulates); one request errors (num_errors++). Then client → `$SRV.STATS.OrderInventory` → service replies with the accumulated stats. Shows stats accumulating in real time, then read back. |
| 5 | `serviceScalingAnimated` | scaling | Nodes: client, NATS (queue-group selector), five `OrderInventory` instances sharing queue group `"q"`. Edges: request 1 to `orders.inventory.check` → NATS selects instance id3 → response; request 2 → NATS selects id1 → response. Highlights the selected instance per request. Shows queue-group load balancing across N instances. |

### 7.2 Reused existing scenarios

| Page | Reused `data-scenario` | Why |
|---|---|---|
| index (optional, supplementary) | `requestReply` | One-line reminder that a service is request-reply underneath, before the chapter formalizes it. (Optional; the index may stay text + map only.) |

No other existing scenario fits the framework-specific flows, so pages 2–6 each
get a purpose-built scenario from §7.1. (For reference, the existing wired pool
is: `publishSubscribeAnimated`, `subjectsWildcardAnimated`, `requestReply`,
`queueGroupAnimated`, `requestReplyScatterGather`, `jetStreamContrastAnimated`,
`jetStreamConsumersAnimated`, `singleToClusterAnimated`, `clusterMeshAnimated`,
`superClusterAnimated`, `leafNodeAnimated`, `massiveScaleAnimated`,
`centralizedAuthAnimated`, `decentralizedAuthAnimated`, `authCalloutAnimated`.)

---

## 8. Page-by-page outline

`stateIn`/`stateOut` track the running Acme session. ≤2 new concepts each.

### Page 1 — `index` (Services)

- **Purpose:** Frame the chapter. A service is a request-reply responder the
  framework formalizes: it gains a name, a version, discovery, stats, and
  built-in load balancing — no new infrastructure.
- **New concepts:** (none new; orientation only) — names the layering: micro is
  built on request-reply + queue groups (link both Core NATS pages).
- **stateIn:** Reader knows request-reply and queue groups from Core NATS.
- **stateOut:** Reader knows the chapter promotes the Core NATS `inventory`
  responder into `OrderInventory` and knows the 6-page path.
- **Sections:** intro → "By the end you will have" (a running `OrderInventory`
  service you can discover and scale) → "Who this is for" → "How to read it" →
  `## Map` (table linking all 7 pages) → `## Prerequisites` (a local
  `nats-server`; comfort with `/learn/core-nats/request-reply` and
  `/learn/core-nats/queue-groups`).
- **Visual:** optional `requestReply` reminder (§7.2) or none.
- **Defers/links:** persistence → `/learn/jetstream`; security of `$SRV` →
  `/learn/security`.

### Page 2 — `your-first-service`

- **Teaches (≤2):** (1) **a service** = `AddService(Name, Version, Description)`
  with an **endpoint** (a named handler on a subject) — the framework
  auto-generates a unique **service ID** and auto-subscribes the discovery verbs;
  (2) the **handler** contract — `req.Data()` in, `req.Respond()` out — is the
  same request-reply you already know, now wrapped.
- **Runs:** Promote the Core NATS `inventory` responder. Create `OrderInventory`
  v1.0.0 with endpoint `check` on `orders.inventory.check`, default queue group
  `"q"`. Send the canonical order payload, get a response.
- **Examples:** `addService`, `requestService`.
- **Pitfalls:** validate request data — handler must `Unmarshal` `req.Data()` and
  respond with a **service error** on bad input rather than crashing (runnable
  `validateInput` example). Also: name/version are validated (Name regex,
  SemVer) — an invalid value fails service creation.
- **Visual:** `serviceRequestAnimated` (NEW).
- **stateIn:** local `nats-server` running. **stateOut:** `OrderInventory`
  service running with one endpoint, answering on `orders.inventory.check`.
- **Defers/links:** how request-reply itself works →
  `/learn/core-nats/request-reply`; full config fields → `/reference/`.

### Page 3 — `endpoints-and-groups`

- **Teaches (≤2):** (1) one service can expose **multiple endpoints**;
  `AddEndpoint(name, handler)` adds another, and the endpoint subject defaults to
  its name; (2) a **group** is a subject-prefix namespace —
  `AddGroup("prefix")` makes endpoints under it answer on
  `{prefix}.{endpoint}`, and a group can set its own queue group. (Defer the full
  endpoint/group option list to Reference.)
- **Runs:** Add a second service `ShippingQuote` with endpoint `quote` on
  `shipping.quote` (promotes the Core NATS scatter-gather providers as a named
  service). Show a grouped endpoint and the resulting subject.
- **Examples:** `secondService`, `addGroup`, `customQueueGroup`.
- **Pitfalls:** queue-group override surprises — overriding to a custom queue
  group changes who load-balances with whom; disabling the queue group turns the
  endpoint into broadcast (all instances answer). Runnable `customQueueGroup`
  example with the do/don't. Also: endpoints and metadata are **immutable** once
  added — no remove.
- **Visual:** `serviceEndpointsAnimated` (NEW).
- **stateIn:** `OrderInventory` running. **stateOut:** `OrderInventory` plus
  `ShippingQuote`, multiple endpoints, one in a group.
- **Defers/links:** queue-group mechanics → `/learn/core-nats/queue-groups`;
  scatter-gather semantics → `/learn/core-nats/scatter-gather`; full option list
  → `/reference/`.

### Page 4 — `discovery`

- **Teaches (≤2):** (1) every service auto-answers three **discovery verbs** on
  `$SRV` — **PING** (is anyone there, with name+id+version), **INFO** (what
  endpoints), **STATS** (counters) — at three levels: all services
  (`$SRV.PING`), by name (`$SRV.PING.OrderInventory`), by instance
  (`$SRV.PING.OrderInventory.<id>`); (2) discovery is **broadcast** — every
  matching instance replies, so the caller collects N responses by deadline (not
  first-wins). (Defer STATS detail to the observability page.)
- **Runs:** Query `$SRV.INFO.OrderInventory`, read the endpoint list; target one
  instance by ID. Show `nats service list` / `nats service info` as the CLI ops
  shortcut.
- **Examples:** `discoverInfo`, `targetInstance`.
- **Pitfalls:** discovery is broadcast, not load-balanced — a deadline/count
  loop is required to collect all instances; a single `Request` returns only one.
  Runnable handling. Also: `$SRV` is a reserved subject prefix — do not publish
  to it yourself.
- **Visual:** `serviceDiscoveryAnimated` (NEW).
- **stateIn:** two services running. **stateOut:** reader can enumerate services
  and target a specific instance.
- **Defers/links:** stats fields → `/learn/services/observability`; subject
  reservation / `$SRV` security → `/learn/security`; wire schema → `/reference/`.

### Page 5 — `observability`

- **Teaches (≤2):** (1) the framework tracks **per-endpoint stats**
  automatically — `num_requests`, `num_errors`, `last_error`, total and average
  `processing_time` — readable via `$SRV.STATS`; (2) returning a **service
  error** from a handler (`req.Error(code, description, data)`, which sets
  `Nats-Service-Error` + `Nats-Service-Error-Code`) increments `num_errors` and
  records `last_error`. (Defer custom `StatsHandler` and server-side latency
  advisories to Reference / monitoring.)
- **Runs:** Generate a few requests including one error; read the accumulated
  stats from `$SRV.STATS.OrderInventory`; show `nats service stats` CLI shortcut.
- **Examples:** `serviceStats`, `serviceError`.
- **Pitfalls:** a service error is signalled in **headers**, not as a transport
  failure — callers must check `Nats-Service-Error-Code`, or a failed call looks
  like success. Runnable handling. Also: stats are per-instance — aggregate
  across IDs yourself; `Reset()` zeroes them.
- **Visual:** `serviceStatsAnimated` (NEW).
- **stateIn:** services running with traffic. **stateOut:** reader can read and
  interpret per-endpoint stats and signal/detect service errors.
- **Defers/links:** custom stats + server-side latency advisories →
  `/learn/monitoring`; wire schema → `/reference/`.

### Page 6 — `scaling`

- **Teaches (≤2):** (1) **horizontal scaling** = run N instances of the same
  service (same name+version, new IDs); the framework's default queue group
  `"q"` makes the server deliver each request to exactly one instance — no
  config, no coordinator; (2) graceful shutdown — `Stop()` drains in-flight
  requests and unsubscribes the discovery verbs. (Defer queue-group disabled /
  custom-queue scaling patterns to Reference, having shown the override on
  endpoints-and-groups.)
- **Runs:** Start a second `OrderInventory` instance; send a burst of requests
  and watch them spread across instances (the queue group does it); stop one
  instance gracefully.
- **Examples:** `runInstances`, `stopService`.
- **Pitfalls:** N instances may mutate shared state concurrently — services hold
  no shared memory; protect external state (use a database / JetStream) rather
  than assume one instance. Runnable note. Also: a blocking handler stalls other
  requests on that instance — keep handlers non-blocking or run more instances.
- **Visual:** `serviceScalingAnimated` (NEW).
- **stateIn:** one service instance. **stateOut:** two+ instances
  load-balancing; reader knows scaling is "run more, the queue group balances."
- **Defers/links:** durable state → `/learn/jetstream`; connection
  drain/reconnect → `/learn/resilient-clients`; cross-region placement →
  `/learn/topologies`.

### Page 7 — `where-next`

- **Purpose:** Navigation + recap. No new concepts.
- **Sections:** recap "the whole game" (a service = a named, versioned,
  discoverable request-reply responder; endpoints + groups organize it; `$SRV`
  verbs make it discoverable and observable; the queue group scales it) → "Where
  the details live now" (Reference) → `## Sibling deep dives` (Core NATS for the
  request-reply/queue-group foundation; JetStream for durable state; Resilient
  Clients for reconnect/drain; Security for `$SRV` isolation; Monitoring for
  latency advisories; Topologies for multi-region services) → `## Where you are`
  (`OrderInventory` + `ShippingQuote` still running) → `## Production checklist`
  (collect every page's Pitfalls action items, grouped per page with a
  `#pitfalls` link) → `## See also` (≤3).
- **May run longer than 400 lines.**

### 8.1 Concept budget audit

| Page | New concept 1 | New concept 2 | Third (deferred) |
|---|---|---|---|
| index | (orientation) | — | — |
| your-first-service | service + endpoint (`AddService`/`AddEndpoint`) | the handler contract (`Data`→`Respond`) | discovery verbs → discovery page |
| endpoints-and-groups | multiple endpoints | groups (subject prefix) | queue-group override detail → Reference |
| discovery | the three `$SRV` verbs (PING/INFO/STATS) | discovery is broadcast | stats fields → observability page |
| observability | per-endpoint stats | service errors (`req.Error`, headers) | custom StatsHandler / latency advisories → monitoring |
| scaling | horizontal scaling via queue group `"q"` | graceful `Stop()`/drain | queue-disabled/custom-queue patterns → Reference |
| where-next | (recap only) | — | — |

---

## 9. Research domains / fact pack (folded from the verified pack)

Source of truth: `nats.go micro/` (`service.go`, `request.go`), `nats.js
services/`, `nats.java service/`, `nats.py micro`, ADR-32 (Service API), and
`natscli`. The verified fact pack supplied with this task is authoritative; the
keys below organize it per page.

| Key | Focus (verified facts to fold in) |
|---|---|
| `S_SERVICE` | `AddService(nc, Config)` → unique NUID ID; `Config` fields: `Name` (required, regex `^[A-Za-z0-9\-_]+$`), `Version` (required, SemVer), `Description`, `Metadata` (immutable), `Endpoint`, `QueueGroup` (default `"q"`), `QueueGroupDisabled`, `StatsHandler`/`DoneHandler`/`ErrorHandler`. `Request` methods: `Respond`, `RespondJSON`, `Error(code,desc,data)`, `Data()`, `Headers()`, `Subject()`, `Reply()`. (nats.go micro/service.go:169–202, 290; request.go:39–64.) |
| `S_ENDPOINTS` | `AddEndpoint(name, handler, opts...)`; subject defaults to name; opts `WithEndpointSubject`, `WithEndpointMetadata`, `WithEndpointQueueGroup`, `WithEndpointQueueGroupDisabled`, `WithEndpointPendingLimits`. Validation: name regex, subject regex `^[^ >]*[>]?$`. Wire: `QueueSubscribe(subject, queueGroup, handler)` unless disabled → `Subscribe`. Immutable; no remove. (micro/service.go:403–462, 954–995.) |
| `S_GROUPS` | `AddGroup(name, opts...)` → prefix; subject = `{group_prefix}.{endpoint}`; nested groups combine prefixes; queue-group inheritance Service→Group→Endpoint, each level overridable (`WithGroupQueueGroup`, `WithGroupQueueGroupDisabled`). (micro/service.go:486–498, 997–1007.) |
| `S_DISCOVERY` | `$SRV` (APIPrefix). Verbs PING/STATS/INFO, three levels (verb, verb.name, verb.name.id). PING response type `io.nats.micro.v1.ping_response` (name,id,version,metadata); INFO `..info_response` (+ description, endpoints[]); each endpoint {name, subject, queue_group, metadata}. Broadcast: all matching instances reply; caller gathers by deadline/count. (micro/service.go:126–138, 656–666, 755–775, 931–951; ADR-32.) |
| `S_STATS` | STATS response `io.nats.micro.v1.stats_response`: started (ISO8601), endpoints[] each {name, subject, queue_group, num_requests, num_errors, last_error, processing_time ns, average_processing_time ns, data}. Tracking per request under service mutex; `req.Error` → NumErrors++ + LastError. `Reset()` zeroes + resets started. Optional `StatsHandler` for custom `data`. Server-side latency advisory `io.nats.server.metric.v1.service_latency` is separate (server config). (micro/service.go:104–124, 690–705, 777–816.) |
| `S_SCALING` | Default queue group `"q"` load-balances across instances (server delivers to one member). N instances = same name+version, new IDs. `QueueGroupDisabled=true` → all instances receive all requests (broadcast). `Stop()` drains all subscriptions, unsubscribes control subjects, invokes `DoneHandler`. One connection shared by an instance's endpoints. Handlers called synchronously — blocking starves the instance. (micro/service.go:262, 447–462, 691–693, 707–743, 975–979.) |
| `S_PITFALLS` | (1) Unvalidated `req.Data()` → respond `Error("400", ...)`. (2) Caller must read `Nats-Service-Error`/`-Code` headers — framework does not auto-decode (except nats.js ServiceMsg). (3) `QueueGroupDisabled` ≠ load balancing; it broadcasts. (4) Shared mutable state across instances needs external synchronization/store. (5) Blocking handler starves the instance. |
| `S_CONTINUITY` | `OrderInventory` = Core NATS inventory responder; endpoint `check` on `orders.inventory.check`, queue `"q"`, version 1.0.0. `ShippingQuote` = Core NATS shipping providers. Canonical payload unchanged. No new accounts/streams. `$SRV` propagation across topologies is a topologies/monitoring concern (caveat: APIPrefix override) — link, do not teach. |
| `S_RESOURCES` | Canonical examples (real URLs, verified): natsbyexample.com `/examples/services/intro/go`; nats.go `micro/example_package_test.go`, `micro/example_test.go`, `micro/example_handler_test.go`; nats.js `services/examples/01_services.ts`, `services/examples/03_bigdata.ts`, `services/tests/service_test.ts`; ADR-32 (full spec). Use to seed CLI `.sh` and verify multi-language API shapes. |

Per-language API shapes (verified, for the multi-repo example pipeline):
- **Go:** `micro.AddService(nc, micro.Config{...})`, `svc.AddEndpoint`,
  `svc.AddGroup`, `micro.ControlSubject`, `req.Error`, `svc.Stop()`.
- **TS:** `nc.service({...})`, `service.addEndpoint`, `service.addGroup(name, q)`,
  `msg.respondError(code, desc, payload)`.
- **Java:** `new ServiceBuilder().connection(c).name(...).version(...).build()`,
  `ServiceEndpoint.builder()...`, `service.addServiceEndpoints(...)`,
  `service.start()`.
- **Python:** `nc.micro.add_service(ServiceConfig(name=..., version=...))`.

---

## 10. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/services/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is either one of the 5 NEW scenarios (§7.1)
      after it is built, or the reused `requestReply` (§7.2) — no fabricated
      names.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms, and **no
      request-reply-internals, JetStream, security, or clustering vocabulary** is
      used as if it applied to the framework.
- [ ] Every internal link resolves to a §5.4 allow-list path.

Per page:

- [ ] ≤2 new concepts (§8.1); one `## Pitfalls` section (2–4 gotchas, ≥1 runnable
      handling example) placed BEFORE `## Where you are`; one `## See also` (≤3
      links).
- [ ] Service names / payload / subjects / version match §4 exactly.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh` at the path
      that equals its `data-type` (§6.1); CLI is the default tab where Tabs are
      used.
- [ ] No leaked tool-call tags in the file.

`where-next` specifically:

- [ ] `## Production checklist` collects every page's Pitfalls action items,
      grouped per page, each group linking to that page's `#pitfalls`.

---

## 11. Out of scope

- Request-reply internals, queue-group internals, persistence/JetStream,
  connection resilience, security, monitoring/latency advisories, and topology —
  all linked, none taught here.
- Versioned Learn content; translation; search tuning.
- Sidebar edits; new or removed pages.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
