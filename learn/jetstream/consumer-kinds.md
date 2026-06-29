---
id: consumer-kinds
title: Kinds of consumers
sidebar_position: 10
description: The dimensions a consumer varies along — naming, lifetime, replicas, storage, delivery, and the ordered pattern
---

# Kinds of consumers

A consumer is server-side state over a stream: a cursor that tracks how far a
reader has progressed, plus the ack bookkeeping that moves it. You've used one
kind throughout this chapter — a named pull consumer with explicit ack. This
page maps the choices that make one consumer differ from another, so you can
pick the right one for a job. The choices are independent, and they combine.

## Every consumer has a name

Older material splits consumers into **durable** (named, kept on disk) and
**ephemeral** (nameless, cleaned up when idle). That split is out of date.
Today every consumer has a name: clients set the `name` field, and the old
`durable_name` field is deprecated — the server's own schema says all
consumers will have names.

So "durable versus ephemeral" isn't a real fork in the road. What people
called an ephemeral consumer is just one you let the server clean up when it
goes idle, which is the inactivity threshold below — a setting, not a separate
kind. Name your consumers. The name is what lets a reader find the same
consumer again after a restart and resume where it left off.

## Lifetime: the inactivity threshold

`InactiveThreshold` (`--inactive-threshold`) is a duration that tells the
server to delete a consumer once it's been idle that long. It defaults to `0`,
which keeps the consumer until you delete it by hand.

Set a threshold for a reader that comes and goes — a CLI tail, a one-off
replay, a short-lived watcher — so abandoned consumers don't pile up on the
server. Leave it at `0` for a long-lived service consumer that has to survive
quiet periods.

```bash
# A consumer the server removes after an hour of inactivity.
nats consumer add ORDERS temp-reader --pull --ack explicit --inactive-threshold 1h --defaults
```

The catch is the cursor. When the server cleans up a consumer, its position
and ack floor go with it. A later reader that recreates the consumer starts
from the consumer's start policy, not from where the old reader stopped. For a
read you need to resume after an interruption, either leave the threshold off
or set it comfortably longer than any gap you expect.

## Durability: how many replicas hold the state

`Replicas` (`--replicas`) sets how many copies of the consumer's state the
cluster keeps. It defaults to `0`, which inherits the stream's replica count.
You can pin it instead, from `1` up to `5`, but never higher than the stream's
own replicas.

A single-replica (R1) consumer keeps its cursor on one node. It's cheaper and
a little faster, but if that node is lost the consumer is rebuilt and may
redeliver messages the old one had already handed out. That's fine for a
consumer you can afford to restart.

A consumer that matches its stream's replica count — R3 on an R3 stream —
replicates its position the way the stream replicates its messages, so it
survives a node loss without losing its place. Use it for a consumer whose
position you can't afford to lose. A consumer can be less replicated than its
stream, never more. The mechanics of replicas and leaders are on
[Surviving node loss](/learn/jetstream/surviving-node-loss).

## Storage: memory or file

`MemoryStorage` (`--memory`) controls where the consumer keeps its state. It
defaults to inheriting the stream's storage. Force it on and the cursor and
ack state live in memory only — faster to update, but gone if the node
restarts.

Memory storage pairs naturally with a short inactivity threshold and R1: a
fast, throwaway reader whose position you don't mind rebuilding. Ordered
consumers, below, use exactly this combination.

## Delivery: pull vs push

A **pull** consumer hands control to the reader: the application asks the
server for messages when it's ready for more. A **push** consumer has the
server send messages to the reader as they arrive. This chapter uses pull
consumers throughout, and pull is the default for new work. The trade-offs,
and how to migrate a push consumer, are on
[Push vs pull](/learn/jetstream/push-vs-pull).

## Ordered consumers

An **ordered consumer** isn't a server-side kind. It's a pattern the client
library builds on the dimensions above. You ask the library for one, and it
manages the rest.

Underneath, the library creates an ephemeral, in-memory, single-replica
consumer with acknowledgment off, redelivery off (a `max_deliver` of 1), and
flow control and heartbeats on. It then tracks the stream sequence for you.
When it sees a gap — a missing sequence, or heartbeats that stop because the
consumer was deleted, lost on reconnect, or dropped in a node restart — it
deletes the consumer and creates a fresh one starting at the next sequence it
expected. Each recreation gets a new name (`prefix_1`, `prefix_2`, and so on).
The reader sees one unbroken, in-order stream through all of it.

The trade is what you give up. There are no acks and no redelivery, so you
can't mark individual messages handled. Each reader gets its own consumer, so
two processes can't share progress through one ordered consumer. And delivery
is single-threaded, with no parallel handlers. In return you get a simple,
gap-free, in-order read with no ack bookkeeping to manage.

This is the pattern behind a [Key-Value](/learn/key-value) watch and an
[Object Store](/learn/object-store) read. Reach for it when you want to read a
stream straight through in order and don't need to coordinate readers or
control acks. The behavior is specified in
[ADR-17](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-17.md).

## Choosing

The dimensions combine. A few common pairings:

| Reader | Inactivity threshold | Replicas | Storage | Ack |
| --- | --- | --- | --- | --- |
| Long-lived service worker | off | match the stream | file | explicit |
| One-off replay or CLI tail | short | R1 | memory | none |
| In-order projection or watch | (ordered consumer) | R1 | memory | none |

The `billing` and `shipping` consumers from earlier pages are the first row:
named, no threshold, replicated with their stream, explicit ack. That's the
right default for a service that has to keep its place. All three rows are pull
consumers.

## Pitfalls

**Treating "ephemeral" as a separate kind.** It isn't one. A short-lived
consumer is just a named consumer with an inactivity threshold. Name your
consumers and set the threshold deliberately, rather than reaching for a
"nameless" reader.

**Trusting an R1 consumer's position across a node loss.** A single-replica
consumer rebuilds after its node is lost and can redeliver. If the position
matters, match the consumer's replicas to the stream.

**Expecting to resume a consumer the server already cleaned up.** Once the
inactivity threshold deletes a consumer, its cursor is gone. Recreating it
under the same name starts from the start policy, not the old position.

**Sharing an ordered consumer, or expecting acks from it.** Each reader gets
its own ordered consumer, and it acks nothing. For shared progress or
per-message acks, use a normal named consumer.

## What's next

The next page steers which worker on the `shipping` consumer gets an order:
[priority groups](/learn/jetstream/priority-groups) can send all the work to
one client until it fails, or hold a standby idle until the pool falls behind.

## See also

- [Push vs pull](/learn/jetstream/push-vs-pull) — choosing a delivery mode
- [Pull consumers in depth](/learn/jetstream/pull-consumers)
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — replicas and leaders
- [Delivery semantics](/learn/jetstream/delivery-semantics) — how a stream's retention shapes consumers
- [ADR-17: Ordered Consumer](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-17.md)
  — the ordered-consumer behavior
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer) —
  every consumer field
