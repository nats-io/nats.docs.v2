---
id: durable-work-queue
title: "Durable work queue"
description: "Share tasks across workers so each is processed at least once and survives worker and server restarts"
tags: [jetstream]
---

# Durable work queue

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

A durable work queue is a stream with work-queue retention and one durable
pull consumer that any number of workers fetch from. Each task is delivered
to one worker, redelivered if that worker doesn't acknowledge it in time,
and removed from the stream once acknowledged. The one thing to get right:
acknowledge after the work is durable, not on receipt.

## Problem

Tasks arrive faster than one process can handle, each task must be done
even if a worker crashes mid-way, and no task should be done twice by
accident. A core NATS queue group spreads load but loses a task if no worker
is connected or one dies before finishing.

## Solution

Capture the task subjects in a stream with work-queue retention. Create one
durable pull consumer. Run workers that fetch a batch, do the work, and
acknowledge each task. The server redelivers anything unacknowledged after
`AckWait`, caps redeliveries with `MaxDeliver`, and deletes each task on
acknowledgment.

## When to use

- Background jobs, order fulfilment steps, notifications, batch processing.
- Any task where a lost or half-done unit costs money or trust.

## When not to use

- Live updates where the next message supersedes the last. Use core
  publish-subscribe.
- Requests that need an answer now. Use
  [request-reply services](/architecture/patterns/messaging/request-reply-services).
- Several independent readers that each need every task. Use limits
  retention with one consumer per reader; work-queue retention allows only
  one consumer per subject.

## Design

Subjects: one token for the task type, so a consumer can be scoped later.

```text
jobs.email
jobs.invoice
jobs.export
```

Stream: work-queue retention, file storage, three replicas, and a size limit
with discard-new so a full queue rejects publishes instead of dropping
unprocessed tasks.

```bash
nats stream add JOBS \
  --subjects "jobs.>" \
  --retention work \
  --storage file \
  --replicas 3 \
  --max-bytes 10GB \
  --discard new \
  --dupe-window 2m \
  --defaults
```

Consumer: one durable pull consumer shared by every worker, explicit
acknowledgment, an `AckWait` above the slowest task, a small `MaxDeliver`,
and a `MaxAckPending` that bounds in-flight work.

```bash
nats consumer add JOBS workers \
  --pull \
  --deliver all \
  --ack explicit \
  --wait 30s \
  --max-deliver 5 \
  --max-pending 1000 \
  --filter "jobs.>" \
  --defaults
```

Workers: fetch a batch with an expiry, process each task, acknowledge on
success, negative-acknowledge with a delay on a transient failure, terminate
on a permanent one. Give every publish a `Nats-Msg-Id` so a retried publish
doesn't enqueue the task twice.

## Failure modes

| What happens | What you see | What to do |
| --- | --- | --- |
| A worker dies mid-task | Redelivered count rises; the task arrives at another worker after `AckWait` | Nothing, if the handler is idempotent. Otherwise make it so. |
| A task can never succeed | The same sequence redelivered up to `MaxDeliver`, then a max-deliveries advisory | Subscribe to the advisory and copy the task to a dead-letter stream. See [Retry and dead letter](/architecture/patterns/persistence/retry-and-dead-letter). |
| Workers fall behind | Pending count grows; publishes fail once `MaxBytes` is hit | Add workers. Raise the limit only if the backlog is temporary. |
| A task is slower than `AckWait` | Duplicate processing of in-progress tasks | Send in-progress acknowledgments, or raise `AckWait`. |
| A server holding the stream leader goes down | A pause of a few seconds while a new leader is elected | Nothing. R3 covers it. |

## Rules applied

[CONS-1](/architecture/rules/consumers#cons-1),
[CONS-2](/architecture/rules/consumers#cons-2),
[CONS-5](/architecture/rules/consumers#cons-5).

## Related

- [Load balancing with queue groups](/architecture/patterns/messaging/queue-groups),
  the non-durable version.
- [Exactly-once processing](/architecture/patterns/persistence/exactly-once-processing).
- [Acknowledging before the side effect](/architecture/anti-patterns/ack-before-side-effect).
- Learn: [Worker pool](/learn/jetstream/worker-pool),
  [Retention policies](/learn/jetstream/retention-policies).
