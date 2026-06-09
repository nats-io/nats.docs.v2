---
id: where-next
title: "18. Where to go next"
sidebar_position: 19
description: Recap the JetStream mental model and point to what comes after this chapter
---

# 18. Where to go next

You started this chapter with a publisher shouting into the void and no
one guaranteed to be listening. You end it with an `ORDERS` stream, a
handful of consumers reading it at their own pace, and a mirror keeping a
permanent copy. That is the whole arc.

This page does not teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The whole game in three words

Every page in this chapter circled the same three ideas. If you remember
nothing else, remember these.

A **stream** is a server-side log of messages. You publish to a subject,
the server appends the message to any stream that captures that subject,
and it stays there — replayable — until a limit removes it. The stream
is what core NATS lacked: a place for a message to wait.

A **consumer** is a cursor over a stream. It tracks which messages a
reader has seen, independent of every other consumer. Two consumers on
the same stream read the same messages at different positions, and
neither one disturbs the other.

An **ack** is the reader's promise that a message is handled. Until the
consumer acks, the message stays in flight, and the server redelivers it
after a timeout. The ack is what turns "the message was stored" into
"the work is done."

Stream, consumer, ack. Everything else in this chapter — filtering,
worker pools, retention, mirrors — is a refinement of those three.

## Where the details live now

The chapter is unversioned and concept-first. The exact flags, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise type of a config field or the full list of consumer
options, that is where to look.

The [Reference root](/reference/) is the entry point. The handoff
phrases throughout this chapter — "the full set of options is documented
in Reference" — all point into it.

## Sibling deep dives

This was the first deep dive. The others build on the same foundation, so
the stream-consumer-ack model carries straight into them.

The [Key-Value deep dive](/learn/key-value) shows how a key-value bucket
is a stream underneath. The keys map to subjects, the history maps to
sequence numbers, and a watch is a consumer. Everything you learned about
retention and limits applies directly.

The [Object Store deep dive](/learn/object-store) does the same for large
blobs. An object is chunked across many messages in a stream, then
reassembled on read. The stream is still the storage layer.

The [Clustering & Replication deep dive](/learn/clustering) goes deeper
than this chapter's single page on surviving node loss. It covers how
`R=3` actually elects a leader, how placement works, and what happens
during a node failure.

The [Monitoring deep dive](/learn/monitoring) covers how to watch a
stream and its consumers in production — advisories, health endpoints,
and the metrics that tell you a consumer is falling behind.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
operational side: snapshotting a stream, restoring it, and using the
mirrors you met on the previous page for disaster recovery.

## Where you are

This is the end of the chapter — the whole arc is complete, and no new
scenario state is introduced here. The `ORDERS` stream, its consumers,
and its mirror are still running in your session exactly as you left them
on the previous page. You can keep experimenting with them, or tear them
down with `nats stream rm ORDERS` when you are done.

You hold the core model: a stream stores messages, a consumer reads them
at its own pace, and an ack closes the loop. That model is the floor for
every other JetStream feature you will meet.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place — a last pass before you
trust a stream with real orders. Each group links back to the page that
explains the why.

### Why a stream — see [Pitfalls](/learn/jetstream/why-a-stream#pitfalls)

- [ ] Run a service that subscribes and responds where you need a reply; a stream stores, it never answers requests.
- [ ] Stay on plain pub-sub when the next message supersedes the last; reach for a stream only when a missed message has consequences.

### Your first stream — see [Pitfalls](/learn/jetstream/your-first-stream#pitfalls)

- [ ] Set at least one limit (`MaxAge`, `MaxBytes`, or `MaxMsgs`) so an unbounded stream never fills the disk.
- [ ] Pick the stream name deliberately the first time; there is no rename, only delete-and-recreate.
- [ ] Choose the retention policy before messages flow; switching to or from WorkQueue on a live stream is rejected.

### Publishing — see [Pitfalls](/learn/jetstream/publishing#pitfalls)

- [ ] Read the `PubAck` back; a plain `nats pub` line is not proof the message was stored.
- [ ] Give every retryable publish a stable `Nats-Msg-Id` so a retry does not double-store.
- [ ] Wait for delivery and ack before acting on a business outcome; a `PubAck` means stored, not processed.

### Reading back — see [Pitfalls](/learn/jetstream/reading-back#pitfalls)

- [ ] Reach for `--all` only when you want the whole history; sample the tail with `--last`, `--since`, or `--start-sequence`.
- [ ] Use a named, durable consumer for any read you must resume after a disconnect; an ephemeral one restarts from sequence 1.
- [ ] Confirm `--all` versus `--new` matches the question — backlog or live traffic — before you run the command.

### Your first consumer — see [Pitfalls](/learn/jetstream/your-first-consumer#pitfalls)

- [ ] Set Ack Wait longer than your slowest handler, with headroom, to avoid a redelivery storm.
- [ ] Ack on every success path, and term a genuinely unprocessable message so it stops coming back.
- [ ] Ack each delivery exactly once, in one place in the handler.
- [ ] Edit a durable consumer to change it; recreating with a new config is rejected as already-exists.

### Filtering — see [Pitfalls](/learn/jetstream/filtering#pitfalls)

- [ ] Confirm the filter matches a subject the stream stores before assuming an empty pull means an empty stream.
- [ ] Decide retention through stream limits, not filters; a filter narrows a view, it never deletes messages.
- [ ] Keep multiple filter subjects on one consumer disjoint; the server rejects overlap inside a single consumer.

### Acknowledgment — see [Pitfalls](/learn/jetstream/acknowledgment#pitfalls)

- [ ] Nak a transient failure with a delay, or set a backoff, instead of a bare nak that loops at network speed.
- [ ] Term a poison message the moment the code knows no attempt will succeed, rather than burning the delivery budget.
- [ ] Subscribe to the max-deliveries advisory so a dropped message does not vanish unnoticed; JetStream has no dead-letter queue.
- [ ] Raise AckWait or send in-progress for long jobs so a slow handler does not trigger double work.

### Pull consumers — see [Pitfalls](/learn/jetstream/pull-consumers#pitfalls)

- [ ] Treat an empty fetch as "nothing right now" and loop; never as an error that crashes the worker.
- [ ] Always set an `expires` on a fetch so a quiet stream returns control instead of stalling.
- [ ] Keep `MaxAckPending` at or above your batch size so it does not throttle throughput.
- [ ] Pair `batch` with `max_bytes` so a single pull is bounded by size as well as count.

### A pool of workers — see [Pitfalls](/learn/jetstream/worker-pool#pitfalls)

- [ ] Key every side effect by `order_id` so a redelivered message is a no-op, not a double shipment.
- [ ] Size `MaxAckPending` to at least your worker count, with headroom; the cap is shared across the whole pool.
- [ ] Tune `AckWait` to real processing time so a crashed worker's message recovers without redelivering honest work.

### Priority groups — see [Pitfalls](/learn/jetstream/priority-groups#pitfalls)

- [ ] Run one priority group per consumer; passing more than one silently uses only the first.
- [ ] Drive failover with `min_pending` or `min_ack_pending`; the ADR-42 `failover` timer is not yet shipped.
- [ ] Lean on explicit acks and idempotent handlers, not the pin, to keep work from doubling up; the pin is not a lock.
- [ ] Keep each pull's `expires` comfortably under `--pinned-ttl` so a pinned client renews in time.

### Pausing a consumer — see [Pitfalls](/learn/jetstream/pausing#pitfalls)

- [ ] Read the `Paused Until Deadline` line before debugging a "stuck" consumer; a pause looks like a stall.
- [ ] Pause with a duration like `1h` so the deadline can never land in the past and no-op.
- [ ] Size the stream for the longest pause you expect; publishes keep landing and count against the limits while a consumer sleeps.

### Push vs pull — see [Pitfalls](/learn/jetstream/push-vs-pull#pitfalls)

- [ ] Start new work on a pull consumer; push consumers are deprecated and cannot be flipped to pull in place.
- [ ] Enable flow control if you must run an inherited push consumer on a hot stream; better yet, migrate to pull.
- [ ] Subscribe with the matching deliver group, not bare; a plain subscriber receives the full firehose.

### Shaping the stream — see [Pitfalls](/learn/jetstream/shaping-the-stream#pitfalls)

- [ ] Switch to Discard New when you need backpressure; Discard Old drops the oldest message silently.
- [ ] Size `MaxBytes` for your peak, not your average, when the age window matters; either limit can fire first.
- [ ] Add `MaxMsgsPerSubject` when each subject deserves its own retention; whole-stream limits let one noisy subject starve a quiet one.

### Delivery semantics — see [Pitfalls](/learn/jetstream/delivery-semantics#pitfalls)

- [ ] Create a new stream to move to or from WorkQueue; the server locks that change on a live stream.
- [ ] Give each WorkQueue consumer a disjoint filter, or share one consumer as a pool; overlapping consumers are rejected.
- [ ] Monitor consumer health on an Interest stream; a stalled consumer keeps unacked messages from leaving and fills the disk.

### Per-message TTL — see [Pitfalls](/learn/jetstream/message-ttl#pitfalls)

- [ ] Confirm `Allows Per-Message TTL` is on before relying on `Nats-TTL`; a header on an opted-out stream fails the publish.
- [ ] Size a TTL to outlast the slowest healthy consumer's lag; the clock deletes the stored copy whether or not it was read.
- [ ] Set `SubjectDeleteMarkerTTL` only when consumers must learn a value expired, and keep it at or below your shortest TTL.

### Surviving node loss — see [Pitfalls](/learn/jetstream/surviving-node-loss#pitfalls)

- [ ] Confirm the replica count before trusting a stream with real orders; R=1 has no copy to recover from.
- [ ] Use odd replica counts — R=3 for the production floor, R=5 for state you cannot re-derive.
- [ ] Prove failover on a real cluster; a green single-node run cannot show leader election or a node loss.

### Mirrors and sources — see [Pitfalls](/learn/jetstream/mirrors-and-sources#pitfalls)

- [ ] Publish to the upstream stream, not the mirror; a mirror captures no subjects and replies `no responders`.
- [ ] Read the `Lag` field before assuming a mirror is current; a mirror is eventually consistent, not synchronous.
- [ ] Pick `filter_subject` or `subject_transforms` on one entry, never both; the server rejects a config that sets both.
- [ ] Verify each export type for cross-domain sourcing; a wrong type lets the mirror silently never catch up.

## See also

- [Reference](/reference/) — every config field, flag, default, and
  error code, versioned and exhaustive.
- [Key-Value deep dive](/learn/key-value) — the next chapter built on the
  same stream foundation.
- [Clustering & Replication deep dive](/learn/clustering) — the deeper
  story behind "surviving node loss."
