---
id: delivery-semantics
title: "Delivery semantics"
sidebar_position: 15
description: The three retention policies, and how to pick one for the kind of work a stream does
---

# Delivery semantics

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

**Interest** keeps a message only while some consumer still wants it. A
message is removed once *every* consumer on the stream has acked it. If
no consumer is interested in a subject, a message on that subject is
removed right away.

**WorkQueue** keeps a message only until *one* consumer acks it. The
first ack removes the message for everyone. Each message is delivered
once and then removed.

The three policies differ in who decides a message is finished. Under
Limits, the limits decide. Under Interest, every consumer must ack
before the message is removed. Under WorkQueue, the first consumer to
ack removes it.

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
The message is a task. One worker picks it up, does it, and acks it, and
then the message is removed so no one does it twice. This is the kind of
stream where a message should leave once it's handled.

## A WorkQueue stream, for contrast

`ORDERS` stays Limits; don't change it. To see the contrast, create a
separate `JOBS` stream with WorkQueue retention. This is the only place
in the chapter where a second stream appears, and it's here to show the
policy difference.

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-workQueueCreate" data-languages="cli,js,go,python,java,rust,csharp"></div>

The `--retention work` flag is the only change. `nats stream info JOBS`
reports it in the configuration block, next to the same fields you read
on `ORDERS`:

```bash
nats stream info JOBS
```

```
Configuration:

             Subjects: jobs.>
   Retention Policy: WorkQueue
       Discard Policy: Old
```

Publish a job and have a consumer ack it, and the stream's message count
drops back to zero. The ack removed the message, which no limit on
`ORDERS` does. This is the behavior WorkQueue provides.

## Switching retention on a live stream

Set retention when you create the stream, and leave it there.

The `retention` field is set when you create the stream. The server lets
you change it on an existing stream, but the change applies to every
message already stored, right away. Say a stream has been collecting an
audit history under Limits, and you switch it to WorkQueue. It starts
deleting messages on the first ack, including history you meant to keep.

Treat the policy as fixed at creation. If you want a different policy
than the stream has, create a new stream with the right policy rather
than editing the running one. `ORDERS` was created as Limits on purpose,
and it stays Limits.

## How Interest and WorkQueue can go wrong

Interest and WorkQueue each have a way they can go wrong. Know it before
you use them.

**Interest can fill the disk.** A message is only removed once all
consumers ack it. The stream tracks the lowest ack position across every
consumer and only deletes up to that point. So a single slow consumer
holds up cleanup for the whole stream. If a consumer stalls (a stuck
worker, a service that's down), its unacked messages never become ready
to leave, and the stream grows until it hits its limits or runs out of
room. Interest retention still needs limits set, and it makes watching
consumer health more important.

**WorkQueue delivers each message once.** The first ack removes the
message for everyone. So two separate consumers on a WorkQueue stream
don't each get a full copy. They split the messages between them, and
neither sees the whole stream. For several consumers that each see every
message, use Interest or Limits. A worker *pool* sharing one consumer
(the worker-pool page) works on WorkQueue. Several separate consumers
that each expect the full stream does not.

The full set of retention behavior, including how Interest and
WorkQueue interact with stream republish, mirrors, and sources, is in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
This page uses only the three `retention` values.

## Pitfalls

Both of these apply to Interest and WorkQueue. The server checks both
when you create or edit a stream, so you find out right away rather than
in production.

**Retention to or from WorkQueue is locked after creation.** The earlier
section covered switching at all, and how that rewrites your history.
There's a stricter rule underneath it. The server lets you swap Limits
and Interest on a live stream, but it rejects any change that adds or
removes WorkQueue. A stream that isn't WorkQueue at creation can't become
one, and a WorkQueue stream can't change to another policy.

Don't plan a migration path that edits retention into or out of
WorkQueue. Create a new stream with the policy you want and move the
data. The edit below is rejected with `stream configuration update can
not change retention policy to/from workqueue`.

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-retentionSwitchRejected" data-languages="cli,js,go,python,java,rust,csharp"></div>

**WorkQueue rejects consumers that overlap.** The first ack removes a
message for everyone, so the server won't let two consumers claim the
same message. Adding a second unfiltered consumer, or two consumers
whose filters overlap, fails the create: `multiple non-filtered
consumers not allowed on workqueue stream`, or `filtered consumer not
unique on workqueue stream` for overlapping filters.

Give each consumer a filter that splits the subjects between them, so no
message belongs to two consumers. A worker *pool* sharing one consumer
is the other valid setup; see [A pool of workers](/learn/jetstream/worker-pool).

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-workqueueOverlap" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

`ORDERS` is unchanged. It's a Limits stream that holds its order history
and lets late and repeat consumers replay.

You now have:

- The three retention policies (Limits, Interest, WorkQueue) and the
  one question that separates them: who decides a message is finished.
- Which policy fits which kind of work: audit log → Limits, fan-out →
  Interest, job queue → WorkQueue.
- A throwaway `JOBS` stream that showed WorkQueue removing a message on
  ack.
- The rule that retention is fixed at creation, not switched on a live
  stream.

## What's next

Limits-based retention removes messages by age across the whole stream.
The next page adds a [per-message
TTL](/learn/jetstream/message-ttl) that expires a single message on its
own schedule, independent of the stream's `MaxAge`.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — the `retention` field, its three values, and how each interacts with
  limits, republish, and mirrors.
- [Shaping the stream](/learn/jetstream/shaping-the-stream) — the
  limits that govern a Limits stream.
- [A pool of workers](/learn/jetstream/worker-pool) — the worker pool
  that shares one consumer, the pattern that fits WorkQueue.
