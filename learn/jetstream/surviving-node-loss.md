---
id: surviving-node-loss
title: "16. Surviving node loss"
sidebar_position: 17
description: Why R=1 is a single point of failure, why R=3 is the production floor, and what storage durability means
---

# 16. Surviving node loss

Every page so far ran against a single `nats-server` on your laptop.
That is the right way to learn. It is the wrong way to run orders in
production.

A single server is a single point of failure. If that machine loses
its disk, crashes, or simply reboots, your `ORDERS` stream is at risk.
This page explains what protects against that, and why the protection
is something you turn on, not something you get for free.

It introduces two ideas: **replicas** — how many copies of the stream
exist — and **storage durability** — whether a copy survives a restart.

## How many copies: replicas

`nats stream info ORDERS` reports `Replicas: 1`. You saw this on the
[Your first stream](/learn/jetstream/your-first-stream) page and have
not changed it since.

`Replicas: 1` means the stream exists on exactly one server. There is
one copy of the message log and nothing else. This is **R=1**.

R=1 has no fault tolerance. Lose that one server and you lose the
stream — every message, every consumer's position, all of it. On a
laptop that is fine. In production it is a data-loss incident waiting
for a bad day.

The fix is more copies. Set the stream to keep three copies across
three servers, and the loss of any one server costs you nothing. This
is **R=3**, and it is the production floor.

R=3 tolerates one server failure. Three copies, lose one, two remain —
and two out of three is a **majority**. The stream keeps serving reads
and writes through the failure, with no data loss and no manual
recovery.

The reason the majority matters is consensus: the replicas agree on
the order of messages by majority vote, so the group stays consistent
as long as more than half of its members are reachable. The mechanism
is called Raft, and the [Clustering & Replication](/learn/clustering)
deep dive walks through it on a real cluster.

You can go higher. **R=5** keeps five copies and tolerates two
simultaneous server failures. Five is the maximum a stream supports.
Most production streams run R=3; R=5 is for state you cannot afford to
re-derive.

## The stream has a leader

With more than one copy, one of them is in charge. The replicas elect a
**leader**, and the other copies are **followers**.

Every write goes through the leader. When you publish into `ORDERS`,
the leader assigns the sequence number, stores the message, and only
returns the `PubAck` once a majority of replicas have the message. That
is what makes the `PubAck` on an R=3 stream a real durability promise:
the message survives the loss of any single server.

Reads can be served by any replica, so read load spreads across the
group rather than piling onto one server.

If the leader's server dies, the remaining replicas elect a new leader
from among themselves, automatically. Writes pause for the short
window of that election, then resume. No message is lost, because every
message that received its `PubAck` already lived on a majority before
the old leader went away.

There is one failure mode to name. If so many servers are down that no
majority remains — two of three gone — the group cannot elect a leader.
Writes block until enough replicas come back. The stream chooses
consistency over accepting writes it could not safely replicate.

## Where the copies live: storage durability

Replicas answer "how many copies." Storage answers a different
question: does a copy survive a server restart?

`nats stream info ORDERS` reports `Storage: File`. This is the default,
and it is the durable one. File storage writes messages to disk, so a
server can reboot and read its copy back intact.

The alternative is **Memory** storage. A memory stream keeps its
messages in RAM only. It is faster, and it is not durable: restart that
server and its copy is gone. Memory storage suits data you can afford
to lose on a restart, never an order log.

Storage type is a property of the whole stream, not of individual
replicas. An R=3 stream is all file or all memory — you cannot mix a
disk copy with two RAM copies.

Replicas and storage are independent choices that combine. R=3 file
storage is the durable, fault-tolerant default for important streams:
three copies, each on disk. R=3 memory storage survives a single server
crash through its replicas but loses everything if the whole group
restarts at once.

## Consumers replicate too

A consumer also has state worth protecting: its cursor position and
which messages are awaiting ack. On an R=3 stream, the `shipping`
consumer's state is replicated the same way, so a worker pool keeps its
place through a server failure.

By default a consumer inherits its stream's replica count. You can set
a consumer to fewer replicas than its stream when its state is cheap to
rebuild, but never more — a consumer cannot out-replicate the stream it
reads.

The full set of consumer replica and storage options is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We rely on inheritance from the stream here.

## Turning R=3 on

On a cluster you raise the replica count with one command:

<div class="nats-example"
     data-type="learn-jetstream-surviving-node-loss-set-replicas"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

This command needs a real cluster behind it. A single-node server
rejects `--replicas=3`, because there are not three servers to hold the
three copies. Running it on your laptop returns an error, not a
three-way stream. That is expected.

Standing up the three-node cluster, watching a leader get elected, and
killing a server to see the failover is a walkthrough of its own. It
lives in the [Clustering & Replication](/learn/clustering) deep dive,
which picks up exactly where this page leaves off.

The full set of placement controls — which servers a stream lands on,
tag-based steering, and per-account replica limits — is documented in
the [Clustering & Replication](/learn/clustering) deep dive. We change
only the replica count here.

## Pitfalls

These are the failures that bite when a stream meets its first dead
server.

**Trusting R=1 in production.** An R=1 stream has exactly one copy. Lose
that server's disk and the `ORDERS` stream is gone — every message,
every consumer's position. There is no recovery, because there was no
second copy to recover from. R=3 is the production floor; R=1 belongs on
a laptop. Before you trust a stream with real orders, confirm its
replica count rather than assuming it.

<div class="nats-example"
     data-type="learn-jetstream-surviving-node-loss-check-replicas"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Setting an even replica count.** Fault tolerance comes from a
majority, and a majority needs an odd number. R=2 still has a single
point of failure: lose either copy and two-of-two is no longer a
majority, so writes block. R=4 tolerates only one loss — the same as
R=3 — while paying for a fourth copy. Use odd counts: R=3 for the
production floor, R=5 for state you cannot re-derive. Five is the
maximum a stream supports.

**Reading failover from a single-node demo.** Replicas only exist
across servers, so a one-server laptop cannot show leader election or
survive a node loss — and `nats stream edit ORDERS --replicas=3` is
rejected outright, because there are not three servers to hold the three
copies. Do not conclude a stream is fault-tolerant from a green
single-node run. Prove failover on a real cluster, which the
[Clustering & Replication](/learn/clustering) deep dive walks through
end to end.

## Where you are

Nothing about your local `ORDERS` stream changed on this page. It is
still R=1 file storage on one server, exactly as you have run it
throughout the chapter.

What changed is your mental model:

- **R=1** is a single point of failure — fine for learning, dangerous
  in production.
- **R=3** is the production floor — three copies, tolerates one server
  loss, no data lost.
- **File** storage survives a restart; **Memory** storage does not.
- The stream has a **leader** that all writes flow through, and a new
  one is elected automatically when a server dies.

## What is next

The next page is about copying a stream's data elsewhere on purpose:
**mirrors and sources**, the building blocks for read-replicas,
aggregation, and disaster recovery across regions.

## See also

- [Operate → Clustering & Replication](/learn/clustering) — stand up a
  real three-node cluster and watch leader election and failover.
- [Reference → Stream Configuration](/reference/jetstream/api/stream) —
  every storage and replica option and its valid range.
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — consumer-level replica and storage overrides.
