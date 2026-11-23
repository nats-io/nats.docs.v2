---
id: resilient-cross-region-clusters
title: Resilient cross-region clusters
sidebar_position: 6
description: Stretch one cluster across three nearby data centers or cloud regions, treat each as an availability zone, and survive the loss of any one of them
---

# Resilient cross-region clusters

A **cross-region cluster**, also called a **stretch cluster**, is a single
NATS cluster whose servers run in more than one data center or cloud region.
All servers share one full mesh of routes, one JetStream meta group, and
synchronous stream replication.

We generally advise against spreading one cluster across regions. As
[Super-clusters](./super-clusters.md) explains, every server holds a route to
every other server, and the cluster expects those links to be fast and
reliable. For regions that are far apart, a super-cluster with one cluster
per region, and mirrors for the data you need in both, is the right shape.

In a narrow set of conditions, a stretch cluster does increase resilience.
This page describes those conditions, how to set one up, and what it costs.

## What a stretch cluster protects against

A cluster in one data center already survives the loss of a server. With its
servers in three data centers, it also survives the loss of a whole data
center, or a whole cloud provider's region, without any failover step:

- The meta group keeps a majority and its leader, so streams can still be
  created, edited, and moved.
- Every R3 stream keeps two of its three replicas and stays writable.
- Writes are replicated synchronously. A write the client saw acknowledged is
  on a majority of replicas, so the outage loses none of them. A mirror to a
  second site, by contrast, loses whatever lag it had when the site went down.
- Clients reconnect to a surviving server and carry on.

Compare that with [Disaster recovery](../backup-recovery/disaster-recovery.md),
where losing the `east` cluster means promoting a mirror by hand and
accepting its lag as data loss.

## Treat each data center as an availability zone

Design the cluster as if each data center or cloud region were an
availability zone of a single region:

- **Use three data centers.** A cluster survives the loss of a minority. With
  two data centers, one of them always holds the majority, and losing that one
  stops the meta group. With three, losing any one leaves a majority.
- **Run the same number of servers in each.** One server per data center is
  the smallest setup, three servers in total. With uneven counts, the data
  center with the most servers becomes the one you can't afford to lose.
- **Place one replica of each stream in each data center.** Tag every server
  with its data center and set `unique_tag`, as shown below.

## Network requirements

A stretch cluster only works on a network that behaves like a network inside
one data center. Every replicated write waits for a round trip to a replica
in another data center, and the RAFT groups use timeouts to detect failed
leaders.

**The network must be stable in normal operation.** Packet loss, link flaps,
or routing changes between data centers look to the cluster like failing
servers. The result is leader elections, stalled writes, and replicas that
fall behind and catch up over and over.

**Latency must be low.** Each acknowledged write includes at least one round
trip between data centers, so the round-trip time adds directly to publish
latency. A tested setup uses three data centers from different cloud
providers, close together in the same city, with round-trip times of about
1 ms between them.

**The cluster must be homogeneous.** The round-trip time between every pair of
data centers should be about the same. With uneven links, the servers behind
the slow link are always the last to acknowledge, fall behind, and lose
elections, and the cluster's behavior depends on which server happens to be
leader.

Measure the round-trip times between all pairs of hosts before you deploy,
and keep measuring them in production.

**Don't connect a single server over a high-latency link.** Adding one server
in a distant region to an otherwise local cluster isn't supported. It makes
the whole cluster unstable: that server slows down every RAFT group it's a
member of and triggers elections when the link degrades. To serve a distant
site, use a [leaf node](./leaf-nodes.md) or a separate cluster joined by a
gateway, and a mirror for the data it needs.

## Configure the cluster

The `east` cluster runs three servers, one in each data center: `n1-east` in
`dc1`, `n2-east` in `dc2`, and `n3-east` in `dc3`. Each server gets a tag
naming its data center, and the `jetstream` block sets `unique_tag` to the tag
prefix:

```
# n1-east.conf — the server in dc1
server_name: n1-east
server_tags: ["az:dc1"]

jetstream {
  store_dir: "/data/jetstream"
  # Never place two replicas of a stream on servers with the same az: tag.
  unique_tag: "az:"
}

cluster {
  name: east
  listen: 0.0.0.0:6222
  routes: [
    nats-route://n1-east.dc1.example.net:6222
    nats-route://n2-east.dc2.example.net:6222
    nats-route://n3-east.dc3.example.net:6222
  ]
}
```

`n2-east` and `n3-east` use the same config with their own `server_name` and
`az:dc2` and `az:dc3`. Set `unique_tag` the same way on every server.

With `unique_tag: "az:"`, the cluster places each replica of a stream on a
server with a different `az:` value. An R3 stream on `east` gets one replica
in each data center, without any placement in the stream config.

Two details of `unique_tag` matter:

- A server without a tag that starts with the prefix is never chosen for a
  replica. Tag every JetStream server.
- If a stream's placement explicitly asks for a tag with the prefix, for
  example `--tag az:dc1`, the uniqueness rule is off for that stream, and all
  its replicas go to that data center.

Tags and placement are covered in depth on
[Placement](../clustering/placement.md).

## Check the replica spread

Create the stream at R3 and read where the replicas landed:

```bash
nats stream add ORDERS --subjects "orders.>" --replicas 3 --defaults
nats stream info ORDERS
```

The cluster section of `stream info` lists the leader and the two other
replicas. Each should be a server in a different data center. Then check the
meta group:

```bash
nats --context sys server report jetstream
```

The meta group table should list all three servers as online and current.

## Costs

**Data egress.** Traffic between data centers or cloud providers is usually
billed. In a stretch cluster, every write to an R3 stream is sent from the
leader to the two other replicas, both in other data centers. Messages
between clients in different data centers, and the routes' own traffic, cross
the same links. Estimate this from your write volume before you commit to the
design.

**Publish latency.** Every acknowledged write waits for a replica in another
data center. Even at 1 ms between sites, that's higher than within one data
center.

**Less headroom during maintenance.** With one server per data center, taking
a server down for an upgrade leaves the cluster unable to survive the loss of
another data center until it's back. Plan maintenance with that in mind, or
run more servers per data center.

## Combine with other topologies

A stretch cluster can be one part of a larger system. It can be one cluster
of a [super-cluster](./super-clusters.md), take
[leaf node](./leaf-nodes.md) connections from edge sites, or hold mirrors of
streams from other clusters.

When you combine topologies, manage stream placement carefully. The
protection only applies to streams whose replicas are spread across the three
data centers:

- An R1 stream lives in one data center and is lost with it.
- A stream placed with a tag such as `az:dc1` has all its replicas in one
  data center.
- A stream placed in another cluster of the super-cluster isn't on the stretch
  cluster at all.

Decide per stream which ones need to survive a data center loss, give those
R3 without a data-center tag in their placement, and verify the spread with
`nats stream info`.

## Pitfalls

**Two data centers don't give you this protection.** One of them always holds
the majority. Use three.

**Uneven latency destabilizes the cluster.** A slower link between one pair
of data centers makes the servers behind it fall behind and lose elections.
Keep the round-trip times between all pairs about equal.

**A single distant server isn't supported.** It slows down every group it's
in and causes elections. Use a leaf node or a gateway instead.

**An untagged server never gets a replica.** With `unique_tag` set, a server
without an `az:` tag is skipped for placement, and a stream can fail with
`no suitable peers for placement`.

**Placement can undo the spread.** A placement tag with the unique prefix
turns the uniqueness rule off for that stream.

**Replication doesn't protect against mistakes.** A delete or a bad write
replicates to all three data centers. Keep
[snapshots](../backup-recovery/stream-backup-restore.md) as well.

## See also

- [Super-clusters](./super-clusters.md) — the usual shape for multiple
  regions, with one cluster per region joined by gateways.
- [Placement](../clustering/placement.md) — server tags and stream placement.
- [Replication and R3](../clustering/replication-and-r3.md) — how a replicated
  write commits, and `sync_interval` across availability zones.
- [Disaster recovery](../backup-recovery/disaster-recovery.md) — recovering
  when a whole cluster is lost.
- [Reference → jetstream](/reference/config/jetstream) — `unique_tag` and the
  other JetStream settings.
