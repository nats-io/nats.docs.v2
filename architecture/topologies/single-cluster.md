---
id: single-cluster
title: "Single cluster"
description: "The default production shape: three servers in one zone, JetStream on all of them, R3 for what matters"
tags: [topology, operations]
---

# Single cluster

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

Three `nats-server` processes in one low-latency zone, joined by routes,
with JetStream enabled on all three. It survives one server failing, runs
R3 streams, and is the right starting point for almost every production
deployment. Grow it into a super-cluster or add leaf nodes later; the
clients won't notice.

## Shape

<div class="nats-flow" data-scenario="cluster" data-width="650" data-height="350"></div>

Three servers, `n1-east`, `n2-east`, `n3-east`, in cluster `east`. Each
has a route to the other two. Clients connect to any of them and discover
the rest.

## Use when

- You're going to production and have one region.
- You need JetStream with replication.
- You need to upgrade without downtime.

## Don't use when

- Users or servers are in more than one region. Use a
  [multi-region super-cluster](/architecture/topologies/multi-region-supercluster).
- Sites need to keep working while disconnected. Use an
  [edge fleet with leaf nodes](/architecture/topologies/edge-fleet-with-leaf-nodes).
- It's a laptop or a test. One server is enough.

## Sizing

- **Three servers.** Not two, which has no quorum, and not four, which
  tolerates the same single failure as three. Five tolerates two failures
  at the cost of more replication traffic.
- **JetStream on all three.** Dedicated storage nodes come later, at a
  scale where core traffic and disk I/O compete; see
  [JetStream placement](/architecture/topologies/jetstream-placement).
- **R3 for anything you can't lose.** R1 for data you can recreate.
- **Resources per server.** _Placeholder: baseline CPU, memory, and disk
  numbers, with the rule for deriving them from message rate and
  retention._ Local SSD for the store directory, never network storage
  shared between servers.

## Configuration skeleton

The fields that define the shape. Every other field is in
[Reference](/reference/config/).

```text
server_name: n1-east
listen: 0.0.0.0:4222

cluster {
  name: east
  listen: 0.0.0.0:6222
  routes: [
    nats://n1-east:6222
    nats://n2-east:6222
    nats://n3-east:6222
  ]
}

jetstream {
  store_dir: /data/jetstream
  max_memory_store: 1GB
  max_file_store: 200GB
}
```

The same file on each server, with `server_name` changed.

## What survives what

| Failure | Keeps working | Degrades |
| --- | --- | --- |
| One server down | Core messaging. R3 streams and consumers, after a leader election. Clients reconnect to the other two. | R1 assets on that server are unavailable until it returns. |
| Two servers down | Core messaging for clients on the survivor. | Every R3 asset loses quorum: no writes, no consumer progress, until a second server is back. |
| One server's disk full | The other two. | That server's JetStream stops accepting writes. Treat it as down. |
| The zone | Nothing. | This shape has one zone. |

## Operations

- Upgrade one server at a time. Put it in lame-duck mode, wait for clients
  to move, upgrade, rejoin, confirm it's current before the next.
- Watch `/healthz` and `/jsz` on each server, and the JetStream meta
  leader.
- Back up streams with snapshots; mirror the important ones to a second
  cluster when you have one.

## Related

- Learn: [Your first cluster](/learn/topologies/your-first-cluster),
  [JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster),
  [Clustering & Replication](/learn/clustering/),
  [Rolling upgrades](/learn/deployment/rolling-upgrades).
- [Event-driven order processing](/architecture/reference-architectures/order-processing)
  runs on this shape.
