---
id: super-clusters
title: "4. Super-clusters"
sidebar_position: 5
description: Join the east and west clusters with gateways, and keep order traffic local by default
---

# 4. Super-clusters

Acme's `east` cluster is healthy. Three servers, a full mesh of routes,
the `ORDERS` stream replicated across them. Then a second region comes
online: a `west` data center, closer to half of Acme's customers.

You could run `west` as a completely separate NATS deployment. But then
a publisher in `west` could never reach a subscriber in `east`, and the
`ORDERS` stream in one region would be invisible to the other. Two
islands.

You could also stretch one cluster across both regions — put all six
servers in a single mesh of routes. That works, but every server holds a
route to every other server, and route traffic flows freely across the
slow, expensive link between regions. A full mesh assumes the members
are close together.

A **super-cluster** is the shape for this. It joins two independent
clusters into one logical system without melting them into a single
mesh. This page wires `east` and `west` together and shows how traffic
stays in its home region by default.

## Two concepts on this page

This page introduces two ideas:

- **Gateways** — the cluster-to-cluster connection that joins clusters
  into a super-cluster.
- **Geo-affinity** — the behavior that keeps queue-group and request
  traffic in its home region, crossing a gateway only when no local
  worker can serve it.

## A gateway joins clusters, not servers

Inside a cluster, every server holds a **route** to every other server —
the full mesh from the [previous chapter](/learn/topologies/your-first-cluster).
A **gateway** is a different kind of connection. It joins one *cluster*
to another *cluster*.

The distinction matters for how many connections you pay for. Routes
mesh every server to every other server. Gateways mesh every *cluster*
to every other *cluster*, and a single gateway connection per cluster
pair carries all the cross-region traffic.

The savings grow with scale. Three clusters of three servers each, all
meshed by routes, would need 36 route connections. Joined as a
super-cluster instead, the same nine servers need only 18 gateway
connections between clusters. Gateways are how NATS spans regions
without a connection explosion.

A super-cluster — sometimes called a cluster of clusters, the one time
this guide will write that phrase — is just clusters joined this way.
Each cluster keeps running on its own. The gateway is the seam between
them.

<div class="nats-flow" data-scenario="superClusterAnimated" data-width="640" data-height="400"></div>

## Gateways carry only what has interest

A gateway does not blindly forward every message to the other side. It
carries a message across only when the remote cluster has a subscriber
interested in that subject.

This is the whole reason gateways are cheap to run across a slow link. A
publisher in `east` floods `orders.created` thousands of times a second.
If nobody in `west` subscribes to `orders.created`, not one of those
messages crosses the gateway. The interest never existed, so the traffic
never travels.

The wire-level detail of how gateways advertise and track this interest
is documented in [Reference → Gateway protocol](/reference/protocols/gateway).
We only need the behavior here: no interest on the far side means no
traffic across the gateway.

## Wiring east to west

A gateway is configured with a `gateway {}` block. The block names the
local cluster and lists the remote clusters to reach.

Here is the `gateway {}` block for the `east` servers. It declares the
local gateway name `east`, the port this server listens on for inbound
gateway connections, and a `gateways` array pointing at `west`:

```conf
# east gateway block — the name and the gateways list are shared
# by n1-east, n2-east, n3-east; each server picks its own port.
gateway {
  name: "east"
  port: 7222

  gateways: [
    { name: "west", urls: ["nats://127.0.0.1:7322", "nats://127.0.0.1:7323", "nats://127.0.0.1:7324"] }
  ]
}
```

Two things to read carefully.

The `name` field identifies the *cluster*, not the server. Every server
in `east` uses the identical gateway name `east`. A server's own entry
in the `gateways` array is ignored automatically, so the `name` and the
`gateways` list are identical across all three `east` servers — only the
`port` each one listens on differs.

The `gateways` array lists every remote cluster, each with its `name`
and the `urls` to reach its gateway listeners. Listing all three `west`
URLs gives the connection somewhere to land if one `west` server is
down — which is also the hint that each remote server runs its own
gateway listener on its own port. The `port` line above is per server:
in a real deployment `n1-east`, `n2-east`, and `n3-east` each bind a
distinct gateway port, and the three `west` URLs point at three distinct
`west` listeners. The shared part is the `name` and the `gateways` list,
not the port.

The `west` servers get the mirror-image block — local name `west`,
pointing back at the `east` gateway URLs:

```conf
# west gateway block — name and gateways list shared by
# n1-west, n2-west, n3-west; each server picks its own port.
gateway {
  name: "west"
  port: 7322

  gateways: [
    { name: "east", urls: ["nats://127.0.0.1:7222", "nats://127.0.0.1:7223", "nats://127.0.0.1:7224"] }
  ]
}
```

Each cluster keeps the `cluster {}` block and the client `port` it had
before. The `gateway {}` block is additive. You are not rebuilding
`east`; you are giving it a seam to `west`.

A runnable two-cluster setup, with both clusters started and joined as a
super-cluster, lives in
[`gateway-config.sh`](#wiring-east-to-west). Run it to watch the gateway
form on your own machine.

## Confirm the super-cluster formed

Ask any server what gateways it sees:

```bash
nats server report gateways
```

The report lists the local cluster and the remote clusters reachable
through gateways. `east` should report a connection to `west`, and
`west` a connection to `east`. The same data is on the HTTP monitoring
endpoint at `http://127.0.0.1:8222/gatewayz` if you prefer to curl it.

Once both directions show, the seam is live. A publisher in either region
can now reach an interested subscriber in the other.

## Geo-affinity keeps traffic local

Now the second concept. Acme runs the same fleet of order workers in
both regions — a **queue group** named `order-workers`, where each
message goes to exactly one worker in the group. (If queue groups are
hazy, the [queue-groups primer](/concepts/queue-groups) is the
five-minute recap.)

Here is the question a super-cluster has to answer: when a worker exists
in *both* `east` and `west`, and an order is published in `east`, which
worker handles it?

The answer is **geo-affinity**. NATS prefers a local queue subscriber
first. An order published in `east` goes to an `east` worker, even
though a `west` worker is also subscribed and willing. The message never
crosses the gateway, because it does not need to.

This keeps the slow inter-region link quiet. Day to day, `east` orders
are served in `east` and `west` orders in `west`. Each region's traffic
stays home.

The gateway becomes the safety net only when the local side cannot
serve. If every `east` worker is down, an order published in `east` has
no local subscriber — so geo-affinity falls through and the message
crosses the gateway to a remote cluster that has an interested worker.
When more than one remote cluster has a worker for the queue group, NATS
forwards across every gateway with interest. The queue-group rule still
applies on the far side, so the order reaches exactly one worker. No work
is lost; it just travels.

You can watch this local-first behavior with a queue subscriber running
in each region:

<div class="nats-example"
     data-type="learn-topologies-super-clusters-geo-affinity"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Publish in `east` while both workers run, and the `east` worker answers
every time. Stop the `east` worker, publish again, and the order now
crosses to `west`. That fallthrough is the gateway doing its job — and
nothing on the publisher changed to make it happen.

## What this does not change

The application code is identical to the single `east` cluster. A
publisher still calls publish on `orders.created`. A worker still
subscribes to its queue group. Neither knows a second region exists.

What about the `ORDERS` stream and its replicas? A super-cluster lets a
stream's replicas span regions, but where those replicas land and how
they stay consistent across a slow link is replication mechanics, not
topology. That belongs to the
[Clustering & Replication](/learn/clustering) chapter, which covers
placement across a super-cluster. The shape — gateways joining clusters
— is all we wire here.

## Pitfalls

A super-cluster has a few traps that all come from one habit: thinking
about it like a bigger cluster. It is not. The seam between regions is a
gateway, and gateways behave differently from routes.

**Reaching for routes to span regions.** A route is the intra-cluster
link that builds the full mesh. It assumes its peers are close and floods
freely. Stretch one `cluster {}` across `east` and `west` and every
server holds a route to every other server, with cluster traffic crossing
the slow link constantly. Do not grow a cluster across regions. Join two
independent clusters with a `gateway {}` block instead, so only
interested traffic crosses the seam.

**Mismatched gateway names.** The `name` in each gateway block names the
*cluster*, and each entry in the `gateways` array must use the remote
cluster's exact name. Get one character wrong and the server refuses the
connection — its log reads `Connection from "west" rejected, wanted to
connect to "east", this is "eats"` — and the seam silently never forms.
Always confirm both directions show up after wiring:

<div class="nats-example"
     data-type="learn-topologies-super-clusters-gateway-name-check"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

If `server report gateways` lists no remote cluster, the gateway did not
join. Check the names match before looking anywhere else.

**Chatty cross-region traffic without local workers.** Geo-affinity only
keeps traffic home when a *local* queue subscriber exists to serve it.
Run all your `order-workers` in `east` and let `west` clients publish, and
every `west` order crosses the gateway to reach a worker — the slow link
carries your steady-state load, not just failover. Do not centralize
workers in one region and assume geo-affinity hides the distance. Place a
queue subscriber for each workload in every region that produces that
work, so each region serves its own orders and the gateway stays quiet.

## Where you are

Acme's deployment grew from one cluster to a super-cluster:

- `east` and `west` are independent clusters, each a full mesh of routes.
- A **gateway** joins them, carrying only traffic with interest on the
  far side.
- **Geo-affinity** keeps queue-group and request traffic in its home
  region, crossing the gateway only when the local side cannot serve.
- The ORDERS application code never changed.

## What is next

The next page pushes NATS past the data center entirely. A
[leaf node](/learn/topologies/leaf-nodes) is a server that opens an
*outbound* connection into the `east` cluster, so it can run at a
factory or on a laptop with nothing but outbound network access — and
still bridge order traffic in both directions.

## See also

- [Reference → Gateway protocol](/reference/protocols/gateway) — the
  wire-level detail of how gateways advertise interest and connect.
- [Core Concepts → Queue Groups](/concepts/queue-groups) — the recap of
  the queue-group behavior geo-affinity steers.
- [Operate → Clustering & Replication](/learn/clustering) — where stream
  replicas live across a super-cluster, and how they stay consistent.
