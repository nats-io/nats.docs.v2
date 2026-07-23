---
id: replication-and-r3
title: Replication and R=3
sidebar_position: 4
description: How a replicated stream commits a write by quorum, and the consistency you get from it
---

# Replication and R=3

The last page elected leaders, so the cluster now has a meta leader and,
once you create a stream, a leader for that stream's RAFT group. This
page uses those leaders: it follows a single order from
`order-svc` into the `ORDERS` stream and shows exactly when that write
becomes safe to lose a server over.

The [surviving node loss](/learn/jetstream/surviving-node-loss) page in
the JetStream chapter gave you the one-line version: `R=3` keeps three
copies, so the loss of one server costs nothing. This page explains the
mechanism behind that guarantee. It introduces two ideas: **quorum
commit**, how the leader turns one write into a committed entry across
the group, and the **consistency** you get back from it.

## R=3 means three peers in one RAFT group

A stream's replica count is the number of copies the cluster keeps.
`R=3` keeps three. Each copy lives on a different server, and the three
servers holding the copies form a single RAFT group, the same kind of
consensus group the last page elected a leader for.

You set the count when you create the stream. On the `east` cluster,
one flag turns the single-server `ORDERS` of the JetStream chapter into
a three-peer stream. (If you ran the election exercise on
[Raft and leaders](/learn/clustering/raft-and-leaders), `ORDERS` already
runs at `R=3`; restart any server you stopped there, and read this as the
create that stood it up.)

<div class="nats-example" data-type="learn-clustering-replication-and-r3-createR3" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

`--replicas=3` is the whole change. Starting from the JetStream chapter's
`R=1` stream instead, raise it in place with
`nats stream edit ORDERS --replicas=3`. The application code doesn't move:
`order-svc` publishes the same payload to the same subject whether the
stream is `R=1` or `R=3`.

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

What changes is underneath. The stream now has a **leader** (one of
the three peers — the meta leader picks which, and an election may have
moved it) and two **followers**. Every write goes through the leader. The
followers never take writes directly; they receive them from the leader.

Three is the minimum for production, and a stream
supports at most `R=5`. The reasoning for *which* odd count to choose
belongs to [surviving node loss](/learn/jetstream/surviving-node-loss).
Here we follow what one write does once the count is three.

## A write commits by quorum

When `order-svc` publishes `orders.created`, the message reaches the
stream leader, `n1-east`. The leader does not return success on storing
it locally; it runs a short sequence first.

The leader **appends** the write to its own log: an ordered,
append-only record of every operation the group has agreed on. Appending
is local and not yet durable across the group: only `n1-east` has the
entry so far.

The leader then sends an **append entry** to each follower: the
replication message that says "add this entry to your log at this
position." `n2-east` and `n3-east` receive it, write it to their own
logs, and reply with an ack.

The leader counts acks. A write is **committed** once a **quorum**,
a majority of the peers, holds the entry. For `R=3`, a quorum is two
of three. The leader is itself one of the two, so it needs just one
follower's ack to reach quorum. The instant the first follower acks,
the entry is committed.

Commit is the point at which durability is reached. A committed entry
survives the loss of any single server, because it already lives on a
majority. This is what makes the `PubAck` that `order-svc` receives a
real guarantee: the leader returns it only after the write commits, so
a `PubAck` means the order already survived the chance of a single-node
failure before you heard back.

The third peer isn't on the critical path. `n3-east` may ack a moment
later, or be briefly behind; the write committed without waiting for it.
That's the point of a quorum: the group makes progress as long as a
majority is reachable, even if not all peers are.

## Followers apply what the leader commits

Committing records that a quorum *has* the entry. It doesn't yet put
the order into each peer's copy of the stream. That last step is
**apply**: copying a committed entry from the log into the stream store,
where consumers can read it.

The leader tracks a **commit index**, the position up to which entries
are committed. It is included on the next append entry or heartbeat, so
followers learn "everything up to here is committed; apply it." Each
follower then applies those entries to its own stream store in the same
order the leader did.

Order is what the group guarantees here. Every peer applies the same
entries in the same sequence, so all three copies of `ORDERS` converge
on the identical message log. A follower can lag the leader by a few
entries, but it never reorders them and never skips one.

Here's one write from `order-svc` moving through that whole sequence
(publish, append entry, ack, commit at quorum, apply):

<div class="nats-flow" data-scenario="r3ReplicationAnimated" data-width="600" data-height="350"></div>

You'll find the full set of RAFT replication parameters (append-entry
batching, heartbeat intervals, log compaction) in
[Reference](/reference/system/monitor/raftz). All you need here is the
append → quorum → commit → apply shape.

## The consistency you get

Quorum commit gives a specific, nameable consistency, and you should
know its boundaries before you build on it.

Reads from the leader are read-after-write. The leader holds every
committed entry and assigns every sequence number, so once a `PubAck`
returns, a read from the leader sees that order. There's no window
where your own just-acked write is missing.

Reads from a follower can lag. A follower applies committed entries
slightly after the leader does, so a direct read from `n2-east` or
`n3-east` might not yet show the most recent order, even though that
order is already committed and safe. The data is correct but slightly
behind. For read-after-write, read from the leader.

This is the trade `R=3` makes on purpose. Rather than promising that
every copy is identical at every instant, it promises that every copy
*converges*, in order, and that a committed write survives one server
loss. When you need to confirm where the copies actually stand, the
`Cluster` block of `nats stream info` reports each replica's status and
how far behind it is, which is exactly the next section's first trap.

## Pitfalls

These are three common mistakes the first time you trust a replicated
stream. Each is scoped to this page's two ideas: how a write commits,
and the consistency it gives back.

**`R=1` has no copy.** A stream at `R=1` lives on exactly one server.
There's no second peer, so there's no quorum and nothing to commit
*to* beyond the one log. If that server's disk is lost, the order is
lost too, with no failover and no recovery. Only `R≥3` survives a node
loss.
Don't run real orders at `R=1`; the why-three reasoning is covered on
[surviving node loss](/learn/jetstream/surviving-node-loss).

**A follower may lag, so a follower read can be stale.** A committed
write is safe, but it reaches each follower's stream store slightly after
the leader applies it. A direct read aimed at a follower can therefore
return data that's correct but not the newest. Don't assume any peer
is current just because the write was acked. For read-after-write, read
from the leader; to confirm a copy is caught up, read its status before
you trust it.

Check the leader and each replica's lag before assuming all copies are
current:

<div class="nats-example" data-type="learn-clustering-replication-and-r3-inspectReplicas" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**A `PubAck` proves quorum, not full replication.** The leader returns
the `PubAck` the instant a quorum holds the entry: for `R=3`, the
leader plus one follower. The third peer may still be catching up at that
moment. That's correct and safe: the write already survives one node
loss. But don't read a `PubAck` as "all three copies are identical
right now." If you need every copy current (say, before deliberately
taking a server down), verify each replica shows `current` in
`nats stream info` first.

## Where you are

The `ORDERS` stream now runs `R=3` on the `east` cluster: a leader on one
of `n1-east`, `n2-east`, or `n3-east` and followers on the other two, all
carrying the same order log.

What changed is your model of a write:

- A write appends to the leader's log, replicates as an append entry
  to followers, and commits once a quorum holds it: two of three for
  `R=3`.
- Followers apply committed entries in order, so all three copies
  converge on the identical log.
- A `PubAck` means the order survived the loss of one server before you
  heard back.
- Read-after-write comes from the leader; follower reads may lag.

## What's next

The stream is replicated, but the cluster chose *where* its three copies
landed. The next page makes that choice yours: placement constrains a
stream's replicas to a cluster and to servers carrying matching tags,
and lets you ask a chosen server to take leadership.

Continue to [Placement](/learn/clustering/placement).

## See also

- [Surviving node loss](/learn/jetstream/surviving-node-loss) — the
  one-page operator intro to `R=3` and storage durability.
- [Reference → Stream Configuration](/reference/jetstream/api/stream) —
  the full `StreamConfig`, including every replica option.
- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — copying
  a stream's data on purpose, across clusters and for DR.
