---
id: mirrors-and-sources
title: "17. Mirrors and sources"
sidebar_position: 18
description: Copy one stream into another, or aggregate many streams into one
---

# 17. Mirrors and sources

So far the `ORDERS` stream has stood alone. Every page has read from it,
written to it, or shaped it — but always the one stream.

This page introduces the two ways one stream can be built from another.
A **mirror** is a read-only copy of a single stream. **Sources**
aggregate many streams into one.

Both behaviors are specified in
[ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md), the authoritative document for stream
sourcing and mirroring.

## A mirror is a read-only copy

A mirror is a stream that continuously copies every message from one
upstream stream. The server runs a hidden internal consumer on the
upstream and appends each message it reads into the mirror.

The copy is exact. A message in the mirror keeps the same sequence
number, the same timestamp, and the same subject it had upstream. If
`orders.created` was sequence `1` in `ORDERS`, it is sequence `1` in the
mirror too.

A mirror is read-only. You cannot publish to it directly, because it has
no captured subjects of its own — its only job is to follow the
upstream. The mirror rejects any `nats pub` aimed at it.

A mirror keeps its own retention. The upstream might keep messages for
seven days while the mirror keeps them forever. The copy keeps all
messages from upstream; the mirror's own retention limits decide what it
stores locally.

## Build the ORDERS-ARCHIVE mirror

Create a second stream that mirrors `ORDERS`. Call it `ORDERS-ARCHIVE`,
and give it no limits, so it becomes a permanent record of every order:

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-createMirror"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The `--mirror ORDERS` flag is the whole trick. It tells the server this
new stream is not a normal stream — it is a mirror of `ORDERS`. You do
not give it `--subjects`, because a mirror captures nothing of its own.

The CLI exposes only the simplest mirror. For a mirror that filters or
rewrites subjects you supply a JSON config instead. Here is the raw
command for the archive:

```bash
nats stream add ORDERS-ARCHIVE --mirror ORDERS
```

By default a mirror starts from the very beginning of the upstream; the
Reference covers controlling where replication starts.

Right after creation the mirror catches up. Within moments it holds the
same three orders that `ORDERS` does. Confirm it:

```bash
nats stream info ORDERS-ARCHIVE
```

The output carries a section that a normal stream does not — the mirror
status:

```
Mirror Information:

          Stream Name: ORDERS
                  Lag: 0
               Active: 1.20s
```

Three fields tell the whole story.

**Stream Name** is the upstream the mirror follows: `ORDERS`.

**Lag** is how many messages the mirror is still behind the upstream. A
lag of `0` means fully caught up. A lag that climbs and stays high means
the mirror cannot keep pace with the upstream's write rate.

**Active** is how long since the mirror last heard from the upstream. A
small, steady value is healthy.

Publish a fourth order into `ORDERS`, then re-run `nats stream info
ORDERS-ARCHIVE`. The mirror picks it up on its own, with no consumer and
no client code involved. The lag ticks to `0` again.

## A mirror cannot be edited

A mirror's configuration is fixed at creation. You cannot point
`ORDERS-ARCHIVE` at a different upstream, or add a filter, or change
where replication started — not with an update.

To change any of that, you delete the mirror and create it again. On the
fresh creation the new settings take effect, and the mirror catches up
from the upstream all over again.

This is the one rule that catches people. A mirror is cheap to recreate
because the upstream still holds the data, so deleting and recreating is
the supported path, not a workaround.

## Sources aggregate many streams into one

A source is the mirror's mirror image. Where a mirror copies from one
upstream, a stream with **sources** pulls from several upstreams at once
and merges them into a single stream.

Picture three regional order streams — `ORDERS-US`, `ORDERS-EU`,
`ORDERS-APAC`. A stream that lists all three as sources becomes one
combined `ALL-ORDERS` view, fed by every region:

```bash
nats stream add ALL-ORDERS --source ORDERS-US --source ORDERS-EU --source ORDERS-APAC
```

Messages from each upstream keep their own relative order. Across
different upstreams there is no ordering guarantee — the merged stream
interleaves them in the order they arrive.

A sourced stream can also capture its own subjects. Unlike a mirror, it
may accept direct publishes alongside the messages it pulls in, mixing
aggregated and locally-published messages in one stream.

Sources can change after creation. You add an upstream, drop one, or
adjust a filter by updating the stream config — no delete-and-recreate.
That flexibility is the practical difference from a mirror.

## What each one is for

Reach for a **mirror** when you want a faithful second copy of one
stream: a read replica close to a far-off region, a stream that survives
the loss of the upstream's cluster, or — as here — a long-retention
archive of a short-retention stream.

Reach for **sources** when you want to fan many streams in: combining
per-region or per-tenant streams into one for reporting, or building a
derived view that draws from several places.

## Filters, transforms, and reach

A mirror or source can copy a subset of subjects with a filter, rewrite
subjects on the way through with a subject transform, or reach a stream
in another account or JetStream domain. Each is one extra field on the
mirror or source configuration.

Reaching across an account or domain involves three subjects, and each
has a required export type: the consumer API and flow-control subjects
are *services* (they are request-reply), while delivery is a *stream*
(messages flow one way). Getting a type wrong is a common trap — the
Pitfalls below cover the failure mode.

The full set of mirror and source options — `filter_subject`,
`subject_transforms`, `opt_start_seq`, `external`, and the rest — is
documented in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
We use only the plain `--mirror` and `--source` forms here.

Using mirrors for disaster recovery — failing over to a mirror when the
primary cluster is lost — is its own operational concern, covered in
[Operate → Backup & Recovery](/learn/backup-recovery/mirrors-and-sources).

## Pitfalls

Mirrors and sources are a thin layer of config, but a few of their rules
catch people the first time. Watch for these.

**Treating a mirror as writable.** A mirror captures no subjects of its
own, so there is nothing on the mirror's name for a publish to reach. A
`nats pub` aimed at `ORDERS-ARCHIVE` does not error with "this is a
mirror" — it comes back with `no responders available`, because no stream
is listening on that name. Do not publish to the mirror; publish to the
upstream `ORDERS` stream and let the mirror copy the message on its own.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-publishToMirror"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Treating mirror contents as real-time.** A mirror is eventually
consistent, not synchronous. The server reads the upstream through a
hidden internal consumer, so under a write burst the mirror trails behind
and its `Lag` climbs above `0`. Do not assume a message in `ORDERS` is
already in `ORDERS-ARCHIVE` the instant it lands; read the `Lag` field
first, and treat a lag that climbs and stays high as a sign the mirror
cannot keep pace.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-mirrorLag"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Combining a filter with a transform on one source.** On a single source
or mirror entry, `filter_subject` and `subject_transforms` are mutually
exclusive — the server rejects a config that sets both. Use
`filter_subject` when you only need to select a subset of subjects, and
`subject_transforms` when you also need to rewrite them (a transform
filters and renames in one step). Do not reach for both fields on the
same entry; pick the one that fits.

**Cross-domain config that fails silently.** Reaching a stream in another
account or JetStream domain needs the `external` block plus matching
exports and imports on both sides — and each of the three subjects has a
required type. The consumer API and flow-control subjects are *service*
exports (they are request/reply), while the delivery subject is a *stream*
export (messages flow one way). Get a type wrong and replication does not
error loudly; the mirror simply never catches up. Do not eyeball the
import types — verify each against
[Reference → Stream Configuration](/reference/jetstream/api/stream/create),
and treat the cross-account and cross-domain mechanics behind it as an
account and authorization configuration concern, not a clustering one.

## Where you are

You now have:

- An `ORDERS` stream, unchanged.
- An `ORDERS-ARCHIVE` mirror that holds an exact, read-only copy of it.
- A mental model for sources as the aggregation counterpart to mirrors.

## What is next

This is the last mechanics page of the chapter. The next page points you
to where the JetStream story continues — KV, object store, operations —
and back to the Reference for everything we deferred.

## See also

- [Reference → ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md) — the authoritative spec for
  mirroring and sourcing behavior.
- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — every mirror and source field and its valid values.
- [Operate → Backup & Recovery](/learn/backup-recovery/mirrors-and-sources)
  — using mirrors for disaster recovery.
