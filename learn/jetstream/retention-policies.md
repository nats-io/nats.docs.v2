---
id: retention-policies
title: "Retention policies"
sidebar_position: 14
description: The three retention policies, and how to pick one for the kind of work a stream does
---

# Retention policies

The previous page shaped `ORDERS` with limits: how many messages it
keeps, for how long, in how many bytes. Those limits decide when a
message leaves the stream because the stream ran out of room.

There's a second, separate question: should a message ever leave the
stream because a consumer finished with it? Limits don't ask that.
A message capped only by age or size stays until its limit hits,
read or unread, acked or not.

Some workloads need the other behavior. A job queue wants a message
gone once a worker completes it. A fan-out wants a message gone once
every interested consumer has seen it. Limits can't express either.

The **retention policy** is the field that does. It decides what makes
a message ready to leave the stream. You picked one already, by
accepting a default, when you created `ORDERS`.

## The three policies

A stream has exactly one retention policy, fixed by the `retention`
field. There are three values.

**Limits** is the default, and the one `ORDERS` has. Messages stay until a
limit is reached: `MaxMsgs`, `MaxBytes`, or `MaxAge`, whichever comes
first. Consumers reading and acking messages has no effect on what the
stream keeps. The stream is a log, and the log holds everything inside
its limits.

<div class="nats-flow" data-scenario="limitsRetentionAnimated" data-width="580" data-height="284"></div>

**Interest** keeps a message only while some consumer still wants it. A
message is removed once *every* consumer whose filter covers it has acked
it. If no consumer is interested in a subject, a message on that subject
is removed right away.

<div class="nats-flow" data-scenario="interestRetentionAnimated" data-width="580" data-height="300"></div>

**WorkQueue** keeps a message only until *one* consumer acks it. The
first ack removes the message for everyone. Each message is delivered
once and then removed.

<div class="nats-flow" data-scenario="workQueueRetentionAnimated" data-width="580" data-height="288"></div>

The three policies differ in who decides a message is finished. Under
Limits, the limits decide. Under Interest, every consumer must ack
before the message is removed. Under WorkQueue, the first consumer to
ack removes it.

Limits still apply under all three. Retention removes a message when
consumers are done with it; the stream's limits remove it when the stream
grows too old or too large. On an Interest or WorkQueue stream the limits are
the backstop that keeps it bounded when consumers fall behind — retention
doesn't replace limits, it adds a second way a message can leave.

## Pick the policy from the kind of work

Choose a retention policy from the kind of work the stream does. The
policy follows from the work, not the other way around.

**An audit log or event history → Limits.** You want to keep every
message for a window of time no matter who read it, and you want to
replay from any point. `ORDERS` is this kind of stream. Late consumers,
re-reads, and the replay on the reading-back page all depend on messages
staying after they're consumed. Limits is the only policy that allows
that, which is why it's the default and why `ORDERS` keeps it.

**A fan-out where every consumer must process each message →
Interest.** Several independent services each need to handle every order
once, and once they all have, the message is no longer needed. The
stream stays small because it drops a message once the last interested
consumer is done. You get fan-out delivery without an ever-growing log.

**A job queue where each message is work for one worker → WorkQueue.**
This is the home for Acme's shipping workers from [Scaling a
consumer](/learn/jetstream/worker-pool). Each message is an order to ship.
One shipping worker claims it, ships it, and acks, and then the task is
removed so no one ships the same order twice. The queue drains as the
workers keep up, where a log would only grow.

## A WorkQueue stream for the shipping work

`ORDERS` stays Limits; don't change it — it's the record of what
customers did. But Acme also has *work* to do on each order: when one is
paid, a [shipping worker](/learn/jetstream/worker-pool) has to ship it,
exactly once. Ship the same order twice and a second parcel goes out the
door. That's a job queue, not a log — each task goes to one worker and is
gone once it's done. Give it its own `FULFILLMENT` stream with WorkQueue
retention:

<div class="nats-example" data-type="learn-jetstream-retention-policies-workQueueCreate" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The `--retention work` flag is the only change from how you built
`ORDERS`. `nats stream info FULFILLMENT` shows it in the `Options` block:

```bash
nats stream info FULFILLMENT
```

```
             Subjects: fulfill.>

Options:

            Retention: WorkQueue
       Discard Policy: Old
```

Enqueue one order to ship and have a shipping worker ack it, and the
stream's message count drops back to zero. The ack removed the task,
which no limit on `ORDERS` does. The worker publishes `orders.shipped`
back to `ORDERS` as it finishes, so the record lands in the log while the
task drains from the queue.

Those shipping workers run as a pool sharing **one** consumer on
`FULFILLMENT`, exactly as on [Scaling a consumer](/learn/jetstream/worker-pool):
WorkQueue hands each order to the consumer, one worker ships it, and the ack
clears it. You scale by adding workers to that one consumer, not by adding
consumers — WorkQueue won't let two consumers claim the same order (the
pitfalls below cover why).

## Switching retention on a live stream

Set retention when you create the stream, and leave it there.

The server allows exactly one live change: it swaps Limits and Interest,
in either direction. Anything involving WorkQueue is locked — see the
pitfall below. And even the allowed swap applies to messages already
stored, right away. Say a stream has been collecting an audit history
under Limits and you switch it to Interest. From that moment the server
removes any message every consumer has already acked, and any message on
a subject no consumer is interested in — including history you meant to
keep.

Treat the policy as fixed at creation. If you want a different policy
than the stream has, create a new stream with the right policy rather
than editing the running one. `ORDERS` was created as Limits on purpose,
and it stays Limits.

## How Interest and WorkQueue can go wrong

Interest and WorkQueue each have a way they can go wrong. Know it before
you use them.

**Interest can fill the disk.** A message is removed only when every
consumer whose filter covers it has acked it. A slow consumer holds up
cleanup for every message it still owes an ack on. If a consumer stalls
(a stuck worker, a service that's down), its unacked messages never
become ready to leave, and the stream grows until it hits its limits or
runs out of room. Interest retention still needs limits set, and it makes
watching consumer health more important.

**WorkQueue delivers each message once.** The first ack removes the
message for everyone, so no two consumers can claim the same message — the
server rejects overlapping consumers outright (the pitfall below). You can
still run more than one consumer if their filters *partition* the subjects,
but each then handles only its slice; none sees the whole stream. For several
consumers that each see every message, use Interest or Limits instead. To
scale a single workload, use a worker *pool* sharing one consumer (the
worker-pool page), not multiple consumers.

The full set of retention behavior, including how Interest and
WorkQueue interact with stream republish, mirrors, and sources, is in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
This page uses only the three `retention` values.

## Pitfalls

Both of these are WorkQueue constraints. The server checks them when you
create or edit a stream, so you find out right away rather than in
production.

**Retention to or from WorkQueue is locked after creation.** The earlier
section covered the Limits–Interest swap the server allows, and how even
that rewrites your history. The rule underneath it is stricter: the
server rejects any change that adds or removes WorkQueue. A stream that
isn't WorkQueue at creation can't become one, and a WorkQueue stream
can't change to another policy.

Don't plan a migration path that edits retention into or out of
WorkQueue. Create a new stream with the policy you want and move the
data. The edit below is rejected with `stream configuration update can
not change retention policy to/from workqueue`.

<div class="nats-example" data-type="learn-jetstream-retention-policies-retentionSwitchRejected" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**WorkQueue rejects consumers that overlap.** The first ack removes a
message for everyone, so the server won't let two consumers claim the
same message. Adding a second unfiltered consumer, or two consumers
whose filters overlap, fails the create: `multiple non-filtered
consumers not allowed on workqueue stream`, or `filtered consumer not
unique on workqueue stream` for overlapping filters.

Give each consumer a filter that splits the subjects between them, so no
message belongs to two consumers. A worker *pool* sharing one consumer
is the other valid setup; see [A pool of workers](/learn/jetstream/worker-pool).

<div class="nats-example" data-type="learn-jetstream-retention-policies-workqueueOverlap" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Where you are

`ORDERS` is unchanged. It's a Limits stream that holds its order history
and lets late and repeat consumers replay.

You now have:

- The three retention policies (Limits, Interest, WorkQueue) and the
  one question that separates them: who decides a message is finished.
- Which policy fits which kind of work: audit log → Limits, fan-out →
  Interest, job queue → WorkQueue.
- A `FULFILLMENT` WorkQueue stream — the shipping workers' queue — that
  dropped a task on ack while `ORDERS` kept the record.
- The rule that retention is fixed at creation, not switched on a live
  stream.

## What's next

Retention removes messages on a schedule the server runs. The next page
covers removing them by hand: [deleting a single
message](/learn/jetstream/altering-stream-state) and purging the stream.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — the `retention` field, its three values, and how each interacts with
  limits, republish, and mirrors.
- [Shaping the stream](/learn/jetstream/shaping-the-stream) — the
  limits that govern a Limits stream.
- [A pool of workers](/learn/jetstream/worker-pool) — the worker pool
  that shares one consumer, the pattern that fits WorkQueue.
