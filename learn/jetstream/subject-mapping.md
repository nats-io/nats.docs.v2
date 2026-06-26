---
id: subject-mapping
title: Subject mapping and transforms
sidebar_position: 6.6
description: Rewrite subjects on the way into a stream, and republish stored messages onto new subjects
---

# Subject mapping and transforms

{/* DRAFT — skeleton to flesh out. CLI-only examples for now; multi-language
     examples come once the page settles. */}

A [filter](/learn/jetstream/filtering) narrows which stored messages a consumer
receives, but it never changes a subject. **Subject mapping** does change the
subject. JetStream rewrites subjects in three places:

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

- `{{wildcard(1)}}` — the first `*` token from the source.
- `{{partition(n, 1)}}` — hash the first token into one of `n` buckets
  (`0`…`n-1`), for deterministic partitioning.
- `{{split(2, ".")}}`, `{{splitfromleft(1, 3)}}` — split or slice a token.

So `orders.*` → `orders.{{wildcard(1)}}.archived` turns `orders.created` into
`orders.created.archived`. You can try a transform without a stream:

```bash
nats server mappings "orders.*" "orders.{{wildcard(1)}}.archived" orders.created
```

{/* TODO: confirm the full function list (wildcard, partition, split,
     splitfromleft/right, slicefromleft/right) against the reference and link it. */}

## Rewrite subjects on the way in

A stream's **subject transform** changes the subject under which a message is
stored. The stream still listens on its configured subjects; the transform
decides what each stored message's subject becomes.

A common use is deterministic partitioning: tag every order with a partition
bucket so downstream consumers can split the load by bucket. Hash the order's
type token into three buckets:

```bash
nats stream add ORDERS \
  --subjects "orders.>" \
  --transform-source "orders.*" \
  --transform-destination "orders.{{partition(3,1)}}.{{wildcard(1)}}" \
  --defaults
```

`orders.created` is now stored as `orders.0.created` (or `.1.`/`.2.`), so a
consumer filtered to `orders.0.>` sees only one bucket. Add or remove the
transform on an existing stream with `nats stream edit --transform-source/
--transform-destination`, or `--no-transform` to clear it.

{/* TODO: tie this to the worker-pool / partitioned-consumer scaling story,
     and show a consumer reading a single bucket. Decide whether partitioning
     lives here or on the worker-pool page. */}

## Republish to live subjects

**Republish** re-emits every message a stream stores onto a second subject, in
real time. Core subscribers listen on that subject and see the data flow by
without creating a consumer or replaying anything — a cheap bridge from a stored
stream to live, fire-and-forget delivery, useful for a dashboard or a monitor.

```bash
nats stream edit ORDERS \
  --republish-source "orders.>" \
  --republish-destination "dash.orders.>"
```

Now a plain core subscription sees each order as it lands:

```bash
nats sub "dash.orders.>"
```

Each republished message carries headers with the original stream, sequence, and
subject, so a subscriber can still tell where it came from. Add
`--republish-headers` to send only the headers, not the bodies, when subscribers
just need to know that something changed.

{/* TODO: show the republish headers (Nats-Stream, Nats-Sequence,
     Nats-Subject, Nats-Last-Sequence) and contrast republish (no durability,
     no replay) with a real consumer. */}

## Transform while copying

When a stream **sources** from or **mirrors** another stream, each source can
carry its own subject transform, so you can re-namespace messages as you
aggregate them — for example prefixing every region's orders as they merge into
one stream. That belongs with the copying mechanics, so it's covered on
[Mirrors and sources](/learn/jetstream/mirrors-and-sources).

## Not the same as account subject mapping

NATS also has account-level subject mapping (configured on the server, not on a
stream), which reroutes *core* subjects before they're ever published into a
stream. That's a server-configuration topic, not a JetStream one.

{/* TODO: link the core subject-mapping concept page once confirmed. */}

## Pitfalls

{/* TODO: flesh out. Candidates:
     - a transform destination that drops tokens you later need to filter on
     - republish has no durability or replay — it is not a consumer
     - changing a stream's subject transform doesn't rewrite already-stored
       messages
     - partition bucket count is fixed once consumers depend on it */}

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) — the
  `subject_transform`, `republish`, and per-source `subject_transforms` fields.
- [Filtering what you consume](/learn/jetstream/filtering) — narrowing a
  consumer's view without changing subjects.
- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — transforms
  applied while aggregating streams.
