---
id: leaf-nodes
title: "5. Leaf nodes"
sidebar_position: 6
description: Bridge a factory site to the east cluster with a leaf node that dials out and binds to an account
---

# 5. Leaf nodes

Acme now runs a super-cluster: `east` and `west`, joined by gateways.
Both clusters live in cloud regions Acme controls. The ORDERS workload
moves freely between them.

The next site is different. Acme has a factory floor that publishes
`orders.*` from machines on the plant network. That network sits behind
a firewall. Nothing on the internet can dial into it. The factory can
only reach out.

A gateway will not help here. A gateway joins two clusters that can both
accept connections from each other. The factory cannot accept anything.
This page introduces one shape built for exactly that constraint: the
**leaf node**. Everything else on the page — how it bridges interest,
how it binds to an account — is part of understanding that one shape.

## What a leaf node is

A **leaf node** is a NATS server that opens an *outbound* connection to
a remote NATS system and bridges subject interest across it.

That outbound direction is the whole point. The factory's server dials
the `east` cluster; `east` never dials the factory. As long as the
factory can make one connection out to the hub, the bridge works — no
inbound firewall rule, no public address on the factory side.

The server the leaf dials is the **hub**. In Acme's case the hub is the
`east` cluster. The leaf is `factory-1`.

Once the link is up, the leaf is a regular NATS server to anyone on the
factory floor. A machine publishes `orders.created` to `factory-1` the
same way it would publish to any server. It does not know or care that
`factory-1` is a leaf.

What the leaf adds, behind that ordinary front, is to bridge interest
across the link. When a client somewhere on the hub subscribes to
`orders.>`, that interest flows down the leaf link, and `factory-1`
forwards matching messages up to the hub. When a factory machine
subscribes, hub traffic flows down. The leaf carries only subjects that
have interest on the other side. This is the same interest propagation
clusters use internally; the leaf just extends it across one outbound
hop. (Routing and replication inside a cluster are covered in the
[Clustering deep dive](/learn/clustering).)

<div class="nats-flow" data-scenario="leafNodeAnimated" data-width="640" data-height="400"></div>

The wire-level detail of the leaf node protocol — how interest and
messages are framed across the link — is documented in
[Reference → Leafnode protocol](/reference/protocols/leafnode). We only
need the config and the bridging behavior here.

## The hub side: accept leaf connections

The hub opens a port for leaf nodes to dial. On every `east` server,
add a `leafnodes {}` block with a `listen` address.

The default leaf node port is **7422**. Keep it distinct from the client
port (4222), the route port (6222), and the gateway port (7222) — four
different listeners for four different kinds of connection.

Here is `n1-east` from the previous page, now also accepting leaf
connections. Only the new block is shown; the `cluster {}` and
`gateway {}` blocks from earlier stay exactly as they were:

```conf
# n1-east.conf — carrying forward cluster + gateway, adding leafnodes
server_name: n1-east
listen: 0.0.0.0:4222

cluster {
  name: east
  listen: 0.0.0.0:6222
  routes: [
    nats://127.0.0.1:6223
    nats://127.0.0.1:6224
  ]
}

gateway {
  name: east
  listen: 0.0.0.0:7222
  gateways: [
    { name: west, url: "nats://127.0.0.1:7333" }
  ]
}

# NEW: accept inbound leaf node connections on 7422
leafnodes {
  listen: 0.0.0.0:7422
}
```

Add the same `leafnodes {}` block to `n2-east` and `n3-east`. A leaf can
dial any hub server; listing several gives the leaf somewhere to
reconnect if one hub server is down.

## The leaf side: dial out with a remote

The leaf does the opposite. Instead of *listening* for leaf
connections, `factory-1` declares a **remote** — the hub it dials.

A remote lives in `leafnodes.remotes` and carries three things that
matter for this page: the hub `urls`, the `credentials` that prove who
the leaf is, and the `account` the leaf's bridged interest joins
locally.

```conf
# factory-1.conf — a leaf that dials the east cluster
server_name: factory-1
listen: 0.0.0.0:4222

leafnodes {
  remotes: [
    {
      urls: [
        "nats://n1-east.acme.internal:7422"
        "nats://n2-east.acme.internal:7422"
        "nats://n3-east.acme.internal:7422"
      ]
      credentials: "/etc/nats/factory-1.creds"
      account: "ORDERS"
    }
  ]
}
```

`factory-1` has no `cluster {}` block and no `gateway {}` block. It is a
standalone server that reaches the rest of Acme through one outbound
link. That is what lets it run on the plant network with nothing but
egress.

The `urls` are plain NATS URLs pointing at each hub server's leafnode
listen port (`7422` here). List every hub server you want the leaf to be
able to dial; the leaf tries them in turn.

## Where the leaf's traffic lands: the account field

The `account` field finishes the picture of how the leaf bridges. It
names which **local** account on the leaf the bridged link joins — the
account a factory machine's traffic flows into on `factory-1` itself.

An account is NATS's unit of subject isolation — its own flat space of
subjects, separate from every other account. Acme runs the ORDERS
workload inside an account named `ORDERS`, the same one the JetStream
and Security chapters use. The leaf does not introduce the account
concept; it reuses the existing `ORDERS` account and simply names which
one its bridged interest joins.

Two accounts are in play, one on each end of the link. The `account`
field above selects the account on the *leaf*; the `credentials` the
remote presents decide which account the leaf attaches to on the *hub*.
Acme names both `ORDERS`, so the leaf's local `ORDERS` account and the
hub's `ORDERS` account become one shared subject space across the link.
That symmetry is a choice, not a requirement — but it is the simple,
common setup, and the one to reach for first.

With that binding in place, every subject a factory machine publishes
into `factory-1`'s `ORDERS` account reaches every `orders.>` subscriber
in the hub's `ORDERS` account, and vice versa. The factory floor and the
cloud share one subject space because both ends of the link sit in an
`ORDERS` account.

The `credentials` file is how the hub knows which account to attach the
leaf to, and that it is allowed at all. It holds the leaf's user
identity; the hub checks it against its own authorization before
attaching the leaf to the hub's `ORDERS` account. A factory cannot reach
a hub account it has no credentials for.

How those credentials are minted, and how the hub authorizes leaf
connections, is the job of the [Security deep dive](/learn/security). We
only need to point a remote at an existing `.creds` file here.

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

## See it bridge

Stand up the hub and the leaf, subscribe on the factory floor, and
publish from the hub. The message crosses the leaf link in the
hub-to-leaf direction.

<div class="nats-example"
     data-type="learn-topologies-leaf-nodes-leaf-bridge"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The subscriber runs against `factory-1` on its local port. The publisher
runs against an `east` hub server. The order arrives on the factory
floor because the leaf carried the hub's `orders.shipped` interest up,
and the hub forwarded the matching message down. Neither side opened a
connection to the other beyond the single leaf link.

## Inspect the link from the hub

From any `east` server, ask the hub what leaf nodes are attached:

```bash
nats server report leafnodes
```

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                              Leafnode Connections                              │
├─────────┬───────────┬─────────┬───────────────────┬──────┬─────────┬──────────┤
│ Server  │ Name      │ Account │ Address           │ RTT  │ Msgs In │ Msgs Out │
├─────────┼───────────┼─────────┼───────────────────┼──────┼─────────┼──────────┤
│ n1-east │ factory-1 │ ORDERS  │ 10.4.1.20:51884   │ 12ms │ 1,204   │ 87       │
╰─────────┴───────────┴─────────┴───────────────────┴──────┴─────────┴──────────╯
```

Three columns confirm the shape. `Name` is `factory-1`, the leaf. The
`Account` is `ORDERS`, the binding from the remote. `Address` is the
factory's outbound source address — the leaf dialed the hub, so the hub
sees the leaf's side of the connection.

`Msgs In` and `Msgs Out` are from the hub's point of view: orders coming
up from the factory, and hub traffic going down. If both stay at zero,
the link is up but no interest crosses it yet — subscribe on one side and
publish on the other to see them move.

## One line on JetStream over a leaf

If `factory-1` runs its own JetStream — a local `ORDERS` store on the
plant floor — it needs a JetStream **domain**.

A domain is a name that isolates one JetStream system from another across
a leaf link, so the factory's streams and the hub's streams stay
separate and addressable. Without distinct domains, a leaf's JetStream
and its hub's JetStream collide.

Copying stream data across the leaf — a local factory mirror of the hub's
`ORDERS`, or sourcing factory orders up into a hub stream — is the
subject of [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources).
We only name the domain concept here.

## Pitfalls

Three traps catch people the first time they attach a leaf. Each comes
from a config field doing exactly what it says — just not what you
meant.

**The leaf binds to the wrong account.** The `account` field on a remote
decides which local account on the leaf the bridged link joins. Name the
wrong account, or omit it and let the leaf fall back to its own default
account (`$G`), and the link still comes up green — but a factory
subject never matches a hub subscriber, because they sit in different
accounts. Do not assume the binding; read it. The `Account` column in
`nats server report leafnodes` shows the account the leaf actually
landed in. The symptom downstream is a request that returns *no
responders are available* even though both servers are up: the link is
healthy, the interest just never crossed.

<div class="nats-example"
     data-type="learn-topologies-leaf-nodes-wrong-account"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

(The `credentials` file is what lets the hub authorize that binding at
all; a wrong or missing one fails the connection with an authorization
error instead. Minting and authorizing those creds is the
[Security deep dive](/learn/security).)

**Treating the leaf like an inbound connection.** A leaf dials *out*.
The hub `listen`s on 7422; the leaf declares a `remotes` entry pointing
at the hub. People reverse this — putting a `listen` on the factory and
expecting the hub to dial in — and nothing connects, because the hub
never reaches out. Put the `remotes` block on the side that has only
egress (the factory), and the `leafnodes { listen }` block on the side
that accepts connections (the hub).

**Expecting JetStream to span the leaf without a domain.** A leaf and
its hub do not automatically get separate JetStream systems. If
`factory-1` enables JetStream while sharing the hub's system account, it
extends the *hub's* JetStream rather than running its own — so a stream
you create on the factory floor may land on the hub, not locally. Give
the leaf its own JetStream **domain** when you want a distinct local
store. Copying data between the two domains across the leaf is
[JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources).

## Where you are

Acme's deployment now reaches the edge:

- `east` and `west` clusters, joined by gateways (a super-cluster).
- A leaf node, `factory-1`, dialing `east` over an outbound link on
  port 7422.
- The leaf bound to the `ORDERS` account, bridging `orders.*` interest
  both ways.
- Factory machines connected to `factory-1` as plain clients, hidden
  behind the leaf, sharing one subject space with the cloud.

The application code never changed. A factory machine publishes
`orders.created` exactly the way the dev server `n1` did on page 1.

## What is next

You have met all four shapes: a single server, a cluster, a
super-cluster, and a leaf. The next page,
[Putting it together](/learn/topologies/putting-it-together), composes
them into the full Acme picture and draws the address-space isolation
that makes the whole thing scale.

## See also

- [Reference → Leafnode protocol](/reference/protocols/leafnode) — the
  wire-level framing of the leaf link.
- [Security deep dive](/learn/security) — minting leaf credentials and
  authorizing leaf connections on the hub.
- [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources)
  — copying stream data across a leaf with JetStream domains.
