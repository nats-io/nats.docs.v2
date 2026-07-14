---
id: index
title: Clustering & Replication Deep Dive
sidebar_position: 1
description: How a NATS cluster agrees and replicates — routes, RAFT, quorum commits, placement, and peers
---

# Clustering & Replication Deep Dive

A NATS cluster involves more than three servers wired together. Beneath
that wiring is a mechanism by which the servers find each other, elect
leaders, agree on every write, and keep replicas in step. This chapter
covers that mechanism, taught one layer at a time the way you'd learn it
by running a real cluster and watching it work.

The [Topologies](/learn/topologies) chapter stood up the shapes (one
server growing into the `east` cluster, then a super-cluster, then leaf
nodes) and deliberately left the internals for here. The
[JetStream](/learn/jetstream) chapter gave you one page on
[surviving node loss](/learn/jetstream/surviving-node-loss): set `R=3`,
lose a server, keep serving. This chapter explains how both of those
work. We go beneath the shapes to the agreement and replication that make
them work.

## By the end you'll have

- A live three-server cluster (`n1-east`, `n2-east`, `n3-east`, the same
  `east` cluster from Topologies) that discovered itself from a single
  seed route.
- The `ORDERS` stream running at `R=3`, with a write you can trace from
  `order-svc` publishing `orders.created`, through the leader's log, to a
  quorum commit that survives one server dying.
- A working mental model of the five moving parts: **routes** form the
  mesh, **RAFT groups** agree, a **quorum** commits each write,
  **placement** decides where replicas live, and **peer management**
  grows or shrinks the set safely.
- The commands to inspect all of it (leaders, replicas, lag) and the
  failure modes to watch for when you operate it for real.

## Who this is for

You've read the [Core Concepts](/concepts/what-is-nats) primers and,
ideally, the [JetStream](/learn/jetstream) and
[Topologies](/learn/topologies) deep dives. You know what a stream, a
consumer, a route, and a cluster are. This chapter doesn't re-teach
them.

You don't need to know anything about consensus or replication
specifically. We start from "what is a route and how does one server
find another" and build up to placement and peer management from there.

## How to read it

Each page introduces at most two new concepts and carries the cluster
forward. You stand up `n1-east`, `n2-east`, and `n3-east` on the first
page and keep them running: later pages elect a leader on that same
cluster, replicate a write to it, place the stream on tagged servers,
and add or remove a peer. The server names, the `ORDERS` stream, and the
payload never change.

The vocabulary here is dense: leader, follower, term, quorum, commit,
apply. Every term is defined before it's used, so read the pages in
order rather than jumping. Where a feature has a long list of knobs or
timer values, the page teaches only what you need to understand the
mechanism and links to [Reference](/reference/) for the rest.

This chapter is replication *within one cluster*. Replication *across*
clusters (gateways, geo-affinity, super-cluster traffic) stays in
[Super-clusters](/learn/topologies/super-clusters).

## Map

| Page | What you learn |
|---|---|
| [Forming a cluster](/learn/clustering/forming-a-cluster) | Routes (explicit seed vs implicit gossip) and how one seed grows into a full mesh |
| [Raft and leaders](/learn/clustering/raft-and-leaders) | RAFT groups, the meta leader and stream leaders, and how an election picks one |
| [Replication and R=3](/learn/clustering/replication-and-r3) | How a quorum commits a write, then followers apply it, and the consistency you get |
| [Placement](/learn/clustering/placement) | Constrain replicas to a cluster and tagged servers, and move a stream's leader to a chosen server |
| [Scaling and peer management](/learn/clustering/scaling-and-peers) | Grow the group with catchup, move a replica off a server safely, and never lose quorum doing it |
| [Where to go next](/learn/clustering/where-next) | A recap of the whole mechanism and a production checklist |

In summary, servers form a mesh, elect leaders, replicate
every write, place the replicas where you want them, and let you scale
the peer set without losing agreement.

## Prerequisites

You'll need:

- Three local `nats-server` processes with JetStream enabled, which the
  first page stands up as the `east` cluster. A single server isn't
  enough here: RAFT needs a majority, so the mechanism only appears once
  three servers are talking.
- The `nats` CLI installed. Most of this chapter is server config and
  `nats` operator commands; a few stream operations also show the
  JavaScript, Go, Python, Java, Rust, and C# client form, since every
  client sets the same replica count and placement.
- A system account (`$SYS`) to run the `nats server` operator commands
  against. These configs don't set one up; add a system user (the
  [Security deep dive](/learn/security) covers it) and connect with its
  credentials before the first `nats server list`, `info`, or `report`.

Open a terminal and turn to
[Forming a cluster](/learn/clustering/forming-a-cluster).

## See also

- [Topologies deep dive](/learn/topologies) — the shapes this chapter
  runs beneath, including the `east` cluster it reuses.
- [JetStream → surviving node loss](/learn/jetstream/surviving-node-loss)
  — the one-page replica intro this chapter goes deeper than.
- [Reference](/reference/) — the exhaustive config, protocol, and
  monitoring detail behind every mechanism here.
