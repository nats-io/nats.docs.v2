---
id: raft-and-leaders
title: "Raft and leaders"
sidebar_position: 3
description: How a NATS cluster reaches agreement — RAFT groups, leaders and followers, and the election that picks a leader on a quorum of votes
---

# Raft and leaders

The [previous page](/learn/clustering/forming-a-cluster) left you with a live
three-server cluster `east` (`n1-east`, `n2-east`, and `n3-east`) that
discovered itself from one seed route. The servers know about each other and
forward messages. But knowing about each other isn't the same as *agreeing*
with each other.

Plain `orders.created` traffic needs no agreement: a publish lands on one
server, gets forwarded, and is gone. Stored data is different. When the
`ORDERS` stream keeps three copies of every order, the three servers holding
those copies must agree on which orders exist and in what order, even while
one of them is restarting or unreachable.

This page is about that agreement. It introduces two ideas: a **RAFT group**
is a set of servers that keep an identical log by consensus, and a **leader
election** is how a group picks the one server that drives the log. Everything
the next page does with replication rests on these two.

## RAFT groups

NATS reaches agreement with **RAFT**, a consensus algorithm. A **RAFT group**
is a fixed set of servers (its **peers**) that maintain a single shared log
that all of them agree on. One peer is the **leader**; the rest are
**followers**. The leader is the only peer that accepts new entries; it copies
each entry to the followers, and the group advances together.

A cluster runs many RAFT groups at once, layered.

The first is the **meta group**: one cluster-wide RAFT group whose peers are
the servers themselves. Its log holds the cluster's *assignments* rather than your
data: which streams exist, how many replicas each has, and which
servers hold them. Its leader is the **meta leader**, the server that decides
where new streams and consumers are placed. Every server in `east` is a peer of
the meta group.

The rest are **per-asset groups**: every replicated stream gets its own RAFT
group, and so does every replicated consumer. The `ORDERS` stream running with
three copies is one RAFT group whose three peers are the three servers holding
those copies. Its leader, the **stream leader**, is the server that accepts
writes to `ORDERS` and replicates them.

So `east` holding one replicated `ORDERS` stream runs at least two RAFT groups
at once: the meta group across all three servers, and the `ORDERS` stream group
across its three peers. They're independent. The meta leader and the `ORDERS`
stream leader may be the same server or different servers, and a change to one
doesn't move the other.

You can see both. The JetStream report names the meta group's leader:

```bash
nats server report jetstream
```

Its `RAFT Meta Group Information` table lists every server and marks the one
that holds meta leadership. To see a stream's group, ask the stream (you
stand `ORDERS` up in the exercise below):

```bash
nats stream info ORDERS
```

The `Cluster Information` block names the stream's RAFT group, listing its
`Leader` and each `Replica` peer:

```
Cluster Information:

           Name: east
         Leader: n1-east
        Replica: n2-east, current, seen 0.05s ago
        Replica: n3-east, current, seen 0.07s ago
```

`Leader` is the stream leader. Each `Replica` line shows a follower peer,
whether it's `current` (caught up), and how recently the leader heard from it.
This is the `ORDERS` RAFT group, viewed from the outside.

For a live view of a group's RAFT state (current term, who the leader is, each
peer's status), check the `/raftz` monitoring endpoint. The full set of RAFT
internals it exposes is documented in
[Reference → /raftz](/reference/system/monitor/raftz): log compaction, the
`$NRG.*` subjects peers vote over, snapshot timing. We only need the group, the
leader, and the followers here.

## Leader election

A group has one leader at a time. When the leader is healthy, the steady-state
behavior is straightforward:
the leader sends a periodic **heartbeat** to its followers (by default about
once a second), and as long as that heartbeat arrives, the followers stay
followers and do nothing but accept the leader's entries.

The interesting case is when the heartbeat stops, because the leader crashed,
hung, or got cut off by the network. The followers can't tell *why* the
heartbeat stopped, only that it did. So they don't wait forever. Each follower
runs an **election timer**, and if no heartbeat arrives before it fires, that
follower assumes the leader is gone and starts an **election** to replace it.

An election needs one more idea: the **term**, a number that counts elections
and only ever goes up. Every entry and every vote is stamped with a term, so
the group can always tell a stale message from a current one. A leader from an
older term is automatically obsolete the moment a newer term exists.

Here's the sequence when a follower's election timer fires.

The follower becomes a **candidate**, the third RAFT role. It increments the
term to one higher than any it's seen, votes for itself, and asks every other
peer to vote for it in this new term.

Each peer grants its vote if it hasn't already voted in this term and the
candidate's log is at least as up to date as its own. A peer votes for at most
one candidate per term, which is what stops two leaders from emerging at once.

The candidate becomes the leader the instant it collects a **quorum** of
votes: a majority of the group's peers, `(N+1)/2`. For the three-peer `ORDERS`
group that's two: the candidate's own vote plus one more. With the majority in
hand, the new leader immediately starts sending heartbeats, the other peers
return to being followers, and the group is whole again under the new term.

<div class="nats-flow" data-scenario="raftElectionAnimated" data-width="600" data-height="350"></div>

The quorum rule is why a majority must survive for a group to elect a leader at
all. A three-peer group keeps a leader as long as two peers are up; lose two and
the survivor can't reach a majority, so it can't become leader and the group
goes leaderless until a peer returns. This is the consensus math behind the
odd-server-count advice the [Topologies chapter](/learn/topologies/your-first-cluster)
gives as a deployment choice: an even count buys no extra majority.

## Observing an election

You can observe this directly. This exercise needs the replicated `ORDERS`
stream; the [next page](/learn/clustering/replication-and-r3) creates it in
full, but one command stands it up now:

```bash
nats stream add ORDERS --subjects 'orders.>' --replicas=3 --defaults
```

With `east` running and `ORDERS` replicated, find the current stream leader,
kill it, and watch the survivors elect a new one.

First, find the leader:

```bash
nats stream info ORDERS | grep Leader
```

Say it reports `Leader: n1-east`. Stop that server: Ctrl-C its terminal, or
kill its process. For a moment the `ORDERS` group has no leader: its heartbeat
has stopped and the two survivors are running their election timers.

Within a few seconds, ask one of the survivors:

```bash
nats stream info ORDERS --server nats://127.0.0.1:4223
```

The `Cluster Information` block now names a different leader, `n2-east` or
`n3-east`, and the term has advanced. The remaining two peers held a quorum
(two of three), so they elected a new leader and `ORDERS` is writable again,
even with `n1-east` down.

## Moving a leader manually

Sometimes you want to move leadership without killing anything: to drain a
server before maintenance, or to rebalance after a restart. A **stepdown** is a
leader voluntarily yielding its role so the group elects a new one.

For a stream leader, ask the stream's group to step down:

```bash
nats stream cluster step-down ORDERS
```

The current leader yields, the group runs an election, and a different peer
takes over. The meta group has its own stepdown, scoped to the whole cluster:

```bash
nats server cluster step-down
```

That moves the *meta* leader, independently of any stream leader. Use the
stream form to move a single stream, the server form to move cluster-wide
assignment duty.

## Pitfalls

RAFT is robust, but its timing and its layering are common sources of
confusion. Each pitfall below is scoped to this page's two concepts: groups and
elections.

**An election takes seconds, not milliseconds.** The election timer fires
between four and nine seconds after the last heartbeat, deliberately staggered
so two followers don't become candidates at the exact same instant. So when you
kill a leader, expect a short window where `nats stream info` shows no leader
and writes are refused. That window is RAFT working as designed, not a bug.
Don't build a client that treats a brief "no leader" as a fatal error. Have it
retry, since a new leader arrives within seconds.

The correct handling is to retry the write rather than fail it. A `nats stream
info` during the gap confirms what's happening:

```bash
# During the election window, the leader line is briefly empty:
nats stream info ORDERS | grep Leader
# Leader:
# Re-run a few seconds later and a new leader appears:
nats stream info ORDERS | grep Leader
# Leader: n2-east
```

**Stepdown moves leadership, but the election still picks the successor.**
`nats stream cluster step-down` makes the current leader yield, and the *next*
leader is chosen by a quorum election among the remaining peers. You can name
a preferred successor with `nats stream cluster step-down --preferred <server>`
(NATS Server 2.11+), but that's a request, not a guarantee — the election can
still land elsewhere. So run stepdown to *move leadership off* the current
server, then read `nats stream info` to learn who actually won. Stream
placement (cluster and tags) can't name a leader at all; that's covered on
[Placement](/learn/clustering/placement).

**The meta leader and a stream leader are different groups.** Losing the meta
leader doesn't lose the `ORDERS` stream leader, and vice versa; they're
separate RAFT groups with separate elections. A common mistake is to see "the
leader is down," panic, and assume the stream is unavailable when only the meta
leader moved (or the reverse). Check the right group: `nats server report
jetstream` for the meta leader, `nats stream info ORDERS` for the stream leader.

## Where you are

Your cluster now has names for its moving parts:

- The meta group spans all three servers and holds the cluster's
  assignments; its meta leader decides placement.
- The `ORDERS` stream is its own RAFT group of three peers with its own
  stream leader, independent of the meta leader.
- You've killed a leader and watched the survivors run a leader election
  (a candidate, a bumped term, and a quorum of votes), and you've moved
  a leader on purpose with stepdown.

What you haven't done yet is follow a single write through the group: how the
leader gets an order onto all three peers and decides it's safe.

## What's next

The next page traces exactly that. It follows one `orders.created` write from
the leader's log to a quorum of peers, shows where the write **commits**, and
explains the consistency you get from `R=3`:
[Replication and R=3](/learn/clustering/replication-and-r3).

## See also

- [Reference → /raftz](/reference/system/monitor/raftz) — the RAFT group
  monitoring endpoint and its full field set.
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — the one-page
  operator view of replicas riding through a server loss.
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster) —
  where the odd-server-count and shape choices live.
