---
id: forming-a-cluster
title: "Forming a cluster"
sidebar_position: 2
description: How servers find each other — explicit seed routes and the gossip that grows one seed into a full mesh
---

# Forming a cluster

The [Topologies chapter](/learn/topologies/your-first-cluster) wired three
servers into the cluster `east` and showed a client surviving a server
loss. It covered the `cluster {}` block and the shape it produces. It did
not cover the *how*: how a server you pointed at one peer
ends up holding a route to every peer.

This page covers that. It's the first mechanism of the chapter, the
one every later page builds on. Before servers can elect a leader or
replicate a write, they have to find each other. Two ideas do that work:
a route, the connection one server opens to another, and gossip,
the way servers tell each other who else is in the cluster.

We use the same `east` cluster the whole way: `n1-east`, `n2-east`, and
`n3-east`, client ports 4222/4223/4224, route ports 6222/6223/6224. By
the end of the page they're running and have discovered themselves from
a single seed.

## A route is a server-to-server connection

A **route** is the connection one `nats-server` opens to another so the
two act as one cluster. It isn't a client connection. A client connects
on the client port (4222); a route connects on a separate route port
(6222). The two never share a port, and that distinction has practical
consequences: half of cluster-formation bugs are a route pointed at the
client port.

A route is bidirectional once open. Whichever server dialed, both ends
afterward send and receive over the same link: subscription interest in
one direction, the messages that match it in the other. With three
servers fully connected, every server holds a route to the other two, so
each is exactly one hop from all the rest.

Routes come in two kinds, and this page covers how to tell them apart.

An **explicit route** is one you configured. You wrote its address into
the `routes` list in `nats.conf`, and the server dials it on startup.
This is the seed: the address a fresh server uses to find the cluster at
all.

An **implicit route** is one the server opened on its own, to a peer it
was *not* configured to know. The server learned that peer existed and
dialed it without you writing its address anywhere. Implicit routes are
how a cluster fills in the connections you didn't configure, and they
come from gossip.

## Gossip turns one seed into a full mesh

You configured `n2-east` and `n3-east` with a single explicit route each,
both pointing at `n1-east`. Yet the running cluster has every server
connected to every other. The connections you never wrote appear on their
own through **gossip**.

Gossip is route discovery by INFO redistribution. When two servers form a
route, each sends the other an **INFO** message, a small protocol frame
carrying its own address. The receiver learns that peer exists and dials
it. A server then forwards that INFO to the other peers
it already holds routes to, so each of them learns the new peer and dials
it too. Those self-opened connections are implicit routes.

Trace it on `east`. `n1-east` boots and waits. `n2-east` boots, dials its
explicit route to `n1-east`, and the two exchange INFO. `n3-east` boots,
dials *its* explicit route to `n1-east`, and now `n1-east` knows about
both newcomers. On the next INFO exchange, `n1-east` tells `n2-east` about
`n3-east`. `n2-east` has no route to `n3-east`, so it opens one — an
implicit route that completes the mesh.

<div class="nats-flow" data-scenario="clusterGossipAnimated" data-width="600" data-height="350"></div>

This is why each server only needs one seed address. You point them all at
`n1-east`; gossip discovers the rest. Adding a fourth server later means
giving it one route, to `n1-east`, and nothing else.

The wire-level detail of the INFO frame and the route handshake (every
field a server advertises, the protocol verbs) lives in
[Reference → Route protocol](/reference/protocols/route). We only need the
behavior here: each INFO announces one peer's address, and a server
forwards a new peer's INFO to the routes it already holds so they dial it
too.

## Stand up the seed and two joiners

These are the `east` configs from Topologies, with JetStream still enabled
— the later pages replicate a stream on it. We read them here for what
they tell us about routes, not as a shape to choose; that choice belongs to
[Topologies → Your first cluster](/learn/topologies/your-first-cluster).
One detail differs from that page: here `n1-east` carries no `routes` of
its own, so the pure seed pattern stands out.

`n1-east` is the seed. It carries no `routes` of its own; the others find
it.

```conf title="n1-east.conf"
server_name: n1-east
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/n1-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6222
}
```

Three things in the `cluster {}` block control formation.

`name` is the cluster identifier, `east`. Every server that should join
must set the exact same name. A route to a server whose name differs is
rejected the moment the names are compared: the server logs
`Rejecting connection, cluster name ... does not match ...` and closes the
route, so the odd server forms a separate cluster of its own. See
[Pitfalls](#pitfalls) for how to catch it in the log.

`listen` is the route port this server accepts routes on: `6222`, one
above the client port and never the same as it. This is the port peers
dial, not clients.

`routes` is the list of seed addresses to dial on startup. `n1-east` has
none, so it only waits. The joiners carry one each.

`n2-east` is the same pattern with its own ports and a single explicit
route back to the seed:

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

`n3-east` repeats it, one port higher, pointing at the same seed. It
does **not** list `n2-east`, and it doesn't need to: gossip will supply
that route.

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

Start all three, each with its own config file:

```bash
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &
```

`n1-east` comes up first. As the joiners dial their explicit route to it,
they exchange INFO, learn about each other, and open the implicit routes
that complete the mesh, all within a moment of the last server starting.

The full set of `cluster {}` fields (`pool_size`, `compression`,
`authorization`, the per-link `tls {}` block) is documented in
[Reference → Cluster config](/reference/config/cluster). We only need
`name`, `listen`, and `routes` to form the cluster.

## Confirm the mesh formed

Check the cluster's state from the outside. The `nats server` commands here
query the system account (`$SYS`), which these configs don't set up; add one
(the [Security deep dive](/learn/security) covers it) and connect with its
credentials before you run them.

```bash
nats server list
```

The list shows all three servers as one cluster, each with its route count:

```
╭─────────────────────────────────────────────────────────────────────────╮
│                             Server Overview                                │
├─────────┬─────────┬──────┬─────────┬─────┬───────┬──────┬────────┬────────┤
│ Name    │ Cluster │ Host │ Version │ JS  │ Conns │ Subs │ Routes │ Uptime │
├─────────┼─────────┼──────┼─────────┼─────┼───────┼──────┼────────┼────────┤
│ n1-east │ east    │ ...  │ 2.x.x   │ yes │     0 │    9 │      8 │  1m2s  │
│ n2-east │ east    │ ...  │ 2.x.x   │ yes │     0 │    9 │      8 │  58s   │
│ n3-east │ east    │ ...  │ 2.x.x   │ yes │     0 │    9 │      8 │  55s   │
╰─────────┴─────────┴──────┴─────────┴─────┴───────┴──────┴────────┴────────╯
```

Every row's `Cluster` column reads `east`, so the three joined one cluster
and not three separate ones. The `Routes` column counts route connections,
not peers: each link to a peer is a small pool of connections (three by
default) plus a dedicated system-account route, so a three-server cluster
shows several per server. What confirms the mesh is that the count is the
same on every row and non-zero. You configured one explicit route per
joiner; gossip supplied the rest.

For one server's own view of its routes, query it directly:

```bash
nats server info n1-east
```

This prints `n1-east`'s perspective: its client port, the routes it
holds, and the cluster name it belongs to. The route list there is the
explicit seed plus every implicit route gossip added.

## Pitfalls

A cluster is straightforward to form, but three details have to be correct.
Each one leaves you with a running server that isn't in the cluster you
meant — sometimes with nothing but a line in the server log to tell you.

**A mismatched `cluster.name` forms two clusters.** The name is
what binds servers together. Set `name: east` on two servers and
`name: eest` on the third, and the third's route is rejected: its log reads
`Rejecting connection, cluster name "east" does not match "eest"` and it
forms its own one-server cluster that never merges. Unless you read that
line, you're left with two clusters that look like one until a message
fails to cross. Set the identical `name` on every server, then confirm they
joined as one before trusting the cluster:

```bash
nats server list
```

If every row shows `east`, the mesh is complete. A stray name, or a server
missing from the list, means it formed a separate cluster. Fix the `name`
and restart it.

**Pointing `routes` at the client port (4222) never forms the mesh.** The
route port (6222) and the client port (4222) are different listeners. A
`routes` entry of `nats://127.0.0.1:4222` aims at the client listener,
which speaks the client protocol, not the route protocol. The route never
establishes and the server runs alone. Always point `routes` at a peer's
route port: `6222`, not `4222`.

**One seed is enough, but list two or three anyway.** Gossip means a
single seed route is sufficient to discover the whole cluster. The risk is
boot ordering: if every joiner seeds off `n1-east` alone and `n1-east`
happens to be down when they start, none of them can find the cluster.
Listing two or three seed routes lets formation survive any one seed being
unavailable at boot. Don't rely on a single seed in production:

```conf
cluster {
  name: east
  listen: 127.0.0.1:6223
  routes: [
    nats://127.0.0.1:6222
    nats://127.0.0.1:6224
  ]
}
```

## Where you are

The `east` cluster is running and has discovered itself from one seed:

- `n1-east`, `n2-east`, and `n3-east` are up on client ports
  4222/4223/4224 and route ports 6222/6223/6224.
- Each joiner carried one explicit route to `n1-east`; gossip opened the
  implicit routes that complete the mesh, so every server holds a route to
  the other two.
- `nats server list` shows all three under cluster `east`, each with the
  same non-zero route count.

The servers can now reach each other. What they can't yet do is *agree*:
decide together which server owns a stream, and keep that decision when one
of them fails. RAFT handles that, and it's the subject of the next page.

## What's next

A cluster whose servers can reach each other still can't reach agreement.
The next page introduces **RAFT groups** and **leader election**: how the
servers in `east` pick a leader for the cluster and for each stream, and how
they pick a new one when a leader is lost.

Continue to [Raft and leaders](/learn/clustering/raft-and-leaders).

## See also

- [Reference → Cluster config](/reference/config/cluster) — every field of
  the `cluster {}` block.
- [Reference → Route protocol](/reference/protocols/route) — the wire-level
  route handshake and the INFO frame gossip uses.
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster) —
  the same `east` cluster as a deployment shape.
