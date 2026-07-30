---
id: where-next
title: "Where to go next"
sidebar_position: 23
description: Recap the JetStream model and point to what comes after this chapter
---

# Where to go next

This chapter started with a publisher and no one guaranteed to be
listening. It ends with an `ORDERS` stream, a handful of consumers
reading it at their own pace, and a mirror keeping a permanent copy.

This page gathers the model you built into one place. It then points you
at the chapters and Reference that take it further.

## The core model

Every page in this chapter built on the same three ideas.

A **stream** is a log of messages kept on the server. You publish to a
subject. The server adds the message to any stream that captures that
subject. The message stays there, ready to be read again, until a limit
removes it.

A consumer is a position marker over a stream. It tracks which messages a
reader has seen, separately from every other consumer. Two consumers on
the same stream can read the same messages at different positions without
affecting each other.

An ack is the reader's way of saying a message is handled. Until the
consumer acks, the message stays open, and the server sends it again
after a timeout. A stored message has not yet been processed.

Everything else in this chapter builds on stream, consumer, and ack. That
includes filtering, worker pools, retention, and mirrors.

## Where the details live

This chapter teaches the ideas and is not tied to a server version. The
exact flags, defaults, and ranges live in **Reference**, which is tied to
a version and covers every option. When you need the precise type of a
config field, or the full list of consumer options, look there.

The [Reference root](/reference/) is the way in. The pointers to
Reference throughout this chapter all lead into it.

## Sibling deep dives

This was the first deep dive. The others build on the same foundation, so
the stream, consumer, and ack model carries into them.

The [Key-Value deep dive](/learn/key-value) shows how a key-value bucket
is a stream underneath. The keys become subjects. The history becomes
sequence numbers. A watch is a consumer. Everything you learned about
retention and limits applies directly.

The [Object Store deep dive](/learn/object-store) does the same for large
files. An object is split across many messages in a stream, then put back
together when you read it. The stream is still where the data lives.

The [Clustering & Replication deep dive](/learn/clustering) goes deeper
than this chapter's single page on surviving node loss. It covers how
`R=3` picks a leader, how the server decides where to place the stream,
and what happens when a node fails.

The [Monitoring deep dive](/learn/monitoring) covers how to watch a
stream and its consumers in production. It walks through advisories,
health endpoints, and the numbers that tell you a consumer is falling
behind.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
day-to-day operations: saving a stream to a snapshot, restoring it, and
using the mirrors you met on the
[Mirrors and sources](/learn/jetstream/mirrors-and-sources) page to recover
from a disaster.

## Where you are

This is the end of the chapter. This page adds nothing new to the running
example. The `ORDERS` stream, its consumers, and its mirror are still
running in your session as you left them on the previous page. You can
keep experimenting with them, or remove them with `nats stream rm
ORDERS` when you're done.

You now have the core model. A stream stores messages. A consumer reads
them at its own pace. An ack confirms a message was handled. That model
sits under every other JetStream feature.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This gathers
the action items from all of them in one place. Each group links back to
the page that explains it.

### Your first stream — see [Pitfalls](/learn/jetstream/your-first-stream#pitfalls)

- [ ] Stay on plain pub-sub when the next message supersedes the last; reach for a stream only when a missed message has consequences.
- [ ] Set at least one limit (`MaxAge`, `MaxBytes`, or `MaxMsgs`) so an unbounded stream never fills the disk.
- [ ] Pick the stream name deliberately the first time; there's no rename, only delete-and-recreate.
- [ ] Choose the retention policy before messages flow; switching to or from WorkQueue on a live stream is rejected.

### Publishing — see [Pitfalls](/learn/jetstream/publishing#pitfalls)

- [ ] Read the `PubAck` back; a plain `nats pub` line isn't proof the message was stored.
- [ ] Give every retryable publish a stable `Nats-Msg-Id` so a retry doesn't double-store.
- [ ] Wait for delivery and ack before acting on a business outcome; a `PubAck` means stored, not processed.

### Reading back — see [Pitfalls](/learn/jetstream/reading-back#pitfalls)

- [ ] Reach for `--all` only when you want the whole history; sample the tail with `--last`, `--since`, or `--start-sequence`.
- [ ] Use a named, durable consumer for any read you must resume after a disconnect; an ephemeral one restarts from sequence 1.
- [ ] Edit a durable consumer to change it; recreating with a new config is rejected as already-exists.
- [ ] Confirm `--all` versus `--new` matches the question (backlog or live traffic) before you run the command.
- [ ] Pair `--all` with `--terminate-at-end` for a one-shot replay; on its own it drains the backlog then blocks waiting for more.

### Delivery and acknowledgment — see [Pitfalls](/learn/jetstream/delivery-and-acknowledgment#pitfalls)

- [ ] Set Ack Wait longer than your slowest handler, with headroom, to avoid a redelivery storm.
- [ ] Ack on every success path, and term a genuinely unprocessable message so it stops coming back.
- [ ] Ack each delivery exactly once, in one place in your handler; a second ack is a no-op the server ignores.

### Filtering — see [Pitfalls](/learn/jetstream/filtering#pitfalls)

- [ ] Confirm the filter matches a subject the stream stores before assuming an empty pull means an empty stream.
- [ ] Decide retention through stream limits, not filters; a filter narrows a view, it never deletes messages.
- [ ] Keep multiple filter subjects on one consumer disjoint; the server rejects overlap inside a single consumer.

### Ack responses and redelivery — see [Pitfalls](/learn/jetstream/acknowledgment#pitfalls)

- [ ] Nak a transient failure with a delay, or set a backoff, instead of a bare nak that loops at network speed.
- [ ] Term a poison message the moment the code knows no attempt will succeed, rather than burning the delivery budget.
- [ ] Subscribe to the max-deliveries advisory so a dropped message doesn't vanish unnoticed; JetStream has no dead-letter queue.
- [ ] Raise AckWait or send in-progress for long jobs so a slow handler doesn't trigger double work.

### Pull consumers — see [Pitfalls](/learn/jetstream/pull-consumers#pitfalls)

- [ ] Treat an empty fetch as "nothing right now" and loop; never as an error that crashes the worker.
- [ ] Always set an `expires` on a fetch so a quiet stream returns control instead of stalling.
- [ ] Keep `MaxAckPending` at or above your batch size so it doesn't throttle throughput.
- [ ] Pair `batch` with `max_bytes` so a single pull is bounded by size as well as count.

### Scaling a consumer — see [Pitfalls](/learn/jetstream/worker-pool#pitfalls)

- [ ] Key every side effect by `order_id` so a redelivered message is a no-op, not a double shipment.
- [ ] Size `MaxAckPending` to at least your worker count, with headroom; the cap is shared across the whole pool.
- [ ] Tune `AckWait` to real processing time so a crashed worker's message recovers without redelivering honest work.

### Ordered consumers — see [Pitfalls](/learn/jetstream/ordered-consumer#pitfalls)

- [ ] Reach for an ordered consumer only for a read you can restart from the top; for work that must land once, use a named consumer with explicit ack.
- [ ] Split work across processes with a named consumer and a worker pool; two ordered consumers each read the whole stream instead of sharing it.
- [ ] Don't build a resumable job on an ordered consumer; its cursor is disposable by design and starts over after a crash.

### Priority groups — see [Pitfalls](/learn/jetstream/priority-groups#pitfalls)

- [ ] Run one priority group per consumer; passing more than one silently uses only the first.
- [ ] Drive failover with `min_pending` or `min_ack_pending`; the ADR-42 `failover` timer isn't shipped yet.
- [ ] Lean on explicit acks and idempotent handlers, not the pin, to keep work from doubling up; the pin is not a lock.
- [ ] Keep each pull's `expires` comfortably under `--pinned-ttl` so a pinned client renews in time.

### Pausing a consumer — see [Pitfalls](/learn/jetstream/pausing#pitfalls)

- [ ] Pause with a duration like `1h` so the deadline can never land in the past and no-op.
- [ ] Size the stream for the longest pause you expect; publishes keep landing and count against the limits while a consumer sleeps.

### Shaping the stream — see [Pitfalls](/learn/jetstream/shaping-the-stream#pitfalls)

- [ ] Switch to Discard New when you need backpressure; Discard Old drops the oldest message silently.
- [ ] Size `MaxBytes` for your peak, not your average, when the age window matters; either limit can fire first.
- [ ] Add `MaxMsgsPerSubject` when each subject deserves its own retention; whole-stream limits let one noisy subject starve a quiet one.

### Retention policies — see [Pitfalls](/learn/jetstream/retention-policies#pitfalls)

- [ ] Create a new stream to move to or from WorkQueue; the server locks that change on a live stream.
- [ ] Give each WorkQueue consumer a disjoint filter, or share one consumer as a pool; overlapping consumers are rejected.
- [ ] Watch disk on an Interest stream with a stopped consumer; interest means messages wait for every registered consumer's ack.
- [ ] Treat a live switch from Limits to Interest as destructive; it re-applies to stored messages and can drop already-acked history.

### Per-message TTL — see [Pitfalls](/learn/jetstream/message-ttl#pitfalls)

- [ ] Confirm `Allows Per-Message TTL` is on before relying on `Nats-TTL`; a header on an opted-out stream fails the publish.
- [ ] Size a TTL to outlast the slowest healthy consumer's lag; the clock deletes the stored copy whether or not it was read.
- [ ] Set `SubjectDeleteMarkerTTL` only when consumers must learn a value expired, and keep it at or below your shortest TTL.

### Altering stream state — see [Pitfalls](/learn/jetstream/altering-stream-state#pitfalls)

- [ ] Use `nats stream purge` to clear messages and `nats stream rm` to delete the stream; don't swap the two.
- [ ] Treat a sequence as a stable address that may hold no message; never assume messages run `1..N` without gaps.
- [ ] Set `DenyPurge` on a stream that matters, and keep a mirror; a purge can't be undone.

### Surviving node loss — see [Pitfalls](/learn/jetstream/surviving-node-loss#pitfalls)

- [ ] Confirm the replica count before trusting a stream with real orders; R=1 has no copy to recover from.
- [ ] Use odd replica counts: R=3 for the production floor, R=5 for state you can't re-derive.
- [ ] Prove failover on a real cluster; a green single-node run can't show leader election or a node loss.

### Advanced publishing — see [Pitfalls](/learn/jetstream/advanced-publishing#pitfalls)

- [ ] Collect and check every `PubAck` on an async publish; add `Nats-Expected-Last-Subject-Sequence` when order matters so a retry fails fast.
- [ ] Treat the final `PubAck` as the only proof an atomic batch committed; a sequence gap, an oversized batch, or a ten-second idle drops the whole batch.
- [ ] Keep atomic publishing off a stream set to `PersistMode: async`; the server rejects it, though fast-ingest batches are fine there.
- [ ] Choose `gap: ok` only when a lost message is acceptable; use `gap: fail` or an atomic batch for anything you can't lose.

### Mirrors and sources — see [Pitfalls](/learn/jetstream/mirrors-and-sources#pitfalls)

- [ ] Publish to the upstream stream, not the mirror; a mirror captures no subjects, so a plain publish lands in the origin, and forcing the mirror by name errors with `expected stream does not match`.
- [ ] Read the `Lag` field before assuming a mirror is current; a mirror is eventually consistent, not synchronous.
- [ ] Pick `filter_subject` or `subject_transforms` on one entry, never both; the server rejects a config that sets both.
- [ ] Verify each export type for cross-domain sourcing; a wrong type lets the mirror silently never catch up.

### Reading messages directly — see [Pitfalls](/learn/jetstream/get-direct#pitfalls)

- [ ] Confirm `Direct Get: true`, or set `--allow-direct`, before a direct read; without it the request just times out.
- [ ] Keep direct reads off read-after-write checks; they can answer from a trailing replica, so read with `nats stream get` against the leader there.
- [ ] Use a consumer, not a direct batch, when you need to follow the stream; a batch reads the backlog once and stops.

### Subject mapping — see [Pitfalls](/learn/jetstream/subject-mapping#pitfalls)

- [ ] Keep every token a downstream consumer filters on in the transform's destination; dropping a `{{wildcard}}` collapses messages under one subject.
- [ ] Use a consumer when a reader has to catch up on what it missed; republish is fire-and-forget core NATS with no storage or replay.
- [ ] Point a republish destination at a separate subject space, not one under the stream's own subjects; an overlap is rejected as a cycle (`10052`).
- [ ] Re-namespace existing data by sourcing it into a new stream with the transform; editing a transform leaves already-stored messages untouched.
- [ ] Pick the partition count up front; raising it later re-hashes keys, so a consumer's filter quietly starts covering a different set.

### Stream and consumer policies — see [Pitfalls](/learn/jetstream/policies#pitfalls)

- [ ] Settle the fixed policies — storage, persist mode, deliver, ack, and replay — before creating anything durable; `stream edit` and `consumer edit` can't change them.
- [ ] Plan the data move when a fixed policy must change; recreating a stream needs a mirror or a re-publish, and a recreated consumer starts fresh, not where the old one stopped.
- [ ] Treat `--deliver new` as a one-time start position, not a per-restart skip; a durable resumes from its saved position on reconnect.
- [ ] Check whether "last per subject" means the deliver policy or the Direct Get flag before copying a command.

## See also

- [Reference](/reference/) — every config field, flag, default, and
  error code, versioned and exhaustive.
- [Key-Value deep dive](/learn/key-value) — the next chapter built on the
  same stream foundation.
- [Clustering & Replication deep dive](/learn/clustering) — the detail
  behind "surviving node loss."
