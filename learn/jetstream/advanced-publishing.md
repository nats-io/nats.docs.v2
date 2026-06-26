---
id: advanced-publishing
title: "Advanced publishing"
sidebar_position: 20
description: Async, atomic-batch, and fast-ingest publishing for higher throughput or grouped writes
---

# Advanced publishing

[Publishing](/learn/jetstream/publishing) sent one message at a time and
waited for each `PubAck`. That's the right default, and most services
never need more. When you do — because you publish at high volume, or you
need a group of messages to land together — JetStream offers three other
ways to publish.

This page is a map of the three, not a how-to. Each one is a larger topic
with its own protocol and per-client API; this page says what each is for
and when to reach for it, then links to the detail. Nothing about the
`ORDERS` stream changes here.

## Async publish

A normal publish blocks until the `PubAck` comes back. An **async publish**
doesn't: you fire many publishes in a row and collect their `PubAcks`
later. The round trips overlap instead of running one after another, so
throughput goes up.

The contract is the same as a synchronous publish — one `PubAck` per
message, at-least-once storage — so you still have to check every ack;
a publish you never confirm is a publish you can't trust. This is a
client-library feature with no stream setting to turn on. The exact API
varies by language; see your client's reference.

## Atomic batch publish

An **atomic batch** stores a group of messages all-or-nothing. Either the
whole batch is committed, or none of it is. Use it when several messages
only make sense together — for example, the multiple keys of one record,
where a half-written update would leave the data inconsistent.

The stream must opt in with `AllowAtomicPublish`, and the client marks
batch membership with `Nats-Batch-Id`, `Nats-Batch-Sequence`, and a final
`Nats-Batch-Commit` header. The server holds the messages until the commit,
then writes them as a unit. A batch is capped (1000 messages) and is
abandoned if it stalls or a sequence gap appears, so the commit can fail —
read the final `PubAck`. Added in server 2.12.

See [ADR-50: JetStream Batch Publishing](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md)
for the header protocol, and [Reference → Create
Stream](/reference/jetstream/api/stream/create) for the `allow_atomic`
field.

## Fast-ingest batch publish

A **fast-ingest batch** moves data into a stream at high speed without the
atomicity. It's built to replace async publish: instead of the client
guessing how fast to go, the server runs flow control over an open channel
and tells each publisher how fast it may push, so many concurrent fast
publishers stay balanced. A batch can run unbounded, and you choose whether
a dropped message fails the batch (`gap: fail`, for ordered data like an
object store) or is tolerated (`gap: ok`, for metrics).

The stream opts in with `AllowBatchPublish`. These batches aren't reliable
the way atomic ones are: in `gap: ok` mode messages can be lost without the
batch being abandoned, so it's for throughput, not guarantees. Added in
server 2.14.

See [ADR-50: JetStream Batch
Publishing](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md)
for the flow-control protocol.

## Pitfalls

A few things separate these from a plain publish.

**An async publish you never check is a lost write.** Firing publishes
without reading the `PubAcks` gives up the one guarantee a JetStream
publish offers. Collect and check every ack, or use fast-ingest, which
makes the server pace you instead.

**An atomic batch can be abandoned silently.** If the batch hits a sequence
gap, exceeds 1000 messages, or goes 10 seconds without a message, the server
drops the whole thing and raises an advisory. Treat the final `PubAck` as
the only proof the batch committed, and don't assume a half-sent batch
landed.

**`AllowAtomicPublish` and async persistence don't mix.** A stream set to
persist asynchronously (`PersistMode: async`) rejects atomic publishing,
because the atomicity depends on the synchronous write path. Fast-ingest
batches are fine on such a stream.

**Fast-ingest gaps lose data in `gap: ok` mode.** That mode keeps going
past a dropped message on purpose. Use it only when a hole is acceptable
(metrics); for anything you can't lose, use `gap: fail` or an atomic batch.

## What's next

That's the end of the JetStream deep dive. The [next
page](/learn/jetstream/where-next) recaps the model you built and points to
the chapters that take it further.

## See also

- [ADR-50: JetStream Batch Publishing](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md)
  — the full atomic and fast-ingest protocols, headers, and limits.
- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  the `allow_atomic` and `allow_batched` stream settings.
- [Reference → Publish Acknowledgement](/reference/jetstream/api/stream/pub-ack)
  — the `batch` and `count` fields a batch `PubAck` carries.
