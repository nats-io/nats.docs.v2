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

To move a stream off a server, you **evacuate** the peer. This doesn't
shrink the stream: it moves the replica off the named server and onto
another server that qualifies, so `ORDERS` stays at its replica count. The
command names the stream and the peer to clear:

```bash
nats --server nats://127.0.0.1:4222 stream cluster evacuate ORDERS n4-east
```

The meta leader picks a replacement peer and records the new peer set, but
`n4-east` doesn't drop out at that point. It stays in the group, serving the
stream, while the replacement joins and catches up the same way a grown peer
does. Only once the replacement is caught up does the membership change that
drops `n4-east` commit. If the evacuated peer held leadership, the group
elects a new leader before it goes, so leadership lands on a peer that
stays.

If no other server qualifies — placement leaves nowhere to put the replica —
the request fails with `peer remap failed` and nothing moves. That refusal
is the point: the alternative would be dropping to two replicas on a stream
you asked to keep at three. Fix the placement, or add a server that
satisfies it, then evacuate again.

Consumers move with the stream. A consumer pinned to the same server can
also be moved on its own:

```bash
nats --server nats://127.0.0.1:4222 consumer cluster evacuate ORDERS NEW n4-east
```

To change the replica *count* — shrink `R=3` to `R=1`, say — edit the stream
instead: `nats stream edit ORDERS --replicas=1`. Evacuating moves a replica
between servers; `--replicas` sets how many replicas there are.

Re-read the group after an evacuation and expect a move in progress rather
than a finished one. Both peers are listed while it runs, with the
replacement behind on lag, and `nats` marks a peer that is joining or on its
way out `(pending)`.

<div class="nats-example" data-type="learn-clustering-scaling-and-peers-evacuate" data-languages="cli"></div>

The move is done when `n4-east` is gone from the `Replicas` list and
`stream info` stops printing the migration section it shows while a
reconfiguration is in flight. Don't wait on lag reaching zero instead: a
stream taking constant writes always has followers a little behind, because
a write commits once a quorum has it rather than once everyone does. If a
move looks stuck, that migration section carries a status line saying what
it's waiting on — the [next page](/learn/clustering/desired-state) reads it
properly.

Removing a server from the JetStream **meta** group is a different command,
`nats server cluster peer-remove`, and that one allows only one change at a
time: ask for a second while one is in flight and it answers
`cluster member change is in progress`. Let one finish before the next. It's
also for a different situation — a server that is gone and isn't coming
back. Evacuating is what you reach for while the server is still running.

Always stop the server before you peer-remove it. A running server that
gets peer-removed reacts by turning JetStream off on itself, so you take a
live node out of service instead of retiring a stopped one.

The full set of peer-management and stream-assignment operations is
documented in [Reference](/reference/jetstream/api/meta). We only need
grow, move, and the verify step here.

## Pitfalls

Two mistakes are common the first time you resize a live group. Both
come from this page's two concepts: growing a group with catchup, and
moving a replica off a server.

**Scaling up costs you failure headroom until the new peer catches up.**
Raising `ORDERS` from three replicas to four raises the quorum with it: a
four-peer group commits once three peers hold a write, where three peers
needed two. The new peer joins the group before it holds any of the
stream's history, so until it catches up it can't supply one of those three
acks — which leaves all three of the original peers having to. Lose one of
them mid-catchup and writes stall until the new peer is caught up. For that
window a four-replica stream tolerates fewer failures than the three-replica
one it grew from, which is the opposite of what raising the count suggests.
It closes when `nats stream info` shows the new peer `current`.

**`peer remap failed` means nothing moved, and that's the safe outcome.**
Evacuating a stream or a consumer refuses to proceed when no server
qualifies to take the replica — placement is too narrow, or the cluster is
too small — rather than completing the move and leaving the group a replica
short. Read the error as "fix the placement and try again", not as a failure
to work around with `--force`. The one command that behaves differently is
`nats server cluster evacuate`, which drains a whole server best-effort and
*will* leave an asset under-replicated if nothing qualifies; the
[next page](/learn/clustering/desired-state) covers that difference.

Evacuating also leaves the replica count alone. To go from `R=3` to `R=1`,
read the current count from `nats stream info` and edit it with
`nats stream edit --replicas`.

## Where you are

You can now resize a live RAFT group without taking the stream down:

- You grew the `ORDERS` group by raising `--replicas`, watched the new
  peer catch up, and learned not to lean on it until `stream info` shows
  it `current`.
- You moved a replica off a server with `nats stream cluster evacuate`,
  saw the meta leader re-place it to keep the replica count, and confirmed a
  leader was back before touching it again.
- You know that a refused evacuation (`peer remap failed`) has moved
  nothing, and that it is protecting the stream's replica count.

The `ORDERS` stream is back on `n1-east`, `n2-east`, and `n3-east`, the
same three peers it started on — but now you can grow or shrink that set
on purpose.

## What's next

You've changed the group one peer at a time and waited for each change to
land. From 2.15 the server records where a reconfiguration is heading and
converges on it for you, which is what makes draining a whole server a
single command — and what makes a move you started by mistake something you
can roll back.

Continue to [Desired state and evacuation](/learn/clustering/desired-state).

## See also

- [Raft and leaders](/learn/clustering/raft-and-leaders) — election and
  `leader-stepdown`, which an evacuation triggers when it moves the
  leader.
- [Desired state and evacuation](/learn/clustering/desired-state) — the
  2.15 model these operations run under, and the bulk evacuate command.
- [Reference → meta API](/reference/jetstream/api/meta) — the full set
  of peer-management and stream-assignment operations.
- [Backup & recovery](/learn/backup-recovery) — take a backup before a
  risky resize, so a lost replica is recoverable.
