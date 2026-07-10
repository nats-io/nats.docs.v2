---
id: forming-a-cluster
title: "Forming a cluster"
sidebar_position: 2
description: How servers find each other — explicit seed routes and the gossip that grows one seed into a full mesh
---

# Forming a cluster

The [Topologies chapter](/learn/topologies/your-first-cluster) wired
three servers into the cluster `east`. It covered the `cluster {}` block
and the shape it produces, not the *how*: how a server you pointed at one
address ends up holding a route to every server in the cluster.

This page covers that. Before servers can elect a leader or replicate a
write, they have to find each other. Two ideas do that work: a route, the
connection one server opens to another, and gossip, the way servers tell
each other who else is in the cluster. We use the same `east` cluster the
whole way: `n1-east`, `n2-east`, and `n3-east`, client ports
4222/4223/4224, route ports 6222/6223/6224. By the end of the page
they're running, and you've watched the discovery happen in the logs.

## A route is a server-to-server connection

A **route** is the connection one `nats-server` opens to another so the
two act as one cluster. It isn't a client connection: clients connect on
the client port (4222), routes on a separate route port (6222), and the
two listeners speak different protocols — see [Pitfalls](#pitfalls) for
what happens when a route dials the wrong one.

A route is bidirectional once open: whichever server dialed, both ends
afterward send and receive over the same link. Routes come in two kinds.

An **explicit route** is one you configured: you wrote its address into
the `routes` list, and the server dials it on startup. This is the seed,
the address a fresh server uses to find the cluster at all.

An **implicit route** is one the server opened on its own, to a server it
was *not* configured to know. It learned that server existed and dialed
it without you writing the address anywhere. Implicit routes come from
gossip.

## Gossip turns one seed into a full mesh

In the `east` configs below, no server lists both of the other servers in
its `routes`. Yet the running cluster has every server connected to every
other. The connections you never wrote appear through **gossip**.

Gossip is route discovery by INFO redistribution. When two servers form a
route, each sends the other an **INFO** message, a small protocol frame
that carries its own route address. A server that already holds routes
forwards a newcomer's INFO over them, so every server that receives it
learns the newcomer's address and dials it. Those self-opened connections
are implicit routes.

Trace it on `east`. `n2-east` and `n3-east` each dial their explicit
route to `n1-east` at boot. `n1-east` then knows both joiners, so it
forwards `n3-east`'s INFO to `n2-east`, which holds no route to `n3-east`
and opens one: an implicit route that completes the mesh.

<div class="nats-flow" data-scenario="clusterGossipAnimated" data-width="600" data-height="350"></div>

This is why a joiner needs one seed address and nothing else. The
wire-level detail of the INFO frame and the route handshake is documented
in [Reference → Route protocol](/reference/protocols/route). We only need
the behavior here: an INFO announces one server's route address, and a
server forwards a newcomer's INFO to the routes it already holds.

## Stand up the seed and two joiners

The configs are the ones Topologies used to build `east`, with one
addition. [Your first cluster](/learn/topologies/your-first-cluster)
already walked the `cluster {}` fields (`name`, `listen`, `routes`), and
the `jetstream` block stays because later pages create the `ORDERS`
stream here. The addition is a system account: the `nats server`
inspection commands this chapter leans on answer only on the **system
account**, so each config defines a `SYS` account with one user. Accounts
themselves are covered in
[Security → Accounts and multitenancy](/learn/security/accounts-and-multitenancy).
Each config also sets `http_port`, the HTTP monitoring endpoint — it's
off by default, and the next page reads live Raft state from it.

```conf title="n1-east.conf"
server_name: n1-east
listen: 127.0.0.1:4222
http_port: 8222

jetstream {
  store_dir: "./js/n1-east"
}

accounts { SYS: { users: [ { user: sys, password: sys } ] } }
system_account: SYS

cluster {
  name: east
  listen: 127.0.0.1:6222
  routes: [
    nats://127.0.0.1:6223
  ]
}
```

```conf title="n2-east.conf"
server_name: n2-east
listen: 127.0.0.1:4223
http_port: 8223

jetstream {
  store_dir: "./js/n2-east"
}

accounts { SYS: { users: [ { user: sys, password: sys } ] } }
system_account: SYS

cluster {
  name: east
  listen: 127.0.0.1:6223
  routes: [
    nats://127.0.0.1:6222
  ]
}
```

```conf title="n3-east.conf"
server_name: n3-east
listen: 127.0.0.1:4224
http_port: 8224

jetstream {
  store_dir: "./js/n3-east"
}

accounts { SYS: { users: [ { user: sys, password: sys } ] } }
system_account: SYS

cluster {
  name: east
  listen: 127.0.0.1:6224
  routes: [
    nats://127.0.0.1:6222
  ]
}
```

The `routes` lists are deliberately incomplete: `n2-east` and `n3-east`
never mention each other, and `n1-east` never mentions `n3-east`. Start all
three, each with its own config file:

```bash
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &
```

Ordinary clients need no credentials; they land in the default account,
which still has JetStream. Only the `nats server` system commands below
need `--user sys --password sys`. The full set of `cluster {}` fields
(`pool_size`, `compression`, `authorization`, `tls {}`) is documented in
[Reference → Cluster config](/reference/config/cluster). We only need
`name`, `listen`, and `routes` to form the cluster.

## Confirm the mesh formed

Ask every server to identify itself:

```bash
nats server list --user sys --password sys
```

All three answer as one cluster (columns trimmed):

```
╭────────────────────────────────────────────────────────────────────╮
│                          Server Overview                           │
├─────────┬─────────┬─────────┬─────┬───────┬──────┬────────┬────────┤
│ Name    │ Cluster │ Version │ JS  │ Conns │ Subs │ Routes │ Uptime │
├─────────┼─────────┼─────────┼─────┼───────┼──────┼────────┼────────┤
│ n1-east │ east    │ 2.14.0  │ yes │ 1     │ 196  │      8 │ 5m4s   │
│ n2-east │ east    │ 2.14.0  │ yes │ 0     │ 196  │      8 │ 5m2s   │
│ n3-east │ east    │ 2.14.0  │ yes │ 0     │ 196  │      8 │ 5m0s   │
╰─────────┴─────────┴─────────┴─────┴───────┴──────┴────────┴────────╯
```

The `Cluster` column reads `east` on all three rows, so they joined one
cluster and not three separate ones. The one connection on `n1-east` is
the CLI itself.

The `Routes` column reads `8`, not `2`. A modern server opens a small
pool of TCP connections per remote server (`pool_size`, default 3) so
traffic can spread over parallel connections, plus one more dedicated to
the system account. Two remote servers times four connections is 8.
Logically it's still one route to each of the other two servers.

To see which connections were configured and which came from gossip, ask
a server for its route details:

```bash
nats server request routez --name n2-east --user sys --password sys
```

Two entries from the `routes` array, trimmed:

```json
{
  "remote_name": "n1-east",
  "did_solicit": true,
  "is_configured": true,
  "port": 6222
}
{
  "remote_name": "n3-east",
  "did_solicit": true,
  "is_configured": false,
  "port": 6224
}
```

This is the explicit/implicit split made visible. The route to `n1-east`
is `is_configured: true`: the seed you wrote into `n2-east.conf`. The
route to `n3-east` is `is_configured: false` with `did_solicit: true`:
`n2-east` dialed it on its own, to an address gossip handed it.
(`nats server report routes` prints the same data as a cluster-wide table.)

`is_configured` is the field to key on. `did_solicit` and `port` record
which side happened to dial first, so your capture may show the implicit
route as an inbound connection (`did_solicit: false`) with an ephemeral
port instead.

One server's summary view comes from `nats server info`; the tail of
its output is the `Cluster` block:

```bash
nats server info n1-east --user sys --password sys
```

```
Cluster:

                             Name: east
                             Host: 127.0.0.1:6222
                             URLs: 127.0.0.1:6223
```

`URLs` shows only `127.0.0.1:6223`, the route address
`n1-east` was *configured* with. Implicit routes never appear here, only
in `routez`.

Since the configs enable JetStream, confirm it's ready on all three:

```bash
nats server report jetstream --user sys --password sys
```

```
╭─────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                        JetStream Summary                                        │
├──────────┬─────────┬─────────┬───────────┬──────────┬───────┬────────┬──────┬─────────┬─────────┤
│ Server   │ Cluster │ Streams │ Consumers │ Messages │ Bytes │ Memory │ File │ API Req │ Pending │
├──────────┼─────────┼─────────┼───────────┼──────────┼───────┼────────┼──────┼─────────┼─────────┤
│ n1-east* │ east    │ 0       │ 0         │ 0        │ 0 B   │ 0 B    │ 0 B  │ 1       │       0 │
│ n2-east  │ east    │ 0       │ 0         │ 0        │ 0 B   │ 0 B    │ 0 B  │ 0       │       0 │
│ n3-east  │ east    │ 0       │ 0         │ 0        │ 0 B   │ 0 B    │ 0 B  │ 0       │       0 │
├──────────┼─────────┼─────────┼───────────┼──────────┼───────┼────────┼──────┼─────────┼─────────┤
│          │         │ 0       │ 0         │ 0        │ 0 B   │ 0 B    │ 0 B  │ 1       │       0 │
╰──────────┴─────────┴─────────┴───────────┴──────────┴───────┴────────┴──────┴─────────┴─────────╯

╭───────────────────────────────────────────────────────────────────────╮
│            RAFT Meta Group Information - Lead cluster: east           │
├─────────────────┬──────────┬────────┬─────────┬────────┬────────┬─────┤
│ Connection Name │ ID       │ Leader │ Current │ Online │ Active │ Lag │
├─────────────────┼──────────┼────────┼─────────┼────────┼────────┼─────┤
│ n1-east         │ N0TeytwJ │ yes    │ true    │ true   │ 0s     │ 0   │
│ n2-east         │ cJ6ynrck │        │ true    │ true   │ 127ms  │ 0   │
│ n3-east         │ h4QkFOiR │        │ true    │ true   │ 127ms  │ 0   │
╰─────────────────┴──────────┴────────┴─────────┴────────┴────────┴─────╯
```

No streams yet, but every server runs JetStream. And the second table
shows something the servers did on their own the moment the mesh formed:
they elected a leader (`n1-east` in our run; which server wins differs
run to run). That Raft Meta Group is the next page's subject.

## Trace the discovery in the logs

The gossip story above is checkable. Restart the servers with debug
logging (`-DV`) and a log file each:

```bash
nats-server -c n1-east.conf -DV -l n1-east.log &
nats-server -c n2-east.conf -DV -l n2-east.log &
nats-server -c n3-east.conf -DV -l n3-east.log &
```

At boot, `n2-east` dials its one configured address, the explicit route:

```
[47616] 2026/07/07 12:31:55.431979 [DBG] Trying to connect to route on 127.0.0.1:6222 (127.0.0.1:6222)
[47616] 2026/07/07 12:31:55.432523 [INF] 127.0.0.1:6222 - rid:8 - Route connection created
```

When `n3-east` registers at the seed (two seconds later in our run),
watch `n2-east`:

```
[47616] 2026/07/07 12:31:57.425505 [DBG] Trying to connect to route on 127.0.0.1:6224 (127.0.0.1:6224)
[47616] 2026/07/07 12:31:57.425697 [INF] 127.0.0.1:6224 - rid:14 - Route connection created
```

`127.0.0.1:6224` appears in no config file `n2-east` has ever read. The
seed forwarded `n3-east`'s INFO over its existing route, and about 16
milliseconds after `n3-east` came up, `n2-east` dialed it: the implicit
route from the `routez` output above. `n3-east`'s own log shows the other
end, an inbound connection it never solicited:

```
[47621] 2026/07/07 12:31:57.426519 [INF] 127.0.0.1:53078 - rid:10 - Route connection created
```

That's the whole mechanism: each joiner makes one configured dial, the
seed forwards the INFO, and the servers open the remaining routes on
their own.

## Pitfalls

Three details have to be correct. None of them crashes the server: you
get a running process, just not the cluster you meant, and the evidence
is in the logs.

**A mismatched `cluster.name` forms two clusters.** Give one server
`name: eats` instead of `east` and it keeps running, but every route it
opens to the others is closed at the handshake. Its own log shows:

```
[INF] 127.0.0.1:6222 - rid:6 - Router connection closed: Cluster Name Conflict
```

and the seed logs the reason:

```
[ERR] 127.0.0.1:53915 - rid:29 - Rejecting connection, cluster name "eats" does not match "east"
```

The odd server retries forever as a one-server cluster of its own, and
nothing surfaces at the client until a message fails to cross. Set the
identical `name` everywhere, then confirm with `nats server list`: every
row must show the same `Cluster` value.

**Pointing `routes` at the client port (4222) never forms the mesh, and
it floods the log.** A server whose `routes` entry reads
`nats://127.0.0.1:4222` reaches a listener speaking the wrong protocol,
so it connects, fails to parse, disconnects, and immediately retries:

```
[INF] 127.0.0.1:4222 - rid:6 - Route connection created
[ERR] 127.0.0.1:4222 - rid:6 - Route Error 'Unknown Protocol Operation'
[INF] 127.0.0.1:4222 - rid:6 - Router connection closed: Parse Error - Remote: n1-east
```

A few seconds of this misconfiguration produced almost ten thousand of
those cycles. Always point `routes` at a route port: `6222`, not `4222`.

**One seed is enough, but list two or three anyway.** The risk of a
single seed is boot ordering: if every joiner seeds off `n1-east` alone
and `n1-east` happens to be down when they start, none of them can find
the cluster. Listing two or three seed routes lets formation survive any
one seed being down at boot. Don't rely on a single seed in production:

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

- `n1-east`, `n2-east`, and `n3-east` are up on ports 4222/4223/4224 and
  6222/6223/6224, with JetStream on and a `SYS` account for the
  `nats server` commands (`--user sys --password sys`).
- Each joiner carried one explicit route; gossip opened the implicit
  routes, visible as `is_configured: false` in `routez` and as a dial to
  an unconfigured address in the debug log.
- `nats server list` shows all three under cluster `east`, joined by a
  pool of route connections (`Routes: 8` per server).

## What's next

The servers can reach each other, and the JetStream report already shows
them agreeing on one thing: a meta group leader. The next page introduces
**Raft groups** and **leader election**: how the servers in `east` picked
that leader, and how they pick a new one when a leader is lost.

Continue to [Raft and leaders](/learn/clustering/raft-and-leaders).

## See also

- [Reference → Cluster config](/reference/config/cluster) — every field of
  the `cluster {}` block, including `pool_size`.
- [Reference → Route protocol](/reference/protocols/route) — the wire-level
  route handshake and the INFO frame gossip uses.
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster) —
  the same `east` cluster as a deployment shape.
