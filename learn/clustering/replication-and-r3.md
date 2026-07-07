---
id: replication-and-r3
title: Replication and R=3
sidebar_position: 4
description: How a replicated stream commits a write by quorum, and the consistency you get from it
---

# Replication and R=3

The last page elected leaders, and on the way it created the `ORDERS`
stream with three replicas so there was a stream group to elect. This
page uses that stream: it follows a single order from `order-svc` into
`ORDERS` and shows exactly when that write becomes safe to lose a
server over.

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

You set the count when you create the stream. This is the create the
last page ran; if your `ORDERS` is still the single-server stream from
the JetStream chapter, raise it with
`nats stream edit ORDERS --replicas=3` instead:

<div class="nats-example" data-type="learn-clustering-replication-and-r3-createR3" data-languages="cli"></div>

`--replicas=3` is the whole change. The application code doesn't move:
`order-svc` publishes the same payload to the same subject whether the
stream is `R=1` or `R=3`.

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

What changes is underneath, and `nats stream info ORDERS` shows it in
the `Cluster Information` block:

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n1-east (9.82s)
                      Replica: n2-east, current, seen 22ms ago
                      Replica: n3-east, current, seen 22ms ago
```

The stream now has a **leader**, one of the three peers, and two
followers. In our run the leader is `n1-east` and the followers are
`n2-east` and `n3-east`; your election may have picked differently.
Every write goes through the leader. The followers never take writes
directly; they receive them from the leader.

Three is the minimum for production, and a stream supports at most
`R=5`. The reasoning for *which* odd count to choose belongs to
[surviving node loss](/learn/jetstream/surviving-node-loss). Here we
follow what one write does once the count is three.

## A write commits by quorum

When `order-svc` publishes `orders.created`, the message reaches the
stream leader, `n1-east`. The leader runs a short sequence before it
reports success.

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
real guarantee: the leader returns it only after the write commits.
With the CLI, `--jetstream` waits for that `PubAck`:

```bash
nats pub --jetstream orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

```
13:11:13 Published 91 bytes to "orders.created"
13:11:13 Stored in Stream: ORDERS Sequence: 2
```

The `Stored in Stream` line is the `PubAck` (sequence 2: the last page's
meta-leader demo stored sequence 1). By the time it printed, the order
already survived the chance of a single-server failure.

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

## Durable consumers replicate the same way

The stream isn't the only thing that must survive a server loss. A
durable consumer carries state of its own, which messages are
acknowledged and where delivery stands, and that state commits by the
same quorum mechanism: each durable consumer gets its own RAFT group,
at the stream's replica count unless you set it lower (the rule itself
is covered on [surviving node loss](/learn/jetstream/surviving-node-loss);
here you watch it enforced).

Create the `shipping` pull consumer on `ORDERS` and read its
`Cluster Information` block from `nats consumer info`:

```bash
nats consumer add ORDERS shipping --pull --defaults
nats consumer info ORDERS shipping
```

```
Cluster Information:

                    Name: east
              Raft Group: C-R3F-i6mOPU9R
                  Leader: n3-east (15.26s)
                 Replica: n1-east, current, seen 253ms ago
                 Replica: n2-east, current, seen 253ms ago
```

The shape matches the stream's block: a generated group name (`C` for
consumer this time), a leader, and follower peers. Note the leader: in
our run the `shipping` group elected `n3-east` while the `ORDERS`
stream group is led by `n1-east`. They're separate RAFT groups with
separate elections, so a consumer group has its own stepdown too:
`nats consumer cluster step-down ORDERS shipping`.

The bounds are enforced. Asking for more copies than the stream has
fails:

```bash
nats consumer add ORDERS toomany --pull --defaults --replicas 5
```

```
nats: error: Consumer creation failed: consumer config replica count exceeds parent stream (10126)
```

An ephemeral consumer runs at `R=1`: it's meant to die with its client,
so there's nothing worth replicating, and its info shows a leader and no
`Replica` lines.

## The consistency you get

Quorum commit gives a specific, nameable consistency, and you should
know its boundaries before you build on it.

Reads from the leader are read-after-write. The leader holds every
committed entry and assigns every sequence number, so once a `PubAck`
returns, a read from the leader sees that order. Ordinary reads go
there by themselves: `nats stream get` and consumer delivery are served
by a group leader, so there's no window where your own just-acked write
is missing.

Reads served by a follower can lag. The create output above shows
`Direct Get: true`: `ORDERS` allows direct gets, reads that any peer
may answer straight from its local store instead of forwarding to the
leader. A follower applies committed entries slightly after the leader
does, so a direct get answered by `n2-east` or `n3-east` might not yet
show the most recent order, even though that order is already committed
and safe. The data is correct but slightly behind. For guaranteed
read-after-write, read through the leader; a stream created without
`AllowDirect` serves gets only from the leader in the first place.

This is the trade `R=3` makes on purpose. The promise is that every
copy converges, in order, and that a committed write survives one
server loss, not that every copy is identical at every instant. When
you need to confirm where the copies actually stand, the
`Cluster` block of `nats stream info` reports each replica's status and
how far behind it is.

## Kill the leader mid-publish

The `PubAck` guarantee is checkable: run a publisher, crash the stream
leader under it, and count what survived. Start a publish loop against
all three servers, as `order-svc` would run:

```bash
nats pub --jetstream orders.created --count 60 --sleep 250ms \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

In a second terminal, `kill -9` the stream leader (ours was `n1-east`).
The publisher's output, trimmed to the moment of the crash:

```
13:12:19 Published 91 bytes to "orders.created"
13:12:19 >>> Disconnected due to: EOF, will attempt reconnect
13:12:19 Published 91 bytes to "orders.created"
nats: error: nats: no responders available for request
```

Three things happened in under a second. The publisher was connected to
the killed server, so it reconnected to another one; the reconnect is
routine and cost nothing. (Whether you see the `Disconnected` line
depends on which of the three servers your publisher had connected to;
the failed publish that follows shows up in every run.) Then its next
publish failed, not by waiting
out a timeout but immediately: with the leader dead, no server holds a
subscription for `orders.created`, so the request comes straight back
as `no responders available`. The CLI exits on that error; a real
`order-svc` would catch it and retry.

One detail in that capture matters: the CLI printed `Published 91
bytes` for that last message, because `Published` only means *sent*.
The `PubAck` never came, and that message was not stored; without the
ack there's no guarantee.

The window closes by election, exactly as the last page timed it. The
new leader's log:

```
[53390] 2026/07/07 13:12:19.462036 [INF] 127.0.0.1:6222 - rid:11 - Router connection closed: Client Closed - Remote: n1-east
[53390] 2026/07/07 13:12:24.778689 [INF] JetStream cluster new stream leader for '$G > ORDERS'
```

5.3 seconds, inside the four-to-nine-second crash window. After it, the
retry succeeds against the new leader:

```
13:13:29 Published 91 bytes to "orders.created"
13:13:29 Stored in Stream: ORDERS Sequence: 15
```

Now count. The stream held 2 messages before the loop, the loop's
progress counter had acked 12 more when the leader died, and the retry
stored one:

```bash
nats stream info ORDERS | grep 'Messages:'
```

```
                     Messages: 15
```

Every write that got a `PubAck` is in the stream. The one send that
never got one isn't; had it been stored, the count would read 16.
That's the whole contract in one number: quorum
commit doesn't promise that publishing never fails, it promises that an
acked write is never lost, and that the failure window is one election
long.

Here's that failure end to end:

<div class="nats-flow" data-scenario="r3FailoverAnimated" data-width="640" data-height="400"></div>

Restart the killed server and it rejoins as a follower, behind:

```
                      Replica: n1-east, outdated, seen 761ms ago, 16 operations behind
```

A few seconds later it shows `current`: it applied the entries it
missed, in order, from the leader's log.

## Pitfalls

These are three common mistakes the first time you trust a replicated
stream. Each is scoped to this page's two ideas: how a write commits,
and the consistency it gives back.

**`R=1` has no copy.** A stream at `R=1` lives on exactly one server.
There's no second peer, so there's no quorum and nothing to commit
*to* beyond the one log. Don't run real orders at `R=1`; the disk-loss
consequence and the why-three reasoning are covered on
[surviving node loss](/learn/jetstream/surviving-node-loss).

**A follower may lag, so a follower read can be stale.** A committed
write is safe, but it reaches each follower's stream store slightly after
the leader applies it. A direct get answered by a follower can therefore
return data that's correct but not the newest. Don't assume any peer
is current just because the write was acked. For read-after-write, read
through the leader; to confirm a copy is caught up, read its status
before you trust it.

Check the leader and each replica's lag before assuming all copies are
current:

<div class="nats-example" data-type="learn-clustering-replication-and-r3-inspectReplicas" data-languages="cli"></div>

**A `PubAck` proves quorum, not full replication.** The leader returns
the `PubAck` the instant a quorum holds the entry: for `R=3`, the
leader plus one follower. The third peer may still be catching up at that
moment. That's correct and safe: the write already survives one server
loss. But don't read a `PubAck` as "all three copies are identical
right now." If you need every copy current (say, before deliberately
taking a server down), verify each replica shows `current` in
`nats stream info` first. And the inverse holds too, as the crash demo
showed: a publish without a `PubAck` proves nothing, even if the client
reported the bytes as sent.

## Where you are

The `ORDERS` stream runs `R=3` on the `east` cluster, three peers
carrying the same order log, joined by the `shipping` durable consumer
with a replicated group of its own.

What changed is your model of a write:

- A write appends to the leader's log, replicates as an append entry
  to followers, and commits once a quorum holds it: two of three for
  `R=3`.
- Followers apply committed entries in order, so all three copies
  converge on the identical log.
- A `PubAck` means the order survived the loss of one server before you
  heard back; you crashed a leader mid-publish and every acked write
  was still there.
- Read-after-write comes from the leader; direct gets answered by a
  follower may lag.

## What's next

The stream is replicated, but the cluster chose *where* its three copies
landed. The next page makes that choice yours: placement constrains a
stream's replicas to a cluster and to servers carrying matching tags,
and hints which peer should lead first.

Continue to [Placement](/learn/clustering/placement).

## See also

- [Surviving node loss](/learn/jetstream/surviving-node-loss) — the
  one-page operator intro to `R=3` and storage durability.
- [Reference → Stream Configuration](/reference/jetstream/api/stream) —
  the full `StreamConfig`, including every replica option.
- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — copying
  a stream's data on purpose, across clusters and for DR.
