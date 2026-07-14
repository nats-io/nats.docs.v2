---
id: your-first-cluster
title: "Your first cluster"
sidebar_position: 3
description: Join three servers into a cluster with routes, then watch a client survive a server loss
---

# Your first cluster

The [previous page](/learn/topologies/single-server) left Acme running on one
server, `n1`. That server publishes `orders.*` and holds the `ORDERS` stream. It
also has one critical limitation: if it stops, the whole ORDERS system stops
with it.

This page fixes that. You'll stand up the production cluster `east`
(three servers: `n1-east`, `n2-east`, and `n3-east`) and watch a client
continue working through the loss of one of them.

Publishing doesn't change: the same publish to `orders.created`, the same
`ORDERS` stream, the same payload. The deployment underneath is what
changes.

This page introduces two ideas: a cluster is a set of servers joined by
routes, and a client connects to any one of those servers and fails
over to another when its server dies.

## What a cluster is

A **cluster** is a set of `nats-server` processes that know about each
other and act as one logical NATS system. A client connected to any server
in the cluster can reach a subscriber connected to any one of the servers in the
cluster.

The servers talk to each other over **routes**. A route is a
server-to-server connection, distinct from the client connections you've
used so far. Clients connect on the client port (`4222`, the NATS
default); servers connect to each other on a separate cluster port
(`6222` in the configs below).

Every server holds a route to every other server, so each is one hop from
all the rest. With three servers that's three routes. There's no central
coordinator and no single server the others depend on; each is a peer. A
message a server receives over a route is delivered to that server's own
clients and forwarded no further, because one hop is always enough to reach
anyone.

<div class="nats-flow" data-scenario="topologiesClusterMesh" data-width="720" data-height="360"></div>

The wire-level detail of how two servers open a route, exchange
subscriptions, and forward messages is documented in
[Reference → Route protocol](/reference/protocols/route). We only need the
config and the shape here.

## Configure three servers

Each server in `east` needs the same cluster name and its own pair of ports.
Routes connect the servers, but the cluster name has to match for them to join:
a mismatched name (a typo like `eats`) gets that server's route refused —
the log contains `cluster name "eats" does not match "east"` — and it ends up a
cluster of its own.

Here's `n1-east`. It carries one `routes` entry, pointing at `n2-east`; the
other two point back at `n1-east`.

```conf title="n1-east.conf"
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
```

`n2-east` has its own ports and name, and its `routes` entry points back at
`n1-east`.

```conf title="n2-east.conf"
server_name: n2-east
listen: 127.0.0.1:4223

jetstream {
  store_dir: "./js/n2-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6223
  routes: [
    nats://127.0.0.1:6222
  ]
}
```

`n3-east` is the same pattern again, one port higher, pointing at the same
server.

```conf title="n3-east.conf"
server_name: n3-east
listen: 127.0.0.1:4224

jetstream {
  store_dir: "./js/n3-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6224
  routes: [
    nats://127.0.0.1:6222
  ]
}
```

Three fields do the work in each `cluster {}` block.

`name` is the cluster identifier. It must be `east` on all three servers,
or they won't join.

`listen` is the address and port this server accepts routes on. It's the
cluster port (`6222`, `6223`, `6224`), separate from the client
port in `listen` at the top of the file.

`routes` is the list of peers to actively connect to — one per server.
`n2-east` and `n3-east` point at `n1-east` on `6222`; `n1-east` points at
`n2-east` on `6223`. None lists every peer.

Each config also carries a `jetstream` block with its own `store_dir`, so
the cluster can hold the `ORDERS` stream the workload has been using. It's
only switched on here — what JetStream actually does once it runs across a
cluster is the [next page](/learn/topologies/jetstream-in-a-cluster). This
page is about the routes.

## How the remaining routes are formed

Look again at the configs: each server lists a single route to one peer —
`n2-east` and `n3-east` at `n1-east`, and `n1-east` back at `n2-east`.
That's one route apiece, not the full mesh from above where every server
holds a route to every other. The obvious move is to finish it by hand —
give every config a route to both of its peers.

You can, and it's a valid cluster: the servers simply notice the
redundant connections and drop the extras (the log notes a `Duplicate
Route` close). But you don't need to, because they complete the mesh on
their own.

When a server connects to a route you wrote, it learns about every other
server that peer already knows, and dials those too. So `n2-east` connects
to `n1-east`, discovers the rest of the cluster, and connects to them
directly; when `n3-east` joins, the others learn about it and connect back.
The routes you didn't write appear on their own.

This is why each server only needs one route, not the full list:
`n2-east`, `n3-east`, and any server you add later point at `n1-east`,
`n1-east` points back at one of them, and gossip fills in the rest. The
by-hand mesh is the other end of the trade-off — no server depends on a
single seed being up first, but every new server then means editing every
config.

## Start the cluster

Start all three servers, each with its own config file:

```bash
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &
```

`n1-east` comes up first and waits. As `n2-east` and `n3-east` start, they
dial it, discover the rest, and within a moment all three hold routes to
each other.

The `&` runs each in the background of one terminal. Stop the cluster with
`kill %1 %2 %3` (or `pkill nats-server`). If you'd rather watch each
server's log on its own — handy in a moment when you kill one to test
failover — drop the `&` and run each `nats-server -c …` in its own
terminal instead.

## Confirm the routes

Confirm a message crosses the cluster: subscribe on one server, publish on
another, and watch it arrive.

Subscribe to `orders.>` on `n3-east`, in its own terminal:

```bash
nats sub "orders.>" --server nats://localhost:4224
```

In another terminal, publish to `n1-east`:

```bash
nats pub orders.created '{"order_id":"ord_8w2k"}' --server nats://localhost:4222
```

The subscriber on `n3-east` prints the order:

```
[#1] Received on "orders.created"
{"order_id":"ord_8w2k"}
```

It was published on `n1-east`, crossed a route to `n3-east`, and arrived —
without any client ever naming two servers. If the two hadn't joined (a
mismatched cluster name, say), nothing would show up.

## A client connects to any server

Your application connects to a server, not to "the cluster." But it can be
handed several servers and treat them as interchangeable.

A client connects to one of the servers it's given. From that one
connection it can publish `orders.created` and have a consumer on any
server in `east` receive it, because the routes carry the message to
wherever the interest is.

The server also tells the client about its peers. On connect, a server
sends an INFO message that includes the other servers' client URLs. The
client now knows about all three even if you only configured one.

This discovery is what makes the next part work. The client doesn't need
the full server list written into its config; it gets the rest from the
server it reached.

## Survive a server loss

Next, test failover. Point a publisher at one specific server — `n1-east`
— send a steady stream of orders, then kill `n1-east` out from under it.

In its own terminal, publish an order a second to `n1-east`:

```bash
nats pub orders.created "order {{Count}}" --count 100 --sleep 1s --trace --server nats://localhost:4222
```

Let a few go by, then kill `n1-east`: `kill %1` in the terminal where you
started the servers, or `Ctrl+C` its window if you gave it one. The
publisher doesn't stop. With `--trace` it logs each connection event, so you
can watch it drop `n1-east` and reconnect (a couple of discovery lines are
trimmed below):

```
12:00:22 >>> Connected to nats://localhost:4222 (127.0.0.1:4222)
12:00:23 Published 7 bytes to "orders.created"
12:00:24 Published 7 bytes to "orders.created"
12:00:25 >>> Disconnected due to: EOF, will attempt reconnect
12:00:25 >>> Reconnected to nats://localhost:4223 (127.0.0.1:4223)
12:00:26 Published 7 bytes to "orders.created"
12:00:27 Published 7 bytes to "orders.created"
```

Look at where it reconnected: `4223` is `n2-east` — a server you never
named. You pointed the publisher at `n1-east` and nothing else, but on
connect `n1-east` handed it the rest of the cluster (the discovery from
[the section above](#a-client-connects-to-any-server)). So when `n1-east`
died, the publisher had somewhere to go, and the orders kept flowing.
That's what the cluster buys: the loss of one server is a reconnect, not an
outage.

One control governs this. If a server sets `no_advertise: true`, it stops
advertising its peers, and a client only knows the URLs you gave it by
hand. Leave it off (the default) and failover spans the whole cluster.

## Pitfalls

A cluster is easy to set up, but a handful of details cause problems if you
get them wrong. These three come up most often when standing up `east`.

**Misspell a cluster name.** A typo in `name` doesn't raise an error.
The server with the odd name forms its own cluster and never
joins `east`, leaving you with two clusters that look like one until a
message fails to cross. (On the wire the server rejects the route with
`cluster name does not match`.) Set the same `name` on all three. To catch
a stray one, look for that rejection line in its log, or rerun the
cross-server publish from [Confirm the routes](#confirm-the-routes): if a
message published on one server never reaches a subscriber on another, they
never joined.

**Expose the cluster port to the world.** The cluster `listen` port (6222)
accepts routes from other servers, not clients — and a route is a *trusted*
link: it carries every account's traffic plus the system account, far more
than any one client connection sees. Leave it reachable with no
authorization (these configs have none) and anyone who connects with the
cluster name `east` can join as a server and read or inject messages across
your accounts. Bind it to a private interface and firewall it — and in
production require route credentials or TLS. The configs above bind it to
`127.0.0.1`, off the network entirely.

**Plan for an even server count.** A cluster of two or four servers works
fine for plain `orders.*` traffic, but the moment you replicate the
`ORDERS` stream you want an *odd* count. A two-server set loses its majority
as soon as one server is down, and a four-server set tolerates only one loss
— the same as three — so the extra server adds cost without buying more
failure tolerance. That's a JetStream
concern, covered on the [next page](/learn/topologies/jetstream-in-a-cluster);
the consensus math behind it lives in
[Clustering & Replication](/learn/clustering). For a pure routing cluster,
any count is fine.

## Where you are

Acme has grown from one dev server to a three-server production cluster:

- The cluster `east` runs `n1-east`, `n2-east`, and `n3-east` locally, on
  client ports 4222/4223/4224 and cluster ports 6222/6223/6224.
- The three servers are joined by routes: every server holds a route to
  every other, built from pointing each one at `n1-east`.
- A client connects to any server, discovers the rest, and fails over to a
  survivor when its server dies.

## What's next

What you watched cross the cluster was plain pub/sub — the durable `ORDERS`
stream isn't on `east` yet. The next page creates it on the cluster,
replicated across the three servers so it survives a server loss the way the
cluster already does:
[JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster).

## See also

- [Reference → Route protocol](/reference/protocols/route) — the
  wire-level detail of how servers form routes and forward messages.
- [Operate → Clustering & Replication](/learn/clustering) — Raft, leader
  election, and replica placement inside a cluster.
- [Core Concepts → Topologies](/concepts/topologies) — the five-minute
  overview of every shape.
