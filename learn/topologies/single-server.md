---
id: single-server
title: "Single server"
sidebar_position: 2
description: One nats-server process clients connect to directly — when it's enough and where its ceiling is
---

# Single server

Every topology in this chapter is built from a set of `nats-server`
processes connected to each other. Before connecting anything, it's
worth looking at the building block on its own: one server.

A **server** is one `nats-server` process. It accepts client connections, routes
messages between subjects, and, if you turn JetStream on, can store them in
streams. One process is all you need to run the entire ORDERS workload while you
build it.

This page stands up a development server, `n1`, on your machine. Then it
covers when one server is enough and the limits that eventually lead Acme to
add more servers.

## The simplest deployment

There's no wiring to draw yet. There is one server in the middle, and each
client opens a connection straight to it. Here that's two: `order-svc`, which
publishes orders, and the `warehouse` service, which subscribes to them.

<div class="nats-flow" data-scenario="topologiesSingleServer" data-width="600" data-height="300"></div>

The clients don't know about each other. They know one address. A
publisher sends `orders.created` to the server; the server hands it to
whoever subscribed to a matching subject, and that is the whole topology.

This is the deployment you've been using throughout the JetStream and
Security chapters without naming it. It's the
single-server topology, and it's a real, valid way to run NATS.

## Start the dev server

Give the server a config file. A single server needs almost nothing in
it, but a few settings earn their place from day one.

```conf
# n1.conf — the development server
server_name: n1
port: 4222
http_port: 8222

jetstream {
  store_dir: "./js/n1"
}
```

`server_name` is a human-readable name for this server. Set it to `n1`,
so that the logs and monitoring endpoints identify it clearly.

`port` is where clients connect. `4222` is the NATS default; it's written
out here so the client address is explicit. Clients use
`nats://localhost:4222`.

`http_port` turns on the monitoring endpoint, as it's
off by default. Enable it at `8222` from the start so `n1` is
observable; the [Monitoring deep dive](/learn/monitoring) covers what to
watch on it.

[`jetstream`](/reference/config/jetstream) turns JetStream on and gives it a `store_dir` to
write to. Enable it so `n1` can hold the same ORDERS stream it
carried through the JetStream chapter.

Start `n1` with the config:

```bash
nats-server -c n1.conf
```

The server logs that it's listening on `4222` for clients and `8222`
for monitoring. `n1` is up. Nothing else is deployed; this one process
is the entire system.

Confirm it's reachable:

```bash
nats server check connection --server nats://localhost:4222
```

A healthy server answers, and the check reports OK.

## Connect and publish an order

With `n1` running, subscribe to `orders.>` in one terminal:

```bash
nats sub "orders.>" --server nats://localhost:4222
```

In another, connect and publish an ORDERS order:

```bash
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' --server nats://localhost:4222
```

The subscriber prints the order:

```
[#1] Received on "orders.created"
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

There's nothing topology-specific here. The client names one server URL and
publishes; the same kind of publish runs unchanged against the cluster, the
super-cluster, and the leaf node in the pages ahead.

For the wire-level detail of how a client connects and authenticates,
see [Reference → Client protocol](/reference/protocols/client).
We only need the connect URL here.

## When one server is enough

A single server is the right tool for a real set of
jobs.

Reach for one server in **development**: a laptop or a CI run. There's
nothing to coordinate and nothing to wait for.

One server also fits when NATS runs **on the device itself**. The
`nats-server` binary is one small, self-contained process, so it can run
on edge hardware — a car, a factory machine, a point-of-sale terminal —
or embedded in-process inside another application. Each gets a full local
NATS with no fleet to operate. A device server like this often later dials
out to a central system as a [leaf node](/learn/topologies/leaf-nodes),
but on its own it's still a single server.

A **small, single-instance service** is the third fit — an internal
dashboard or a nightly job that already runs as one process.
That service is the least available part of the feature, so clustering
NATS behind it raises the broker's uptime but not the feature's: the
service still fails first. Lifting the feature's availability means a second copy of
the service too, which a small feature rarely earns.

In all of these, one server is the correct amount of infrastructure
rather than a compromise.

## The limits of one server

Two limits eventually push Acme past `n1`. The first is **availability**:
a single server can fail. The second is **capacity**: a single server can
only grow so far.

A single server is a **single point of failure**. If that process dies,
or the machine it runs on reboots, every client loses its connection at
once. There's no server to fail over to, because there is no
second server. Message routing stops until `n1` comes back.

That's fine for the use-cases described above. It isn't fine for production
deployments, where a reboot during a deploy would drop every order in flight.

Durability is a separate question with the same answer. Because `n1`
has JetStream enabled, it stores the ORDERS stream on disk so messages
survive a restart of the process, but they still live on one machine.
Lose that disk and you lose the stream. One server gives you durability against a
crash, never against the loss of the server itself.

Capacity is the second limit. A single server scales **vertically** — a
bigger CPU, more RAM, a faster disk — which is sometimes the right fix,
but every machine has a ceiling. Past it, the way forward is more servers,
not a bigger one.

The fix for both limits is a **cluster**: more than one server, so a
client can fail over and a stream can keep copies on more than one machine.
The next page stands up Acme's first cluster, `east`, and shows how it
lifts both limits at once.

## Pitfalls

A single server has one trap worth seeing up close — the one that turns
the availability limit above from theory into an error message.

**Reaching for redundancy too late.** It's tempting to assume durability
is something you switch on when you need it. But a single server can't
hold a replicated stream. Ask the ORDERS stream for three replicas
on `n1` and the server refuses, because three replicas need three servers
to live on:

```bash
nats stream add ORDERS --subjects 'orders.*' --storage file --replicas 3 --defaults
```

The server answers `replicas > 1 not supported in non-clustered mode`.
Don't treat that error as a config typo to override. It reflects how the
topology works: redundancy is a cluster's job. On one server, ask
for `--replicas 1` and accept that R1 survives a process restart but
never the loss of `n1`. When orders must survive that, grow to [Your
first cluster](/learn/topologies/your-first-cluster). The quorum and
replication mechanics behind R3 live in
[Clustering & Replication](/learn/clustering).

## Where you are

Acme's deployment right now:

- One development server, `n1`, listening on `4222` with monitoring on
  `8222`.
- The ORDERS workload running against it directly: `order-svc` publishing
  `orders.*`, with the `ORDERS` stream stored on `n1` now that JetStream
  is enabled.

## What's next

The next page joins three servers (`n1-east`, `n2-east`, `n3-east`)
into Acme's first cluster, so a client whose server dies reconnects
to another and keeps working: [Your first
cluster](/learn/topologies/your-first-cluster).

## See also

- [Core Concepts → Topologies](/concepts/topologies) — the
  five-minute overview of all four shapes.
- [Reference → Client protocol](/reference/protocols/client) — how a
  client connects, the connect URL, and the full set of options.
