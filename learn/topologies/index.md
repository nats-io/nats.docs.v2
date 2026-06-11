---
id: index
title: "Topologies Deep Dive"
sidebar_position: 1
description: How NATS servers compose into bigger shapes, grown one deployment at a time
---

# Topologies Deep Dive

NATS scales by composing servers. This chapter walks through the shapes
those servers form (one server, a cluster, a super-cluster, leaf nodes
at the edge), the way a real deployment grows: start small, add servers
when you need them, stretch across regions, push to the edge.

The point that holds the whole chapter together is this: the
application never changes. The same server binary and the same client
code run on every shape. You change the deployment, not the code.

<div class="nats-flow" data-scenario="singleToClusterAnimated" data-width="640" data-height="400"></div>

## The growing deployment

We follow one company, Acme, and one workload: its ORDERS system. The
application publishes order events on the `orders.*` subjects and
consumes them from the `ORDERS` stream. Every example uses the same
payload shape:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

What grows across the chapter is the deployment under that workload, in
four stages:

- **One server.** Acme starts with a single `nats-server`, `n1`, on a
  developer laptop. Clients connect to it directly. It's the simplest
  thing that works.
- **A cluster.** Production needs to survive a server dying. Acme stands
  up the `east` cluster (three servers: `n1-east`, `n2-east`, and
  `n3-east`) joined into a full mesh by **routes**. Clients connect to
  any one of them.
- **A super-cluster.** Traffic arrives from a second region. Acme adds
  the `west` cluster and joins it to `east` with **gateways**. The two
  clusters now form a super-cluster that spans regions, while keeping
  most traffic local to where it starts.
- **Leaf nodes.** A factory floor needs NATS on-site with only outbound
  network access. Acme runs `factory-1` as a **leaf node** that connects
  outward to the `east` cluster and serves its own local edge clients.

Each shape adds exactly one new way for servers to connect. That's the
whole vocabulary of NATS topology: routes join servers into a cluster,
gateways join clusters into a super-cluster, and leaf remotes attach a
leaf to a hub.

## What this chapter is, and is not

This is the Operate-half companion to the
[Core Concepts → Topologies](/concepts/topologies) primer. The concept
page is the five-minute overview. This chapter wires each shape up for
real, with config you can copy-paste, `nats-server` processes you can
run locally, and the "when and why" behind each step.

This chapter teaches the **shapes and the wiring**. It doesn't teach
the **mechanics** of replication: Raft, quorum, leader election, stream
placement. Those live in the
[Clustering & Replication](/learn/clustering) deep dive. When a topology
page reaches that boundary, it says so in one sentence and links out
rather than re-explaining it here.

## Who this is for

You've read the [Core Concepts](/concepts/what-is-nats) primers,
including [Topologies](/concepts/topologies) and
[JetStream](/concepts/jetstream). Ideally you've worked through the
[JetStream deep dive](/learn/jetstream) and know what a stream and a
consumer are. This chapter reuses the `ORDERS` stream rather than
re-introducing it.

You don't need to know anything about clustering specifically. We start
from a single server and grow.

## How to read it

Each page introduces at most two new concepts and carries the
deployment forward from the page before it. The server names and the
ORDERS payload stay fixed throughout, so you can keep a mental picture
of the same Acme system getting bigger rather than a new example each
time.

Where a connection type has a full wire-level protocol, the page covers
only what you need to wire it up and links to
[Reference](/reference/) for the exhaustive detail.

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | [Single server](/learn/topologies/single-server) | The simplest deployment, when one server is enough, and its single-point-of-failure ceiling |
| 2 | [Your first cluster](/learn/topologies/your-first-cluster) | Join servers with routes into a full mesh, and what client reconnect and failover buy you |
| 3 | [JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster) | What changes for streams once there's a cluster: the meta layer and replicated streams |
| 4 | [Super-clusters](/learn/topologies/super-clusters) | Join clusters with gateways across regions, and how geo-affinity keeps traffic local |
| 5 | [Leaf nodes](/learn/topologies/leaf-nodes) | Attach a leaf node with an outbound leaf connection and how subject interest flows across it |
| 6 | [Putting it together](/learn/topologies/putting-it-together) | Compose clusters, gateways, and leaf nodes into the full Acme picture |
| 7 | [Where to go next](/learn/topologies/where-next) | A map of what's beyond this chapter |

## What you build

By the end you'll have stood up, on one machine, each shape in turn:
a single server, a three-server cluster, a two-cluster super-cluster,
and a leaf node attached to a cluster. The ORDERS workload runs on all
of them without a single change to the client code.

Open a terminal and turn to [Single server](/learn/topologies/single-server).

## See also

- [Core Concepts → Topologies](/concepts/topologies) — the five-minute
  overview of the same four shapes
- [JetStream deep dive](/learn/jetstream) — the `ORDERS` stream this
  chapter reuses
- [Clustering & Replication](/learn/clustering) — the replication
  mechanics this chapter deliberately leaves out
