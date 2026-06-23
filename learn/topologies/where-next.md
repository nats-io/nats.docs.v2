---
id: where-next
title: "7. Where to go next"
sidebar_position: 8
description: Recap the four composable shapes and point to the mechanics, operations, and protocol references beyond this chapter
---

# 7. Where to go next

You started this chapter with one `nats-server` on `localhost` serving
Acme's ORDERS workload. You end it with that same workload running on a
two-cluster super-cluster that fans out to a leaf at the factory floor.
The deployment grew throughout, while the application stayed the same.

This page collects the model you built into one place and points you at
the chapters and Reference that take it further, rather than teaching
anything new.

## The chapter summarized

NATS scales by **composing servers**. To grow the deployment you wired
more `nats-server` processes together into bigger shapes, instead of
swapping binaries or rewriting Acme's publisher.

There are four shapes, and they stack on top of each other.

A **single server** is one `nats-server` process. Clients connect to it
directly. It's the right tool for development and small workloads, and
elsewhere it's a single point of failure.

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

The four shapes are single server, cluster, super-cluster, and leaf.
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
[Monitoring](/learn/monitoring) deep dive. The monitoring endpoints this
chapter used to inspect a topology (routes, gateways, and leaf
connections) are the same ones you scrape in production to know the mesh
is healthy and traffic is flowing where you expect.

## Securing a leaf

The [Leaf nodes](/learn/topologies/leaf-nodes) page attached `factory-1`
to the `east` cluster and bound it to an account, but kept the
credentials side light.

A leaf opens a connection across a trust boundary, often the public
internet, so authenticating that connection and scoping what the leaf
can publish and subscribe is not optional in production. The
[Security](/learn/security) deep dive covers leaf authentication,
accounts, and the credentials a leaf remote presents to its hub.

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

Each shape in this chapter ends with a **Pitfalls** section. Here are
those traps collected into one pass over a deployment before it carries
real traffic: the thing to do, grouped by the page that explains why.

**Single server**: see [Pitfalls](/learn/topologies/single-server#pitfalls)

- [ ] Move production workloads off a single server before a reboot can drop orders in flight.
- [ ] Set `http_port: 8222` from day one so `/varz` is there when something breaks.
- [ ] Plan for horizontal growth, not a bigger box; vertical scaling has a ceiling.

**Cluster**: see [Pitfalls](/learn/topologies/your-first-cluster#pitfalls)

- [ ] Give every client the full server list, never a single seed URL.
- [ ] Set the same `name` on all servers, then confirm they joined as one cluster.
- [ ] Bind the cluster port to a private interface and firewall it off the open internet.
- [ ] Run an odd server count once you replicate a stream.

**JetStream in a cluster**: see [Pitfalls](/learn/topologies/jetstream-in-a-cluster#pitfalls)

- [ ] Audit replica counts and raise the streams that matter to R3; a cluster alone is not HA.
- [ ] Run an odd count (three or five), never an even count; a stream replicates across at most five servers.
- [ ] Read a stream's own leader from `nats stream info`, not from the meta-group summary.
- [ ] Spread R3 replicas across independent failure domains, not one rack or zone.

**Super-cluster**: see [Pitfalls](/learn/topologies/super-clusters#pitfalls)

- [ ] Join regions with a `gateway {}` block, never a `cluster {}` stretched across them.
- [ ] Match each gateway `name` exactly, then confirm both directions show up.
- [ ] Place a queue subscriber for each workload in every region that produces it.

**Leaf nodes**: see [Pitfalls](/learn/topologies/leaf-nodes#pitfalls)

- [ ] Set the leaf's `account` explicitly and verify it in `nats server report leafnodes`.
- [ ] Put `remotes` on the egress-only side and `leafnodes { listen }` on the hub.
- [ ] Give a leaf its own JetStream `domain` when it needs a distinct local store.

**Composing shapes**: see [Pitfalls](/learn/topologies/putting-it-together#pitfalls)

- [ ] Bind each leaf to its own dedicated account so leaves never leak into each other.
- [ ] Use accounts, not another route or gateway, when you need a wall between deployment parts.
- [ ] Add each layer only when the current one runs out of room.

## See also

- [Operate → Clustering & Replication](/learn/clustering): the mechanics
  inside a cluster (Raft, leader election, replication, and placement)
- [Operate → Deployment](/learn/deployment): running these shapes in
  production on Kubernetes, with rolling upgrades and sizing
- [Core Concepts → Topologies](/concepts/topologies): the five-minute
  overview of the same four shapes
