---
id: jetstream-health
title: "JetStream health"
sidebar_position: 3
description: Read stream and consumer state, then compute lag, in-flight, and redelivery as numbers
---

# JetStream health

The previous page showed you the monitoring port and named `/jsz` as the
JetStream endpoint. That endpoint counts streams and consumers, but a count
doesn't tell you whether the `shipping` consumer is keeping up. To answer
that you read *state*, the live numbers JetStream keeps for the stream
and for each consumer, and you turn a few of them into one number: lag.

This page introduces two ideas. The first is **stream and consumer
state**: what the server reports about an `ORDERS` stream and its
`shipping` consumer right now. The second is **lag**: a single number,
computed from two of those fields, that says how far behind the consumer
has fallen.

This page reads state. It doesn't re-explain what a stream, a consumer,
or an ack is; the [JetStream deep dive](/learn/jetstream) owns those
definitions, and this page assumes them.

**Entering:** the `east` cluster is up, the `ORDERS` stream has been
taking orders, and the `shipping` consumer has fallen behind. You can hit
`/jsz` on any node. Now you want the numbers underneath it.

## Stream state: what is stored right now

Every stream keeps a small block of **state** separate from its
configuration. The configuration is what you asked for when you created
the stream. The state is what's actually in it at this moment, and it
changes with every published order.

Read it with `nats stream info`, or fetch the same fields from any client:

<div class="nats-example" data-type="learn-monitoring-jetstream-health-streamState" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The output has a configuration half and a state half. Only the state half
moves. For the `ORDERS` stream it looks like this:

```
State:

             Messages: 1,000
                Bytes: 412 KiB
        First Sequence: 1
         Last Sequence: 1,000
          Num Subjects: 4
        Active Consumers: 2
```

Three of these fields matter most here.

**Messages** (`messages`) is how many orders the stream holds. **Last
Sequence** (`last_seq`) is the sequence number assigned to the newest
order, `1000` in our snapshot. Every published order gets the next
sequence, so `last_seq` only ever climbs. You'll use it in a moment to
measure how far any consumer is behind. **Num Subjects** (`num_subjects`)
is how many distinct subjects the stream has seen: `orders.created`,
`orders.shipped`, `orders.canceled`, and one regional subject make four.

The full set of stream state fields is documented in
[Reference → jsz](/reference/system/monitor/jsz) and
[Reference → stream API](/reference/jetstream/api/stream). We only need
`last_seq` here.

## Consumer state: position and gap

A consumer keeps its own state. Where the stream state describes what's
*stored*, the consumer state describes how far one reader has *gotten*.
Read it with `nats consumer info`, or with `consumer_info` from any
client:

<div class="nats-example" data-type="learn-monitoring-jetstream-health-consumerState" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

For the `shipping` consumer the state half reads:

```
State:

  Last Delivered Message: Consumer sequence: 980  Stream sequence: 980
        Acknowledgment Floor: Consumer sequence: 975  Stream sequence: 975
        Outstanding Acks: 5 out of maximum 1,000
            Redelivered Messages: 3
            Unprocessed Messages: 20
                  Waiting Pulls: 0 of maximum 512
```

Four fields describe the consumer's progress, and each one has a precise
meaning.

**Last Delivered Message** carries `delivered.stream_seq`: the stream
sequence of the last order the server handed to a `shipping` worker. In
the snapshot it's `980`. The stream's `last_seq` is `1000`. The gap
between them is what this page is about.

**Acknowledgment Floor** (`ack_floor.stream_seq`) is the sequence below
which every order has been acked. Orders `981` through `1000` haven't
been delivered yet; orders `976` through `980` were delivered but aren't
all acked. That second group is the next field.

**Outstanding Acks** counts orders delivered but not yet acked, also
called **in-flight** (`num_ack_pending`). Five `shipping` workers are
holding five orders, working on them, and haven't confirmed them back.
In-flight measures work in progress, which is a different thing from lag.

**Redelivered Messages** (`num_redelivered`) is how many orders the server
is currently tracking as delivered more than once: three right now. It's
not a lifetime tally — when one of those orders is finally acked the server
stops tracking it and the count drops back down. A redelivery happens when
a worker takes an order and never acks it, or negative-acks it with a
`nak`, so the server hands it to another worker.

The full set of consumer state fields is documented in
[Reference → consumer API](/reference/jetstream/api/consumer). We only
need the four above.

## Lag is a number you compute

The most important health signal for a consumer is **lag**: the number of
orders the stream holds that haven't been delivered to this consumer yet.
It's the gap you saw a moment ago, written as one number:

```
lag = stream.last_seq − consumer.delivered.stream_seq
```

For the pinned snapshot:

```
lag = 1000 − 980 = 20
```

Twenty orders are waiting for a `shipping` worker to fetch them. That's
what "the shipping consumer is behind" means as a number. A pull consumer
also reports this same value directly as **Unprocessed Messages**
(`num_pending`), so most of the time you read it off `nats consumer info`
rather than subtracting by hand. Computing it from the two source fields
yourself is worth doing once, to see exactly what `num_pending` measures.

Three numbers now describe the full state of the `shipping` consumer:

- **lag = 20**: orders waiting, never delivered (`num_pending`)
- **in-flight = 5**: orders delivered, not yet acked (`num_ack_pending`)
- **redelivered = 3**: orders the server had to hand out again
  (`num_redelivered`)

A healthy consumer keeps lag near zero and `num_redelivered` near zero. Lag
climbing while `last_seq` climbs means orders arrive faster than `shipping`
processes them. A `num_redelivered` that stays high or keeps growing means
workers keep taking orders and failing to ack them. Each symptom has a
different cause, and naming which number moved is the first step every time.

This animation shows the three numbers as positions on the stream log:
orders append and push `last_seq` up, the consumer cursor advances as
workers fetch and ack, the gap between them is lag, and a failed order
pulses back as a redelivery.

<div class="nats-flow" data-scenario="consumerLagAnimated" data-width="600" data-height="350"></div>

Watching lag is the task here. Deciding what to do about a lag that won't
come down (adding `shipping` workers, or sizing the deployment) belongs to
the [worker pool](/learn/jetstream/worker-pool) page and the
[deployment](/learn/deployment) chapter. This page names the symptom, and
the fix is covered there.

## Pitfalls

These traps are scoped to this page's two concepts: reading consumer
state, and reading lag from it. Each one is a number that misleads if you
read it without context.

**Crashed workers show up as rising lag with nobody fetching.** When every
`shipping` worker has crashed, `num_pending` keeps climbing: the server
updates it on every new matching order, whether or not any client is
fetching. So a high `num_pending` on its own is ambiguous — a healthy
consumer draining a backlog looks the same for a moment. The signature of
crashed workers is the combination: lag rising while **Waiting Pulls**
(`num_waiting`) sits at `0` and `delivered.stream_seq` stops advancing.
Read all three together:

<div class="nats-example" data-type="learn-monitoring-jetstream-health-consumerState" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

If `num_pending` is large and climbing while `num_waiting` is `0` and
`delivered.stream_seq` hasn't moved, no worker is fetching and the pool is
gone.

**In-flight is not lag.** `num_ack_pending` counts orders a worker
already holds; `num_pending` counts orders no worker has taken yet.
Reading one for the other hides a real problem: a handler that fetches
orders and then hangs shows a steady, non-zero in-flight count while lag
quietly grows behind it. Don't collapse the two into one "behind"
number. Read both, every time: rising in-flight means a stuck handler,
rising lag means not enough handlers.

**A filtered consumer's lag counts only its subjects.** The `analytics`
consumer filters `orders.shipped`. Its `num_pending` counts only the
shipped orders it hasn't seen, not the whole stream. An empty pending on
a filtered consumer doesn't mean the `ORDERS` stream is empty; it means
nothing on *that filter* is waiting. Don't read a filtered consumer's
lag as a stream-wide number. Compare it against the stream's per-subject
counts, not against `last_seq`.

## Where you are

You can now read the live state of the `ORDERS` stream and its `shipping`
consumer, and you can turn it into the three numbers that matter:

- **lag = 20**: orders waiting, from
  `last_seq − delivered.stream_seq`, also reported as `num_pending`
- **in-flight = 5**: orders delivered but not acked (`num_ack_pending`)
- **redelivered = 3**: orders handed out more than once
  (`num_redelivered`)

You know which field is which, and you know lag and in-flight are
different measurements that move for different reasons.

## What's next

State is something you have to ask for: you poll `/jsz` or run
`nats consumer info` and read the answer. Some events never show up in a
poll. When a poison order exhausts its deliveries, the server announces
it once, on a subject, and if you're not listening you never learn it
happened.

The next page covers subscribing to those announcements.

Continue to [Advisories & events](/learn/monitoring/advisories-and-events).

## See also

- [Reference → consumer API](/reference/jetstream/api/consumer) — every
  consumer state field and its type
- [Worker pool](/learn/jetstream/worker-pool) — how a pool of `shipping`
  workers shares the lag
- [Monitoring endpoints](/learn/monitoring/monitoring-endpoints) — the
  `/jsz` endpoint these numbers come from
