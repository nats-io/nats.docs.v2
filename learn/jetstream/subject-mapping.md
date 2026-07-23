---
id: subject-mapping
title: Subject mapping and transforms
sidebar_position: 20
description: Rewrite subjects on the way into a stream, and republish stored messages onto new subjects
---

# Subject mapping and transforms

A [filter](/learn/jetstream/filtering) picks which stored messages a consumer
sees without ever changing a subject. **Subject mapping** rewrites the subject
itself, in three places:

- **On the way in** — a stream's *subject transform* rewrites a message's
  subject as it's stored.
- **On the way out** — *republish* re-emits each stored message onto a new
  subject, so plain core subscribers can watch a stream without a consumer.
- **While copying** — a source or a mirror can transform subjects as it pulls
  from another stream (see [Mirrors and sources](/learn/jetstream/mirrors-and-sources)).

All three use the same small transform language.

## The transform language

A transform is a `source → destination` pair. The source is a subject filter
with the usual `*` and `>` wildcards; the destination is a subject template that
pulls matched tokens back in by position:

- `{{wildcard(1)}}` — the token the first `*` matched (`{{wildcard(2)}}` the
  second, and so on). The older `$1` form means the same thing.
- `{{partition(n, 1)}}` — hash the token the first `*` matched into one of `n`
  buckets, `0`…`n-1`. The same value always lands in the same bucket, so it's a
  stable way to shard.
- A trailing `>` in the source carries across to a `>` in the destination
  unchanged — that's how `orders.>` maps to `dash.orders.>`, with every token
  after `orders` riding along.
- `{{split(1, -)}}`, `{{splitfromleft(1, 3)}}` — reshape a single matched token:
  split it wherever a bare delimiter appears (written without quotes, and it
  can't be `.`, which already separates tokens), or cut it at a character
  position.

ADR-30 (linked below) has the complete list. You'll mostly reach for `wildcard` and
`partition`; `split`, `splitfromleft`/`splitfromright`, and
`slicefromleft`/`slicefromright` chop a single token when you need it.

You can try a transform without a stream. `nats server mappings` takes the
source, the destination, and a subject, and prints what it maps to:

```bash
nats server mappings "orders.*" "orders.{{wildcard(1)}}.archived" orders.created
```

```
orders.created.archived
```

## Rewrite subjects on the way in

A stream's **subject transform** rewrites the subject a message is stored under.
The stream keeps listening on all its configured subjects: a message whose subject
matches the transform's source is stored under the rewritten subject, and any
other message is stored under its original subject. A transform rewrites subjects;
it never drops a message.

<div class="nats-flow" data-scenario="subjectTransformAnimated" data-width="680" data-height="300"></div>

A common use is deterministic partitioning: hash a token into a fixed set of
buckets so consumers can split the load by bucket. Leave `ORDERS` alone — this is
a throwaway stream that ingests on `ingest.*` and shards each message into one of
three buckets by hashing the customer token:

<div class="nats-example"
     data-type="learn-jetstream-subject-mapping-transform"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Publish a few customers' orders, and each lands under
`orders.<bucket>.<customer>`:

```bash
nats pub ingest.acme   "an order"
nats pub ingest.globex "an order"
nats pub ingest.wayne  "an order"
nats stream subjects ORDERS-SHARDED
```

```
Subject         │ Count
orders.1.acme   │ 1
orders.1.globex │ 1
orders.2.wayne  │ 1
```

Each customer hashes to the same bucket every time, so a consumer filtered to one
bucket — `orders.1.>` here — always reads the same share of customers. Add or
remove the transform on an existing stream with `nats stream edit
--transform-source/--transform-destination`, or `--no-transform` to clear it.

The transform rewrites only what gets stored from the moment it's set. It doesn't
touch messages already in the stream; the Pitfalls cover what that means.

## Republish to live subjects

**Republish** re-emits every message a stream stores onto a second subject, in
real time. Core subscribers listen on that subject and see the data flow by
without creating a consumer or replaying anything — a low-cost way to feed a
dashboard or a monitor from a stored stream.

<div class="nats-example"
     data-type="learn-jetstream-subject-mapping-republish"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Now a plain core subscription sees each order as it lands:

```bash
nats sub "dash.orders.>"
```

```
[#1] Received on "dash.orders.created"
Nats-Stream: ORDERS
Nats-Subject: orders.created
Nats-Sequence: 5
Nats-Time-Stamp: 2026-05-22T11:02:00Z
Nats-Last-Sequence: 4

{"order_id":"ord_5xk1","customer":"initech","total_cents":1500,"ts":"2026-05-22T11:02:00Z"}
```

Each republished message carries five headers describing where it came from:
`Nats-Stream`, `Nats-Subject` (the original stored subject), `Nats-Sequence`,
`Nats-Time-Stamp`, and `Nats-Last-Sequence` — the stream sequence of the previous
message *on the same subject*, or `0` if there wasn't one, so a subscriber
following one subject can tell it missed something. Any headers the publisher set
are carried through too.

`--republish-headers` sends the headers without the bodies, for subscribers that
only need to know something changed; each message then also carries a
`Nats-Msg-Size` header with the omitted body's byte count. Clear republish with
`nats stream edit ORDERS --no-republish`.

## Transform while copying

When a stream **sources** from or **mirrors** another stream, each source can
carry its own subject transform, so you can re-namespace messages as you
aggregate them — for example prefixing every region's orders as they merge into
one stream. That belongs with the copying mechanics, so it's covered on
[Mirrors and sources](/learn/jetstream/mirrors-and-sources).

## Not the same as account subject mapping

NATS also has [account-level subject mapping](/learn/core-nats/subject-mapping), configured on the server, not on a
stream. It reroutes *core* subjects before they're ever published into a stream.
That's a server-configuration topic, separate from the stream transforms on this
page.

## Pitfalls

A few ways subject mapping trips people up.

**A transform that drops a token a consumer filters on.** A destination template
keeps only the tokens you name. Rewrite `orders.*` to `orders.archived` and drop
the `{{wildcard(1)}}`, and every order is stored under the one subject
`orders.archived`, where a consumer can no longer filter by type. Keep every
token a downstream filter needs in the destination.

**Republish is not a consumer.** A republished subject is plain core NATS:
fire-and-forget, no storage, no acks, no replay. A subscriber that's down misses
whatever was republished while it was away, and nothing redelivers it. Use
republish to watch a stream live; use a consumer when a reader has to catch up on
what it missed.

**A republish destination that loops back into the stream.** The destination
can't overlap the stream's own subjects. Point a stream that ingests `orders.>`
at destination `orders.dash.>` and the server rejects it as a cycle (error
`10052`). Send republished messages to a separate subject space — `dash.orders.>`,
not something under `orders.>` — and watch for loops that span two streams in one
account, which the server can't always catch.

**Editing a transform doesn't rewrite what's already stored.** Adding or changing
a subject transform only affects messages stored after the change. Messages
already in the stream keep the subjects they were stored under. To re-namespace
existing data, copy it into a new stream that sources from the old one with the
transform applied.

**A partition count is fixed once consumers depend on it.** Consumers filter on
bucket numbers (`orders.0.>`, `orders.1.>`, …). Change `partition(3, …)` to
`partition(4, …)` later and the same customer can hash to a different bucket, so a
consumer's filter quietly starts covering a different set. Pick the bucket count
up front, the way you would for any partitioned system.

## Where you are

`ORDERS` is unchanged by the transform work — that ran on a throwaway
`ORDERS-SHARDED` stream. If you added republish to `ORDERS` above, that's the one
change; it's additive, and `nats stream edit ORDERS --no-republish` clears it. You
saw the three places JetStream rewrites a subject:

- a **subject transform** that changes the stored subject on the way in
- **republish** that re-emits stored messages onto a live subject on the way out
- the per-source transforms that rewrite subjects while copying, over on
  [Mirrors and sources](/learn/jetstream/mirrors-and-sources)

## What's next

The next page covers [per-message TTL](/learn/jetstream/message-ttl):
giving a single message a shorter lifespan than the rest of the stream.

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) — the
  `subject_transform`, `republish`, and per-source `subject_transforms` fields.
- [ADR-36: Subject Mapping Transforms in Streams](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-36.md)
  — where a transform attaches to a stream, a source, or a mirror.
- [ADR-30: Subject Transform](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-30.md)
  — the transform template functions and their exact behavior.
- [ADR-28: RePublish](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-28.md)
  — the republish headers and the loop-prevention rules.
- [Filtering what you consume](/learn/jetstream/filtering) — narrowing a
  consumer's view without changing subjects.
- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — transforms
  applied while aggregating streams.
