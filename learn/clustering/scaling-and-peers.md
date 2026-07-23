---
id: scaling-and-peers
title: "Scaling and peer management"
sidebar_position: 6
description: Add a peer with catchup, remove one safely, and keep quorum while you grow or shrink the ORDERS group
---

# Scaling and peer management

The `ORDERS` stream runs at `R=3` on `n1-east`, `n2-east`, and
`n3-east`, placed where the [Placement](/learn/clustering/placement)
page pinned it. That peer set isn't frozen. You can grow it — raise the
replica count so a copy lands on another server — or move a replica off a
server to retire it, without taking the stream down or losing the agreement
the rest of this chapter built.

This page changes the membership of a RAFT group while it keeps serving.
A **peer** here is a RAFT-group member, as it has been since
[Raft and leaders](/learn/clustering/raft-and-leaders): one server's
role inside the `ORDERS` group. Growing or shrinking that set is **peer
management**, and it comes in two halves: **growing the group** so a new
peer catches up, and **moving a replica off** a server.

<div class="nats-flow" data-scenario="peerScalingAnimated" data-width="600" data-height="350"></div>

The animation shows both halves: a fourth server joins the group and
streams the entries it's missing until it's caught up; later a replica is
moved off a server, which drops its RAFT subscriptions while the rest carry
on.

## Growing the group: a new peer catches up

You grow a stream's group by raising its replica count. The fourth server
has to be a running member of `east` already, so start `n4-east` with the
same cluster config the
[first page](/learn/clustering/forming-a-cluster) used, and let it join the
mesh. Then raise `ORDERS` from three replicas to four:

```bash
nats --server nats://127.0.0.1:4222 stream edit ORDERS --replicas=4
```

You don't name the new server. The meta leader assigns the extra replica to
a server that qualifies under the stream's placement (the tags from the
[Placement](/learn/clustering/placement) page), records the new peer set in
its assignment log, and the `ORDERS` group picks it up. `n4-east` is now a
member.

It isn't a useful one yet, because a brand-new peer holds none of the
stream's history. So it **catches up** first. Catchup is how a new or behind
peer streams the entries it's missing: the leader feeds it the log from where
it's short, the peer applies each entry into its stream store, and its lag
shrinks toward zero. Lag here is just a count: how many entries behind the
leader's log the peer still is.

Adding the peer changes the quorum right away: an `R=4` group commits once
three peers hold a write, not two. What the new peer can't do while its log
is empty is win an election — it stays an observer until the leader's first
entries reach it, so it never campaigns on state it doesn't have. The
practical rule is simpler: don't lean on `n4-east` as a data-bearing replica
until `stream info` shows it `current`, because until then only the peers
that already hold the data can serve it.

You watch the catchup in the same place you read everything else about
the group, the `Cluster` block of `nats stream info`:

```bash
nats --server nats://127.0.0.1:4222 stream info ORDERS
```

The `Replicas` list now shows a fourth entry, and its lag counts down
as catchup proceeds:

```
Cluster Information:

                Name: east
              Leader: n1-east
             Replica: n2-east, current, seen 0.12s ago
             Replica: n3-east, current, seen 0.20s ago
             Replica: n4-east, outdated, seen 0.18s ago, 14,231 operations behind
```

`outdated` and the operations-behind count are catchup in progress.
When `n4-east` reads `current` with no lag, it holds the full stream and
pulls its weight as a replica like any other peer.

## Moving a replica off a server

To retire a server, or move a stream off one, you **remove a peer**. This
doesn't shrink the stream: it evicts the replica from the named server, and
the meta leader re-places it on another server that qualifies, so `ORDERS`
stays at its replica count. The command names the stream and the peer to
drop:

```bash
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east
```

The meta leader picks a replacement peer, updates the stream's assignment,
and the evicted server lets go of its RAFT subscriptions for the group. The
replacement then catches up the same way a grown peer does. If the evicted
peer held leadership, the group elects a new leader first, so leadership
lands on a peer that stays. If no other server qualifies — placement leaves
nowhere to put the replica — an R>1 stream still loses the peer: the server
evicts it and returns `peer remap failed`, leaving the group a replica
short. Only a single-replica stream is spared, since removing its last peer
would brick it (the pitfall below covers that case).

To change the replica *count* — shrink `R=3` to `R=1`, say — edit the stream
instead: `nats stream edit ORDERS --replicas=1`. `peer-remove` moves a
replica between servers; `--replicas` sets how many replicas there are.

Removing a server from the JetStream **meta** group is a different command,
`nats server cluster peer-remove`, and that one allows only one change at a
time: ask for a second while one is in flight and it answers
`cluster member change is in progress`. Let one finish before the next.

After any `peer-remove`, re-read the group before you touch it again: the
evicted peer is gone, its replacement is catching up, and a named leader is
in place. The `Cluster` block of `nats stream info` shows all three.

The full set of peer-management and stream-assignment operations is
documented in [Reference](/reference/jetstream/api/meta). We only need
grow, move, and the verify step here.

## Pitfalls

Three mistakes are common the first time you resize a live group. All
three come from this page's two concepts: growing a group with catchup, and
moving a replica off a server.

**Don't stack membership changes before the replacement catches up.** A
`peer-remove` evicts a healthy replica and its replacement starts empty, so
for a while only the peers that already held the data can serve it. Fire a
second change — another `peer-remove`, or a `--replicas` edit — before that
replacement is `current`, and you can drop the number of peers holding the
data below the majority the group needs, and it stops committing. Make one
change, wait for a named leader and a caught-up replacement, then the next.

The handling is the verify step itself. Make exactly one change, then read
the `Cluster` block back before going further:

<div class="nats-example" data-type="learn-clustering-scaling-and-peers-peerRemove" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

If that second `stream info` shows `no leader`, stop. You've lost
quorum, and the fix is to restore a peer, not make another change.

**A freshly added peer isn't safe until its lag is zero.** When you raise
the replica count, the new peer joins the set immediately but holds none of
the stream's history. It can't win an election and can't serve a read while
it catches up. Kill another server mid-catchup and you can drop below the
peers that actually hold the data and stall the group. Don't treat a new
peer as a working replica until `nats stream info` shows it `current` with
zero lag, which is when catchup is done.

**Removing the only peer needs `--force`, and forcing it doesn't move the
data.** The CLI refuses to `peer-remove` the last peer of a stream without
`--force` (`removing the only peer on a stream will result in data loss`).
Even forced, there's nowhere to re-place the replica, so the server refuses
to drop it and answers `peer remap failed` rather than brick the stream. The
danger to avoid is forcing the removal in the belief the data will follow —
it won't. Know the current replica count from `nats stream info` first, and
change the count with `nats stream edit --replicas` rather than by removing
the last peer.

## Where you are

You can now resize a live RAFT group without taking the stream down:

- You grew the `ORDERS` group by raising `--replicas`, watched the new
  peer catch up, and learned not to lean on it until `stream info` shows
  it `current`.
- You moved a replica off a server with `nats stream cluster peer-remove`,
  saw the meta leader re-place it to keep the replica count, and confirmed a
  leader was back before touching it again.
- You know to make one membership change at a time, and why stacking a
  second before the replacement catches up is the way to lose quorum.

The `ORDERS` stream is back on `n1-east`, `n2-east`, and `n3-east`, the
same three peers it started on — but now you can grow or shrink that set
on purpose.

## What's next

You've walked the whole mechanism: routes form the mesh, RAFT groups
agree, a quorum commits each write, placement decides where replicas
live, and peer management grows the set safely. The last page collects
the recap, points to where the exhaustive detail lives, and gathers
every page's Pitfalls into one production checklist.

Continue to [Where to go next](/learn/clustering/where-next).

## See also

- [Raft and leaders](/learn/clustering/raft-and-leaders) — election and
  `leader-stepdown`, which a `peer-remove` triggers when it drops the
  leader.
- [Reference → meta API](/reference/jetstream/api/meta) — the full set
  of peer-management and stream-assignment operations.
- [Backup & recovery](/learn/backup-recovery) — take a backup before a
  risky resize, so a lost replica is recoverable.
