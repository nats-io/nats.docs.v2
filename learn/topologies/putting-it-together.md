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

It introduces two ideas: composition (the shapes are layers you
combine, not options you choose between) and address-space isolation
(what a leaf hides from the system it connects to).

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

<div class="nats-flow" data-scenario="massiveScaleAnimated" data-width="640" data-height="400"></div>

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
with three blocks:

```conf
# n1-east.conf — one server, three roles
server_name: n1-east
listen: 0.0.0.0:4222

cluster {
  name: east
  listen: 0.0.0.0:6222
  routes: [
    nats://127.0.0.1:6223   # n2-east
    nats://127.0.0.1:6224   # n3-east
  ]
}

gateway {
  name: east
  listen: 0.0.0.0:7222
  gateways: [
    { name: west, urls: ["nats://west.acme.internal:7222"] }
  ]
}

leafnodes {
  listen: 0.0.0.0:7422
}

jetstream {}
```

That's three blocks for three layers on one server. The `cluster` block
is the same one from [Your first cluster](/learn/topologies/your-first-cluster),
the `gateway` block is from [Super-clusters](/learn/topologies/super-clusters),
and the `leafnodes` block is from
[Leaf nodes](/learn/topologies/leaf-nodes). Putting them in one file is
all "composition" means.

## Address-space isolation behind a leaf

The clients on the `factory-1` leaf aren't visible to the rest of the
deployment the way a cluster server's clients are. That difference has
a name.

**Address-space isolation** means the subjects and clients behind a
leaf stay private to that leaf unless the leaf is explicitly told to
share them. A client on `factory-1` can publish to a local subject and
have it stay on the factory floor, never reaching `east` or `west`.

This falls out of how a leaf binds to an account.
[Leaf nodes](/learn/topologies/leaf-nodes) attached
`factory-1` to one account on the hub. Only the subjects that account
imports and exports cross the leaf connection. Everything else the
factory clients do is theirs alone.

Contrast that with a cluster. Inside `east`, the three servers share
one account namespace by design: a subject published on `n2-east` is
reachable from `n1-east` because routes carry the account's full
interest across the mesh. Servers in a cluster are peers in the same
address space.

A leaf is a boundary by design, the opposite of a route. That's why you
use a leaf at a factory or a branch office: local traffic stays local,
and only the agreed-upon subjects (`orders.*` flowing up to the `ORDERS`
stream) cross the link.

The wire-level detail of how a leaf binds an account and filters
subjects lives in
[Reference → Leafnode protocol](/reference/protocols/leafnode). We only
need the shape here: a leaf is an isolation boundary, a route is not.

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

One command surveys every layer. From a client with system-account
access, `nats server list` reports each server, which cluster it
belongs to, and its route and gateway connection counts:

```bash
nats server list
```

```
╭───────────────────────────────────────────────────────────────────────────╮
│                                  Server Overview                            │
├──────────┬─────────┬──────┬─────────┬─────┬───────┬──────┬────────┬─────────┤
│ Name     │ Cluster │ IP   │ Version │ JS  │ Conns │ Subs │ Routes │ GWs     │
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
lists the leaf by name, the account it bound to, its address, and its
round-trip time. That's the boundary the previous section described,
made visible:

```
╭──────────────────────────────────────────────────────────────────╮
│                         Leafnode Report                            │
├─────────┬───────────┬─────────┬──────────────────┬──────┬─────────┤
│ Server  │ Name      │ Account │ Address          │ RTT  │ Spoke   │
├─────────┼───────────┼─────────┼──────────────────┼──────┼─────────┤
│ n1-east │ factory-1 │ ORDERS  │ 203.0.113.7:...  │ 18ms │ yes     │
╰─────────┴───────────┴─────────┴──────────────────┴──────┴─────────╯
```

The `Spoke` column says `yes`: from the hub's point of view,
`factory-1` is on the far end of an outbound connection it accepted,
not a peer it dialed. That's the leaf direction from
[Leaf nodes](/learn/topologies/leaf-nodes), confirmed
by the report.

Run these three reports together and you've surveyed every layer of
the deployment in one pass: routes, gateways, and leaves, each shown by
the command named after it.

## The application stays unchanged

The main point of this chapter is that nothing about the ORDERS
application changed across any of these layers.

The producer still publishes `orders.created` with the same payload:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

A consumer still reads the `ORDERS` stream. The client connects to a
NATS URL and the server fabric (routes, gateways, leaves) delivers
the message to wherever interest lives. The topology is an operations
concern, not an application one.

That separation is why you can start on a laptop and grow to a
multi-region edge deployment without rewriting a line of business
logic. Growing the system means changing the deployment while the app
stays the same.

## Pitfalls

Composing shapes is mostly addition, but three traps come from forgetting
that one property, isolation, doesn't stack automatically.

**Two leaves sharing one account leak into each other.** A leaf with no
account named in its config binds to the default global account on the
hub. Attach a second leaf the same way and both sit in the same address
space: a subject one factory publishes is reachable from the other,
because they share one account, not because you meant them to.

Don't rely on "it's a leaf" for isolation. Bind each leaf to its own
dedicated account on the hub (`factory-1` to the `ORDERS` account, a
second site to its own) so only the subjects that account imports and
exports cross the link. The boundary is the account, not the leaf
connection.

You can prove the boundary holds. A service that lives only in `east`
is unreachable from the factory floor unless the factory account imports
its subject. The request comes back with no responders instead of
silently crossing the leaf:

<div class="nats-example" data-type="learn-topologies-putting-it-together-isolation-boundary" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Stacking a shape onto a cluster does not add a boundary.** A route
carries the full interest of an account across the whole mesh, and a
gateway forwards any subject that has interest on the far side. Adding a
gateway to `east` widens reach; it doesn't partition anything. If you
want a boundary between two parts of the deployment, that boundary is a
leaf with its own account, not another route or gateway.

Don't use a super-cluster expecting it to hide one cluster's
subjects from another. Use accounts for that separation, and a leaf
where the separation also needs to follow a network edge.

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
- A leaf, `factory-1`, dialed into `east`, serving isolated edge
  clients.
- The unchanged ORDERS workload running across all of it.

And two ideas to carry forward:

- Composition: the shapes are layers you stack, each one leaving
  the layer below untouched.
- Address-space isolation: a leaf is a boundary that keeps its
  clients and subjects private until you explicitly share them; a route
  is not.

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
