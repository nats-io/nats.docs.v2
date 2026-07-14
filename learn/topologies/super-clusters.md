---
id: super-clusters
title: "Super-clusters"
sidebar_position: 5
description: Join the east and west clusters with gateways, and keep order traffic local by default
---

# Super-clusters

Acme's `east` cluster is healthy: three servers form a full mesh of
routes, with the `ORDERS` stream replicated across them. But half of Acme's customers are a continent away from `east`, and every
order they place has to cross the continent to reach it. So Acme brings up
a second region — a `west` data center near those customers, where their
orders land with far less latency.

Now two regions have to behave as one system — a publisher in either
reaches a subscriber in the other — without dragging every message across
the slow link between them.

You could run `west` as a completely separate NATS deployment. But then
a publisher in `west` could never reach a subscriber in `east`, and the
`ORDERS` stream in one region would be invisible to the other, leaving
you with two isolated islands.

You could also stretch one cluster across both regions, putting all six
servers in a single mesh of routes. That works, but every server holds a
route to every other server, and route traffic flows freely across the
slow, expensive link between regions. A full mesh assumes the members
are close together.

A **super-cluster** is the shape for this. It joins two independent
clusters into one logical system without combining them into a single
mesh. This page wires `east` and `west` together and shows how traffic
stays in its home region by default.

## Two concepts on this page

This page introduces two ideas:

- Gateways: the cluster-to-cluster connection that joins clusters
  into a super-cluster.
- Geo-affinity: the behavior that keeps queue-group and request
  traffic in its home region, crossing a gateway only when no local
  worker can serve it.

## How a gateway joins clusters

Inside a cluster, every server holds a **route** to every other server,
the full mesh from [Your first cluster](/learn/topologies/your-first-cluster).
A **gateway** is a different kind of connection. It joins one *cluster*
to another *cluster*.

A route ties two *servers* together and assumes they're close; a gateway
ties two *clusters* together and assumes they're far apart. Stretch one
cluster across both regions and every server holds a route to every server
in the other region — a full mesh running over the slow link. A
super-cluster keeps each region's mesh local and connects the regions
through gateways instead, so the servers never mesh across the WAN,
however many each region runs. Each server opens just one gateway connection
to each *other cluster*, never one to every remote server.

A gateway also carries less. A route propagates interest freely inside its
cluster; a gateway forwards a message to another cluster only when that
cluster has a subscriber for it, and prefers a local worker over a remote
one. Those two behaviors — interest-based forwarding and geo-affinity —
get their own sections below, and they're what keep the inter-region link
quiet.

A super-cluster (sometimes called a cluster of clusters) is just clusters
joined this way.
Each cluster keeps running on its own. The gateway is the connection
between them.

<div class="nats-flow" data-scenario="superClusterAnimated" data-width="720" data-height="400"></div>

## Gateways carry only what has interest

A gateway doesn't blindly forward every message to the other side. It
carries a message across only when the remote cluster has a subscriber
interested in that subject.

This is the whole reason gateways are cheap to run across a slow link. A
publisher in `east` floods `orders.created` thousands of times a second.
If nobody in `west` subscribes to `orders.created`, not one of those
messages crosses the gateway, because there is no interest on the far
side to forward them to.

The wire-level detail of how gateways advertise and track this interest
lives in [Reference → Gateway protocol](/reference/protocols/gateway).
All you need here is the behavior: no interest on the far side means no
traffic across the gateway.

## Wiring east to west

You configure a gateway with a `gateway {}` block. The block names the
local cluster and lists the remote clusters to reach.

Here's the `gateway {}` block for the `east` servers. It declares the
local gateway name `east`, the port this server listens on for inbound
gateway connections, and a `gateways` array pointing at `west`:

```conf
# east gateway block — the name and the gateways list are shared
# by n1-east, n2-east, n3-east; on one host each picks its own port.
gateway {
  name: "east"
  port: 7222

  gateways: [
    { name: "west", urls: ["nats://127.0.0.1:7322", "nats://127.0.0.1:7323", "nats://127.0.0.1:7324"] }
  ]
}
```

Read two fields carefully.

The `name` field identifies the *cluster*, not the server. Every server
in `east` uses the identical gateway name `east`. It has to match the name
in this server's `cluster {}` block exactly — set them differently and the
server refuses to start (`cluster name conflicts between cluster and
gateway definitions`). A server's own entry
in the `gateways` array is ignored automatically, so the `name` and the
`gateways` list are identical across all three `east` servers. In this
localhost demo the `port` differs per server; on separate hosts even that
is identical.

The `gateways` array lists every remote cluster, each with its `name`
and the `urls` to reach its gateway listeners. Listing all three `west`
URLs gives the connection somewhere to land if one `west` server is
down. That's also the hint that each `west` server runs its own gateway
listener. On separate hosts every `east` server can use this identical
block, port 7222 included — each host is its own listener, so the three
`west` URLs point at three distinct `west` listeners on three hosts. The
distinct ports here (7222-7224) exist only because this demo runs all six
servers on one machine, where a shared port would collide.

You don't have to list every cluster exhaustively, though. Like routes,
gateways **gossip**: point a server at a few remote gateways and it
discovers the rest, including clusters it was never told about directly.
Seed `east` with `west` and `west` with a third region, and `east` picks up
that region on its own. The URLs are a starting point for discovery and a
fallback if one is down, not a list you must keep complete.

The `west` servers get the mirror-image block, with local name `west`
pointing back at the `east` gateway URLs:

```conf
# west gateway block — name and gateways list shared by
# n1-west, n2-west, n3-west; on one host each picks its own port.
gateway {
  name: "west"
  port: 7322

  gateways: [
    { name: "east", urls: ["nats://127.0.0.1:7222", "nats://127.0.0.1:7223", "nats://127.0.0.1:7224"] }
  ]
}
```

Each cluster keeps the `cluster {}` block and the client `port` it had
before. The `gateway {}` block is additive. You're not rebuilding
`east`; you're adding a gateway connection from it to `west`.

To stand the whole thing up on your own machine without hand-editing six
files, this script writes every config and starts all six servers. East
uses client ports 4222-4224 and west 4225-4227; each server's gateway
`name` matches its cluster `name`, as above.

```bash
# Write a cluster+gateway config for each server, then start the super-cluster.
write_conf() {  # name cluster client cluster-port route gateway-port remote remote-urls
  cat > "$1.conf" <<EOF
server_name: $1
listen: 127.0.0.1:$3
cluster {
  name: $2
  listen: 127.0.0.1:$4
  routes: [ nats://127.0.0.1:$5 ]
}
gateway {
  name: $2
  listen: 127.0.0.1:$6
  gateways: [ { name: $7, urls: [ $8 ] } ]
}
EOF
}

EAST_URLS='nats://127.0.0.1:7222, nats://127.0.0.1:7223, nats://127.0.0.1:7224'
WEST_URLS='nats://127.0.0.1:7322, nats://127.0.0.1:7323, nats://127.0.0.1:7324'

write_conf n1-east east 4222 6222 6223 7222 west "$WEST_URLS"
write_conf n2-east east 4223 6223 6222 7223 west "$WEST_URLS"
write_conf n3-east east 4224 6224 6222 7224 west "$WEST_URLS"
write_conf n1-west west 4225 6225 6226 7322 east "$EAST_URLS"
write_conf n2-west west 4226 6226 6225 7323 east "$EAST_URLS"
write_conf n3-west west 4227 6227 6225 7324 east "$EAST_URLS"

for s in n1-east n2-east n3-east n1-west n2-west n3-west; do
  nats-server -c "$s.conf" &
done
```

Stop everything later with `pkill nats-server`. These configs leave
JetStream off to keep the gateway demo simple — add the `jetstream` block
from the [previous page](/learn/topologies/jetstream-in-a-cluster) if you
want `ORDERS` in the mix too.

## Confirm the super-cluster formed

Confirm the super-cluster works by sending a message across it. Subscribe
in `west`, publish in `east`, and watch the order arrive on the far side of
the gateway.

Subscribe to `orders.>` on a `west` server, in its own terminal:

```bash
nats sub "orders.>" --server nats://localhost:4225
```

In another terminal, publish to an `east` server:

```bash
nats pub orders.created "order ord_8w2k" --server nats://localhost:4222
```

The `west` subscriber prints the order:

```
[#1] Received on "orders.created"
order ord_8w2k
```

It was published in `east`, crossed the gateway, and arrived in `west`.
That only happens once the gateway is live *and* `west` has advertised
interest in `orders.>` across it — the interest-based forwarding from
[earlier](#gateways-carry-only-what-has-interest). If nothing arrives,
check each server's log for gateway connection errors — a typo'd remote
name or an unreachable gateway URL keeps the connection from forming.

## Geo-affinity keeps traffic local

The second concept is geo-affinity. Acme runs the same fleet of order
workers in both regions: a **queue group** named `order-workers`, where each
message goes to exactly one worker in the group. (If queue groups are
hazy, the [queue-groups primer](/concepts/queue-groups) is the
five-minute recap.)

Here's the question a super-cluster has to answer: when a worker exists
in *both* `east` and `west`, and an order is published in `east`, which
worker handles it?

The answer is **geo-affinity**. NATS prefers a local queue subscriber
first. An order published in `east` goes to an `east` worker, even
though a `west` worker is also subscribed and willing. The message never
crosses the gateway, because it doesn't need to.

This keeps the slow inter-region link quiet. Day to day, `east` orders
are served in `east` and `west` orders in `west`, so each region's
traffic stays within that region.

The gateway carries the message only when the local side can't
serve. If every `east` worker is down, an order published in `east` has
no local subscriber, so geo-affinity falls through and the message
crosses the gateway to a remote cluster that has an interested worker.
When more than one remote cluster has a worker for the queue group, NATS
picks one of them and sends the message across that single gateway, so the
order still reaches exactly one worker, and no work is lost in the process.

You can watch this local-first behavior. Start a queue worker in each
region, each in its own terminal:

```bash
# terminal 1 — a worker in east
nats sub orders.created --queue order-workers --server nats://localhost:4222
```

```bash
# terminal 2 — a worker in west
nats sub orders.created --queue order-workers --server nats://localhost:4225
```

Publish an order in `east`:

```bash
nats pub orders.created "order ord_8w2k" --server nats://localhost:4222
```

The `east` worker prints it and `west` stays silent — geo-affinity served
it locally. Stop the `east` worker (`Ctrl+C`) and publish again: now `west`
prints it. With no local worker left, the order fell through to the gateway
and crossed to `west`, and nothing on the publisher changed to make it
happen.

## Pitfalls

A super-cluster has a few traps that all come from one habit: thinking
about it like a bigger cluster, which it is not. The connection between
regions is a gateway, and gateways behave differently from routes.

**Reaching for routes to span regions.** A route is the intra-cluster
link that builds the full mesh. It assumes its peers are close and floods
freely. Stretch one `cluster {}` across `east` and `west` and every
server holds a route to every other server, with cluster traffic crossing
the slow link constantly. Don't grow a cluster across regions. Join two
independent clusters with a `gateway {}` block instead, so only
interested traffic crosses the gateway.

**Mismatched gateway names.** Each entry in the `gateways` array must use
the remote cluster's exact name. Typo it — `wset` for `west` — and that
entry never connects; the server logs `Failing connection to gateway
"wset", remote gateway name is "west"` on every retry. Because the other
cluster's config is correct, its outbound connection still lands, and the
super-cluster forms through that reverse connection and gossip. So a
working cross-region publish doesn't prove your config is right — the typo
keeps failing in the background. Watch each server's log for that error
string instead.

**Chatty cross-region traffic without local workers.** Geo-affinity only
keeps traffic home when a *local* queue subscriber exists to serve it.
Run all your `order-workers` in `east` and let `west` clients publish, and
every `west` order crosses the gateway to reach a worker. The slow link
carries your steady-state load, not just failover. Don't centralize
workers in one region and assume geo-affinity avoids the cross-region
cost. Place a
queue subscriber for each workload in every region that produces that
work, so each region serves its own orders and the gateway stays quiet.

## Where you are

Acme's deployment grew from one cluster to a super-cluster:

- `east` and `west` are independent clusters, each a full mesh of routes.
- A gateway joins them, carrying only traffic with interest on the
  far side.
- Geo-affinity keeps queue-group and request traffic in its home
  region, crossing the gateway only when the local side can't serve.
- Nothing about publishing or subscribing changed — the same
  `orders.created` publish still reaches an interested subscriber, now even
  across regions.

## What's next

The next page pushes NATS past the data center entirely. A
[leaf node](/learn/topologies/leaf-nodes) is a server that *dials out* to
the `east` cluster — a single outbound connection, so it works from a
factory or a laptop with no inbound ports open. That one connection is
two-way, so once it's up the leaf bridges order traffic in both directions.

## See also

- [Reference → Gateway protocol](/reference/protocols/gateway) — the
  wire-level detail of how gateways advertise interest and connect.
- [Core Concepts → Queue Groups](/concepts/queue-groups) — the recap of
  the queue-group behavior geo-affinity steers.
- [Operate → Clustering & Replication](/learn/clustering) — how a stream's
  replicas work within one cluster (a gateway carries interest across
  regions, not stream copies).
