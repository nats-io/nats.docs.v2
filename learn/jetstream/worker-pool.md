---
id: worker-pool
title: "Scaling a consumer"
sidebar_position: 7
description: Point several workers at one consumer to share the load, and what happens when one crashes mid-message
---

# Scaling a consumer

On the [acknowledgment page](/learn/jetstream/acknowledgment), one worker
drove the `shipping` consumer: pull an order, ship it, ack, and let the
redeliver loop retry anything that failed. That kept up while Acme shipped a
few orders an hour.

Then Acme's order volume climbed. Orders arrive faster than one worker can
ship them, and the unshipped ones pile up in `ORDERS`.

You clear that backlog by adding workers. Point several processes at the same
`shipping` consumer and they share the load: the server hands each stored
order to exactly one worker. You reuse the `ORDERS` stream and `shipping`
consumer you already have.

## One consumer, many workers

Each worker names the same `shipping` consumer and runs the same pull loop.
Start that loop in several processes at once:

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

The server hands each waiting order to one worker, rotating round-robin
through the workers that have a pull request open. No two workers get the same
order, so the three split the backlog evenly:

<div class="nats-flow" data-scenario="workerPoolAnimated" data-width="640" data-height="320"></div>

A worker only takes a turn while it's actually asking. One that's still
shipping an order has no pull request open, so the server skips it and gives
the order to the next worker in line. Distribution follows demand: a faster
worker pulls more often and ships more.

The consumer still tracks a single position through all of this. Ask the
server and the acked count climbs as one number:

```bash
nats consumer info ORDERS shipping
```

```
State:

  Last Delivered Message: Consumer sequence: 3 Stream sequence: 6
     Acknowledgment Floor: Consumer sequence: 3 Stream sequence: 6
         Outstanding Acks: 0 out of maximum 1,000
```

The position belongs to the consumer, not to each worker, so it advances the
same whether one process pulls or three.

## This works on the log you already have

`ORDERS` is the same Limits-retention stream from page one; nothing about it
changed to make this work. Sharing is a property of the consumer, not the
stream: point many workers at one consumer and the server splits the work on
any stream.

One consequence matters here. An ack advances the position, it doesn't remove
the order. The order stays in `ORDERS` for `billing`, `analytics`, and any
consumer that reads the log later. The workers share a *position*, not the
messages.

## How this differs from a queue group

If you read the Core Concepts, this looks like a queue group, but the two
balance different things.

A queue group splits **live** messages across core NATS subscribers as each
one arrives, with no storage behind it. A subscriber that's offline when a
message arrives misses it for good.

Workers sharing a consumer split **stored** messages against the stream. A
message waits in the stream until some worker pulls it and acks it, so a
worker that's offline just leaves its share for the others.

Only the stream-backed split survives a worker dropping out or a restart.

## When a worker crashes mid-message

A worker pulls an order and starts shipping it. Before it acks, the process
dies. On the consumer that order is still in progress: the server delivered
it and is waiting on the ack. When `AckWait` runs out (30 seconds by
default), the server hands the order to another worker. This is the
redelivery loop from the [acknowledgment page](/learn/jetstream/acknowledgment),
now spread across the pool.

Watch it happen. Kill one worker mid-order, wait out `AckWait`, and the order
reappears on a surviving worker. It ships once, because some worker
eventually acks it.

## Capping how much is in progress

Each worker can hold an order in progress, so more workers mean more in
progress at once. There's a ceiling on that.

The ceiling is `MaxAckPending`: how many delivered-but-unacked messages the
consumer allows at once, default 1000. Hit it and the server stops delivering
new orders until some get acked. The cap is shared across the whole consumer,
not per worker: five workers get 1000 between them, not 1000 each.

You set it when you create or update the consumer:

```bash
nats consumer add ORDERS shipping --max-pending 1000
```

Set it too low and workers sit idle waiting for a slot. Set it too high and a
slow ack leaves a big in-progress backlog that all redelivers at once if many
workers die together.

## Pitfalls

Running several workers makes two consumer settings, `AckWait` and
`MaxAckPending`, matter in practice.

**A redelivered order ships twice unless the worker is safe to repeat.**
You get at-least-once delivery: a message arrives at least
one time, and sometimes more. When one worker crashes mid-message, the
order comes back to another after `AckWait`. If your worker does its
real-world action (charging a card, printing a label) before it acks,
that action runs again on the redelivery. Tie every action to the
`order_id` so a second delivery of `ord_8w2k` does nothing instead of
shipping twice. Watch redelivery across the workers:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-redelivery-count"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A low `MaxAckPending` starves a large set of workers.** The cap is shared
across the whole consumer, not per worker. Set it to 3 and only three
messages are ever in progress, so ten workers leave seven of them idle no
matter how much is stored. Set the cap to at least your worker count, with
room to spare:

<div class="nats-example"
     data-type="learn-jetstream-worker-pool-max-pending"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A crashed worker holds its order until `AckWait`.** The server can't tell
a crash from slow work; it only knows the ack hasn't come. Until the timer
runs out (30 seconds by default), that order stays in progress and goes to no
one else. Set `AckWait` to your normal processing time: too short redelivers
while a healthy worker is still working, too long leaves real failures stuck.
The full set of in-progress and redelivery options (`AckWait`, `MaxDeliver`,
backoff arrays) is in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).

## Where you are

You now have:

- One `shipping` consumer, unchanged from earlier pages.
- Several workers pulling from it, splitting the stored messages between
  them.
- A crashed worker's message redelivered after `AckWait`, not lost.
- A name for the ceiling on how much runs at once: `MaxAckPending`,
  shared across every worker.

You scale by starting more processes; the consumer is unchanged. And because
`ORDERS` is a log, it keeps every order after a worker handles it.

## What's next

Several workers on the `ORDERS` log still leave every order in the stream
after one of them handles it. That's right for an audit log, but wrong for a
backlog of jobs that should disappear once they're done. The next page
builds a [true job queue](/learn/jetstream/delivery-semantics): a
**WorkQueue** stream where each item is claimed by one worker and removed
on ack, the natural home for workers like these.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — `MaxAckPending`, `AckWait`, backoff, and every other consumer field.
- [Core Concepts → Queue Groups](/concepts/queue-groups) — the core NATS
  balancing this page contrasts with.
