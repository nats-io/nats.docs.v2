---
id: where-next
title: "6. Where to go next"
sidebar_position: 7
description: Recap the clustering mechanism and point to siblings, Reference, and a production checklist
---

# 6. Where to go next

You started this chapter with nothing running. You end it with three
servers — `n1-east`, `n2-east`, `n3-east` — that found each other from a
single seed route, elected leaders for every RAFT group, and hold the
`ORDERS` stream at `R=3`. A write from `order-svc` now lands on the
leader, commits once a quorum has it, and survives one server dying. That
is the whole arc.

This page does not teach anything new. It collects the mechanism you
built into one place and points you at the chapters and Reference that
take it further.

## The whole game in five words

Every page in this chapter turned on the same five ideas. If you remember
nothing else, remember these.

**Routes** are the server-to-server connections that form the cluster. You
configure one explicit seed route, and gossip does the rest: each server
shares the peers it knows in its INFO, so one seed grows into a full mesh
without you listing every server.

**RAFT groups** are how the cluster agrees. There is one meta group across
the whole cluster plus one group per stream, and each group runs an
election to pick a single leader. The leader is the only member that
accepts writes; the followers replicate from it.

A **quorum** is a majority of a group's peers — for `R=3`, two of three.
The leader appends a write to its log and commits it the moment a quorum
has the entry. Quorum is what lets the group make progress while a
minority is down, and lose nothing when it returns.

**Placement** decides where the replicas live. You constrain a stream to a
cluster and to servers carrying matching tags, and the meta leader assigns
the peers from the servers that qualify.

**Peer management** grows or shrinks the set. You add a peer and wait for
its catchup to bring lag to zero before it counts toward quorum; you
remove a peer one at a time so the group never drops below a majority.

Routes, RAFT, quorum, placement, peers. Everything else in this chapter —
terms, elections, append entries, apply, preferred leader, migration — is
a refinement of those five.

## Where the details live now

The chapter is unversioned and concept-first. The exact election timers,
the WAL format, the full `cluster {}` field list, and every
`StreamConfig` option live in **Reference**, which is versioned and
exhaustive. When you need the precise type of a config field or the wire
format of a route, that is where to look.

The [Reference root](/reference/) is the entry point. The handoff phrases
throughout this chapter — "the full set of options is documented in
Reference" — all point into it. The pages you will reach for most:

- [`cluster {}` config](/reference/config/cluster) and the
  [route protocol](/reference/protocols/route) — every field behind
  forming a cluster.
- [Stream API](/reference/jetstream/api/stream) and
  [server tags](/reference/config/server_tags) — replicas and placement.
- [`/jsz`](/reference/system/monitor/jsz) and
  [`/raftz`](/reference/system/monitor/raftz) — the monitoring endpoints
  behind every cluster field you read with the CLI.

## Sibling deep dives

This chapter is the mechanism beneath two others, so it leans on them and
they lean on it.

The [Topologies deep dive](/learn/topologies) is where the shapes live:
when to run a single server, when to grow into a cluster, when to reach
for a super-cluster or leaf nodes. This chapter ran beneath its `east`
cluster; Topologies decides *what shape* to build, and this chapter
explains *how* the shape agrees and replicates once it is built.

The [JetStream deep dive](/learn/jetstream) created the `ORDERS` stream
this chapter replicated. Its page on
[surviving node loss](/learn/jetstream/surviving-node-loss) is the
one-page operator intro to `R=3`; this chapter went deeper, into the
election and the quorum commit that make "lose a node, keep serving"
actually work. For copies *across* clusters, JetStream's
[mirrors and sources](/learn/jetstream/mirrors-and-sources) page covers
the DR story this chapter leaves to it.

The [Deployment deep dive](/learn/deployment) covers running this on real
infrastructure — Kubernetes, rolling upgrades, and sizing the servers you
formed a cluster from here.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
operational safety net: snapshotting a stream before a risky peer change,
and restoring it if a migration goes wrong.

## Where you are

This is the end of the chapter — the whole arc is complete, and no new
scenario state is introduced here. The `east` cluster, its elected
leaders, and the `ORDERS` stream at `R=3` are still running in your
session exactly as you left them on the previous page. You can keep
experimenting — kill a server and watch a re-election, add a fifth peer,
move placement — or tear it all down with `nats stream rm ORDERS` and
stop the three servers when you are done.

You hold the core model: routes form the mesh, RAFT groups agree, a quorum
commits each write, placement decides where the replicas live, and peer
management grows the set without losing agreement. That model is the floor
for operating any NATS cluster in production.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place — a last pass before you
trust a cluster with real orders. Each group links back to the page that
explains the why.

### Forming a cluster — see [Pitfalls](/learn/clustering/forming-a-cluster#pitfalls)

- [ ] Give every server the same `cluster.name`; a mismatch silently forms two clusters that never merge.
- [ ] Point `routes` at the route port (6222), not the client port (4222); aiming at the client port fails to form the mesh.
- [ ] List two or three seed routes so the cluster still forms if one seed server is down at boot; gossip needs only one to reach, but only if that one is up.

### Raft and leaders — see [Pitfalls](/learn/clustering/raft-and-leaders#pitfalls)

- [ ] Treat a brief "no leader" window during failover as normal; an election takes seconds (the timer is 4–9s), not milliseconds.
- [ ] Use `nats stream cluster step-down` to move leadership, not to choose a successor; the next election is still quorum-based and the winner is not yours to pick.
- [ ] Track the meta leader and a stream leader as different groups; losing one is not losing the other.

### Replication and R=3 — see [Pitfalls](/learn/clustering/replication-and-r3#pitfalls)

- [ ] Run at `R≥3` for anything you cannot lose; `R=1` has no copy, so a write is gone with its server.
- [ ] Read from the leader when you need read-after-write; a replica may lag, so a Direct Get from a follower can return stale data.
- [ ] Read a `PubAck` as quorum held, not full replication; before deliberately taking a server down, verify each replica shows `current` in `nats stream info`.

### Placement — see [Pitfalls](/learn/clustering/placement#pitfalls)

- [ ] Match tags exactly; tags are an intersection and case-sensitive — `ssd` ≠ `SSD`, and asking for a tag no server carries leaves the stream with "no suitable peers".
- [ ] Treat `preferred` as a hint, not a lock; if the preferred server dies, the next election is random among the remaining quorum.
- [ ] Verify server tags with `nats server info` before placing a stream on them.

### Scaling and peer management — see [Pitfalls](/learn/clustering/scaling-and-peers#pitfalls)

- [ ] Remove peers one at a time; pulling two from an `R=3` group at once loses quorum and the stream goes leaderless. Remove one, wait for a leader, then the next.
- [ ] Wait for a freshly added peer's lag to reach zero before trusting it; do not kill the cluster mid-catchup.
- [ ] Never remove the only remaining peer without understanding it destroys the replica.

## See also

- [Reference](/reference/) — every config field, flag, default, and error
  code behind this chapter, versioned and exhaustive.
- [Topologies deep dive](/learn/topologies) — the shapes this chapter runs
  beneath, including the `east` cluster it reuses.
- [JetStream → surviving node loss](/learn/jetstream/surviving-node-loss)
  — the one-page replica intro this chapter goes deeper than.
