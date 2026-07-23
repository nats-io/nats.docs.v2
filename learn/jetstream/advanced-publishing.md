---
id: advanced-publishing
title: "Advanced publishing"
sidebar_position: 17
description: Async, atomic-batch, and fast-ingest publishing — what each is for, the order trap in async, and the code for every mode
---

# Advanced publishing

[Publishing](/learn/jetstream/publishing) sent one order at a time and waited
for each `PubAck`. That's the right default, and most services never need
anything else. Two things change that: publishing at high volume, where waiting
for each ack in turn is too slow, and writing a group of orders that only make
sense together. JetStream has three publish modes for those cases.

This page covers each one — what it does, when to reach for it, and what it
costs. The `ORDERS` stream you've used all chapter doesn't change; these are
choices the publisher makes.

## Async publish

A normal publish blocks until the `PubAck` comes back, so a service that sends a
thousand orders pays a thousand round trips end to end. An **async publish**
doesn't wait: you fire each publish and keep going, then collect the acks
afterward. The round trips overlap, so the same thousand orders take a fraction
of the wall-clock time.

The contract is unchanged — one `PubAck` per message, at-least-once storage — so
you still have to check every ack. What's new is when you check it: later, in a
batch, instead of right after each call.

### The order trap

Async publish has one failure mode a synchronous publish doesn't, and it's the
reason to understand the mode before using it.

The server numbers messages in the order they arrive and get stored. When you
fire orders 1 through 6 async, they're stored at sequences 1 through 6. Now say
order 3's ack fails — a timeout, a dropped connection — while 4, 5, and 6
succeeded.

The reorder is an after-effect of the retry. A failed publish doesn't land, so
order 3 is simply missing — and you send it again, automatically or by hand. By
then 4, 5, and 6 are already stored, so the re-sent order takes a higher sequence
and ends up *after* the orders you sent next.

<div class="nats-flow" data-scenario="asyncOrderingAnimated" data-width="840" data-height="380"></div>

There are two fixes, for two different problems:

- **If the ack was lost but the message was actually stored**, re-publishing
  stores a second copy. Give each publish a stable `Nats-Msg-Id` (the same header
  from [Avoiding duplicate writes](/learn/jetstream/publishing#avoiding-duplicate-writes)),
  and the server drops the repeat instead of storing it twice.
- **If the order itself matters**, set `Nats-Expected-Last-Subject-Sequence` on
  each publish. The server stores the message only when the subject's last
  sequence is the one you expect, and rejects it otherwise. An out-of-order
  retry then fails fast — you handle the rejection — instead of silently landing
  in the wrong place.

One rule covers the rest: **an async publish you never check is a lost write.**
Firing publishes without reading the acks gives up the only guarantee a
JetStream publish offers. Collect every ack and confirm it.

Async publish is a client-library feature — there's no stream setting to turn it
on — and the API differs by language. Each one below fires several orders without
awaiting each ack, then collects and checks them all afterward:

<div class="nats-example"
     data-type="learn-jetstream-advanced-publishing-async"
     data-languages="js,go,python,java,rust,csharp,c"></div>

A note per language: Go, Java, .NET, and Rust have a dedicated async-publish call
that hands back a future you collect; nats.js does it by not awaiting each
`publish()` and gathering the promises; nats.py has no first-class async publish,
so the example approximates it with `asyncio.gather` and you add your own limit on
how many run at once. On the CLI, the everyday `nats pub` is synchronous; the
async path lives in the benchmark, `nats bench js pub async orders.created --batch 1000`.

## Atomic batch publish

An **atomic batch** stores a group of messages all-or-nothing. Either the whole
batch commits, or none of it does. Use it when several messages only make sense
together — the line items of one order, where a half-written order would leave
the data inconsistent.

<div class="nats-flow" data-scenario="atomicBatchAnimated" data-width="780" data-height="320"></div>

The stream opts in with `AllowAtomicPublish`. The client opens a batch with a
`Nats-Batch-Id`, tags each message with an increasing `Nats-Batch-Sequence`, and
marks the last one with `Nats-Batch-Commit`. The server holds the messages in a
staging buffer and writes them as a unit only on commit. The committing `PubAck`
carries two extra fields, `batch` and `count`, so you can confirm the whole group
landed.

A batch is bounded, and it can be abandoned. By default it's capped at 1,000
messages and a stream allows at most 50 batches in flight — both are
operator-configurable server limits, not fixed protocol caps. A sequence gap or
an over-limit batch is rejected with an error `PubAck`, so the publisher hears
about it. A batch that goes ten seconds without a message is dropped with no
error reply — the server raises a `stream_batch_abandoned` advisory instead of
committing a partial group. Treat the final `PubAck` as the only proof the batch
committed. Atomic batch was added in server 2.12.

Opt the stream in with `AllowAtomicPublish`, then open a batch, stage messages,
and commit them as a unit. The CLI and nats.js have this in the core client; Go,
Java, Rust, and .NET reach it through the [Synadia
Orbit](https://github.com/synadia-io) companion libraries; nats.py drives it with
the `Nats-Batch-*` headers directly. Each example commits three line items of one
order:

<div class="nats-example"
     data-type="learn-jetstream-advanced-publishing-atomic"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The wire protocol is the same underneath — the `Nats-Batch-Id`,
`Nats-Batch-Sequence`, and `Nats-Batch-Commit` headers — so a client without an
Orbit helper can drive a batch with raw headers, as the Python tab shows. See
[ADR-50](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md)
for the full header set and limits.

## Fast-ingest batch publish

A **fast-ingest batch** moves data into a stream at high speed with the server
setting the pace. It's built to replace async publish: instead of the client
guessing how fast to push and paying to track every ack, the client opens one
channel and the server runs flow control over it. The server acks in batches and
tells each publisher how fast it may go — ramping up while it keeps up, slowing
down under load — so many concurrent fast publishers stay balanced.

<div class="nats-flow" data-scenario="fastIngestAnimated" data-width="760" data-height="300"></div>

It trades away atomicity, and that trade is the choice you make per batch. A
batch can run unbounded, and a dropped message means one of two things:

- **`gap: fail`** abandons the batch on the first gap, so what's stored is in
  order with no holes. Use it for ordered data, like the chunks of an object.
- **`gap: ok`** reports the gap and keeps going. Use it where a hole is
  acceptable, like a stream of metrics.

The stream opts in with `AllowBatchPublish`. Fast-ingest was added in server
2.14, and client support is still landing:

| Client | Fast-ingest publish |
| --- | --- |
| CLI | `nats bench js pub fast` (benchmark only) |
| Go | Synadia Orbit — `jetstreamext.NewFastPublisher` |
| Rust | Synadia Orbit — `jetstream_extra`'s `fast_publish` |
| nats.js | Synadia Orbit — `@synadiaorbit/fastingest` (`startFastIngest`) |
| Python, Java, .NET | `AllowBatchPublish` stream flag; Orbit publishers catching up |

Because there's no stable public publisher in most clients, this page doesn't
show per-language code for it. When you need fast ingest today, the practical
paths are the Orbit libraries for Go, Rust, and JavaScript; the rest will follow.
The flow-control protocol is in
[ADR-50](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md).

## Choosing a mode

Most services should publish one at a time and check each `PubAck`. Reach past
that only when one of these is true:

| Mode | Reach for it when | All-or-nothing | Opt-in |
| --- | --- | --- | --- |
| One at a time | The default — simple, ordered, safe to retry | n/a | none |
| Async | You publish at volume and one-at-a-time is too slow | no | none |
| Atomic batch | A group of messages must land together or not at all | yes | `AllowAtomicPublish` |
| Fast-ingest | You need maximum sustained throughput and can tolerate (or fail on) gaps | no | `AllowBatchPublish` |

## Pitfalls

A few things separate these modes from a plain publish.

**An async publish you never check is a lost write.** Firing publishes without
reading the `PubAcks` gives up the one guarantee a JetStream publish offers.
Collect and check every ack — and if order matters, add
`Nats-Expected-Last-Subject-Sequence` so a retry fails fast instead of landing
out of order.

**An atomic batch can be abandoned.** A sequence gap or a batch over the size
limit (1,000 messages by default) comes back as an error `PubAck`. A batch that
goes ten seconds without a message is dropped with no error reply — only an
advisory. Either way the whole batch is dropped, so treat the final `PubAck` as
the only proof it committed; don't assume a half-sent batch landed.

**`AllowAtomicPublish` and async persistence don't mix.** A stream set to persist
asynchronously (`PersistMode: async`) rejects atomic publishing, because the
atomicity depends on the synchronous write path. Fast-ingest batches are fine on
such a stream.

**Fast-ingest gaps lose data in `gap: ok` mode.** That mode keeps going past a
dropped message on purpose. Use it only when a hole is acceptable, like metrics;
for anything you can't lose, use `gap: fail` or an atomic batch.

## Where you are

Nothing about `ORDERS` changed on this page. You now have the three publish modes
beyond one-at-a-time, and the code for the one most services actually reach for:

- **Async** overlaps round trips for throughput. You collect and check every
  `PubAck` yourself, and watch the order trap on retries.
- **Atomic batch** commits a group all-or-nothing, gated by `AllowAtomicPublish`.
- **Fast-ingest batch** trades atomicity for server-paced speed, gated by
  `AllowBatchPublish`.

The default one-at-a-time publish from the
[publishing page](/learn/jetstream/publishing) still fits most services.

## What's next

The next page covers copying a stream's data elsewhere: **mirrors and sources**,
the building blocks for read-replicas, aggregation, and disaster recovery across
regions.

## See also

- [ADR-50: JetStream Batch Publishing](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-50.md)
  — the full atomic and fast-ingest protocols, headers, and limits.
- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  the `allow_atomic` and `allow_batched` stream settings.
- [Reference → JetStream Headers](/reference/jetstream/api/headers) —
  `Nats-Expected-Last-Subject-Sequence` and the batch headers.
- [Reference → Publish Acknowledgement](/reference/jetstream/api/stream/pub-ack)
  — the `batch` and `count` fields a batch `PubAck` carries.
