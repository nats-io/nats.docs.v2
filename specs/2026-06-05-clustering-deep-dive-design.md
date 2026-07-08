# Clustering & Replication Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

> ## ⚠️ CONTINUITY OVERRIDE — authoritative, supersedes any naming below
>
> This chapter describes the **same physical cluster** as the done Topologies
> chapter. Use Topologies' exact names. Wherever this spec writes `n1`/`n2`/`n3`,
> the page MUST use **`n1-east`/`n2-east`/`n3-east`**; wherever it writes
> `orders-cluster`, the page MUST use the cluster name **`east`** (client port
> 4222, route port 6222 — matching Topologies). This override wins over any
> conflicting names in the sections below, **including the §4 continuity note.**

---

## 1. Goal

Land the **Clustering & Replication** deep dive in the NATS "Learn" section — the
Operate-half chapter that teaches the *mechanism* behind a NATS cluster: how
servers find each other, how they reach agreement (RAFT), how a replicated
stream commits a write, where replicas are placed, and how to grow or shrink the
peer set safely.

This chapter is the answer to a deferral. The **Topologies** chapter wires the
shapes (single server → cluster → super-cluster → leaf nodes) but, by design,
hands the internals to us: "defer RAFT to `/learn/clustering`." The
**JetStream** chapter gives a single page on surviving node loss (`R=3`,
failover) and points here for the deeper story. This is where both promises come
due.

### 1.1 What we reuse vs. expand

We continue the exact same world: the 3-node ORDERS cluster (`n1`/`n2`/`n3`) the
Topologies chapter stood up, carrying the `ORDERS` stream the JetStream chapter
created. We do not re-teach *what a cluster is for* or *how to wire routes into a
shape* — Topologies owns that. We expand into the layer beneath it:

- **Topologies** = the shapes, the config blocks, when to grow.
- **JetStream → surviving node loss** = the one-page operator intro to `R=3`.
- **This chapter** = how a cluster reaches agreement and replicates: routes +
  gossip, RAFT groups and leaders, quorum commits, placement, peer management.

If a paragraph would be at home in the Topologies chapter (choosing a shape, an
odd server count, wiring a `cluster {}` block as a deployment step), it is the
wrong altitude here. Add the consensus mechanism, the replication step, or the
failure mode the shapes chapter skips.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Cluster SHAPES and when to choose them** (single vs cluster vs
  super-cluster vs leaf, odd-node-count guidance as a deployment choice) →
  `/learn/topologies` and its pages. Link, do not re-teach.
- **The one-page operator intro to replicas** (`R=3`, "lose a node, keep
  serving") → `/learn/jetstream/surviving-node-loss`. We go *deeper* than that
  page; we do not repeat it.
- **Replication ACROSS clusters** (gateways, super-cluster traffic, geo-affinity)
  → `/learn/topologies/super-clusters`. This chapter is replication *within one
  cluster*.
- **Kubernetes/Helm, rolling upgrades, sizing** → `/learn/deployment`.
- **Backups, snapshots, disaster recovery** → `/learn/backup-recovery`.
- **Per-stream durability operations** (mirrors, sources for DR) →
  `/learn/jetstream/mirrors-and-sources`.
- Not version-conditional; unversioned, concepts only. The exact knob list lives
  in **Reference**.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Four new animated NatsFlow scenarios** (one per control/message-flow page): `clusterGossipAnimated`, `raftElectionAnimated`, `r3ReplicationAnimated`, `peerScalingAnimated`. `placement` is config/selection — no animation (CLAUDE.md bans NatsFlow for static placement/config). |
| Depth angle | **Mechanism, runnable on a real local cluster.** Go visibly deeper than Topologies and the JetStream surviving-node-loss page. Every page maps a mechanism onto the running ORDERS cluster. |
| Boundary vs. Topologies | **Mechanics, not shapes.** Topologies wires servers and chooses shapes; this chapter explains how those wired servers agree and replicate. Cross-cluster replication stays in super-clusters. |
| Running scenario | **The same 3-node ORDERS cluster** (`n1`/`n2`/`n3`) from Topologies, holding the `ORDERS` stream (R3) from JetStream. No new world. |
| Reader assumption | Has read Core Concepts and ideally the JetStream + Topologies deep dives. Knows what a stream, a consumer, a route, and a cluster are. We do not re-teach them. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/clustering/` (served at `/learn/clustering`). The sidebar
(`sidebars-learn.ts`) already lists all 7 pages in order — **no sidebar edit**.
Slugs and titles are fixed by the existing stubs; do not rename:

```
learn/clustering/
  index.md               # pos 1 — chapter intro (id: index)
  forming-a-cluster.md   # 2. Forming a cluster
  raft-and-leaders.md    # 3. Raft and leaders
  replication-and-r3.md  # 4. Replication and R=3
  placement.md           # 5. Placement
  scaling-and-peers.md   # 6. Scaling and peer management
  where-next.md          # 7. Where to go next
```

Each content page uses numbered-title frontmatter: `id`, `title` (with the
leading number, matching the surviving-node-loss / your-first-stream pattern),
`sidebar_position`, `description`. `index` uses `id: index`, `sidebar_position:
1`. `where-next` is the last position.

### 3.1 Cross-link in

No Core Concepts cross-link is required here — Clustering has no single concept
primer of its own (it is the mechanism under `/concepts/topologies` and
`/concepts/jetstream`). The inbound links already exist: Topologies and the
JetStream surviving-node-loss page point here. Do not add or move concept
content.

### 3.2 URL stability

`/learn/clustering/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the 3-node ORDERS cluster)

This is the SAME Acme order platform from every Learn chapter, shown at the layer
beneath the topology. The 3-node cluster (`n1`/`n2`/`n3`) from Topologies holds
the `ORDERS` stream from JetStream. Byte-identical payload everywhere:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Pinned entities (same names, every page — reuse, never rename):

| Role | Name(s) | Used on page |
|---|---|---|
| Cluster | the 3-node cluster `orders-cluster` | all |
| Servers | `n1`, `n2`, `n3` (client 4222/4223/4224, route 6222/6223/6224) | all |
| Stream | the `ORDERS` stream capturing `orders.>`, `R=3` | replication, placement, scaling |
| Publisher | `order-svc` publishing `orders.created` (from Core NATS / JetStream) | replication |
| Consumers | `shipping` pull consumer; `analytics` consumer filtering `orders.shipped` | replication, scaling |
| Subjects | `orders.created`, `orders.shipped`, `orders.cancelled`; regional `orders.us.created`, `orders.eu.created` | placement |
| Server tags (for placement) | `region:us-east`, `disk:ssd` on the production servers | placement |

Rules: the application code never changes — `order-svc` publishes the same
payload to the same subjects regardless of how many peers hold the stream. Carry
cluster state forward page to page: the reader stands up `n1`/`n2`/`n3` on
`forming-a-cluster` and keeps them running; later pages elect a leader, replicate
a write, set placement, add/remove a peer on that same cluster. Never invent a
different payload, server name, or service name.

> Continuity note (RESOLVED — see the override banner at the top): this chapter
> uses Topologies' exact names — cluster **`east`**, servers
> **`n1-east`/`n2-east`/`n3-east`**. Anywhere the tables/outline below say
> `n1`/`n2`/`n3` or `orders-cluster`, substitute the `-east` names. This is the
> same physical cluster Topologies stood up, so the names must match it.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four DONE chapters)

- **One teaching thought per paragraph.** Two ideas joined by "and" → split.
- **Define-then-use.** Never use a term before the paragraph that defines it.
  (RAFT vocabulary is dense — this rule matters most here. Define *term*, then
  *leader*, then *election*; never the reverse.)
- **≤2 new concepts per page.** A third goes to a later page or is linked out.
- **Active voice, present tense. No filler, no hedging.**
- **Teach what matters; link Reference for the exhaustive knob list.** Use the
  greppable handoff phrase (§5.3).
- **Content page skeleton:** numbered-title frontmatter → intro → concept H2s
  with embedded examples → `## Pitfalls` (2–4 concept-scoped gotchas, do/don't,
  one runnable handling example; inserted BEFORE `## Where you are`) → `## Where
  you are` → `## What is next` → `## See also` (≤3 links).
- **index skeleton:** frontmatter (`id: index`, `sidebar_position: 1`) → intro →
  "By the end you will have" → "Who this is for" → "How to read it" → `## Map`
  table linking every page → `## Prerequisites`.
- **where-next skeleton:** recap "the whole game" → "Where the details live now"
  → `## Sibling deep dives` → `## Where you are` → `## Production checklist`
  (collects every page's Pitfalls action items, grouped per page with a link to
  that page's `#pitfalls`) → `## See also`.
- **Length 150–400 source lines** per content page; `index`/`where-next` may run
  longer.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| server | "server" (a `nats-server` process) | "broker", "instance", "box", "daemon" |
| peer | a RAFT-group member (a server's role inside one group) | "replica" for the member; "node" for a cluster server |
| node | only in "leaf node" (carried from Topologies) | "node" for a cluster server (use "server" or "peer") |
| cluster | "cluster" | "ensemble", "ring", "group of brokers" |
| route | the server↔server cluster connection | "link", "peer connection" for routes |
| gossip | route discovery via INFO redistribution | "auto-discovery", "broadcast" loosely |
| RAFT / RAFT group | "RAFT" (caps); a "RAFT group" is one consensus group | "raft cluster", "consensus ring" |
| meta group / meta leader | the cluster-wide RAFT group and its leader | "metadata cluster", "controller" |
| leader / follower / candidate | the three RAFT roles | "master/slave", "primary/secondary" |
| election | how a group picks a leader | "vote-off", "failover" (failover is the outcome, not the mechanism) |
| term | the monotonically increasing election epoch | "generation", "epoch" (define term once, then use it) |
| quorum | a majority of peers — `(N+1)/2` | "consensus" as a synonym; "majority vote" loosely |
| replica / `R=3` | a stream copy; `R=N` is the replica count | "shard", "partition", "mirror" (mirror is a JetStream-specific feature) |
| commit | an entry replicated to a quorum and durable | "saved", "persisted" loosely; "acked" for the RAFT commit |
| apply | a committed entry copied into the stream store | "process", "deliver" for apply |
| append entry | the leader→follower replication RPC | "log push", "sync message" |
| catchup | how a behind/new peer streams missing entries | "resync", "rebuild", "backfill" |
| placement | constraining where replicas live (cluster + tags) | "scheduling", "pinning" |
| tag | a server label used by placement | "label" (in prose), "attribute" |
| preferred leader | the placement hint for the initial leader | "sticky leader", "leader affinity" |
| peer add / peer remove | growing/shrinking a group's peer set | "join/leave", "scale in/out" loosely |
| stepdown | a leader voluntarily yielding leadership | "demote", "kill the leader" |

**Boundary lockfile (critical):** these belong to other chapters; do NOT teach
them here, only link.

- Cluster SHAPES, choosing single/cluster/super-cluster/leaf, odd-node-count as a
  *deployment decision* → name and link `/learn/topologies/*`. (You may state the
  consequence — "a quorum needs a majority, so an even count buys nothing" — but
  do not turn it into shape-selection guidance.)
- `gateway`, `super-cluster`, cross-cluster traffic, geo-affinity →
  `/learn/topologies/super-clusters`. Never describe replication across a gateway
  here.
- `leafnode`/`domain` → `/learn/topologies/leaf-nodes`.
- Mirrors, sources, DR copies → `/learn/jetstream/mirrors-and-sources`.
- Snapshots/backups/restore as an *ops procedure* → `/learn/backup-recovery`.
- Kubernetes, rolling upgrades, sizing → `/learn/deployment`.

### 5.3 Reference handoff phrase (greppable)

> The full set of `<X>` options is documented in
> [Reference](/reference/<path>). We only need `<the behavior>` here.

Each page ends with a **`## See also`** section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (allow-list)

Only paths in this list may appear. Do NOT invent paths.

**Reference (verified to resolve):**

- `/reference/` (root)
- `/reference/config/cluster` — the `cluster {}` block reference
- `/reference/config/jetstream` — JetStream server config
- `/reference/config/server_tags` — server tags for placement
- `/reference/protocols/route` — the route wire protocol
- `/reference/jetstream/api/meta` — the meta (assignment) API
- `/reference/jetstream/api/stream` — stream create/update (replicas, placement)
- `/reference/system/monitor/jsz` — JetStream monitoring endpoint
- `/reference/system/monitor/raftz` — RAFT group monitoring endpoint

**Concepts (existing):**

- `/concepts/topologies`, `/concepts/jetstream`, `/concepts/what-is-nats`

**Learn siblings (REAL slugs only):**

- This chapter: `/learn/clustering` (+ `forming-a-cluster`, `raft-and-leaders`,
  `replication-and-r3`, `placement`, `scaling-and-peers`, `where-next`) and their
  `#pitfalls` anchors.
- `/learn/topologies` (+ `your-first-cluster`, `jetstream-in-a-cluster`,
  `super-clusters`, `leaf-nodes`, `putting-it-together`, `where-next`).
- `/learn/jetstream` (+ `surviving-node-loss`, `mirrors-and-sources`,
  `your-first-stream`).
- `/learn/deployment`, `/learn/backup-recovery`, `/learn/monitoring` (chapter
  roots only — do not link unverified sub-slugs of these unbuilt chapters).

Do NOT invent paths (e.g. `/reference/clustering/...` does not exist; there is no
`/concepts/clustering`).

---

## 6. Example pattern (matches `CLAUDE.md`)

Clustering is **config + CLI heavy**, like Topologies — most snippets are server
config or `nats` operator commands, not multi-language client code. The default
here is plain fenced blocks; the `nats-example` div is the exception.

- **Server config** (`cluster {}`, `jetstream {}` blocks in `nats.conf`),
  **`nats-server` startup**, and **CLI-only operator commands** (`nats server
  info`, `nats stream cluster ...`, `nats server report`) are plain fenced blocks
  — `conf` for config, `bash` for shell. **No `nats-example` div.**
- **"Run it in N terminals" demos** (start three servers, kill the leader, watch
  re-election) are inline `bash` blocks the reader copy-pastes.
- Use a **`nats-example` div** ONLY where a snippet has a genuine multi-language
  client form — chiefly **creating/updating a stream with `Replicas` and
  `Placement`** (every tier-1 client sets `StreamConfig.Replicas` and
  `Placement`). Each div:

  ```mdx
  <div class="nats-example"
       data-type="learn-clustering-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  with a matching committed CLI source at
  `static/examples/snippets/cli/learn/clustering/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to equal
  the `data-type` — they MUST match exactly.

Planned `nats-example` divs (the multi-language ones):

| Page | `data-type` | CLI source path | Shows |
|---|---|---|---|
| `replication-and-r3` | `learn-clustering-replication-and-r3-createR3` | `cli/learn/clustering/replication-and-r3/createR3.sh` | create `ORDERS` with `--replicas 3`; inspect leader/replicas |
| `replication-and-r3` | `learn-clustering-replication-and-r3-inspectReplicas` | `cli/learn/clustering/replication-and-r3/inspectReplicas.sh` | read the `Cluster` block of `nats stream info` (leader, peers, lag) |
| `placement` | `learn-clustering-placement-placeTags` | `cli/learn/clustering/placement/placeTags.sh` | create/update `ORDERS` with `--placement-cluster` + `--placement-tags` |
| `scaling-and-peers` | `learn-clustering-scaling-and-peers-peerRemove` | `cli/learn/clustering/scaling-and-peers/peerRemove.sh` | `nats stream cluster peer-remove` + verify new peer set (handling example for the quorum-loss Pitfall) |

Everything else on `forming-a-cluster` (config blocks, `nats server info`) and
`raft-and-leaders` (kill-the-leader demo, `nats stream cluster leader-stepdown`)
is CLI/config-only — plain fenced blocks, no divs. The pinned payload and server
names from §4 are identical across every page and language.

### 6.1 NatsFlow — four NEW animated scenarios

This run maximizes animation: every page that carries a genuine control- or
message-flow gets a new animated scenario. `placement` is selection/config, so it
gets **no** animation (CLAUDE.md: do not animate static architecture or config).

Author as animated React components, modeled on
`src/components/NatsFlow/scenarios/jetStreamConsumersAnimated.tsx` and the
Topologies scenarios (`clusterMeshAnimated.tsx`). Node `type`s available:
`publisher`, `subscriber`, `service`, `server`. Edges use `type: "animated"` with
`data: { color, animated, label, delay, interval }`. Wrap in
`ReactFlowProvider`. Export `const <Name>Animated`.

Wiring a new scenario touches FIVE files (all must agree on the camelCase name):

1. `src/components/NatsFlow/scenarios/<name>Animated.tsx`
2. `src/components/NatsFlow/scenarios/index.ts` — `export { … }`
3. `src/plugins/nats-flow/client-module.tsx` — add to `window.NatsFlow`
4. `src/types/global.d.ts` — import type + Window entry
5. `static/js/nats-flow-loader.js` — destructure + a `data-scenario` branch

| Scenario | Page | What flows (nodes + animated edges) |
|---|---|---|
| `clusterGossipAnimated` | `forming-a-cluster` | Three `server` nodes `n1`/`n2`/`n3`. `n1` opens an **explicit route** (configured) to `n2`; `n2` returns an INFO message listing its known peers; `n1` learns `n3` from that INFO and opens an **implicit** (gossip-learned) route to `n3`. Animated edges labelled "explicit route", "INFO (gossip)", "implicit route" show the mesh completing itself from one seed. |
| `raftElectionAnimated` | `raft-and-leaders` | Three `server` nodes as RAFT peers, all `Follower`. The leader's heartbeat stops; `n2`'s election timer fires → `n2` becomes `Candidate`, increments the term, sends `VoteRequest` to `n1` and `n3`; both reply with a vote; `n2` reaches quorum (2/3) and becomes `Leader`, then resumes heartbeats. Edges labelled "VoteRequest", "Vote", "heartbeat"; node labels show the Follower→Candidate→Leader transition and the new term. |
| `r3ReplicationAnimated` | `replication-and-r3` | A `publisher` (`order-svc`) plus three `server` peers; `n1` is the stream leader. `order-svc` publishes `orders.created` to `n1`; `n1` writes its WAL and sends `AppendEntry` to `n2` and `n3`; `n2` acks first → `n1` has quorum (itself + `n2`) and **commits**; the commit index rides the next heartbeat so `n2`/`n3` **apply** to their stream store. Edges labelled "publish", "AppendEntry", "ack", "commit (quorum 2/3)", "apply". The primary animation of the chapter. |
| `peerScalingAnimated` | `scaling-and-peers` | Three existing peers plus a fourth `server` joining empty. Leader proposes `AddPeer`, replicates to quorum, broadcasts the new peer set; the new peer opens a **catchup** stream and pulls missing entries from the leader until its lag is zero. A second beat shows `peer-remove`: the leader proposes `RemovePeer`, commits, and the removed peer drops its RAFT subscriptions. Edges labelled "AddPeer", "catchup", "lag→0", "RemovePeer". |

Embed per page:

```mdx
<div class="nats-flow" data-scenario="<name>Animated" data-width="600" data-height="350"></div>
```

### 6.2 Reused existing scenarios

| Page | Existing `data-scenario` reused | Why |
|---|---|---|
| `index` | `singleToClusterAnimated` (from Topologies) | A familiar "one server grows into a cluster" preview to anchor the chapter before the new RAFT scenarios. Optional — only if the index benefits from a single visual. |

No other existing scenario fits the consensus/replication internals, so the four
new ones above carry the chapter. NEVER reference a `data-scenario` name that is
not either one of the four new scenarios or an existing wired scenario (it would
render an error box).

---

## 7. Reference handoff — what stays vs. what goes

| Belongs in Learn (this chapter) | Belongs in Reference / another chapter |
|---|---|
| How routes discover peers via gossip (the behavior) | Every `cluster {}` field → `/reference/config/cluster`; route wire protocol → `/reference/protocols/route` |
| What RAFT terms/elections/quorum mean and why a write commits | Exact election/heartbeat timer values, WAL format → Reference / source |
| How `R=3` commits a write and what consistency you get | The full `StreamConfig` field list → `/reference/jetstream/api/stream` |
| What placement (cluster + tags + preferred) does | Server-tag config syntax → `/reference/config/server_tags` |
| How to add/remove a peer and migrate a stream safely | Meta assignment API → `/reference/jetstream/api/meta` |
| Reading `nats stream info`/`server report` cluster fields | The `/jsz` and `/raftz` endpoint schemas → `/reference/system/monitor/jsz`, `/reference/system/monitor/raftz` |
| The pinned Acme ORDERS cluster failure modes | Version-specific behavior; exhaustive failure matrices |

---

## 8. Page-by-page outline

`stateIn`/`stateOut` track the running cluster. ≤2 new concepts each.

| # | Slug | Teaches (≤2 concepts) | stateIn → stateOut | Defers / links |
|---|---|---|---|---|
| 0 | `index` | What this chapter is: the *mechanism* under the Topologies cluster — agreement (RAFT) and replication within one cluster. The arc: form → elect → replicate → place → scale. Chapter map; who it is for; how to read it. | in: the reader knows what a cluster and a stream are (from Topologies/JetStream). out: a mental model — routes connect servers, RAFT groups agree, replicas commit by quorum. | Shapes/when-to-cluster → `/learn/topologies`; one-page replica intro → `/learn/jetstream/surviving-node-loss`. NatsFlow `singleToClusterAnimated` (reuse, optional). |
| 1 | `forming-a-cluster` | (1) **routes** — explicit (configured seed) vs implicit (gossip-learned) server↔server connections; (2) **gossip discovery** — servers exchange INFO so one seed grows into a full mesh. Stand up `n1`/`n2`/`n3` with a `cluster {}` block; inspect with `nats server info`. NatsFlow `clusterGossipAnimated`. | in: nothing running. out: a live 3-server `orders-cluster` that discovered itself from one seed route. | `cluster {}` fields → `/reference/config/cluster`; route wire protocol → `/reference/protocols/route`; choosing a shape → `/learn/topologies/your-first-cluster`. |
| 2 | `raft-and-leaders` | (1) **RAFT groups** — a consensus group per asset (the cluster-wide **meta group** plus one group per stream), each with a **leader** and **followers**; (2) **leader election** — on a missed heartbeat a follower becomes a candidate, bumps the **term**, and wins with a **quorum** of votes. Demo: kill the leader, watch re-election; `nats stream cluster leader-stepdown`. NatsFlow `raftElectionAnimated`. | in: 3-server cluster. out: reader can name the meta leader and a stream leader, and has watched an election + a stepdown. | Exact timers/WAL → Reference; cross-cluster meta → `/learn/topologies/super-clusters`; `/raftz` endpoint → `/reference/system/monitor/raftz`. |
| 3 | `replication-and-r3` | (1) **quorum commit** — the stream leader appends a write to its log, sends an **append entry** to peers, and **commits** once a quorum (for `R=3`, 2 of 3) has it; followers then **apply** it; (2) the **consistency** you get — read-after-write from the leader; replicas may lag. Create `ORDERS` as `R=3`; publish via `order-svc`; read the `Cluster`/`Replicas` block. NatsFlow `r3ReplicationAnimated`. | in: cluster with leaders elected. out: `ORDERS` running `R=3`; reader knows a write survives one node loss and where to read consistently. | One-page operator intro → `/learn/jetstream/surviving-node-loss`; full `StreamConfig` → `/reference/jetstream/api/stream`; cross-cluster copies → `/learn/jetstream/mirrors-and-sources`. |
| 4 | `placement` | (1) **placement** — constrain a stream's replicas to a **cluster** and/or to servers carrying matching **tags** (tag match is an intersection: every requested tag must be present); (2) **preferred leader** — a hint for the initial leader, used mainly during scale-up, that is *not* a guarantee on later elections. Tag `n1`/`n2`/`n3`, create/update `ORDERS` with `--placement-tags`. (No NatsFlow — config/selection.) | in: `ORDERS` at `R=3` with default placement. out: `ORDERS` pinned to tagged servers; reader knows tags are intersection + case-sensitive and preferred-leader is a hint. | Tag config syntax → `/reference/config/server_tags`; meta assignment → `/reference/jetstream/api/meta`; geo placement across clusters → `/learn/topologies/super-clusters`. |
| 5 | `scaling-and-peers` | (1) **peer add** — the leader proposes an add, the new peer **catches up** (streams missing entries) before counting toward quorum (scale-up observer behavior); (2) **peer remove** — `nats stream cluster peer-remove` drops a peer, and the stream **migrates** to a new peer set; never remove enough peers at once to lose quorum. Add a 4th server, migrate `ORDERS`, remove one safely. NatsFlow `peerScalingAnimated`. | in: `ORDERS` placed on `n1`/`n2`/`n3`. out: reader can grow/shrink the peer set and verify lag→0 before trusting the change. | Stepdown recap → `raft-and-leaders`; deployment/rolling change → `/learn/deployment`; backups before risky changes → `/learn/backup-recovery`; meta API → `/reference/jetstream/api/meta`. |
| 6 | `where-next` | Navigation. Recap "the whole game": routes form the mesh, RAFT groups agree, a quorum commits each write, placement decides where, peer management grows it safely. Where the details live (Reference). Sibling deep dives. **Production checklist** collecting every page's Pitfalls. May run long. | in: full mechanism understood on the live cluster. out: a map of what is beyond this chapter + a pre-flight checklist. | — |

**Concept budget enforcement:** each content page introduces at most two NEW
named concepts (the bolded terms above). Anything a third idea would add
(snapshots, WAL format, the `$NRG.*` subjects, lost-quorum stepdown timing) is
either deferred to a later page or linked to Reference, never taught inline.

### 8.1 Per-page Pitfalls (the standing convention — 2–4 each, BEFORE "Where you are")

Drawn from the fact pack. Each Pitfall is do/don't with one runnable handling
example where it fits.

- **forming-a-cluster:** (a) every server in a cluster must share the same
  `cluster.name` — a mismatched name silently forms two clusters that never
  merge; (b) the route `listen` port (6222) is not the client port (4222) —
  pointing `routes` at the client port fails to form the mesh; (c) one seed route
  is enough thanks to gossip, but list 2–3 seeds so cluster formation survives the
  seed server being down at boot.
- **raft-and-leaders:** (a) elections take seconds, not milliseconds (the timer
  is 4–9s) — a brief "no leader" window during failover is normal, not a bug;
  (b) `leader-stepdown` moves leadership but the *next* election is still
  quorum-based, so do not use it expecting a specific successor; (c) the meta
  leader and a stream leader are different groups — losing one is not losing the
  other.
- **replication-and-r3:** (a) `R=1` has no copy — a write is gone with its
  server; only `R≥3` survives a node loss (link surviving-node-loss); (b) a
  replica may lag, so a Direct Get from a follower can return stale data — read
  from the leader for read-after-write; (c) check the `Replicas` lag in `nats
  stream info` before assuming all copies are current. Handling example:
  `inspectReplicas` div.
- **placement:** (a) tags are an intersection and case-sensitive — `ssd` ≠ `SSD`,
  and asking for a tag no server carries leaves the stream with "no suitable
  peers"; (b) `preferred` is a hint, not a lock — if the preferred server dies,
  the next election is random among the remaining quorum; verify server tags with
  `nats server info` before placing.
- **scaling-and-peers:** (a) removing two peers from an `R=3` group at once loses
  quorum and the stream goes leaderless — remove one, wait for a leader, then the
  next; (b) a freshly added peer is not safe until its lag is zero — do not kill
  the cluster mid-catchup; (c) do not remove the *only* remaining peer without
  understanding it destroys the replica. Handling example: `peerRemove` div with a
  `nats stream info` verify step.

### 8.2 where-next Production checklist (collects §8.1 action items)

Group by page, each group headed by a link to that page's `#pitfalls`, mirroring
the JetStream where-next pattern. Example item shape:

> ### Forming a cluster — see [Pitfalls](/learn/clustering/forming-a-cluster#pitfalls)
> - [ ] Give every server the same `cluster.name`; a mismatch forms two clusters that never merge.
> - [ ] Point `routes` at the route port (6222), not the client port (4222).
> - [ ] List 2–3 seed routes so the cluster forms even if one seed is down at boot.

Repeat for raft-and-leaders, replication-and-r3, placement, scaling-and-peers.

---

## 9. Research domains (Phase 1 — verified fact pack already supplied)

Source of truth: `nats-server` (`route.go`, `raft.go`, `jetstream_cluster.go`,
`opts.go`), `natscli` (`nats server …`, `nats stream cluster …`), the client libs
(`StreamConfig.Replicas` + `Placement` parity across nats.go/nats.js/nats.py/
nats.rs/nats.java), and the Reference config/protocol/monitor pages. The verified
fact pack in the task brief is the primary input; the keys below map facts → pages.

| Key | Focus (folded from the fact pack) |
|---|---|
| `CL_FORM` | Routes (explicit vs implicit, `RouteType`), the `cluster {}` block (`name`, `listen`, `routes`), gossip via INFO redistribution, how one seed grows a full mesh. (route.go:35-150, opts.go:64-94.) |
| `CL_RAFT` | RAFT groups (meta group + per-stream groups), leader/follower/candidate states, election (4–9s timer, term increment, quorum vote), heartbeats/append-entries, `$NRG.*` vote subjects, stepdown. (raft.go:114-271, 1782-1801, 2875-2913.) |
| `CL_R3` | Replica count (`StreamConfig.Replicas`, max 5), quorum rule `(N+1)/2` → 2 of 3, append-entry → quorum ack → commit → apply, read-after-write from leader, replica lag, catchup after restart. (raft.go:3156-3330; stream.go:67; ADR-31.) |
| `CL_PLACE` | `Placement{Cluster, Tags, Preferred}`, tag intersection matching, "no suitable peers" error, preferred-leader as a scale-up hint. (jetstream_cluster.go:99-103, 1914.) |
| `CL_SCALE` | Peer add (`EntryAddPeer`, observer/catchup before quorum), peer remove (`EntryRemovePeer`, `nats stream cluster peer-remove` → `RemoveRAFTPeer`), stream/consumer migration, membership-change-in-progress guard, quorum-loss pitfall. (raft.go:948-990, 2383-2393; natscli stream_command.go:1070-1116.) |
| `CL_OPS` | Inspection: `nats server info`, `nats stream info` (Cluster/Leader/Replicas/Lag), `nats stream cluster info`, `nats server report`, `nats stream cluster leader-stepdown`; `/jsz` and `/raftz` endpoints. |
| `CL_RESOURCES` | Hidden-examples sweep ONLY across nats-io/synadia-io/synadia-labs/ConnectEverything + nats-by-example: runnable 3-node cluster configs, R3 stream create, peer-remove walkthroughs. Return real URLs + what each shows + which slug it helps. Do not invent URLs. |

---

## 10. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/clustering/*` URLs return 200 and render.
- [ ] Four new NatsFlow scenarios (`clusterGossipAnimated`, `raftElectionAnimated`,
      `r3ReplicationAnimated`, `peerScalingAnimated`) render where embedded (5-file
      wiring correct); any reused scenario name is one already wired (§6.2).
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Every internal link resolves to a §5.4 allow-list path — no invented
      `/reference/clustering/*` or `/concepts/clustering`.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms; boundary
      vocabulary (gateways/super-cluster/leaf/mirrors/k8s) appears only as links.
- [ ] No page re-teaches cluster shapes (Topologies) or repeats the
      surviving-node-loss intro instead of going deeper.

Per page:

- [ ] ≤2 new concepts; a `## Pitfalls` section (2–4 gotchas, BEFORE `## Where you
      are`); one `## See also` block (≤3 links from §5.4).
- [ ] Server names, stream name, payload, tags match §4 exactly; the session is
      carried forward (stateIn → stateOut).
- [ ] 150–400 lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      equals the path with dashes (§6); CLI is the default tab where Tabs appear.
- [ ] `where-next` carries a `## Production checklist` collecting every page's
      Pitfalls, grouped per page with a `#pitfalls` link.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, etc.) in the file.

---

## 11. Out of scope

- Cluster shapes / when-to-cluster (Topologies); cross-cluster replication,
  gateways, geo-affinity (super-clusters); leaf nodes/domains.
- The one-page replica intro (surviving-node-loss) — link, do not repeat.
- Mirrors/sources for DR (JetStream); backups/snapshots/restore as ops
  (Backup & Recovery); Kubernetes/Helm/rolling upgrades/sizing (Deployment);
  monitoring dashboards beyond naming `/jsz` and `/raftz` (Monitoring).
- Versioned Learn content; translation; search tuning.
- New NatsFlow components beyond the four named in §6.1.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
