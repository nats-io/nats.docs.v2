---
id: worker-pool
title: "A pool of workers"
sidebar_position: 10
description: Run several workers off one consumer, and what happens when one crashes mid-message
---

# A pool of workers

The `shipping` consumer works. One worker pulls a message, ships the
order, acks. But one worker is slow: it handles one message at a time,
and your warehouse has more than one packer.

This page scales `shipping` out to three workers. Nothing about the
consumer changes. You point three processes at it.

## One consumer, many workers

A consumer is a marker on the stream that tracks how far you've read.
It lives on the server. It doesn't belong to whichever process created
it.

Any number of processes can pull from the same consumer at the same
time. They share that one read position, and the server delivers each
waiting message to exactly one of them.

To get a pool of workers, run the same pull loop in several processes,
all naming the same consumer:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-worker"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Open three terminals and run that loop in each. The `ORDERS` stream
already holds the orders from earlier pages; now add a fresh handful of
`orders.shipped` messages from a fourth terminal so all three workers
have something to compete for:

```bash
nats pub orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.shipped '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.shipped '{"order_id":"ord_5k1m","customer":"initech","total_cents":1500,"ts":"2026-05-22T10:14:29Z"}'
```

Each message goes to a different worker. The server spreads the
waiting messages across whichever workers are asking for them. No
worker sees a message another worker already took.

The consumer still tracks a single position through all of this. Ask
the server and the count of acked messages climbs as one number, not
three:

```bash
nats consumer info ORDERS shipping
```

```
State:

  Last Delivered Message: Consumer sequence: 3 Stream sequence: 6
     Acknowledgment Floor: Consumer sequence: 3 Stream sequence: 6
         Outstanding Acks: 0 out of maximum 1,000
```

Three workers, one read position. The consumer tracks where it has
read the same way whether one process or many pull from it.

## Worker pool versus queue group

If you read the Core Concepts, this looks like a queue group, but the
two behave differently.

A queue group splits **live** messages across core NATS subscribers.
The split happens as each message arrives, with no storage behind it. A
subscriber that's offline when a message arrives misses it, and nothing
sends it again.

A worker pool splits stored messages across processes sharing one
consumer. The split happens against the stream. A message stays in the
stream until some worker pulls it and acks it. A worker that's offline
doesn't pull, so the message waits for one that does.

The two look the same on the surface. The worker pool is the one that
survives a restart.

## When a worker crashes mid-message

The stream makes one specific failure safe.

A worker pulls a message and starts shipping the order. Halfway
through, before it acks, the process dies. The message was already
delivered to that worker. In core NATS, it would be lost.

In a worker pool it isn't lost. A message that was delivered but never
acked still counts as in progress on the consumer. The server
delivered it, started a timer, and waits for the ack that won't come.

When that timer runs out, the server delivers the message again to
another worker in the pool. The timer is `AckWait`, and its default is
30 seconds. You met the redelivery loop on the acknowledgment page;
this is where it applies.

You can watch it happen. Kill one worker in the middle of processing,
wait out the `AckWait`, and the message reappears on a surviving
worker. The order ships once, because some worker eventually acks it
even though the first attempt failed.

## Capping how much is in progress

Three workers can each be holding a message at once. A bigger pool
holds more at once. There's a ceiling on this, worth knowing before you
grow the pool.

The ceiling is `MaxAckPending`: the number of delivered-but-unacked
messages the consumer allows across the whole pool. Its default is
1000. When the pool reaches that many messages in progress, the server
stops delivering new ones until some get acked.

`MaxAckPending` is shared by every worker on the consumer, not
per-worker. Five workers don't get 1000 each; they get 1000 between
them. The cap belongs to the consumer, so it governs the pool as a
whole.

You set it when you create or update the consumer:

```bash
nats consumer add ORDERS shipping --max-pending 1000
```

Two reasons to care about this number. Too low and your workers sit
idle, waiting for a slot to free up. Too high and a slow ack leaves a
large backlog of in-progress messages that all redeliver at once if a
batch of workers dies together.

The full set of options for messages in progress and redelivery
(`AckWait` tuning, per-attempt backoff arrays) lives in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We use only `MaxAckPending` here.

## Pitfalls

A pool of workers makes two consumer settings, `AckWait` and
`MaxAckPending`, matter in practice.

**A redelivered order ships twice unless the worker is safe to repeat.**
The pool gives you at-least-once delivery: a message arrives at least
one time, and sometimes more. When one worker crashes mid-message, the
order comes back to another after `AckWait`. If your worker does its
real-world action (charging a card, printing a label) before it acks,
that action runs again on the redelivery. Tie every action to the
`order_id` so a second delivery of `ord_8w2k` does nothing instead of
shipping twice. Watch redelivery on the pool:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-redelivery-count"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A low `MaxAckPending` starves a large pool.** The cap is shared
across the whole consumer, not per worker. Set it to 3 and only three
messages are ever in progress, so a ten-worker pool leaves seven
workers idle no matter how much is stored. Set the cap to at least your
worker count, with room to spare:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-max-pending"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A crashed worker holds its message until `AckWait`.** The server
doesn't know a worker died; it knows only that the ack never came.
Until the timer runs out (30 seconds by default), that order stays in
progress and isn't delivered to anyone else. A short `AckWait` recovers
faster but redelivers too soon when real work runs long, so set it to
your normal processing time. This page focuses on `MaxAckPending`; the
full set of options for messages in progress and redelivery (`AckWait`,
`MaxDeliver`, and backoff arrays) is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).

## Where you are

You now have:

- One `shipping` consumer, unchanged from earlier pages.
- Three workers pulling from it, splitting the stored messages between
  them.
- A crashed worker's message redelivered after `AckWait`, not lost.
- A name for the ceiling on how much runs at once: `MaxAckPending`,
  shared across the pool.

The pool grows by adding processes. The consumer stays the same no
matter how many pull from it.

## What's next

Right now the server decides which worker gets the next message; it
spreads them across whoever is asking. The next page,
[Priority groups](/learn/jetstream/priority-groups), gives you a say in
that: pinning work to one worker, or letting a backup take over only
when the main worker falls behind.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — `MaxAckPending`, `AckWait`, backoff, and every other consumer field.
- [Core Concepts → Queue Groups](/concepts/queue-groups) — the core NATS
  balancing this page contrasts with.
