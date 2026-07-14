---
id: putting-it-together
title: "Putting it together"
sidebar_position: 7
description: Compose clusters, gateways, and leaf nodes into the full Acme topology, with isolation behind leaves and the same client code everywhere
---

# Putting it together

Across five pages you've seen four shapes: a single server, a cluster
joined by routes, a super-cluster joined by gateways, and a leaf node
bridging in from the edge. Each page either added a shape or deepened
one, and carried the last one forward.

This page doesn't add a new shape. It shows how the shapes you already
know stack into one deployment, and names the one property that stack
provides without extra work.

It introduces two ideas: composition — the shapes are layers you
combine, not options you choose between — and the one thing composition
doesn't give you: a boundary between the layers, which stays a
leaf-and-account decision.

## The Acme deployment so far

By the end of the leaf-nodes page, the Acme deployment looked like this.

Two clusters: `east` (`n1-east`, `n2-east`, `n3-east`) and `west`
(`n1-west`, `n2-west`, `n3-west`). Each is three servers in a full
mesh of routes.

The two clusters are joined into a super-cluster by gateways. A message
crosses a gateway only when the other side has interest in its subject.

One leaf, `factory-1`, opens an outbound connection to the `east`
cluster and serves its own local edge clients on the factory floor.

The ORDERS workload runs on top of all of it, unchanged. Producers
publish `orders.*`. Consumers read the `ORDERS` stream. The same code
that ran against `n1` on a laptop runs against this.

<div class="nats-flow" data-scenario="massiveScaleAnimated" data-width="820" data-height="470"></div>

The animation shows the messaging layer: an order published in one place
crossing routes, the gateway, and the leaf link to reach interest
elsewhere. The `ORDERS` stream's replicas live on the same servers but
aren't drawn here — that's the JetStream layer from
[JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster).

## Shapes are layers you combine

Look at that deployment again and notice that no shape replaced
another. The cluster is three servers, each one a server like `n1`,
added without removing the single server. The super-cluster is two
clusters with a gateway between them, added without removing the
cluster. The leaf is one more server that dials in, added without
removing anything.

This is **composition**. Each shape is a layer. You add the next layer
when the current one runs out of room, and the layer below keeps
working exactly as it did.

The wiring stays local to each layer. Routes wire servers inside one
cluster. Gateways wire clusters inside a super-cluster. Leaf remotes
wire a leaf to a hub. No single config block has to know about the
whole picture; each server configures only the connections it owns.

A server can take part in more than one layer at once. `n1-east`
carries routes to its cluster peers, a gateway to `west`, and the
inbound leaf connection from `factory-1`, all from one config file
with three topology blocks:

```conf
# n1-east.conf — one server, three roles
server_name: n1-east
listen: 127.0.0.1:4222

cluster {
  name: east
  listen: 127.0.0.1:6222
  routes: [
    nats://127.0.0.1:6223   # n2-east; gossip fills in the rest
  ]
}

gateway {
  name: east
  listen: 127.0.0.1:7222
  gateways: [
    { name: west, urls: ["nats://127.0.0.1:7322", "nats://127.0.0.1:7323", "nats://127.0.0.1:7324"] }
  ]
}

leafnodes {
  listen: 127.0.0.1:7422
}

jetstream {
  store_dir: "./js/n1-east"
}
```

That's three topology blocks for three layers on one server. The `cluster` block
is the same one from [Your first cluster](/learn/topologies/your-first-cluster),
the `gateway` block is from [Super-clusters](/learn/topologies/super-clusters),
and the `leafnodes` block is from
[Leaf nodes](/learn/topologies/leaf-nodes). Putting them in one file is
all "composition" means.

## Composition and boundaries

Stacking these shapes gives you one address space by default. Routes carry
an account's full interest across a cluster; a gateway forwards any subject
the far side wants. Neither partitions anything — they widen where a message
can go.

The one layer that *can* draw a boundary is the leaf, and only when you bind
it to its own account — the **address-space isolation** from
[Leaf nodes](/learn/topologies/leaf-nodes). In a composed deployment, if you
want to keep one part's subjects private, that's where the boundary lives,
not in another route or gateway.

## Picking the next layer

You don't design the whole stack up front. You add a layer when a
specific limit forces it. The limits map cleanly onto the shapes.

- **One server** is enough until a single point of failure is
  unacceptable, or one server can't carry the load. Then add a
  cluster.
- **One cluster** is enough until you need a second region, or a
  failure domain that a single mesh can't give you. Then join a
  second cluster with a gateway.
- **A super-cluster** reaches every region, but not every site. When a
  factory, a ship, or a laptop needs NATS locally with only outbound
  network access, attach a leaf.

Each step is reversible: the layer below never changed, so removing the
layer above leaves a working deployment behind.

## Seeing the whole topology at once

Everything so far has run auth-free, confirmed by publishing across each
boundary. To *survey* the whole fabric instead — every server, cluster, and
connection in one view — you need the **system account** (`$SYS`), which
this chapter doesn't set up. Add one (the [Security deep
dive](/learn/security) covers it), connect with its credentials, and a few
admin commands report the layers.

`nats server list` reports each server, which cluster it belongs to, and
its route and gateway connection counts:

```bash
nats server list
```

```
╭───────────────────────────────────────────────────────────────────────────╮
│                                  Server Overview                            │
├──────────┬─────────┬──────┬─────────┬─────┬───────┬──────┬────────┬─────────┤
│ Name     │ Cluster │ Host │ Version │ JS  │ Conns │ Subs │ Routes │ GWs     │
├──────────┼─────────┼──────┼─────────┼─────┼───────┼──────┼────────┼─────────┤
│ n1-east  │ east    │ ...  │ 2.x.x   │ yes │     4 │   12 │      2 │       1 │
│ n2-east  │ east    │ ...  │ 2.x.x   │ yes │     3 │   12 │      2 │       1 │
│ n3-east  │ east    │ ...  │ 2.x.x   │ yes │     2 │   12 │      2 │       1 │
│ n1-west  │ west    │ ...  │ 2.x.x   │ yes │     2 │   11 │      2 │       1 │
│ n2-west  │ west    │ ...  │ 2.x.x   │ yes │     1 │   11 │      2 │       1 │
│ n3-west  │ west    │ ...  │ 2.x.x   │ yes │     1 │   11 │      2 │       1 │
╰──────────┴─────────┴──────┴─────────┴─────┴───────┴──────┴────────┴─────────╯
```

Each layer also has its own focused report, one command per layer:

```bash
nats server report routes      # the mesh inside each cluster
nats server report gateways    # the gateways between clusters
nats server report leafnodes   # the leaves dialed into the hub
```

`nats server report leafnodes` is the one that shows `factory-1`. It
lists the leaf by name, the account it's on, its address, and its
round-trip time. That's the leaf link the previous section described,
made visible:

```
╭──────────────────────────────────────────────────────────────────╮
│                         Leafnode Report                            │
├─────────┬───────────┬─────────┬──────────────────┬──────┬─────────┤
│ Server  │ Name      │ Account │ Address          │ RTT  │ Spoke   │
├─────────┼───────────┼─────────┼──────────────────┼──────┼─────────┤
│ n1-east │ factory-1 │ $G      │ 203.0.113.7:...  │ 18ms │ false   │
╰─────────┴───────────┴─────────┴──────────────────┴──────┴─────────╯
```

The `Account` column reads `$G`: nothing set up a dedicated account for
the leaf, so it lands in the default global account, and there's no
boundary here — matching the auth-free deployment.

The `Spoke` column reads `false` because this report comes from
`n1-east`, the hub end that accepted the connection. The column is
`true` only on the leaf's own report — `factory-1` dialed out, so from
its side it's the spoke. Either way it's the leaf direction from
[Leaf nodes](/learn/topologies/leaf-nodes).

Run these three reports together and you've surveyed every layer of
the deployment in one pass: routes, gateways, and leaves, each shown by
the command named after it.

## The client code stays the same

The main point of this chapter is that nothing on the client side changed
across any of these layers.

The producer still publishes `orders.created` with the same payload it did
on a single server — order id, customer, total, timestamp.

A consumer still reads the `ORDERS` stream. The client connects to a
NATS URL and the server fabric (routes, gateways, leaves) delivers
the message to wherever interest lives. The topology is an operations
concern, not an application one.

That separation is why you can start on a laptop and grow to a
multi-region edge deployment without rewriting a line of business
logic. Growing the system means changing the deployment while the app
stays the same.

## Pitfalls

The one trap in composing shapes is doing it before you need to.

**Building the whole stack before a limit forces it.** Each layer adds
operational cost: more servers to run, more connections to watch. A
super-cluster you stood up "to be safe" is two regions to keep healthy
before you have a second region's traffic.

Add the next layer only when the current one runs out of room, as
[Picking the next layer](#picking-the-next-layer) describes. The
application code is identical at every stage, so growing later costs you
nothing in the app. Adding a layer early gives you no benefit.

## Where you are

The Acme deployment is now its final, composed shape:

- Two clusters, `east` and `west`, each a full mesh of three servers
  joined by routes.
- The two clusters joined into a super-cluster by gateways.
- A leaf, `factory-1`, dialed into `east`, serving its local edge
  clients.
- The unchanged ORDERS workload running across all of it.

And two ideas to carry forward:

- Composition: the shapes are layers you stack, each one leaving
  the layer below untouched.
- The limit of composition: stacking shapes adds reach, not boundaries.
  Only a leaf with its own account partitions the stack — address-space
  isolation is the leaf's property, from
  [Leaf nodes](/learn/topologies/leaf-nodes).

This is the full picture the [Topologies concept
page](/concepts/topologies) sketched, now wired up for real.

## What's next

You can wire the shapes. The next page,
[Where to go next](/learn/topologies/where-next), points you at the
chapters that take each shape further: the mechanics under a cluster,
the deployment tooling that runs these servers in production, and the
monitoring that watches the whole fabric.

## See also

- [Operate → Clustering & Replication](/learn/clustering/scaling-and-peers)
  — how to grow and shrink the servers inside a cluster safely.
- [Operate → Deployment](/learn/deployment/kubernetes) — running these
  servers under Kubernetes, with rolling upgrades.
- [Reference → Leafnode protocol](/reference/protocols/leafnode) — the
  wire-level detail behind address-space isolation.
