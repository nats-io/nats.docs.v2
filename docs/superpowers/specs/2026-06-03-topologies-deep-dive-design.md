# Topologies Deep Dive — Design Spec

**Date:** 2026-06-03
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Topologies** deep dive in the NATS "Learn" section — the Operate-half
chapter that teaches how NATS servers compose into bigger shapes: a single
server, a cluster, a super-cluster, leaf nodes, and all of them combined.

It expands the short **Core Concepts → Topologies** primer
(`docs/concepts/topologies.md`) into a runnable, step-by-step walkthrough. The
concept page is the five-minute overview; this chapter wires each shape up for
real and explains when and why to reach for it.

### 1.1 What we reuse vs. expand

Reuse the framing, vocabulary, and the four-shapes arc from
`docs/concepts/topologies.md` (single → cluster → super-cluster → leaf →
massive scale). Expand every shape into its own page with real config, real
`nats-server` startup, a runnable local walkthrough, an animated diagram, and
the "when/why" trade-offs the concept page only gestures at.

### 1.2 Problems we are fixing

1. The concept page is **diagram + bullet lists** — no runnable path. The deep
   dive gives one.
2. Topology and clustering mechanics get **conflated** in legacy docs. We draw a
   hard line (see §2): Topologies teaches the *shapes and wiring*; the
   *mechanics* (RAFT, quorum, replication, placement) belong to the Clustering &
   Replication chapter and are linked, not re-taught.
3. **Inconsistent naming** (node/instance/broker, supercluster/super-cluster).
   Fixed by the wording lockfile (§5.2).

### 1.3 Non-goals

- Not teaching RAFT, quorum math, replication internals, or placement — those
  are the Clustering & Replication chapter. One-paragraph mentions + links only.
- Not teaching Kubernetes/Helm deployment specifics — that is the Deployment
  chapter. A topology walkthrough uses plain `nats-server` processes.
- Not version-conditional content. Unversioned; concepts only.
- Not exhaustive config reference — link to `/reference/protocols/*`.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Five new animated NatsFlow scenarios**: `singleToClusterAnimated`, `clusterMeshAnimated`, `superClusterAnimated`, `leafNodeAnimated`, `massiveScaleAnimated`. |
| Boundary vs. Clustering chapter | **Shapes vs mechanics.** Topologies wires servers (routes, gateways, leaf remotes); it DEFERS RAFT/quorum/replication/placement to `/learn/clustering`. `jetstream-in-a-cluster` covers only what changes for JetStream at the *topology* level (meta layer, R3, odd node count, where a leader lives). |
| Running scenario | **Acme infra growth story** — one dev server → a 3-node `east` cluster → a super-cluster spanning `east` + `west` → leaf nodes at edge/factory sites, carrying the same ORDERS workload. |
| Reader assumption | Has read Core Concepts (incl. Topologies + JetStream primers). Ideally the JetStream deep dive. No re-teaching pub/sub or streams. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/topologies/` (served at `/learn/topologies`). The
sidebar (`sidebars-learn.ts`) already lists all 8 pages in order — **no sidebar
edit is needed**:

```
learn/topologies/
  index.md                  # 0 — chapter intro (the growth story + map)
  single-server.md          # 1
  your-first-cluster.md     # 2
  jetstream-in-a-cluster.md # 3
  super-clusters.md         # 4
  leaf-nodes.md             # 5
  putting-it-together.md    # 6
  where-next.md             # 7
```

### 3.1 Cross-link from Core Concepts

`docs/concepts/topologies.md` gains a `:::tip` admonition near the top pointing
to `/learn/topologies`. No content is moved; the concept page stays a valid
overview.

### 3.2 URL stability

`/learn/topologies/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme infra growth story)

Acme runs the ORDERS workload from the JetStream/Security chapters. This chapter
grows its **deployment** while the application code never changes. Same ORDERS
subjects and payload shape:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned topology entities (same names, every page):

| Stage | Entity | Names |
|---|---|---|
| Dev | one server | `n1` on `localhost` |
| Production cluster | cluster `east`, 3 servers | `n1-east`, `n2-east`, `n3-east` (client ports 4222/4223/4224, route port 6222…) |
| Super-cluster | second cluster `west`, 3 servers | `n1-west`, `n2-west`, `n3-west`; gateways join `east` ↔ `west` |
| Edge | leaf nodes | `factory-1` (a leaf bridging to the `east` cluster), serving local edge clients |

Rules: the application (publishing `orders.*`, consuming the `ORDERS` stream)
is identical at every stage — that is the whole point. Carry server/config state
forward; state each transition explicitly (dev server → cluster → super-cluster
→ leaf). Never rename a server or invent a different payload.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the JetStream/Security chapters)

- **One teaching thought per paragraph.** Two ideas joined by "and" → split.
- **Define-then-use.** Never use a term before its own paragraph.
- **≤2 new concepts per page.** A third goes to a later page or is linked out.
- **Active voice, present tense. No filler.**
- **Length 150–400 source lines.** Hard cap 400; `index`/`where-next` may be 80+.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| server | "server" (a `nats-server` process) | "broker", "instance", "box", "daemon" |
| node | only in "leaf node" (the specific term) | "node" for a cluster member (use "server") |
| cluster | "cluster" | "ensemble", "group of brokers" |
| route | the server↔server cluster connection | "link"/"peer connection" for routes |
| gateway | the cluster↔cluster connection | "bridge", "peering", "interconnect" |
| super-cluster | "super-cluster" (hyphenated) | "supercluster", "cluster of clusters" (except once, to define it) |
| leaf node | "leaf node" (then "leaf" short) | "satellite", "edge server", "spoke server" |
| full mesh | routes form a "full mesh" | "fully connected graph", "ring" |
| client | the connecting application | conflating it with "server" |
| subject | "subject" (carry from prior chapters) | "topic", "channel" |
| publish / subscribe | "publish" / "subscribe" | "send" / "listen" |
| stream / consumer / replica | carry from JetStream lockfile | "JetStream stream", "subscriber" for consumer |
| JetStream domain | "domain" (the leaf JetStream term) | "realm", "zone" |

### 5.3 Reference handoff phrase (greppable)

> The wire-level detail of `<X>` is documented in
> [Reference → `<Path>`](/reference/protocols/...). We only need `<Y>` here.

Each page ends with a **"## See also"** section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (allow-list)

Topologies DOES have a reference handoff — the protocol pages exist. Link only to:

- **Reference (real):** `/reference/protocols/route`, `/reference/protocols/gateway`,
  `/reference/protocols/leafnode`, `/reference/protocols/client`,
  `/reference/jetstream/api/meta`, `/reference/jetstream/api/stream`,
  `/reference/jetstream/api/consumer`, `/reference/` (root)
- **Concepts:** `/concepts/topologies`, `/concepts/jetstream`, `/concepts/security`,
  `/concepts/subjects`, `/concepts/pub-sub-basics`, `/concepts/queue-groups`,
  `/concepts/request-reply`, `/concepts/what-is-nats`
- **Learn siblings:** `/learn/topologies/<slug>`; `/learn/clustering` and its pages
  (`forming-a-cluster`, `raft-and-leaders`, `replication-and-r3`, `placement`,
  `scaling-and-peers`); `/learn/jetstream` and pages like
  `/learn/jetstream/surviving-node-loss`, `/learn/jetstream/mirrors-and-sources`;
  `/learn/security` and `/learn/security/leaf`-relevant pages; `/learn/deployment`
  and its pages (`kubernetes`, `rolling-upgrades`, `hardening`,
  `sizing-and-resources`); `/learn/monitoring`

Do NOT invent paths outside this list (e.g. `/reference/clustering/...` does not
exist — RAFT/replication detail goes to `/learn/clustering`, not Reference).

---

## 6. Example pattern (matches `CLAUDE.md`)

Topologies is **config + CLI heavy** (like Security).

- Server config (`nats.conf`, cluster/gateway/leafnode blocks), `nats-server`
  startup, and `nats server …` inspection output are **CLI/config-only**: use a
  plain fenced block — `conf` for config, `bash` for shell. No `nats-example` div.
- Use a `nats-example` div ONLY for a snippet with a genuine client-library form
  (e.g. connecting to a cluster with multiple seed URLs and observing
  reconnect/failover, or publishing/consuming across the topology). Each div:

  ```mdx
  <div class="nats-example"
       data-type="learn-topologies-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI file
  `static/examples/snippets/cli/learn/topologies/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real commands). The path dirs join with dashes to form the
  `data-type`; verify they match.
- Running multiple local servers (different ports) to form a cluster is shown as
  inline `bash`/`conf` blocks — the reader can copy-paste to stand up a local
  cluster.

The pinned ORDERS payload and the pinned server names from §4 are identical
across every page and language.

---

## 7. Reference handoff — what stays vs. what goes

| Belongs in Learn | Belongs in Reference / Clustering chapter |
|---|---|
| The *why/when* of each shape | Wire-level route/gateway/leafnode protocol → `/reference/protocols/*` |
| One runnable local walkthrough per shape | Every config field/default |
| One annotated `nats server report` output | RAFT/quorum/replication/placement mechanics → `/learn/clustering` |
| The failure mode that teaches the shape | Exhaustive failure matrices |
| The pinned Acme growth scenario | Version-specific behavior |

---

## 8. Visual aids (NatsFlow) — five NEW animated scenarios

Author as animated React components, modeled on
`src/components/NatsFlow/scenarios/jetStreamContrastAnimated.tsx` and
`jetStreamConsumersAnimated.tsx`. Node `type`s available: `publisher`,
`subscriber`, `service`, `server` (servers are the main building block here;
clients are publisher/subscriber nodes). Edges use `type: "animated"` with
`data: { color, animated, label, delay, interval }`. Wrap in `ReactFlowProvider`.
Export `const <Name>Animated`.

Wiring a new scenario touches FIVE files (all must agree on the camelCase name):

1. `src/components/NatsFlow/scenarios/<name>Animated.tsx`
2. `src/components/NatsFlow/scenarios/index.ts` — `export { … }`
3. `src/plugins/nats-flow/client-module.tsx` — add to `window.NatsFlow`
4. `src/types/global.d.ts` — import type + Window entry
5. `static/js/nats-flow-loader.js` — destructure + a `data-scenario` branch

| Scenario | Page | What it shows |
|---|---|---|
| `singleToClusterAnimated` | `single-server` | One server with a few clients; a toggle "grow" that splits into a 3-server mesh as clients redistribute. Motivates moving past a single server. |
| `clusterMeshAnimated` | `your-first-cluster` | Three servers (`n1-east`/`n2-east`/`n3-east`) in a full mesh of routes, each with clients. Animate a message published on one server reaching a subscriber on another via a route; then a server fails and its client reconnects to a surviving server. |
| `superClusterAnimated` | `super-clusters` | Two clusters (`east`, `west`) joined by a gateway. Animate geo-affinity: a request in `east` is served by a local worker and stays local; only when there is no local interest does traffic cross the gateway to `west`. |
| `leafNodeAnimated` | `leaf-nodes` | A hub cluster plus a leaf (`factory-1`) that opens an OUTBOUND connection to the hub, with its own edge clients. Animate interest bridging both ways across the leaf link. |
| `massiveScaleAnimated` | `putting-it-together` | The composite: two clusters joined by gateways, each fanning out to leaf nodes with edge clients — the full Acme picture, lightly animated. |

Embed per page:

```mdx
<div class="nats-flow" data-scenario="<name>Animated" data-width="640" data-height="400"></div>
```

---

## 9. Page-by-page outline

`stateIn`/`stateOut` track the deployment as it grows. ≤2 new concepts each.

| # | Slug | Teaches (≤2 concepts) | Leaves reader with | Defers / links |
|---|---|---|---|---|
| 0 | `index` | The growth story and the four shapes (single → cluster → super-cluster → leaf), and that the *same app code* runs on all of them. Chapter map. | A mental model of how NATS scales by composing servers. NatsFlow `singleToClusterAnimated` may preview here or on page 1. | — |
| 1 | `single-server` | (1) the simplest deployment — one `nats-server` process, clients connect directly; (2) when one server is enough (dev, embedded, small) and its single-point-of-failure ceiling. Start Acme's dev server `n1`. NatsFlow `singleToClusterAnimated`. | When a single server is the right tool, and the reason to grow. | Embedding/config detail → `/reference/protocols/client`, `/reference/` root. |
| 2 | `your-first-cluster` | (1) a cluster is servers joined by **routes** into a **full mesh**; (2) clients connect to any server and **reconnect/failover** to another when one dies (server discovery / advertised URLs). Stand up `n1-east`/`n2-east`/`n3-east` locally with `cluster {}` + routes. NatsFlow `clusterMeshAnimated`. | How to wire a cluster and what failover buys. | Route wire protocol → `/reference/protocols/route`; RAFT/quorum/placement → `/learn/clustering`. |
| 3 | `jetstream-in-a-cluster` | (1) JetStream in a cluster adds a **meta layer** with its own leader that manages stream/consumer assignment; (2) a replicated stream (R3) needs an **odd number of servers** for a quorum, and each stream has a leader where its writes land. Show ORDERS as R3 on the `east` cluster. **No RAFT internals** — defer to Clustering. | What changes for JetStream once there's a cluster, at the topology level. | RAFT, quorum math, replication, placement → `/learn/clustering` (raft-and-leaders, replication-and-r3, placement); meta API → `/reference/jetstream/api/meta`; durability → `/learn/jetstream/surviving-node-loss`. |
| 4 | `super-clusters` | (1) a super-cluster joins clusters with **gateways**, which carry only traffic that has interest on the other side; (2) **geo-affinity** keeps queue-group/request traffic local, crossing a gateway only when needed. Join `east` ↔ `west` with `gateway {}`. NatsFlow `superClusterAnimated`. | When to span regions and how gateways differ from routes. | Gateway wire protocol → `/reference/protocols/gateway`; queue-group recap → `/concepts/queue-groups`. |
| 5 | `leaf-nodes` | (1) a leaf node is a server that opens an **outbound** connection to a remote NATS system and bridges subject interest, so it can run anywhere with outbound access; (2) the leaf binds to an account on the hub and its local clients stay hidden behind it. Attach `factory-1` to `east` with `leafnodes {}` + a remote. NatsFlow `leafNodeAnimated`. One line on JetStream **domains**. | When to push NATS to the edge and how a leaf bridges in. | Leafnode wire protocol → `/reference/protocols/leafnode`; leaf auth → `/learn/security`; JetStream over leaf → `/learn/jetstream/mirrors-and-sources`. |
| 6 | `putting-it-together` | Compose everything: clusters + gateways + leaf nodes = massive scale; address-space isolation behind leaves; the same client code everywhere. The full Acme picture. NatsFlow `massiveScaleAnimated`. Mostly synthesis, ≤2 genuinely new ideas (composition + isolation). | A map of how the shapes combine in a real deployment. | Deployment specifics → `/learn/deployment` (kubernetes, rolling-upgrades); scaling → `/learn/clustering/scaling-and-peers`. |
| 7 | `where-next` | Navigation. Recap: same binary, same client code, four composable shapes. Pointers to Clustering (mechanics), Deployment, Monitoring, Security (leaf auth), and the protocol references. May be 80+ lines. | A map of what's beyond this chapter. | — |

---

## 10. Research domains (Phase 1 — verified fact packs)

Source of truth: `nats-server` (config + cluster/gateway/leafnode handling),
`natscli` (`nats server …` inspection commands), the `/reference/protocols/*`
pages, ADRs where relevant. Also sweep **nats-io, synadia-io, synadia-labs,
ConnectEverything** GitHub orgs and **nats-by-example** via WebSearch for hidden,
runnable topology examples (cluster/super-cluster/leaf configs, compose/k8s).

| Key | Focus |
|---|---|
| `T_SINGLE` | Single server: minimal `nats.conf`, `server_name`, client `port` (4222), monitoring `http_port` (8222), running `nats-server`, embedding, when one server suffices + its SPOF ceiling. |
| `T_CLUSTER` | Clustering: the `cluster {}` block (`name`, `listen`, `routes`), full-mesh routes, route gossip/seed, client reconnect + server discovery (advertised connect URLs, `no_advertise`, `client_advertise`). How to run 3 local servers on different ports to form a cluster. `/reference/protocols/route`. |
| `T_JS_CLUSTER` | JetStream in a cluster (TOPOLOGY level only): the meta group/leader, stream/consumer assignment, R3/R5 replicas, why a quorum needs an odd server count, stream leader vs meta leader, `nats server report jetstream` / `nats stream info` cluster fields. Explicitly DEFER RAFT internals. `/reference/jetstream/api/meta`. |
| `T_SUPERCLUSTER` | Super-clusters/gateways: the `gateway {}` block (`name`, `listen`, `gateways: [{name,url}]`), how gateways differ from routes (interest-only propagation, optimistic mode), geo-affinity for queue groups / RTT, when cross-region. `/reference/protocols/gateway`. |
| `T_LEAF` | Leaf nodes: the `leafnodes {}` block + `remotes: [{urls, credentials, account}]`, the outbound connection model, interest bridging, account binding on the hub, hub vs leaf perspective, JetStream `domain` config for leaf. `/reference/protocols/leafnode`. |
| `T_COMPOSITE` | Combining shapes: clusters + gateways + leaf at massive scale, address-space isolation behind leaves, mixing patterns, decision guidance. nats-by-example + synadia deployment writeups. |
| `T_OPS` | Operational glue for inspecting a topology: `server_name`, ports, config reload, `/varz`/`/routez`/`/gatewayz`/`/leafz` monitoring endpoints, `nats server list`/`nats server report`/`nats server check` natscli commands. |
| `T_RESOURCES` | Hidden-examples sweep ONLY across nats-io/synadia-io/synadia-labs/ConnectEverything + nats-by-example: runnable cluster/super-cluster/leaf configs, docker-compose/k8s topology examples, leaf-at-edge writeups. Return real URLs + what each shows + which slug it helps. Do not invent URLs. |

---

## 11. Acceptance criteria

Chapter-wide:

- [ ] All 8 `/learn/topologies/*` URLs return 200 and render.
- [ ] Five new NatsFlow scenarios render where embedded (5-file wiring correct).
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] `docs/concepts/topologies.md` carries the `/learn/topologies` cross-link.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms.
- [ ] No topology page re-teaches RAFT/quorum/replication/placement (boundary §2).

Per page:

- [ ] ≤2 new concepts; one "See also" block (≤3 links from the §5.4 allow-list).
- [ ] Server names/payload match §4 exactly.
- [ ] 150–400 lines (`index`/`where-next` may be 80+).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      matches the file path; CLI default tab where Tabs are used.

---

## 12. Out of scope

- RAFT/quorum/replication/placement mechanics (Clustering chapter).
- Kubernetes/Helm deployment specifics (Deployment chapter).
- Versioned Learn content; translation; search tuning.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
</content>
