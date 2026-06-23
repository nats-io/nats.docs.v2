---
id: placement
title: "4. Placement"
sidebar_position: 5
description: Constrain where a stream's replicas live using cluster and server tags, and understand preferred leader as a hint
---

# 4. Placement

By now the `ORDERS` stream runs `R=3` on the `east` cluster, and the meta
leader chose which three servers hold it. So far you haven't had a say in
that choice: the meta leader picked any three servers with room.

This page lets you control that choice. It constrains *where* a stream's replicas
land: onto a named cluster, or onto servers carrying labels you assign.
Two concepts do all the work, and nothing here changes the payload
`order-svc` publishes or the subjects it uses.

## Placement constrains which servers hold the replicas

**Placement** is a rule attached to a stream that limits which servers may
hold its replicas. Without it, the meta leader is free to put the three
copies of `ORDERS` on any servers in `east` that have capacity. With it,
the meta leader must honor your constraint or refuse to create the stream.

Placement has two levers. The first is the **cluster**: name a cluster and
every replica must live there. In a single cluster like `east` this is a
no-op, since there's only one cluster to choose. It's useful across
clusters, where a stream is pinned to one region; that cross-cluster case
is covered in [Super-clusters](/learn/topologies/super-clusters), not here.

The second lever is the one that matters inside `east`, namely **tags**.

## Tags label servers; placement matches them

A **tag** is a label you attach to a server in its configuration. The
server advertises its tags to the rest of the cluster, and placement uses
them to pick servers. A tag is freeform text: a region, a disk class, a
hardware tier, whatever distinction you want placement to respect.

You set tags with `server_tags` in each server's config. Give the three
production servers a region tag and a disk-class tag:

```conf
# n1-east.conf — tag this server for placement
server_name: n1-east
listen: "0.0.0.0:4222"

server_tags: ["region:us-east", "disk:ssd"]

cluster {
  name: east
  listen: "0.0.0.0:6222"
  routes: [
    "nats://127.0.0.1:6223"
    "nats://127.0.0.1:6224"
  ]
}

jetstream { store_dir: "/data/n1-east" }
```

Repeat the same `server_tags` line on `n2-east` and `n3-east`, keeping
their own `server_name`, ports, and `store_dir`. After a restart, confirm
a server actually carries the tags you expect:

```bash
nats --server nats://127.0.0.1:4222 server info
```

The output lists the server's tags. Read them back rather than assuming
the config took. A typo in `server_tags` is silent until a placement asks
for a tag no server advertises.

### Placing the stream on tagged servers

With the servers tagged, constrain `ORDERS` to land only on servers
carrying both `region:us-east` and `disk:ssd`. The CLI flag is `--tag`,
passed once per required tag; the client libraries set `Placement.Tags` to
a list. The example also names the cluster with `--cluster east`, a no-op
in a single cluster, shown so the syntax is familiar when you place across
clusters later:

<div class="nats-example" data-type="learn-clustering-placement-placeTags" data-languages="cli,js,go,python,java,rust,csharp"></div>

The meta leader now picks three servers that carry *both* tags. Read the
result in the `Cluster` block of `nats stream info ORDERS`: the leader and
the two other peers are all servers you tagged.

## Tag matching is an intersection

When placement lists more than one tag, a server qualifies only if it
carries *every* tag in the list. The match is an intersection, not a union:
`region:us-east` **and** `disk:ssd`, never either-or.

The match folds case: `disk:ssd`, `disk:SSD`, and `disk:Ssd` are the same
tag. Spelling, though, is exact, so `disk:sdd` matches nothing. The problem to
watch for is typos rather than case. Ask for a tag that no server carries (a misspelling,
or a tag you meant to add but didn't) and the intersection is empty. No
server qualifies, and the meta leader refuses the stream with:

```
nats: error: no suitable peers for placement
```

The same error appears if you ask for three replicas but only two servers
carry the required tags. Placement doesn't relax the constraint to fit the
replica count; it fails so you notice.

The full set of placement and server-tag options is documented in
[Reference](/reference/config/server_tags). We only need the cluster
constraint and the tag intersection here.

## Preferred leader is a hint for the initial leader

Placement decides which servers hold the replicas. A separate field decides
which of them starts as leader: the **preferred leader**.

The preferred leader is a hint passed at placement time, naming the server
you'd like to lead the new group. The meta leader honors it when it can,
most usefully during scale-up, when you're adding a stream and want its
leader on a specific server from the start. On a fresh group it shapes the
*initial* leader assignment, sparing you a stepdown to move leadership to
where you wanted it in the first place.

The field is `Placement.Preferred` (a server name) in the client libraries.
The CLI doesn't set it on `stream add`; you nudge leadership toward a
server after the fact with `nats stream cluster step-down --preferred
<server>`. Its full syntax lives in
[Reference](/reference/jetstream/api/stream). We only need to know it's a
hint here.

The word *hint* matters here. The preferred leader applies to the
initial placement only. Once the group is running, RAFT elections decide
leadership, as you saw on [Raft and leaders](/learn/clustering/raft-and-leaders).
If the preferred server later dies, the next election picks a leader from
the surviving quorum at random; it doesn't wait for your preferred server
to return. Use the preferred leader to shape the *start*, never to pin
leadership for the life of the stream.

## Pitfalls

Two mistakes are common the first time you place a stream. Both come from
treating placement as more forgiving than it is.

**Tags are an intersection; a missing tag fails the placement.** Asking for
a tag no server carries leaves the meta leader with nothing to pick: the
stream fails with `no suitable peers for placement` rather than falling back
to any server. Matching folds case, so `ssd` and `SSD` are the same tag, but
spelling is exact — `sdd` matches nothing. Don't guess at tag spelling.
Read the tags back from the servers first, then place against exactly what
they advertise.

Verify the tags exist before you trust a placement, and watch the placement
either succeed or name the missing tag:

<div class="nats-example" data-type="learn-clustering-placement-verifyTags" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Preferred leader is a hint that applies only to the initial leader.** Use it to shape the *initial*
leader of a fresh group. Don't build an operational assumption ("the
leader is always `n1-east`") on it; the moment that server dies, the next
election is quorum-based and random among the survivors. If you need
leadership somewhere specific *now*, move it explicitly with `nats stream
cluster step-down --preferred <server>` (see [Raft and
leaders](/learn/clustering/raft-and-leaders)), and re-check after any
failover.

## Where you are

The `ORDERS` stream is no longer placed on whichever servers the meta leader
chose freely. You tagged `n1-east`, `n2-east`, and `n3-east`, and constrained
the stream to servers carrying both `region:us-east` and `disk:ssd`. You
know the tag match is an intersection that folds case, that a missing or
misspelled tag yields `no suitable peers for placement`, and that the
preferred leader shapes only the first election.

The cluster is still three servers. Nothing on this page changed the peer
count.

## What's next

Changing the peer count is the next page. **Scaling and peer management**
grows the group by adding a fourth server, watches a new peer catch up
before it counts toward quorum, and removes a peer without ever losing the
majority that keeps `ORDERS` writable.

Continue to [5. Scaling and peer management](/learn/clustering/scaling-and-peers).

## See also

- [Reference → Server tags](/reference/config/server_tags) — every
  server-tag and placement option and its syntax.
- [Reference → Meta API](/reference/jetstream/api/meta) — how the meta
  leader assigns a placed stream to servers.
- [Super-clusters](/learn/topologies/super-clusters) — placing replicas
  across clusters for geo-affinity.
