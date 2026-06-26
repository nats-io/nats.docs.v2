---
id: consumer-kinds
title: Kinds of consumers
sidebar_position: 8
description: The dimensions a consumer varies along — delivery, lifetime, and the stream's retention
---

# Kinds of consumers

A consumer is a server-side cursor over a stream: it tracks how far a reader
has progressed and delivers the next messages. Consumers vary along a few
independent dimensions, and the choices combine. This page maps them so you
can pick the right consumer for a job; each dimension links to the page that
covers it in depth.

{/* STUB: this page is a work in progress. Sections below are drafts to be
    refined and integrated. */}

## Delivery: push vs pull

A **pull** consumer hands control to the reader: the application asks the
server for messages when it's ready for more. A **push** consumer has the
server send messages to the reader as they arrive. This chapter uses pull
consumers throughout. The trade-offs, and how to migrate between them, are
on [Push vs pull](/learn/jetstream/push-vs-pull).

## Durable vs ephemeral consumers

A consumer's lifetime is separate from how it delivers messages. The same
delivery mechanics work whether the consumer sticks around or disappears.

A **durable** consumer has a name you choose. The server keeps its state,
including the cursor and the ack floor, on disk under that name. It survives
client disconnects and server restarts. When a reader reconnects using the
same name, it resumes from where the last reader left off. Use a durable
consumer when more than one process, or the same process across restarts,
needs to share one cursor.

An **ephemeral** consumer has no durable name. The server creates it on
demand and removes it once it has been idle. It's the lightest reader and
fits one-off reads, but its cursor is gone after deletion, so there's nothing
to resume.

The `inactive_threshold` field (`InactiveThreshold` in the clients) is a
duration that controls how long the server keeps an idle consumer before
deleting it. It governs ephemeral cleanup, and you can set it on a durable
too, which then makes that durable eligible for cleanup. The practical
effect: if an ephemeral reader stalls or its connection drops partway through
a long read, the consumer disappears once the idle time passes the threshold,
and a reconnect then starts over from sequence 1. For a read you need to
resume after an interruption, use a durable consumer; it keeps its position on
the server across disconnects. Durables aren't cleaned up by default.

For how readers pull and resume against these consumers, see
[pull consumers](/learn/jetstream/pull-consumers) and
[push vs pull](/learn/jetstream/push-vs-pull).

## How a stream's retention shapes consumers

The same consumer mechanics, a cursor that tracks how far you've read and
acks that move it, behave differently depending on the stream's retention
policy. The policy is fixed on the stream's `retention` field, set when you
create the stream. There are three values.

**Limits** (the default, sometimes called normal) keeps messages until a
limit is hit: age, total size, or message count. Many consumers can read the
same stream at once, each with its own cursor. One consumer reading or acking
a message doesn't remove it and doesn't affect any other consumer. This is
the policy that lets late readers and replays work.

**WorkQueue** delivers each message to exactly one consumer and removes it
from the stream once that consumer acks it. The first ack removes the message
for good. Because no message can belong to two consumers, the server requires
that consumers on a work-queue stream have non-overlapping filter subjects,
and it rejects a create that breaks the rule.

```bash
nats stream add JOBS --subjects 'jobs.>' --retention work
```

**Interest** keeps a message only while at least one consumer still has
interest in it. Once every interested consumer has acked a message, the
server removes it. You get fan-out delivery without the stream growing
without bound.

For how each policy decides a message is finished, how to pick one, and the
redelivery details, see [delivery semantics](/learn/jetstream/delivery-semantics)
and [a pool of workers](/learn/jetstream/worker-pool).

## See also

- [Push vs pull](/learn/jetstream/push-vs-pull) — choosing a delivery mode
- [Pull consumers in depth](/learn/jetstream/pull-consumers)
- [Delivery semantics](/learn/jetstream/delivery-semantics) — stream retention in depth
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
