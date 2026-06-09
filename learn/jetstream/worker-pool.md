---
id: worker-pool
title: "9. A pool of workers"
sidebar_position: 10
description: Run several workers off one consumer, and what happens when one crashes mid-message
---

# 9. A pool of workers

The `shipping` consumer works. One worker pulls a message, ships the
order, acks. But one worker is a bottleneck — it processes one message
at a time, and your warehouse has more than one packer.

This page scales `shipping` out to three workers. Nothing about the
consumer changes. You just point three processes at it.

## One consumer, many workers

A consumer is a named cursor on the stream. It lives on the server. It
does not belong to whichever process created it.

That means any number of processes can pull from the same consumer at
the same time. They share the cursor. The server hands each pending
message to exactly one of them.

This is the whole trick. To get a pool of workers, you run the same
pull loop in several processes, all naming the same consumer:

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

Each message lands on a different worker. The server spreads the
pending messages across whichever workers are asking for them. No
worker sees a message another worker already took.

The consumer still tracks a single position through all of this. Ask
the server about it and the count of acked messages climbs as one
number, not three:

```bash
nats consumer info ORDERS shipping
```

```
State:

  Last Delivered Message: Consumer sequence: 3 Stream sequence: 6
     Acknowledgment Floor: Consumer sequence: 3 Stream sequence: 6
         Outstanding Acks: 0 out of maximum 1,000
```

Three workers, one cursor. The pool is an implementation detail the
consumer never has to know about.

## This is not a queue group

If you read the Core Concepts, this looks like a queue group. The
difference matters.

A queue group balances **live** messages across core NATS subscribers.
The balancing happens at delivery time, with no storage behind it. A
subscriber that is offline when a message arrives misses it, and
nothing redelivers.

A worker pool balances **stored** messages across processes sharing one
consumer. The balancing happens against the stream. A message waits in
the stream until some worker pulls it and acks it. A worker that is
offline simply does not pull — the message waits for one that does.

Same shape on the surface, different guarantees underneath. The worker
pool is the durable version.

## When a worker crashes mid-message

Here is the failure that the stream makes safe.

A worker pulls a message and starts shipping the order. Halfway
through — before it acks — the process dies. The message was already
delivered to that worker. In core NATS, it would be gone.

It is not gone. An unacked message is still pending on the consumer.
The server handed it out, started a timer, and is waiting for the ack
that will never come.

When that timer expires, the server redelivers the message to another
worker in the pool. The timer is `AckWait`, and its default is 30
seconds. You met the redelivery loop on the acknowledgment page; the
pool is where it earns its keep.

You can watch it happen. Kill one worker in the middle of processing,
wait out the `AckWait`, and the message reappears on a surviving
worker. The order ships once because some worker eventually acks it —
never zero times, even though the first attempt failed.

## Capping how much is in flight

Three workers can each be holding a message at once. A bigger pool
holds more messages in flight at once. There is a ceiling on this, and
it is worth knowing before you grow the pool.

The ceiling is `MaxAckPending` — the number of delivered-but-unacked
messages the consumer will allow across the whole pool. Its default is
1000. When the pool reaches that many messages in flight, the server
stops handing out new ones until some get acked.

`MaxAckPending` is shared by every worker on the consumer, not
per-worker. Five workers do not get 1000 each; they get 1000 between
them. The cap is a property of the consumer, so it governs the pool as
a whole.

You set it when you create or update the consumer:

```bash
nats consumer add ORDERS shipping --max-pending 1000
```

Two reasons to care about this number. Too low and your workers idle,
waiting for a slot to free up. Too high and a slow ack leaves a large
backlog of in-flight messages that all redeliver at once if a batch of
workers dies together.

The full set of in-flight and redelivery options — `AckWait` tuning,
per-attempt backoff arrays — is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We use only `MaxAckPending` here.

## Pitfalls

A pool of workers turns two consumer settings — `AckWait` and
`MaxAckPending` — into things you feel. Here is what bites.

**A redelivered order ships twice if the worker is not idempotent.**
The pool gives you at-least-once delivery: when one worker crashes
mid-message, the order comes back to another after `AckWait`. If your
worker performs its side effect — charging a card, printing a label —
before it acks, that side effect runs again on the redelivery. Key
every effect by `order_id` so a second delivery of `ord_8w2k` is a
no-op, not a double shipment. Watch redelivery on the pool:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-redelivery-count"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A low `MaxAckPending` starves a large pool.** The cap is shared
across the whole consumer, not per worker. Set it to 3 and only three
messages are ever in flight, so a ten-worker pool leaves seven workers
idle no matter how much is stored. Size the cap to at least your worker
count, with headroom:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-max-pending"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A crashed worker holds its in-flight message until `AckWait`.** The
server does not know a worker died; it only knows the ack never came.
Until the timer expires — 30 seconds by default — that order waits,
pending and undelivered to anyone else. A short `AckWait` recovers
faster but redelivers prematurely when honest work runs long, so tune
it to your real processing time, not to your worst crash. The full set
of in-flight tuning and redelivery options — `AckWait`, `MaxDeliver`,
and backoff arrays — is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
This page focused on `MaxAckPending`; see Reference for the full set.

## Where you are

You now have:

- One `shipping` consumer, unchanged from earlier pages.
- Three workers pulling from it, splitting the stored messages between
  them.
- A crashed worker's in-flight message redelivered after `AckWait`,
  not lost.
- A name for the ceiling on concurrency: `MaxAckPending`, shared across
  the pool.

The pool scales by adding processes. The consumer does not care how
many there are.

## What is next

Right now the server decides which worker gets the next message — it
spreads them across whoever is asking. The next page,
[Priority groups](/learn/jetstream/priority-groups), gives you control
over that: pinning work to one worker, or letting a backup take over
only when the primary falls behind.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — `MaxAckPending`, `AckWait`, backoff, and every other consumer field.
- [Core Concepts → Queue Groups](/concepts/queue-groups) — the core NATS
  balancing this page contrasts with.
