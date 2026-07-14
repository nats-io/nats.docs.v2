---
id: topologies
title: Topologies
description: How NATS servers can be arranged — from a single process to globally distributed deployments
---

# Topologies

NATS scales by composing servers. The same server binary and the same client APIs work across every shape — you change the deployment topology, not your application. Start with one server. Add more when you need to. Stretch across regions. Push to the edge. Mix it all.

For a runnable, step-by-step treatment that grows one server into a cluster, a super-cluster, and out to leaf nodes at the edge, see the [Topologies deep dive](/learn/topologies).

## Single Server

The simplest possible NATS deployment: one server process. All clients connect to it directly.

<div class="nats-flow" data-scenario="singleServer" data-width="600" data-height="350"></div>

Use a single server for:

- Local development and demos
- Embedded use inside another application
- Small services where one node is enough
- Quick experiments and learning

## Cluster

A **cluster** is a group of NATS servers connected by routes, forming a full mesh. Clients connect to any server in the cluster — messages flow across routes to reach subscribers anywhere in the mesh. If one server goes down, clients reconnect to another and keep working. With [JetStream](./jetstream), [streams](/reference/jetstream/api/stream) and [consumers](/reference/jetstream/api/consumer) can be replicated across nodes for durability.

<div class="nats-flow" data-scenario="cluster" data-width="650" data-height="350"></div>

Reach for a cluster when you need:

- High availability — a server can fail without dropping the system
- More throughput than one server can handle
- Production deployments
- Rolling upgrades without downtime
- [JetStream](./jetstream) replication for durable streams and consumers

## Super-Cluster

A **super-cluster** connects multiple clusters together with **gateways**. Each cluster operates independently — usually in its own region or cloud — and gateways only carry the traffic that has interest on the other side, keeping cross-region chatter to a minimum. Queue groups prefer local workers automatically (geo-affinity), so most messages stay close to home.

<div class="nats-flow" data-scenario="superCluster" data-width="850" data-height="450"></div>

Super-clusters fit when you need:

- Multi-region or multi-cloud deployments
- Global services with regional locality

## Leaf Nodes

A **leaf node** is a NATS server that initiates an outbound connection to a remote NATS system — a single server, cluster, or super-cluster — and bridges subject interest between the two. Because the connection is established from the leaf side, the leaf can run anywhere with outbound network access: another datacenter, a developer laptop, or a tiny edge device. Clients connected to the leaf see a regular NATS server. [JetStream](./jetstream) [streams](/reference/jetstream/api/stream) can be mirrored or sourced across the leaf link when you need local copies of data.

<div class="nats-flow" data-scenario="leafNode" data-width="700" data-height="350"></div>

Leaf nodes are great for:

- Edge and IoT deployments
- On-prem services bridging to a cloud cluster
- Hub-and-spoke architectures
- Multi-tenant isolation, where each tenant runs its own leaf

## Massive Scale

Real deployments combine all of the above. Multiple clusters span regions and connect via gateways. Each cluster fans out to leaf nodes at edge sites, factories, or branch offices. Each leaf serves its local clients. Same client code everywhere.

<div class="nats-flow" data-scenario="massiveScale" data-width="900" data-height="650"></div>

A cluster of NATS servers sits in the middle. Each cluster server can host its own clients. Leaf nodes extend outwards — every leaf brings its own group of clients, and the cluster sees one leaf connection rather than the individual clients, which the leaf authenticates on its own. The leaf still bridges subject interest into the account it binds to on the hub, so the subject namespace is shared unless you bind each leaf to its own account. The same pattern keeps composing: add more leaves, add more clients, add more cluster servers, add more clusters connected by gateways. Applications talk to NATS the same way regardless of where they sit.

## Next steps

- [Topologies deep dive](/learn/topologies) — grow these shapes hands-on
- [Clustering & replication](/learn/clustering) — the mechanism behind the mesh
- [Route protocol](/reference/protocols/route) — how cluster servers talk to each other
- [Gateway protocol](/reference/protocols/gateway) — how clusters talk across a super-cluster
- [Leafnode protocol](/reference/protocols/leafnode) — how leaf nodes connect to a hub
