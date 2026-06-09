---
id: single-server
title: "1. Single server"
sidebar_position: 2
description: One nats-server process clients connect to directly — when it is enough and where its ceiling is
---

# 1. Single server

Every topology in this chapter grows out of one shape: a single
server. So that is where Acme starts, and where you start too.

A **server** is one `nats-server` process. It accepts client
connections, routes messages between subjects, and — if you turn it on
— stores them in streams. One process is all you need to run the entire
ORDERS workload while you build it.

This page stands up Acme's development server, `n1`, on your laptop.
Then it draws the line: what one server is great at, and the single
limit that eventually forces you to grow.

## The simplest deployment

There is no wiring to draw yet. One server sits in the middle. Every
client — the order publisher, the warehouse consumer, the analytics
pipeline — opens a connection straight to it.

<div class="nats-flow" data-scenario="singleToClusterAnimated" data-width="640" data-height="400"></div>

The clients do not know about each other. They know one address. A
publisher sends `orders.created` to the server; the server hands it to
whoever subscribed to a matching subject. That is the whole topology.

This is the deployment you have been using throughout the JetStream and
Security chapters without naming it. Naming it is the point: it is the
single-server topology, and it is a real, valid way to run NATS.

## Start Acme's dev server

Give the server a config file. A single server needs almost nothing in
it, but two fields earn their place from day one.

```conf
# n1.conf — Acme's development server
server_name: n1
port: 4222
http_port: 8222
```

`server_name` is a human-readable name for this server. Set it to `n1`.
Leave it out and the server invents a long generated ID that is no fun
to read in logs or monitoring output. Name it now and every later page
in this chapter can refer to `n1` by name.

`port` is where clients connect. `4222` is the NATS default, written
out here so the address is never a mystery. Clients will use
`nats://localhost:4222`.

`http_port` turns on the monitoring endpoint. It is **off by default**,
which trips up many first deployments — without it there is no `/varz`
to curl when something looks wrong. Acme enables it at `8222` from the
start so `n1` is observable.

Start `n1` with the config:

```bash
nats-server -c n1.conf
```

The server logs that it is listening on `4222` for clients and `8222`
for monitoring. `n1` is up. Nothing else is deployed; this one process
is the entire system.

Confirm it is reachable:

```bash
nats server check connection --server nats://localhost:4222
```

A healthy server answers, and the check reports OK.

## Connect and publish an order

With `n1` running, a client connects and publishes the same ORDERS
payload used everywhere in this chapter.

<div class="nats-example" data-type="learn-topologies-single-server-connect" data-languages="cli,js,go,python,java,rust,csharp"></div>

There is nothing topology-specific in that snippet, and that is the
lesson. The client names one server URL and publishes. The exact same
client code will run unchanged against the cluster, the super-cluster,
and the leaf node in the pages ahead — only the connect URL grows. You
change the deployment, not the application.

The wire-level detail of how a client connects and authenticates is
documented in [Reference → Client protocol](/reference/protocols/client).
We only need the connect URL here.

## When one server is enough

A single server is not a toy. It is the right tool for a real set of
jobs.

Reach for one server in **development**: a laptop, a CI run, a quick
experiment. There is nothing to coordinate and nothing to wait for.

Reach for one server when **embedding** NATS inside another
application. The `nats-server` binary runs in-process, giving that one
app a full NATS without operating a separate fleet.

Reach for one server for a **small service** where the blast radius of
that service going down is already "the feature is offline." Adding a
second server buys nothing the service itself does not also need.

In all of these, one server is not a compromise. It is the correct
amount of infrastructure.

## The ceiling: a single point of failure

Here is the one limit that eventually grows Acme past `n1`.

A single server is a **single point of failure**. If that process dies,
or the machine it runs on reboots, every client loses its connection at
once. There is no second server to fail over to, because there is no
second server. Message routing stops until `n1` comes back.

That is fine for a laptop. It is not fine for production orders, where
a reboot during a deploy would drop every order in flight.

Durability is a separate question with the same answer. With JetStream
enabled, `n1` can store the ORDERS stream on disk so messages survive a
restart of the process — but they still live on one machine. Lose that
disk and you lose the stream. One server gives you durability against a
crash, never against the loss of the server itself.

The fix for both is more servers. Two or three `nats-server` processes,
joined together, let a client whose server died reconnect to a survivor
and keep working — and let a stream keep copies on more than one
machine. That joining-together is a **cluster**, and it is the whole
next page.

## Pitfalls

The single-server shape has three traps. Each one is easy to walk into
and easy to avoid once named.

**Running a single server in production.** One server is a single point
of failure, so a reboot or crash takes the whole system down with it.
The trap is reaching for redundancy too late — and discovering that a
single server cannot even hold a replicated stream. Asking the ORDERS
stream for 3 replicas on `n1` is rejected, because three replicas need
three servers to live on:

<div class="nats-example" data-type="learn-topologies-single-server-r3-on-one-server" data-languages="cli,js,go,python,java,rust,csharp"></div>

The server answers `replicas > 1 not supported in non-clustered mode`.
Do not treat that error as a config typo to override. It is the shape
telling you the truth: redundancy is a cluster's job. On one server, ask
for `--replicas 1` and accept that R1 survives a process restart but
never the loss of `n1`. When orders must survive that, grow to [2. Your
first cluster](/learn/topologies/your-first-cluster). The quorum and
replication mechanics behind R3 live in
[Clustering & Replication](/learn/clustering).

**Forgetting the monitoring port.** The monitoring endpoint is off by
default — leave `http_port` out and there is no `/varz` to curl when
something looks wrong, so you are blind exactly when you need to see.
Set `http_port: 8222` from day one, as `n1.conf` does above, and confirm
the server stays reachable rather than guessing:

```bash
nats server check connection --server nats://localhost:4222
```

**Assuming one server scales forever.** A single server scales only
vertically: bigger CPU, more RAM, faster disk. That works until one
machine cannot hold the load, and there is no larger machine to buy. The
trap is planning capacity as if vertical growth has no ceiling. It does.
When you hit it, the answer is more servers sharing the work, not a
bigger one — and that is horizontal scaling, which begins on the next
page.

## Where you are

Acme's deployment right now:

- One development server, `n1`, listening on `4222` with monitoring on
  `8222`.
- The ORDERS workload — publishing `orders.*`, consuming the `ORDERS`
  stream — running against it directly.
- A clear picture of what this buys (simplicity, embedding, small
  services) and the one thing it does not (survival of the server
  itself).

## What is next

The next page joins three servers — `n1-east`, `n2-east`, `n3-east` —
into Acme's first **cluster**, so a client whose server dies reconnects
to another and keeps working: [2. Your first
cluster](/learn/topologies/your-first-cluster).

## See also

- [Core Concepts → Topologies](/concepts/topologies) — the
  five-minute overview of all four shapes.
- [Reference → Client protocol](/reference/protocols/client) — how a
  client connects, the connect URL, and the full set of options.
