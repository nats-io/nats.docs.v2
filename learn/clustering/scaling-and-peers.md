---
id: scaling-and-peers
title: "5. Scaling and peer management"
sidebar_position: 6
description: Add a peer with catchup, remove one safely, and keep quorum while you grow or shrink the ORDERS group
---

# 5. Scaling and peer management

The `ORDERS` stream runs at `R=3` on `n1-east`, `n2-east`, and
`n3-east`, placed where the [Placement](/learn/clustering/placement)
page pinned it. That peer set isn't frozen. You can grow it to move a
replica onto a new server, or shrink it to retire one, without taking
the stream down or losing the agreement the rest of this chapter built.

This page changes the membership of a RAFT group while it keeps serving.
A **peer** here is a RAFT-group member, as it has been since
[Raft and leaders](/learn/clustering/raft-and-leaders): one server's
role inside the `ORDERS` group. Growing or shrinking that set is **peer
management**, and it comes in two halves: **peer add** with catchup, and
**peer remove** with migration.

<div class="nats-flow" data-scenario="peerScalingAnimated" data-width="600" data-height="350"></div>

The animation shows both halves: a fourth server joins, streams the
entries it's missing, and only then counts toward quorum; later one
peer is removed and drops its RAFT subscriptions while the rest carry
on.

## Peer add: a new peer catches up before it counts

You add capacity to a group by adding a peer. When you grow the
`ORDERS` group onto a fourth server (call it `n4-east`), the leader
proposes the addition as a membership-change entry, replicates it to the
current quorum, and broadcasts the new peer set. `n4-east` is now a
member.

It isn't a useful one yet, because a brand-new peer holds none of the
stream's history. It can't vote on a write it's never seen, and it can't
answer a read for data it doesn't have.

So the new peer **catches up** first. Catchup is how a behind or new
peer streams the entries it's missing: the leader feeds it the log from
where it's short, the peer applies each entry into its stream store,
and its lag shrinks toward zero. Lag here is just a count: how many
entries behind the leader's log the peer still is. Until then, the new
peer is an observer, present in the set and replicating, but not yet
relied on for quorum.

This observer step is what makes a scale-up safe. Adding `n4-east`
to an `R=3` group doesn't put a half-empty replica in the voting path
the instant it joins. The group keeps committing on the peers that
already have the data while `n4-east` fills in behind them. Only once
its lag reaches zero does it carry the same weight as the others.

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
When `n4-east` reads `current` with no lag, it has the full stream and
counts toward quorum like any other peer.

## Peer remove: the group migrates to a smaller set

Shrinking is the reverse of growing. You **remove a peer** to retire a
server or to migrate a stream off it. The command names the stream and
the peer to drop:

```bash
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east
```

The leader proposes the removal, commits it to the remaining quorum, and
the dropped peer lets go of its RAFT subscriptions for the group. The
stream **migrates** to the new, smaller peer set. If the removed peer
held the lease as leader, the group runs an election first, so leadership
lands on a peer that stays.

One membership change happens at a time. While a peer add or remove is
committing, the group refuses a second one with a
`cluster member change is in progress` error. This is deliberate,
because two overlapping changes to who's in the voting set are a way for
a group to lose its quorum. Let one finish and confirm a leader before
you start the next.

That confirmation is the rule that keeps a shrink safe. After a
`peer-remove`, re-read the group and check three things before you touch
it again: the dropped peer is gone, a named leader is back, and the
remaining replicas report zero lag. Removing one peer from an `R=3`
group leaves two, and two is still a majority of the original three, so
the stream keeps a leader throughout. Removing a second before the first
settles is where it goes wrong, which the Pitfalls below make concrete.

The full set of peer-management and stream-assignment operations is
documented in [Reference](/reference/jetstream/api/meta). We only need
add, remove, and the verify step here.

## Pitfalls

Three mistakes are common the first time you resize a live group. All
three come from this page's two concepts: peer add with catchup, and
peer remove with migration.

**Removing two peers from an `R=3` group at once loses quorum.** An
`R=3` group needs a majority (two of three) to elect a leader and
commit a write. Drop one peer and two remain, which is still a quorum of
the three-member set. Drop a second before the first removal has settled
and only one peer is left, which can't form a majority of three: the
group goes leaderless and the stream stops committing. Don't batch
removals. Remove one peer, wait for a named leader and zero lag, then
remove the next.

The handling is the verify step itself. Remove exactly one, then read
the `Cluster` block back before going further:

<div class="nats-example" data-type="learn-clustering-scaling-and-peers-peerRemove" data-languages="cli,js,go,python,java,rust,csharp"></div>

If that second `stream info` shows `no leader`, stop. You've lost
quorum, and the fix is to restore a peer, not remove another.

**A freshly added peer isn't safe until its lag is zero.** When you add
`n4-east`, it joins the set immediately but holds none of the stream's
history. While it catches up it's an observer, not a full member of the
quorum. If you kill another server mid-catchup, you can drop below the
peers that actually hold the data and stall the group. Don't treat a
new peer as a working replica until `nats stream info` shows it
`current` with zero lag, which is when catchup is done.

**Do not remove the only remaining peer.** `peer-remove` doesn't warn
you when the peer you're dropping is the last copy of the stream's data.
Removing it destroys that replica. On an `R=3` group you have margin;
once a group has been shrunk to a single peer, a `peer-remove` of that
peer is a delete, not a migration. Know the current replica count from
`nats stream info` before you remove anything, and never remove the last
one expecting the data to survive.

## Where you are

You can now resize a live RAFT group without taking the stream down:

- You added `n4-east` to the `ORDERS` group, watched it catch up, and
  saw it count toward quorum only once its lag reached zero.
- You removed a peer with `nats stream cluster peer-remove`, let the
  stream migrate to the smaller set, and confirmed a leader was back
  before touching it again.
- You know one membership change runs at a time, and why removing two
  peers from `R=3` at once is the way to lose quorum.

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
