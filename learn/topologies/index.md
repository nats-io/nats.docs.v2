---
id: index
title: "Topologies Deep Dive"
sidebar_position: 1
description: How NATS servers compose into bigger shapes, grown one deployment at a time
---

# Topologies Deep Dive

A **topology** is the arrangement of NATS servers and the connections
between them — the shape a deployment takes. NATS scales by composing
servers, so growing a deployment means building bigger topologies out of
smaller ones.

This chapter walks through the shapes those servers form (single server, a
cluster, a super-cluster, leaf nodes), the way a real deployment grows: start
small, add servers when you need them, stretch across regions, push to the edge.

The idea that ties the whole chapter together is that the application
never changes. The same server binary and the same client code run on
every shape, so you change the deployment rather than the code.

## The growing deployment

We follow one company, Acme, and one workload: its ORDERS system. The
application publishes order events on orders.* and consumes them from the ORDERS
stream — the same small payload in every example.

What grows across the chapter is the deployment under that workload, in
four stages:

- **Single server.** Acme starts with a single `nats-server`, `n1`, on a
  developer laptop. Clients connect to it directly. It's the simplest
  thing that works.
- **A cluster.** Production needs to survive a server outage. Acme stands
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

All of the examples in this chapter are runnable on a single machine.

## Scope of this chapter

This is the Operate-half companion to the
[Core Concepts → Topologies](/concepts/topologies) primer. The concept
page is the five-minute overview. This chapter wires each shape up for
real, providing config you can copy-paste, `nats-server` processes you
can run locally, and the "when and why" behind each step.

This chapter teaches the **shapes and the wiring**, rather than the
**mechanics** of replication: Raft, quorum, leader election, stream
placement. Those live in the
[Clustering & Replication](/learn/clustering) deep dive.

## Who this is for

You've read the [Core Concepts](/concepts/what-is-nats) primers,
including [Topologies](/concepts/topologies) and
[JetStream](/concepts/jetstream). Ideally you've worked through the
[JetStream deep dive](/learn/jetstream) and know what a stream and a
consumer are. This chapter reuses the `ORDERS` stream rather than
re-introducing it.

## Map

| Page | What you learn |
|---|---|
| [Single server](/learn/topologies/single-server) | The simplest deployment, when one server is enough, and its single-point-of-failure ceiling |
| [Your first cluster](/learn/topologies/your-first-cluster) | Join servers with routes into a cluster, and what client reconnect and failover buy you |
| [JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster) | What changes for streams once there's a cluster: the meta layer and replicated streams |
| [Super-clusters](/learn/topologies/super-clusters) | Join clusters with gateways across regions, and how geo-affinity keeps traffic local |
| [Leaf nodes](/learn/topologies/leaf-nodes) | Attach a leaf node with an outbound leaf connection and how subject interest flows across it |
| [Putting it together](/learn/topologies/putting-it-together) | Compose clusters, gateways, and leaf nodes into a full picture |
| [Where to go next](/learn/topologies/where-next) | A map of what's beyond this chapter |

Open a terminal and turn to [Single server](/learn/topologies/single-server).

## See also

- [Core Concepts → Topologies](/concepts/topologies) — the five-minute
  overview of the same four shapes
- [JetStream deep dive](/learn/jetstream) — the `ORDERS` stream this
  chapter reuses
- [Clustering & Replication](/learn/clustering) — the replication
  mechanics behind clusters
