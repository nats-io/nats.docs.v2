---
id: surviving-node-loss
title: "16. Surviving node loss"
sidebar_position: 18
description: Why R=1 is a single point of failure, why R=3 is the production floor, and what storage durability means
---

# 16. Surviving node loss

Every page so far ran against a single `nats-server` on your laptop.
That's good for learning, but it's not how you run orders in
production.

A single server is a single point of failure. If that machine loses
its disk, crashes, or reboots, your `ORDERS` stream is at risk. This
page explains what protects against that, and why you have to turn the
protection on yourself.

It introduces two ideas: **replicas** (how many copies of the stream
exist) and **storage durability** (whether a copy survives a restart).

## Replicas

`nats stream info ORDERS` reports `Replicas: 1`. You saw this on the
[Your first stream](/learn/jetstream/your-first-stream) page and
haven't changed it since.

`Replicas: 1` means the stream exists on exactly one server. There's
one copy of the message log and nothing else. This is **R=1**.

R=1 has no fault tolerance. Lose that one server and you lose the
stream: every message and every consumer's position. On a laptop
that's fine. In production it risks data loss.

The fix is more copies. Set the stream to keep three copies across
three servers, and the loss of any one server costs you nothing. This
is **R=3**, and it's the production floor.

R=3 tolerates one server failure. With three copies, losing one leaves
two, and two out of three is a **majority**. The stream keeps serving
reads and writes through the failure, with no data loss and no manual
recovery.

The majority matters because the replicas have to agree on the order of
messages. They settle that order by majority vote, so the group keeps
working as long as more than half of its members are reachable. The
rule they follow is called Raft. It's the method that keeps every
server agreeing on the order of writes through that vote. The
[Clustering & Replication](/learn/clustering) deep dive walks through it
on a real cluster.

You can go higher. **R=5** keeps five copies and tolerates two
simultaneous server failures. Five is the maximum a stream supports.
Most production streams run R=3; R=5 is for state you can't afford to
re-derive.

## The stream has a leader

With more than one copy, one of them is in charge. The replicas elect a
**leader**, and the other copies are **followers**.

Every write goes through the leader. When you publish into `ORDERS`,
the leader assigns the sequence number, stores the message, and only
returns the `PubAck` once a majority of replicas have the message.
That's what makes the `PubAck` on an R=3 stream a real durability
promise: the message survives the loss of any single server.

Any replica can serve reads, so the work of reading is spread across the
group rather than landing on one server.

If the leader's server dies, the remaining replicas elect a new leader
from among themselves, automatically. Writes pause for the short
window of that election, then resume. No acked message is lost, because
every message that received its `PubAck` was already stored on a
majority before the old leader failed.

A publish that was still on its way when the old leader crashed is a
different case. The message had been sent, but it hadn't reached a
majority of replicas yet, so it was never acked. That write is lost, and
the client never gets a `PubAck` for it. The fix is the client's job:
when a `PubAck` doesn't come back, treat the publish as failed and send
it again. The durability promise covers acked messages, not ones that
were still on their way when a server died.

One more failure case is worth covering. If so many servers are down
that no majority remains (two of three gone), the group can't elect a
leader. Writes are blocked until enough replicas come back. The stream
would rather stop than accept writes it couldn't safely copy to a
majority.

## Storage durability

The replica count sets how many copies exist. Storage type sets whether
a copy survives a server restart.

`nats stream info ORDERS` reports `Storage: File`. This is the default,
and it's the durable one. File storage writes messages to disk, so a
server can reboot and read its copy back intact.

The alternative is **Memory** storage. A memory stream keeps its
messages in RAM only. It's faster, but it's not durable: restart that
server and its copy is gone. Memory storage suits data you can afford
to lose on a restart. It's not suitable for an order log.

Storage type is a property of the whole stream, not of individual
replicas. An R=3 stream is all file or all memory; you can't mix a
disk copy with two RAM copies.

Replicas and storage are independent choices that combine. R=3 file
storage is the durable, fault-tolerant default for important streams:
three copies, each on disk. R=3 memory storage survives a single server
crash through its replicas but loses everything if the whole group
restarts at once.

## Consumers replicate too

A consumer also has state worth protecting: how far it has read and
which messages are still waiting for an ack. On an R=3 stream, the
`shipping` consumer's state is copied the same way, so a worker pool
keeps its place through a server failure.

By default a consumer takes its stream's replica count. You can give a
consumer fewer replicas than its stream when its state is cheap to
rebuild, but never more: a consumer can't keep more copies than the
stream it reads.

The full set of consumer replica and storage options is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
Here the consumer just takes its count from the stream.

## Turning R=3 on

On a cluster you raise the replica count with one command:

<div class="nats-example"
     data-type="learn-jetstream-surviving-node-loss-set-replicas"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

This command needs a real cluster behind it. A single server rejects
`--replicas=3`, because there aren't three servers to hold the three
copies. Running it on your laptop returns an error rather than a
three-copy stream, which is expected.

Standing up the three-node cluster, watching a leader get elected, and
killing a server to see the failover is covered separately in the
[Clustering & Replication](/learn/clustering) deep dive, which picks up
where this page leaves off.

The full set of placement controls (which servers a stream lands on,
tag-based steering, and per-account replica limits) is documented in
the [Clustering & Replication](/learn/clustering) deep dive. We change
only the replica count here.

## Pitfalls

These are the failures that show up when a stream first loses a server.

**Trusting R=1 in production.** An R=1 stream has exactly one copy. Lose
that server's disk and the `ORDERS` stream is gone: every message,
every consumer's position. There's no recovery, because there was no
second copy to recover from. R=3 is the production floor; R=1 belongs on
a laptop. Before you trust a stream with real orders, check its replica
count rather than assuming it.

<div class="nats-example"
     data-type="learn-jetstream-surviving-node-loss-check-replicas"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Setting an even replica count.** Fault tolerance comes from a
majority, and a majority needs an odd number. R=2 still has a single
point of failure: lose either copy and you're left with one server out
of two, which can't form a majority, so writes block. R=4 tolerates
only one loss, the same as R=3, while paying for a fourth copy. Use odd
counts: R=3 for the production floor, R=5 for state you can't
re-derive. Five is the maximum a stream supports.

**Reading failover from a single-server demo.** Replicas only exist
across servers, so a one-server laptop can't show leader election or
survive the loss of a server, and `nats stream edit ORDERS --replicas=3`
is rejected outright because there aren't three servers to hold the
three copies. Don't conclude a stream is fault-tolerant from a clean run
on one server. Prove failover on a real cluster, which the
[Clustering & Replication](/learn/clustering) deep dive walks through
end to end.

## Where you are

Nothing about your local `ORDERS` stream changed on this page. It's
still R=1 file storage on one server, exactly as you've run it
throughout the chapter.

What changed is your mental model:

- **R=1** is a single point of failure: fine for learning, dangerous
  in production.
- **R=3** is the production floor: three copies, tolerates one server
  loss, no data lost.
- **File** storage survives a restart; **Memory** storage doesn't.
- The stream has a **leader** that all writes flow through, and a new
  one is elected automatically when a server dies.

## What's next

The next page covers deliberately copying a stream's data elsewhere:
**mirrors and sources**, the building blocks for read-replicas,
aggregation, and disaster recovery across regions.

## See also

- [Operate → Clustering & Replication](/learn/clustering) — stand up a
  real three-node cluster and watch leader election and failover.
- [Reference → Stream Configuration](/reference/jetstream/api/stream) —
  every storage and replica option and its valid range.
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — consumer-level replica and storage overrides.
