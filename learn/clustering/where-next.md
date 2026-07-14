---
id: where-next
title: "Where to go next"
sidebar_position: 7
description: Recap the clustering mechanism and point to siblings, Reference, and a production checklist
---

# Where to go next

You started this chapter with nothing running, and by the end you have three
servers (`n1-east`, `n2-east`, `n3-east`) that found each other from a
single seed route, elected leaders for every RAFT group, and hold the
`ORDERS` stream at `R=3`. A write from `order-svc` now lands on the
leader, commits once a quorum has it, and survives one server dying.
That covers the full arc of the chapter.

This page collects the mechanism you built into one place and points you at
the chapters and Reference that take it further.

## The five core ideas

Every page in this chapter turned on the same five ideas.

**Routes** are the server-to-server connections that form the cluster. You
configure one explicit seed route, and gossip does the rest: each server
shares the peers it knows in its INFO, so one seed grows into a full mesh
without you listing every server.

**RAFT groups** are how the cluster agrees. There's one meta group across
the whole cluster plus one group per stream, and each group runs an
election to pick a single leader. The leader is the only member that
accepts writes; the followers replicate from it.

A **quorum** is a majority of a group's peers: for `R=3`, two of three.
The leader appends a write to its log and commits it the moment a quorum
has the entry. Quorum is what lets the group make progress while a
minority is down, and lose nothing when it returns.

**Placement** decides where the replicas live. You constrain a stream to a
cluster and to servers carrying matching tags, and the meta leader assigns
the peers from the servers that qualify.

**Peer management** grows or shrinks the set. You raise the replica count
and wait for the new peer's catchup to bring its lag to zero before you lean
on it; you move a replica off a server one change at a time so the group
never drops below a majority.

Those five ideas are routes, RAFT, quorum, placement, and peers. Everything
else in this chapter (terms, elections, append entries, apply, preferred
leader, migration) is a refinement of those five.

## Where the details live now

The chapter is unversioned and concept-first. The exact election timers,
the WAL format, the full `cluster {}` field list, and every
`StreamConfig` option live in **Reference**, which is versioned and
exhaustive. When you need the precise type of a config field or the wire
format of a route, that's where to look.

The [Reference root](/reference/) is the entry point. The handoff phrases
throughout this chapter ("the full set of options is documented in
Reference") all point into it. The pages you'll reach for most:

- [`cluster {}` config](/reference/config/cluster) and the
  [route protocol](/reference/protocols/route): every field behind
  forming a cluster
- [Stream API](/reference/jetstream/api/stream) and
  [server tags](/reference/config/server_tags): replicas and placement
- [`/jsz`](/reference/system/monitor/jsz) and
  [`/raftz`](/reference/system/monitor/raftz): the monitoring endpoints
  behind every cluster field you read with the CLI

## Sibling deep dives

This chapter is the mechanism beneath two others, so it depends on them and
they depend on it.

The [Topologies deep dive](/learn/topologies) covers the shapes:
when to run a single server, when to grow into a cluster, when to reach
for a super-cluster or leaf nodes. This chapter ran beneath its `east`
cluster; Topologies decides *what shape* to build, and this chapter
explains *how* the shape agrees and replicates once it's built.

The [JetStream deep dive](/learn/jetstream) created the `ORDERS` stream
this chapter replicated. Its page on
[surviving node loss](/learn/jetstream/surviving-node-loss) is the
one-page operator intro to `R=3`; this chapter went deeper, into the
election and the quorum commit that make "lose a node, keep serving"
actually work. For copies *across* clusters, JetStream's
[mirrors and sources](/learn/jetstream/mirrors-and-sources) page covers
the DR story this chapter leaves to it.

The [Deployment deep dive](/learn/deployment) covers running this on real
infrastructure: Kubernetes, rolling upgrades, and sizing the servers you
formed a cluster from here.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
operational protection: snapshotting a stream before a risky peer change,
and restoring it if a migration goes wrong.

## Where you are

This is the end of the chapter. The arc is complete, and this page adds
no new scenario state. The `east` cluster, its elected leaders, and the
`ORDERS` stream at `R=3` are still running in your session exactly as you
left them on the previous page. You can keep experimenting (kill a server
and watch a re-election, add a fifth peer, move placement) or tear it all
down with `nats stream rm ORDERS` and stop the three servers when you're
done.

You hold the core model: routes form the mesh, RAFT groups agree, a quorum
commits each write, placement decides where the replicas live, and peer
management grows the set without losing agreement. That model is the minimum
you need for operating any NATS cluster in production.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place: a last pass before you
trust a cluster with real orders. Each group links back to the page that
explains the why.

### Forming a cluster — see [Pitfalls](/learn/clustering/forming-a-cluster#pitfalls)

- [ ] Give every server the same `cluster.name`; a mismatch silently forms two clusters that look like one until a message fails to cross.
- [ ] Point `routes` at the route port (6222), not the client port (4222); aiming at the client listener never establishes the route.
- [ ] List two or three seed routes so the cluster still forms if one seed server is down at boot; gossip needs only one to reach, but only if that one is up.

### Raft and leaders — see [Pitfalls](/learn/clustering/raft-and-leaders#pitfalls)

- [ ] Treat a brief "no leader" window during failover as normal; the election timer is 4–9s, so let the client retry instead of failing the write.
- [ ] Use `nats stream cluster step-down` to move leadership off a server, not to pick its successor; the next election is still quorum-based, so read `nats stream info` to learn who won.
- [ ] Track the meta leader and a stream leader as different RAFT groups; check `nats server report jetstream` for one and `nats stream info ORDERS` for the other, because losing one is not losing the other.

### Replication and R=3 — see [Pitfalls](/learn/clustering/replication-and-r3#pitfalls)

- [ ] Run real orders at `R≥3`, never `R=1`; a single copy is gone with its server's disk, with no failover and no recovery.
- [ ] Read from the leader when you need read-after-write; a follower can lag, so a Direct Get from one returns data that's correct but not the newest.
- [ ] Read a `PubAck` as quorum held, not full replication; before deliberately taking a server down, verify each replica shows `current` in `nats stream info`.

### Placement — see [Pitfalls](/learn/clustering/placement#pitfalls)

- [ ] Read a server's tags back before placing against them; tags are an intersection and a missing one fails with `no suitable peers for placement` rather than falling back to any server.
- [ ] Spell tags exactly; matching folds case (`ssd` equals `SSD`) but `sdd` matches nothing.
- [ ] Remember placement can't name a leader — a `preferred` server in placement is rejected; to move leadership to a specific server use `nats stream cluster step-down --preferred` (NATS Server 2.11+), and treat it as a request the quorum election can still overrule.

### Scaling and peer management — see [Pitfalls](/learn/clustering/scaling-and-peers#pitfalls)

- [ ] Make one membership change at a time; stacking a second before the replacement is `current` can drop the peers holding the data below a majority and the stream stops committing. Make one change, wait for a named leader and a caught-up replacement, then the next.
- [ ] Wait for a freshly added peer to show `current` with zero lag before trusting it; while it catches up it can't win an election or serve a read, so don't kill another server mid-catchup.
- [ ] Change the replica count with `nats stream edit --replicas`, not by removing the last peer; the CLI blocks removing the only peer without `--force`, and even forced the server answers `peer remap failed` rather than move the data.

## See also

- [Reference](/reference/): every config field, flag, default, and error
  code behind this chapter, versioned and exhaustive
- [Topologies deep dive](/learn/topologies): the shapes this chapter runs
  beneath, including the `east` cluster it reuses
- [JetStream → surviving node loss](/learn/jetstream/surviving-node-loss):
  the one-page replica intro this chapter goes deeper than
