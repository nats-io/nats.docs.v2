---
id: consumer-type
title: "Which consumer type?"
description: "Pull consumers by default; ordered consumers for single-reader scans; push only for legacy or specific delivery needs"
tags: [jetstream]
---

# Which consumer type?

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

Use a durable pull consumer. It's the only type that shares work across
processes, survives restarts, and acknowledges per message. Use an ordered
consumer when one process needs the stream in order and has nothing to
acknowledge. Use push only for legacy clients or when delivery must land on
a subject.

## Decision table

| You need | Durable pull | Ordered | Push (legacy) |
| --- | --- | --- | --- |
| Share work across processes | Yes, workers fetch from one consumer | No, each reader has its own | With a deliver group |
| Resume after a restart | Yes, from the last unacknowledged message | No, restarts from the start point you give | Yes |
| Acknowledge each message | Yes | No | Yes |
| Read in order with one reader | Yes, with `MaxAckPending` of 1 | Yes, that's what it's for | Yes, with flow control |
| Process each message once | Yes, with deduplication and double ack | No | Possible, harder |
| Control the pace | The worker fetches | The library manages it | The server pushes; you configure flow control |
| Scale out | Add workers | Not applicable | Add deliver-group members |
| Server-side state | Replicated with the stream, or as configured | R1 in memory, auto-deleted when idle | Replicated with the stream |
| Typical use | Work queues, event handlers, projections that ack | Catch-up reads, watches, rebuilds | Older code, deliver-to-subject integrations |

## Default

A durable pull consumer with explicit acknowledgment. It covers every
production workload that processes messages, and the current client
libraries are built around it.

## When to deviate

**Choose an ordered consumer when** one process reads a stream from a start
point to the end, in order, and nothing needs to be acknowledged: rebuilding
a projection, tailing a log, watching a bucket. It's production-safe; see
[the misconception](/architecture/foundations/misconceptions#ordered-consumers).

**Choose an ephemeral pull consumer when** you need acknowledgment semantics
for a one-off job that shouldn't leave a durable behind. Set an inactivity
threshold so the server cleans it up.

**Choose push when** the code is on the older push API and can't move yet,
or a message must be delivered to a subject that another system subscribes
to. Configure flow control and heartbeats.

## Common mistakes

- An ordered consumer for shared work. Each process reads everything.
- Push because it looked simpler. It moves flow control to the client and
  scaling to deliver groups.
- One durable consumer per worker process instead of one shared by all.
  Each one reads everything and acknowledges independently.
- An ephemeral consumer for a job that must resume. It restarts from the
  start point after any disconnect.

## Related

- [CONS-1](/architecture/rules/consumers#cons-1),
  [CONS-4](/architecture/rules/consumers#cons-4).
- [Durable work queue](/architecture/patterns/persistence/durable-work-queue).
- [Push consumers by default](/architecture/anti-patterns/push-consumers-by-default).
- Learn: [Pull consumers](/learn/jetstream/pull-consumers),
  [Ordered consumers](/learn/jetstream/ordered-consumer),
  [Worker pool](/learn/jetstream/worker-pool).
