---
id: your-first-cluster
title: "2. Your first cluster"
sidebar_position: 3
description: Join three servers into a cluster with routes, then watch a client survive a server loss
---

# 2. Your first cluster

The [previous page](/learn/topologies/single-server) left Acme running on
one server, `n1`, on a laptop. That server publishes `orders.*` and holds
the `ORDERS` stream. It also has one critical limitation: if it stops, the
whole ORDERS system stops with it.

This page fixes that. You'll stand up the production cluster `east`
(three servers: `n1-east`, `n2-east`, and `n3-east`) and watch a client
continue working through the loss of one of them.

The application doesn't change: it makes the same publish to
`orders.created`, uses the same `ORDERS` stream, and sends the same
payload. The deployment underneath it is what changes.

This page introduces two ideas: a cluster is a set of servers joined by
routes, and a client connects to any one of those servers and fails
over to another when its server dies.

## What a cluster is

A **cluster** is a set of `nats-server` processes that know about each
other and act as one logical NATS system. A client connected to any server
in the cluster can reach a subscriber connected to any other server in the
cluster.

The servers connect to each other over **routes**. A route is a
server-to-server connection, distinct from the client connections you've
used so far. Clients connect on the client port (4222); servers connect to
each other on a separate cluster port (6222).

Every server holds a route to every other server, so each is one hop from
all the rest. With three servers that's three routes. There's no central
coordinator and no single server the others depend on; each is a peer. A
message a server receives over a route is delivered to that server's own
clients and forwarded no further, because one hop is always enough to reach
anyone.

<div class="nats-flow" data-scenario="clusterMeshAnimated" data-width="640" data-height="400"></div>

The wire-level detail of how two servers open a route, exchange
subscriptions, and forward messages is documented in
[Reference → Route protocol](/reference/protocols/route). We only need the
config and the shape here.

## Configure three servers

Each server in `east` needs the same cluster name and its own pair of
ports. The cluster name is what binds them into one: servers with
matching names form a cluster together, and a mismatched name silently
forms a separate one.

Here's `n1-east`. The others point at it first to find the cluster.

```conf title="n1-east.conf"
server_name: n1-east
listen: 127.0.0.1:4222

cluster {
  name: east
  listen: 127.0.0.1:6222
}
```

`n2-east` is identical except for its ports and name, plus one addition: a
`routes` entry pointing at `n1-east`.

```conf title="n2-east.conf"
server_name: n2-east
listen: 127.0.0.1:4223

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

`routes` is the list of peers to actively connect to. Only `n2-east` and
`n3-east` carry it, and both point only at `n1-east` on `6222`. They don't
list each other.

## How the remaining routes are formed

You configured `n2-east` and `n3-east` with a single route each, pointing
at `n1-east`. Yet the result is three servers each holding a route to the
other two. The routes you didn't write are formed automatically.

When a server connects to a route you wrote, it learns about every other
server that peer already knows, and connects to those too. So when
`n2-east` connects to `n1-east`, it learns about the rest of the cluster
and dials them directly. When `n3-east` joins, the others learn about it and
connect to it in turn.

This is why each server only needs to know about `n1-east`. You point them
all at one server; the routes fill in the rest. Adding a fourth server later
means pointing it at `n1-east` and nothing else.

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

## Confirm the routes

Ask the cluster what it looks like from the outside:

```bash
nats server report
```

The report lists all three servers as one cluster, each showing its route
count:

```
╭──────────────────────────────────────────────────────────────────────╮
│                            Server Overview                             │
├─────────┬─────────┬──────┬─────────┬─────┬───────┬──────┬─────┬────────┤
│ Name    │ Cluster │ IP   │ Version │ JS  │ Conns │ Subs │ Rts │ Uptime │
├─────────┼─────────┼──────┼─────────┼─────┼───────┼──────┼─────┼────────┤
│ n1-east │ east    │ ...  │ 2.x.x   │ no  │     1 │    9 │   2 │  1m2s  │
│ n2-east │ east    │ ...  │ 2.x.x   │ no  │     0 │    9 │   2 │  58s   │
│ n3-east │ east    │ ...  │ 2.x.x   │ no  │     0 │    9 │   2 │  55s   │
╰─────────┴─────────┴──────┴─────────┴─────┴───────┴──────┴─────┴────────╯
```

The `Rts` column reads `2` for every server: each holds a route to the
other two, exactly as expected. The `Cluster` column reads `east` for all
three, confirming they joined the same cluster.

For a single server's view, ask it directly:

```bash
nats server info n1-east
```

This shows the server's own perspective: its client port, its routes, and
the cluster name it belongs to.

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

Here is the result of all that setup. Connect a client with all three
servers in its URL list, publish a stream of orders, then kill the server
the client is on. The client reconnects to a survivor and keeps publishing.

<div class="nats-example"
     data-type="learn-topologies-your-first-cluster-failover"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

When the server holding the client's connection stops, the client does not
fail; instead it picks another server from the list it knows (the ones you
gave it plus the ones it discovered) and reconnects there. Publishing
resumes on the new connection.

From the application's point of view, a brief reconnect happened and then
everything continued, with the orders still being published. That is what
the cluster provides: the loss of one server is a reconnect rather than an
outage.

One control governs whether discovery works. If a server sets
`no_advertise: true`, it stops telling clients about its peers, and a
client knows only the URLs you configured by hand. Leave it off (the
default) and failover spans the whole cluster automatically.

## What this page does not cover

The cluster you built carries plain `orders.*` traffic across routes today.
It doesn't yet replicate the `ORDERS` stream. The stream is still
`Replicas: 1` on whichever server holds it: lose that server and the
stream is still gone, even though the cluster survives.

Making the stream itself fault-tolerant is handled by JetStream, which
adds its own components: a meta layer, an odd server count for a quorum, and
a leader per stream. Those belong to the [next page](/learn/topologies/jetstream-in-a-cluster).

The deeper mechanics behind that quorum (Raft, leader election, where
replicas land) aren't topology questions at all. They live in the
[Clustering & Replication](/learn/clustering) deep dive. This chapter sets
up the shape, and that chapter explains the consensus running inside it.

## Pitfalls

A cluster is easy to set up, but a handful of details cause problems if you
get them wrong. These four come up most often when standing up `east`.

**Hand a client only one server URL.** A client given a single URL has no
peer to reconnect to when that server dies, and the reconnect described
above never happens. Give every client the full list (`n1-east`, `n2-east`,
`n3-east`), not one. Discovery fills in the peers a server advertises
(unless you've set `no_advertise: true`, which turns it off), but the
bootstrap list is your only fallback if the very first server is the one
that's down. Don't rely on a single seed URL in production.

**Misspell a cluster name.** A typo in `name` doesn't raise an error.
The server with the odd name forms its own cluster and never
joins `east`, leaving you with two clusters that look like one until a
message fails to cross. (On the wire the server rejects the route with
`cluster name does not match`.) Set the same `name` on all three, then
confirm they joined as one before trusting the cluster.

<div class="nats-example"
     data-type="learn-topologies-your-first-cluster-confirm-one-cluster"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

If every row shows `east`, the cluster is whole. A stray name or a
missing row means a server failed to join; fix the config and restart it.

**Expose the cluster port to the world.** The cluster `listen` port
(6222) accepts route connections from other servers, not clients. Reachable
from the open internet, it's an entry point into your NATS system.
The configs above bind it to `127.0.0.1` for local work; in production bind
it to a private interface and firewall it, and keep client traffic on 4222.

**Plan for an even server count.** A cluster of two or four servers works
fine for plain `orders.*` traffic, but the moment you replicate the
`ORDERS` stream you want an *odd* count: an even set has no clean majority
to keep a stream writable when one server is lost. That's a JetStream
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
- The `ORDERS` stream is still single-copy; the cluster protects the
  routing of messages, but does not yet protect the stored data.

## What's next

The next page turns on JetStream across `east` and makes the `ORDERS`
stream survive a server loss the way the cluster already does:
[JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster).

## See also

- [Reference → Route protocol](/reference/protocols/route) — the
  wire-level detail of how servers form routes and forward messages.
- [Operate → Clustering & Replication](/learn/clustering) — Raft, leader
  election, and replica placement inside a cluster.
- [Core Concepts → Topologies](/concepts/topologies) — the five-minute
  overview of every shape.
