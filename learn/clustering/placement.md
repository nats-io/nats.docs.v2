---
id: placement
title: "Placement"
sidebar_position: 5
description: Constrain where a stream's replicas live using cluster and server tags, and understand preferred leader as a hint
---

# Placement

By now the `ORDERS` stream runs `R=3` on the `east` cluster, and the meta
leader chose which three servers hold it. So far you haven't had a say in
that choice: the meta leader picked any three servers with room.

This page lets you control that choice. It constrains *where* a stream's replicas
land: onto a named cluster, or onto servers carrying tags you assign.
Two concepts do all the work, and nothing here changes the payload
`order-svc` publishes or the subjects it uses.

## Placement constrains which servers hold the replicas

**Placement** is a rule attached to a stream that limits which servers may
hold its replicas. Without it, the meta leader is free to put the three
copies of `ORDERS` on any servers in `east` that have capacity. With it,
the meta leader must honor your constraint or refuse the placement.

Placement has two levers. The first is the **cluster**: name a cluster and
every replica must live there. In a single cluster like `east` this is a
no-op, since there's only one cluster to choose. It's useful across
clusters, where a stream is constrained to one region; that cross-cluster case
is covered in [Super-clusters](/learn/topologies/super-clusters), not here.

The second lever is the one that matters inside `east`, namely **tags**.

## Tags mark servers; placement matches them

A **tag** is a piece of freeform text you attach to a server in its
configuration. The server advertises its tags to the rest of the cluster,
and placement uses them to pick servers. Use tags for whatever
distinction you want placement to respect: a region, a disk class, a
hardware tier.

You set tags with `server_tags` in each server's config. The config is the
one [Forming a cluster](/learn/clustering/forming-a-cluster) wrote, plus
one line. Give the three servers a region tag and a disk-class tag:

```conf title="n1-east.conf"
server_name: n1-east
listen: 127.0.0.1:4222

server_tags: ["region:us-east", "disk:ssd"]

jetstream {
  store_dir: "./js/n1-east"
}

accounts { SYS: { users: [ { user: sys, password: sys } ] } }
system_account: SYS

cluster {
  name: east
  listen: 127.0.0.1:6222
  routes: [
    nats://127.0.0.1:6223
  ]
}
```

Repeat the same `server_tags` line on `n2-east` and `n3-east`, keeping
their own `server_name`, ports, and `store_dir`. Restart the servers, then
confirm each one actually carries the tags you expect. Name the server you
ask about: without a name, `nats server info` answers with whichever
server responds first, not necessarily the one you connected to.

```bash
nats server info n1-east --user sys --password sys
```

The tags appear in the reply's `Cluster` section (trimmed):

```
Cluster:

                             Name: east
                             Tags: region:us-east, disk:ssd
                             Host: 127.0.0.1:6222
                             URLs: 127.0.0.1:6223
```

Repeat for `n2-east` and `n3-east`. Read the tags back rather than
assuming the config took. A typo in `server_tags` is silent until a
placement asks for a tag no server advertises.

### Placing the stream on tagged servers

With the servers tagged, constrain `ORDERS` to land only on servers
carrying both `region:us-east` and `disk:ssd`. `ORDERS` already exists, so
the command is `nats stream edit`. The flag is `--tag`, passed once per
required tag; the client libraries set `Placement.Tags` to a list. The
example also names the cluster with `--cluster east`, a no-op in a single
cluster, shown so the syntax is familiar when you place across clusters
later:

<div class="nats-example" data-type="learn-clustering-placement-placeTags" data-languages="cli"></div>

The CLI shows the config change it's about to apply, then confirms it
(trimmed):

```
Differences (-old +new):
  api.StreamConfig{
  	... // 13 identical fields
- 	Placement:  nil,
+ 	Placement:  &api.Placement{Cluster: "east", Tags: []string{"region:us-east", "disk:ssd"}},
  }
Stream ORDERS was updated

Information for Stream ORDERS created 2026-07-07 13:22:14

                     Subjects: orders.>
                     Replicas: 3
                      Storage: File
            Placement Cluster: east
               Placement Tags: region:us-east, disk:ssd
```

The meta leader now picks three servers that carry *both* tags. Read the
result in the `Cluster Information` block of `nats stream info ORDERS`:

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n3-east (35.34s)
                      Replica: n1-east, current, seen 341ms ago
                      Replica: n2-east, current, seen 342ms ago
```

The leader and the two other peers are all servers you tagged.

## Tag matching is an intersection

When placement lists more than one tag, a server qualifies only if it
carries *every* tag in the list. The match is an intersection, not a union:
`region:us-east` **and** `disk:ssd`, never either-or.

The match folds case: `disk:ssd`, `disk:SSD`, and `disk:Ssd` are the same
tag. Spelling, though, is exact, so `disk:sdd` matches nothing. The problem to
watch for is typos rather than case. Ask for a tag that no server carries (a misspelling,
or a tag you meant to add but didn't) and the intersection is empty. No
server qualifies, and the meta leader refuses the placement. The error
names the tags it couldn't satisfy:

```
nats: error: could not edit Stream ORDERS: no suitable peers for placement, tags not matched ['disk:sdd'] (10005)
```

The stream keeps its previous config; a refused edit changes nothing.

The same `tags not matched` error appears if you ask for three replicas
but the tags are carried by fewer than three servers, even though the tags
did match some of them. Placement doesn't relax the constraint to fit the
replica count; it fails so you notice.

The full set of placement and server-tag options is documented in
[Reference](/reference/config/server_tags). We only need the cluster
constraint and the tag intersection here.

## Spread replicas across zones with unique_tag

Placement tags say where replicas *may* go. They don't say the replicas
must be apart. All three tagged servers could sit in the same rack, and
`R=3` on one rack is one power failure away from losing quorum. The knob
that forces replicas apart is `unique_tag`, a detail of placement set on
the server rather than on the stream.

`unique_tag` goes in each server's `jetstream` block and names a tag
*prefix*. When the meta leader places any stream, no two replicas may land
on servers whose tag values under that prefix are equal. Tag each server
with its availability zone and require distinct zones:

```conf title="n1-east.conf (tags and jetstream block only)"
server_tags: ["region:us-east", "disk:ssd", "az:1"]

jetstream {
  store_dir: "./js/n1-east"
  unique_tag: "az:"
}
```

Give `n2-east` the tag `az:2` and `n3-east` the tag `az:3`, add the same
`unique_tag` line to all three, and restart. The setting shows up in
`nats server info n1-east` (trimmed to the two relevant lines):

```
                       Unique Tag: az:
                             Tags: region:us-east, disk:ssd, az:1
```

With three servers in three zones, `ORDERS` still fits: each replica lands
in a distinct `az:` value. The restart forced a fresh election, so the
leader moved:

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n1-east (1.83s)
                      Replica: n2-east, current, seen 824ms ago
                      Replica: n3-east, current, seen 824ms ago
```

Now break the assumption. Move `n3-east` into `az:2`, so the cluster spans
only two distinct zones, and try to create any `R=3` stream (here a
throwaway `AUDIT` stream on `audit.>`):

```
nats: error: could not create Stream: no suitable peers for placement, server tag not unique (10005)
```

Three replicas can't occupy two zones at one-per-zone, so the placement
fails outright. A two-replica stream in the same state works, and the two
peers it gets are always in different zones:

```
                     Replicas: 2
                Cluster Group: S-R2F-7wJU0qw0
                       Leader: n1-east (90µs)
                      Replica: n3-east, current, seen 106µs ago
```

`n1-east` is in `az:1` and `n3-east` in `az:2`. The meta leader never
pairs the two `az:2` servers, because their `az:` values collide. Restore
`n3-east` to `az:3` before moving on, so the cluster spans three zones
again. The full syntax is documented in
[Reference](/reference/config/jetstream/unique_tag). We only need the
rule here: one replica per distinct value of the prefix, or the placement
fails.

## Preferred leader is a hint for the initial leader

Placement decides which servers hold the replicas. A separate field decides
which of them starts as leader: the **preferred leader**.

The preferred leader is a hint naming the server you'd like to lead the
group. The meta leader honors it when it can. The field is
`Placement.Preferred` (a server name) in the client libraries; the CLI
doesn't set it on `stream add`. Where you meet it in practice is the
step-down command, which passes it with the `--preferred` flag:

```bash
nats stream cluster step-down ORDERS --preferred n2-east
```

```
13:27:19 Requesting leader step down of "n1-east" for stream "ORDERS" in a 3 peer cluster group
13:27:19 New leader elected "n2-east"
```

The requested server won the election, so leadership is now where you
asked. Its full syntax lives in
[Reference](/reference/jetstream/api/stream). We only need to know it's a
hint here.

The word *hint* matters. Once the group is running, RAFT elections decide
leadership, as you saw on [Raft and leaders](/learn/clustering/raft-and-leaders).
If the preferred server later dies, the next election picks a leader from
the surviving quorum at random; it doesn't wait for your preferred server
to return. Use the preferred leader to shape a moment, never to hold
leadership in one place for the life of the stream.

## Pitfalls

Three mistakes are common the first time you place a stream. All come from
treating placement as more forgiving than it is.

**Tags are an intersection; a tag matched by too few servers fails the
placement.** Asking for a tag no server carries leaves the meta leader
with nothing to pick: the placement fails with `no suitable peers for
placement, tags not matched ['disk:sdd']` rather than falling back to any
server. The same error appears when the tags match some servers but fewer
than the replica count needs. Matching folds case, so `ssd` and `SSD` are
the same tag, but spelling is exact and `sdd` matches nothing. Don't guess
at tag spelling. Read the tags back from the servers first, then place
against exactly what they advertise:

<div class="nats-example" data-type="learn-clustering-placement-verifyTags" data-languages="cli"></div>

**`unique_tag` applies to every placement and fails the ones it can't
spread.** It's a server setting, not a stream setting, so once it's in the
`jetstream` block it constrains every stream anyone creates. If the
cluster has fewer distinct values under the prefix than a stream has
replicas, that stream fails with `no suitable peers for placement, server
tag not unique`. Don't set `unique_tag` on a cluster whose zone spread
can't cover your largest replica count, and re-check after you retag or
remove servers.

**Preferred leader is a hint, not a lock.** Use it to put leadership
somewhere specific now, with `nats stream cluster step-down --preferred
<server>` (see [Raft and leaders](/learn/clustering/raft-and-leaders)).
Don't build an operational assumption ("the leader is always `n2-east`")
on it; the moment that server dies, the next election is quorum-based and
random among the survivors. Re-check leadership after any election.

## Where you are

The `ORDERS` stream is no longer placed on whichever servers the meta leader
chose freely. You tagged `n1-east`, `n2-east`, and `n3-east`, and constrained
the stream to servers carrying both `region:us-east` and `disk:ssd`. You
put each server in its own zone (`az:1`, `az:2`, `az:3`) and set
`unique_tag: "az:"`, so every placement keeps replicas in distinct zones.
You know the tag match is an intersection that folds case, that a missing
or under-matched tag fails with `tags not matched`, and that the preferred
leader is a hint the next election is free to ignore.

The cluster is still three servers. Nothing on this page changed the peer
count.

## What's next

Changing the peer count is the next page. **Scaling and peer management**
grows the group by adding a fourth server, watches a new peer catch up
before it counts toward quorum, and removes a peer without ever losing the
majority that keeps `ORDERS` writable.

Continue to [Scaling and peer management](/learn/clustering/scaling-and-peers).

## See also

- [Reference → Server tags](/reference/config/server_tags) — every
  server-tag and placement option and its syntax.
- [Reference → Meta API](/reference/jetstream/api/meta) — how the meta
  leader assigns a placed stream to servers.
- [Super-clusters](/learn/topologies/super-clusters) — placing replicas
  across clusters for geo-affinity.
