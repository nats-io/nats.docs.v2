---
id: delivery-semantics
title: "13. Delivery semantics"
sidebar_position: 15
description: The three retention policies, and how to pick one per stream archetype
---

# 13. Delivery semantics

The previous page shaped `ORDERS` with limits: how many messages it
keeps, for how long, in how many bytes. Those limits decide *when* a
message leaves the stream because the stream ran out of room.

There's a second, separate question: should a message ever leave the
stream *because a consumer finished with it*? Limits never ask that.
A message capped only by age or size sits there until its limit hits,
read or unread, acked or not.

For some workloads that's exactly wrong. A job queue wants a message
gone the moment a worker completes it. A fan-out wants a message gone
once every interested party has seen it. Limits can't express either.

The **retention policy** is the field that does. It decides what makes
a message eligible to leave the stream. You picked one already, by
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
message is removed once *every* consumer bound to the stream has acked
it. If no consumer is interested in a subject, a message on that subject
is removed right away.

**WorkQueue** keeps a message only until *one* consumer acks it. The
first ack removes the message for everyone. The stream behaves like a
classic work queue: each message is handed out once and then gone.

The dividing line is who decides a message is finished. Under Limits,
the limits decide. Under Interest, all consumers decide together. Under
WorkQueue, the first consumer to ack decides alone.

## Pick the policy from the archetype

You rarely choose a retention policy on its own. You choose it from the
shape of the workload, and the policy follows.

**An audit log or event history → Limits.** You want to keep every
message for a window of time regardless of who read it, and you want to
replay from any point. `ORDERS` is this archetype. Late consumers,
re-reads, and the replay we did on the reading-back page all depend on
messages staying put after they're consumed. Limits is the only policy
that allows that, which is why it's the default and why `ORDERS` keeps
it.

**A fan-out where every consumer must process each message →
Interest.** Several independent services each need to handle every order
exactly once, and once they all have, the message has no further
purpose. The stream stays small because it drops a message as soon as
the last interested consumer is done. You get fan-out delivery without
an ever-growing log.

**A job queue where each message is work for one worker → WorkQueue.**
The message is a task. One worker should pick it up, do it, and ack it,
and then it should disappear so no one does it twice. This is the
archetype where a message genuinely should leave the stream the instant
it's handled.

## A WorkQueue stream, for contrast

`ORDERS` stays Limits; don't change it. To see the contrast, create a
*separate* `JOBS` stream with WorkQueue retention. This is the only
place in the chapter where a second stream appears, and it exists only
to show the policy difference.

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-workQueueCreate" data-languages="cli,js,go,python,java,rust,csharp"></div>

The `--retention work` flag is the whole change. `nats stream info JOBS`
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
drops back to zero. The ack did what no limit on `ORDERS` ever does: it
removed the message. That single behavior is the entire reason WorkQueue
exists.

## The trap: switching after the fact

Retention is a structural decision, not a knob you tune later.

The `retention` field is set when you create the stream. The server lets
you change it on an existing stream, but the change applies to every
message already stored, immediately. A stream that's been collecting
an audit history under Limits, switched to WorkQueue, starts deleting
messages on the first ack, including history you meant to keep.

So treat the policy as fixed at creation. If you find yourself wanting a
different policy than the stream has, the safe move is a new stream with
the right policy, not an edit to the running one. `ORDERS` was created
as Limits on purpose, and it stays Limits.

## A caution on each non-default policy

Interest and WorkQueue each carry a failure mode worth knowing before
you reach for them.

**Interest can fill the disk silently.** A message is only removed once
all consumers ack it. The stream tracks the lowest ack position across
*every* consumer and only deletes up to that point, so a single slow
consumer holds up cleanup for the whole stream. If a consumer stalls (a
stuck worker, a service that's down), its unacked messages are never
eligible to leave, and the stream grows until it hits its limits or runs
out of room. Interest retention doesn't excuse you from setting limits;
it makes monitoring consumer health more important, not less.

**WorkQueue is single-delivery, not shared-view.** The first ack removes
the message for everyone, so two independent consumers on a WorkQueue
stream don't each get a full copy; they split the messages between
them, and neither sees the whole stream. If you want several consumers
that each see every message, that's Interest or Limits, not WorkQueue.
A worker *pool* sharing one consumer (the worker-pool page) is fine on
WorkQueue; multiple distinct consumers each expecting the full stream is
not.

The full set of retention behavior, including how Interest and
WorkQueue interact with stream republish, mirrors, and sources, is
documented in [Reference → Stream Configuration](/reference/jetstream/api/stream/create).
We use only the three `retention` values here.

## Pitfalls

Both of these are specific to the non-default policies, and the server
enforces both: they fail loudly at create or edit time, not silently in
production.

**Retention to or from WorkQueue is locked after creation.** The earlier
trap was about switching at all, and how that rewrites your history.
There's a harder rule underneath it: the server lets you swap Limits and
Interest on a live stream, but it flatly refuses any change that adds or
removes WorkQueue. A stream that isn't WorkQueue at creation can never become
one, and a WorkQueue stream can never leave the policy.

Don't plan a migration path that edits retention into or out of
WorkQueue. Create a new stream with the policy you want and move the
data. The edit below is rejected with `stream configuration update can
not change retention policy to/from workqueue`.

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-retentionSwitchRejected" data-languages="cli,js,go,python,java,rust,csharp"></div>

**WorkQueue rejects consumers that overlap.** Because the first ack
removes a message for everyone, the server won't let two consumers
claim the same message. Adding a second unfiltered consumer, or two
consumers whose filters collide, fails the create: `multiple
non-filtered consumers not allowed on workqueue stream`, or `filtered
consumer not unique on workqueue stream` for overlapping filters.

Give each consumer a filter that partitions the subjects so no message
belongs to two of them. A worker *pool* sharing one consumer is the
other valid shape; see [9. A pool of
workers](/learn/jetstream/worker-pool).

<div class="nats-example" data-type="learn-jetstream-delivery-semantics-workqueueOverlap" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

`ORDERS` is unchanged. It's still a Limits stream, still holds its
order history, still lets late and repeat consumers replay.

You now have:

- The three retention policies (Limits, Interest, WorkQueue) and the
  one question that separates them: who decides a message is finished.
- A mapping from archetype to policy: audit log → Limits, fan-out →
  Interest, job queue → WorkQueue.
- A throwaway `JOBS` stream that showed WorkQueue removing a message on
  ack.
- The rule that retention is fixed at creation, not switched on a live
  stream.

## What's next

Limits-based retention removes messages by age across the whole stream.
The next page adds a finer tool: a [per-message
TTL](/learn/jetstream/message-ttl) that lets a single message expire on
its own schedule, independent of the stream's `MaxAge`.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — the `retention` field, its three values, and how each interacts with
  limits, republish, and mirrors.
- [12. Shaping the stream](/learn/jetstream/shaping-the-stream) — the
  limits that govern a Limits stream.
- [8. A pool of workers](/learn/jetstream/worker-pool) — the worker pool
  that shares one consumer, the pattern that fits WorkQueue.
