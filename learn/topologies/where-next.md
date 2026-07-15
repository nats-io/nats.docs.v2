---
id: where-next
title: "Where to go next"
sidebar_position: 8
description: Recap the four composable shapes and point to the mechanics, operations, and protocol references beyond this chapter
---

# Where to go next

You started this chapter with one `nats-server` on `localhost` serving
Acme's ORDERS workload. You end it with that same workload running on a
two-cluster super-cluster that fans out to a leaf at the factory floor.
The deployment grew throughout, while the client code stayed the same.

This page collects the model you built into one place and points you at
the chapters and Reference that take it further, rather than teaching
anything new.

## The chapter summarized

NATS scales by **composing servers**. To grow the deployment you wired
more `nats-server` processes together into bigger shapes, instead of
swapping binaries or rewriting Acme's publisher.

There are four shapes, and they stack on top of each other.

A **single server** is one `nats-server` process. Clients connect to it
directly. Use it for development and small workloads; in production it's
a single point of failure.

A **cluster** is servers joined by **routes** into a full mesh. Clients
connect to any server and reconnect to another when one dies. This is the
shape you run in production.

A **super-cluster** joins clusters with **gateways**. A gateway carries
only the traffic that has interest on the other side, and geo-affinity
keeps work local until it has to cross. This is how a deployment spans
regions.

A **leaf node** is a server that opens an **outbound** connection to a
remote NATS system and bridges subject interest. It runs anywhere with
outbound access, such as a factory, an edge device, or a laptop, and
hides its local clients behind it. This is how NATS reaches the edge.

Everything in the
[Putting it together](/learn/topologies/putting-it-together) page was one
of those four shapes, or a composition of them.

## The same client code, everywhere

The point to carry out of this chapter is that Acme's ORDERS
publisher and consumer are identical on all four shapes.

A client that publishes `orders.created` and consumes the `ORDERS`
stream doesn't know whether it's talking to a single dev server, a
server in the `east` cluster, a super-cluster spanning `east` and `west`,
or the leaf at `factory-1`. It connects, publishes, and subscribes the
same way.

That's the payoff of separating the application from the topology. You
size and shape the deployment for the operational need in front of you,
and the code you already wrote keeps working.

## What this chapter left out

This chapter taught the shapes and wiring, namely routes, gateways, and
leaf remotes. It didn't teach the mechanics that run inside a
cluster once JetStream is replicated across it.

When you set the `ORDERS` stream to R3 on the
[JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster) page,
you saw the meta layer and the odd-server-count rule from the outside.
How the replicas elect a leader, how a quorum is reached, how writes
survive a failover, and how a stream is placed on specific servers: all
of that lives in the Clustering & Replication deep dive.

The [Clustering & Replication](/learn/clustering) deep dive picks up
exactly there. It stands up a real cluster and walks through Raft, leader
election, R3 replication, and placement on the topology you already know
how to build.

## Operating a topology

Wiring a topology is the start; running one in production is covered by
the [Deployment](/learn/deployment) deep dive.

It covers the things a topology walkthrough on plain `nats-server`
processes skips: running NATS on Kubernetes, rolling upgrades across a
cluster without dropping clients, hardening servers, and sizing servers
for a workload.

Once a topology is live, you watch it with the
[Monitoring](/learn/monitoring) deep dive. The routes you wired by hand
here show up on the `/routez` endpoint it covers; gateways and leaf
connections have their own `/gatewayz` and `/leafz` endpoints you scrape
the same way to know the mesh is healthy and traffic is flowing where you
expect.

## Securing a leaf

The [Leaf nodes](/learn/topologies/leaf-nodes) page attached `factory-1`
to the `east` cluster and ran it auth-free, in the default account,
leaving account binding and credentials for production.

A leaf opens a connection across a trust boundary, often the public
internet, so authenticating that connection and scoping what the leaf
can publish and subscribe is not optional in production. The
[Security](/learn/security) deep dive covers accounts, the credential
types you'd mint for a leaf, and TLS on the leafnode block.

## Wire-level detail

This chapter is unversioned and concept-first. The exact fields,
defaults, and message formats of each connection live in **Reference**,
which is versioned and exhaustive.

When you need the precise protocol behind a shape, that's where to look:

- [Route protocol](/reference/protocols/route): how cluster servers talk
  to each other over a route
- [Gateway protocol](/reference/protocols/gateway): how clusters
  exchange interest across a super-cluster
- [Leafnode protocol](/reference/protocols/leafnode): how a leaf
  connects to and bridges interest with its hub

## Where you are

This is the end of the chapter. The whole growth story is complete: one
dev server `n1`, then the `east` cluster of `n1-east`/`n2-east`/`n3-east`,
then the super-cluster joining `east` and `west` by gateways, then the
`factory-1` leaf at the edge. This page introduces no new scenario state.

You hold the core model: the same binary and the same client code compose
into four shapes (single server, cluster, super-cluster, and leaf node),
and you wire each shape up with routes, gateways, and leaf remotes. That
model is the foundation the Clustering, Deployment, Monitoring, and
Security chapters build on.

## What's next

Two deep dives carry this chapter the furthest. The
[Clustering & Replication](/learn/clustering) deep dive teaches the
mechanics inside a cluster: Raft, leaders, R3, and placement. The
[Deployment](/learn/deployment) deep dive teaches how to run any of these
shapes in production.

## Production checklist

Each shape in this chapter flags what to watch for. Here they are
collected into one pass to run before a deployment carries real traffic.
Each group links to the page that explains why.

**Single server**: see [Pitfalls](/learn/topologies/single-server#pitfalls)

- [ ] Move production workloads off a single server before a reboot can drop orders in flight.
- [ ] Plan for horizontal growth, not a bigger box; vertical scaling has a ceiling.
- [ ] Add redundancy before an outage, not after; one server can't hold a replicated stream, so R1 survives a restart but never the loss of the box.

**Cluster**: see [Pitfalls](/learn/topologies/your-first-cluster#pitfalls)

- [ ] Set the same `name` on all servers, then confirm they joined as one cluster.
- [ ] Bind the cluster port to a private interface and firewall it off the open internet.
- [ ] Run an odd server count once you replicate a stream.

**JetStream in a cluster**: see [Pitfalls](/learn/topologies/jetstream-in-a-cluster#pitfalls)

- [ ] Audit replica counts and raise the streams that matter to R3; a cluster alone is not HA.
- [ ] Run an odd count (three or five), never an even count; a stream replicates across at most five servers.
- [ ] Spread R3 replicas across independent failure domains, not one rack or zone.

**Super-cluster**: see [Pitfalls](/learn/topologies/super-clusters#pitfalls)

- [ ] Join regions with a `gateway {}` block, never a `cluster {}` stretched across them.
- [ ] Match the local gateway `name` to the `cluster {}` name (the server won't start otherwise), and each `gateways` entry to the remote cluster's exact name — a remote typo fails silently, so confirm a publish crosses to the other region.
- [ ] Place a queue subscriber for each workload in every region that produces it.

**Leaf nodes**: see [Pitfalls](/learn/topologies/leaf-nodes#pitfalls)

- [ ] Put `remotes` on the egress-only side and `leafnodes { listen }` on the hub.
- [ ] Give a leaf its own JetStream `domain` when it needs a distinct local store.

**Composing shapes**: see [Pitfalls](/learn/topologies/putting-it-together#pitfalls)

- [ ] Reach for accounts — with a leaf where the boundary follows a network edge — when you need an isolation wall, not another route or gateway. See [Composition adds reach, not boundaries](/learn/topologies/putting-it-together#composition-and-boundaries).
- [ ] Add each layer only when the current one runs out of room.

## See also

- [Operate → Clustering & Replication](/learn/clustering): the mechanics
  inside a cluster (Raft, leader election, replication, and placement)
- [Operate → Deployment](/learn/deployment): running these shapes in
  production on Kubernetes, with rolling upgrades and sizing
- [Core Concepts → Topologies](/concepts/topologies): the five-minute
  overview of the same four shapes
