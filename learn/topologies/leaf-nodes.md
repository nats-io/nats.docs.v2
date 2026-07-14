---
id: leaf-nodes
title: "Leaf nodes"
sidebar_position: 6
description: Bridge a factory site to the east cluster with a leaf node that dials out and binds to an account
---

# Leaf nodes

Acme now runs a super-cluster: `east` and `west`, joined by gateways.
Both clusters live in cloud regions Acme controls. The ORDERS workload
moves freely between them.

The next site is different. Acme has a factory floor that publishes
`orders.*` from machines on the plant network. That network sits behind
a firewall. Nothing on the internet can dial into it. The factory can
only reach out.

A gateway won't help here. A gateway joins two clusters that can both
accept connections from each other. The factory can't accept anything.
This page introduces one shape built for exactly that constraint: the
leaf node. Everything else on the page (how it bridges interest, how it
binds to an account) is part of understanding that one shape.

## What a leaf node is

A **leaf node** is a NATS server that opens an *outbound* connection to
a remote NATS system and bridges subject interest across it.

The outbound direction is what makes this work. The factory's server dials
the `east` cluster; `east` never dials the factory. As long as the
factory can make one connection out to the hub, the bridge works: no
inbound firewall rule, no public address on the factory side.

The server the leaf dials is the **hub**. In Acme's case the hub is the
`east` cluster. The leaf is `factory-1`.

Once the link is up, the leaf is a regular NATS server to anyone on the
factory floor. A machine publishes `orders.created` to `factory-1` the
same way it would publish to any server. The machine needs no
leaf-specific configuration.

What the leaf adds is the bridge across the link. When a client
somewhere on the hub subscribes to
`orders.>`, that interest flows down the leaf link, and `factory-1`
forwards matching messages up to the hub. When a factory machine
subscribes, hub traffic flows down. The leaf carries only subjects that
have interest on the other side. This is the same interest propagation
clusters use internally; the leaf just extends it across one outbound
hop. (Routing and replication inside a cluster are covered in the
[Clustering deep dive](/learn/clustering).)

<div class="nats-flow" data-scenario="leafNodeAnimated" data-width="640" data-height="500"></div>

The wire-level detail of the leaf node protocol (how interest and
messages are framed across the link) is documented in
[Reference → Leafnode protocol](/reference/protocols/leafnode). Here we
only need the config and the bridging behavior.

## The hub side: accept leaf connections

The hub opens a port for leaf nodes to dial. On every `east` server,
add a `leafnodes {}` block with a `listen` address.

The default leaf node port is `7422`. It's a fourth kind of listener,
separate from the client port (4222), the route port (6222), and the
gateway port (7222) — one port per kind of connection.

Here's `n1-east`, the same east cluster config from before, now also
accepting leaf connections. Only the `leafnodes` block is new:

```conf
# n1-east.conf — the east cluster config, now accepting leaf connections
server_name: n1-east
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/n1-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6222
  routes: [
    nats://127.0.0.1:6223
  ]
}

# NEW: accept inbound leaf node connections on 7422
leafnodes {
  listen: 127.0.0.1:7422
}
```

Add a `leafnodes {}` block to `n2-east` and `n3-east` too. Since all three
run on one machine, give each its own leafnode port — 7423 and 7424, the
way their client and cluster ports are already offset. A leaf can dial
any hub server, so listing several gives it somewhere to reconnect if one
is down.

## The leaf side: dial out with a remote

The leaf does the opposite. Instead of *listening* for leaf
connections, `factory-1` declares a **remote**: the hub it dials.

A remote lives in `leafnodes.remotes`. The one field it can't do without
is `urls` — where to dial the hub:

```conf
# factory-1.conf — a leaf that dials the east cluster
server_name: factory-1
listen: 127.0.0.1:4300

leafnodes {
  remotes: [
    {
      urls: [
        "nats://127.0.0.1:7422"
        "nats://127.0.0.1:7423"
        "nats://127.0.0.1:7424"
      ]
    }
  ]
}
```

`factory-1` has no `cluster {}` block and no `gateway {}` block. It's a
standalone server that reaches the rest of Acme through one outbound
link — that's what lets it run on the plant network with nothing but
egress. Its own client port (`4300`) is separate from the hub's.

The `urls` point at each hub server's leafnode listen port. Listing all
three gives the leaf somewhere to reconnect if one hub server is down.

One leaf isn't limited to one hub. `remotes` is a list: a leaf can hold
several, each dialing a different NATS system, and bridge them all through
the one server. A leaf can also run its own `leafnodes { listen }` block and
become a hub for leaves further out — leaf links compose into trees, not
just a single hub and spoke.

In production a remote usually carries two more fields — `credentials` to
prove who the leaf is, and `account` to bind its traffic to a specific
account. We skip both here — the leaf bridges in the default account —
and come back to them in
[Accounts: the production layer](#accounts-the-production-layer).

## Accounts: the production layer

The auth-free setup above bridges in NATS's default account, which is all
the demo needs. A production deployment usually isn't auth-free: it puts
each workload in its own **account** — NATS's unit of subject isolation, a
flat space of subjects separate from every other — and a leaf remote
carries two more fields to join one:

- `account` selects which local account on the leaf the bridged interest
  joins.
- `credentials` is a `.creds` file that proves the leaf's identity to the
  hub, which attaches it to the matching account there.

Point both ends at the same account and the factory floor and the cloud
share one isolated subject space across the link. Setting up accounts,
minting those credentials, and authorizing leaf connections is the job of
the [Security deep dive](/learn/security); here we stay in the default
account.

## Local clients stay hidden behind the leaf

A factory machine connects to `factory-1` as a plain client. It never
appears on the hub as a connection. The hub sees one thing: the leaf
link from `factory-1`.

This is the address-space property of a leaf. The leaf's local clients
live behind it. The hub deals with the leaf, not with the hundred
machines on the plant network. Add a thousand more machines and the hub
still sees one leaf link.

The bridge is by *interest*, not by exposing clients. A hub subscriber
to `orders.>` receives factory orders without ever knowing how many
machines produced them, or that they came from a leaf at all.

That covers connections. Subjects are separate: whether a factory
subject stays on the floor or reaches the hub depends on the account the
leaf binds to. Bound to its own account, only the subjects that account
imports and exports cross the link — that's **address-space isolation**, an
account decision (the [production layer](#accounts-the-production-layer)
above), not something the leaf link gives you for free. In the default
account this page uses there's no subject boundary; interest flows across
the leaf the way it flows across a cluster's routes.

## Send a message across the leaf link

Stand up the hub and the leaf, subscribe on the factory floor, and
publish from the hub. The order crosses the leaf link in the
hub-to-leaf direction.

Subscribe to `orders.>` on `factory-1`, in its own terminal:

```bash
nats sub "orders.>" --server nats://localhost:4300
```

In another terminal, publish to an `east` hub server:

```bash
nats pub orders.shipped "order ord_8w2k shipped" --server nats://localhost:4222
```

The order arrives on the factory floor:

```
[#1] Received on "orders.shipped"
order ord_8w2k shipped
```

The leaf carried the factory's `orders.>` interest up to the hub, and the
hub forwarded the matching message down — neither side opened a connection
to the other beyond the single leaf link.

## JetStream over a leaf

If `factory-1` runs its own JetStream (a local `ORDERS` store on the
plant floor), it needs a JetStream **[domain](/reference/config/jetstream/domain)**.

A domain is a name that isolates one JetStream system from another across
a leaf link, so the factory's streams and the hub's streams stay
separate and addressable. Without distinct domains, a leaf's JetStream
and its hub's JetStream collide.

Copying stream data across the leaf (a local factory mirror of the hub's
`ORDERS`, or sourcing factory orders up into a hub stream) is the
subject of [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources).
We only name the domain concept here.

## Pitfalls

Two problems commonly come up the first time you attach a leaf.

**Treating the leaf like an inbound connection.** A leaf dials *out*.
The hub `listen`s on 7422; the leaf declares a `remotes` entry pointing
at the hub. People reverse this (a `listen` on the factory, expecting
the hub to dial in) and nothing connects, because the hub never reaches
out. Put the `remotes` block on the side that has only
egress (the factory), and the `leafnodes { listen }` block on the side
that accepts connections (the hub).

**Expecting JetStream to span the leaf without a domain.** A leaf and
its hub don't automatically get separate JetStream systems. If
`factory-1` enables JetStream while sharing the hub's system account, it
extends the *hub's* JetStream rather than running its own, so a stream
you create on the factory floor may land on the hub, not locally. Give
the leaf its own JetStream domain when you want a distinct local
store. Copying data between the two domains across the leaf is
[JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources).

## Where you are

Acme's deployment now reaches the edge:

- `east` and `west` clusters, joined by gateways (a super-cluster)
- a leaf node, `factory-1`, dialing `east` over an outbound link on
  port 7422
- the leaf bridging `orders.*` interest both ways over that one link, in
  the default account (bind it to a named account in production)
- factory machines connected to `factory-1` as plain clients, hidden
  behind the leaf, sharing one subject space with the cloud

Publishing and subscribing didn't change. A factory machine publishes
`orders.created` to `factory-1` exactly the way a client did against the
dev server `n1` on [Single server](/learn/topologies/single-server).

## What's next

You've met all four shapes: a single server, a cluster, a
super-cluster, and a leaf. The next page,
[Putting it together](/learn/topologies/putting-it-together), composes
them into the full Acme picture and draws the address-space isolation
that makes the whole thing scale.

## See also

- [Reference → Leafnode protocol](/reference/protocols/leafnode) — the
  wire-level framing of the leaf link
- [Security deep dive](/learn/security) — minting leaf credentials and
  authorizing leaf connections on the hub
- [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources)
  — copying stream data across a leaf with JetStream domains
