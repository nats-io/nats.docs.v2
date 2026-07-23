---
id: ordered-consumer
title: "Ordered consumers"
sidebar_position: 10
description: A fast, in-order read of a stream that cleans up after itself — what the library does for you, and the consumer config underneath
---

# Ordered consumers

Most of this chapter built consumers that stick around. `billing` keeps its
place so it can resume after a restart. `shipping` is a durable consumer a
whole pool of workers shares. Both are made to last.

Some reads aren't. Finance wants to total every order from launch to now, in
the order they happened, to reconcile the books. You read the whole `ORDERS`
log once, top to bottom, and then you never need that reader again. There's no
work to share, no ack to send, and nothing worth keeping once the pass is done.

An **ordered consumer** is built for exactly that: a fast, in-order read of a
stream that cleans up after itself.

## What you write

You ask the library for an ordered consumer over the stream and read it like
any other consumer — iterate, take each message, move on. There's no name to
pick, no ack to send, and no consumer to delete when you finish. The library
hands you every message in stream order, from your start point to the end, as
one continuous flow.

<div class="nats-example"
     data-type="learn-jetstream-ordered-consumer-read"
     data-languages="go,js,python,java,rust,csharp,c"></div>

That's the whole client-side surface: ask for an ordered consumer, loop until
the log is drained. The ordered consumer is a client-library construct, so
there's no CLI form.

## What the library does

The simplicity hides a loop. Under the cover, the library creates a consumer
with a short **inactivity threshold** — a span of idle time after which the
server deletes the consumer — and tracks the stream sequence of each message
it delivers. As long as the sequences arrive in order, it passes them
straight to you.

When a sequence goes missing, or the consumer goes quiet — its heartbeats stop
because it was deleted, lost on a reconnect, or dropped in a node restart — the
library throws the old consumer away and creates a fresh one starting at the
next sequence it expected. Each new consumer gets its own name (`prefix_1`,
`prefix_2`, and so on). You see one unbroken, in-order stream through all of
it; the recovery is invisible.

That recovery is what lets an ordered consumer drop acks and still keep order.
Without acks there's nothing to trigger a redelivery, so a plain no-ack
consumer that missed a message would skip it and read on with a gap. The
ordered consumer instead spots the gap and rebuilds itself from the
missing sequence — the message is still in the stream — so the order holds with
no acks at all.

## The config underneath

An ordered consumer isn't a separate kind of consumer on the server. It's an
ordinary consumer the library configures a specific way, and every choice fits
a throwaway in-order read:

- **No acks** (`AckPolicy=none`). You're reading straight through, not
  processing work that has to land exactly once. Nothing to acknowledge, no
  redelivery to reason about.
- **Memory storage.** The cursor lives in memory, not on disk. It's faster,
  and a one-shot read has no reason to make its position survive a restart.
- **One replica.** A single copy of the consumer's state. Cheap, and there's
  no position worth replicating for a read you can simply run again.
- **A short inactivity threshold** (five minutes). The server deletes the
  consumer once it sits idle that long, so it disappears on its own after the
  pass. This is the part that cleans up after you.
- **Start where you ask.** The first consumer uses the start point you pick —
  the whole log, a specific sequence, or a point in time. After a recovery, the
  library pins the replacement consumer to the next sequence it expected.

These are the same knobs any consumer has. The ordered consumer just sets them
all toward speed and disposability instead of durability. The full set of
fields is in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer/create).

## What you give up

The trade is in what you can't do:

- **No per-message acks.** You can't mark one order handled and another not, so
  this isn't the tool for processing that has to happen exactly once. That's a
  named consumer with explicit ack — the `shipping` pattern.
- **No sharing.** Each reader creates its own ordered consumer, so two
  processes can't split one between them the way a pool shares one `shipping`
  consumer.
- **No parallelism.** Delivery is single-threaded and in order, one message at
  a time.

In return you get a gap-free, in-order read with no ack bookkeeping and nothing
left behind.

## Where ordered consumers show up

Ordered consumers power features you may use elsewhere in NATS: a
[Key-Value](/learn/key-value) watch and an [Object Store](/learn/object-store)
read are both ordered consumers under the cover — each walks a stream straight
through in order. Reach for one whenever you want to read a stream top to
bottom without coordinating readers or tracking acks.

## Pitfalls

**Using it for work that must be processed once.** An ordered consumer doesn't
ack, so it can't mark individual messages handled — there's no way to record
that order 5 shipped but order 6 didn't. For processing where each message must
land exactly once, use a named consumer with explicit ack and let redelivery
cover failures.

**Expecting to share progress across processes.** Each reader gets its own
ordered consumer with its own position, so two processes reading this way both
read the whole stream — they don't split it. To share work, use a named
consumer and a [worker pool](/learn/jetstream/worker-pool).

**Counting on the position to survive.** Memory storage, one replica, and a
short inactivity threshold make the cursor disposable on purpose. Don't build a
long-running job on an ordered consumer expecting it to resume where it left
off after a crash — it starts over.

## What's next

An ordered consumer is one reader walking the log alone. Back at the worker
pool, several readers share one `shipping` consumer — and the next page steers
that split: [priority groups](/learn/jetstream/priority-groups) can send all
the work to one client until it fails, or keep a standby idle until the pool
falls behind.

## See also

- [ADR-17: Ordered Consumer](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-17.md)
  — the behavior the clients implement.
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer/create) —
  every field the library sets under the cover.
- [Key-Value](/learn/key-value) and [Object Store](/learn/object-store) —
  ordered consumers at work.
