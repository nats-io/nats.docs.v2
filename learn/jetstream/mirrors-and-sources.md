---
id: mirrors-and-sources
title: "Mirrors and sources"
sidebar_position: 19
description: Copy one stream into another, or aggregate many streams into one
---

# Mirrors and sources

So far this chapter has worked with a single `ORDERS` stream.

This page covers the two ways to build one stream from another.
A **mirror** is a read-only copy of a single stream. Sources
aggregate many streams into one.

Both behaviors are specified in
[ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md), the authoritative document for stream
sourcing and mirroring.

## A mirror is a read-only copy

A mirror is a stream that continuously copies every message from one
upstream stream. Behind the scenes the server reads each message from
the upstream and adds it to the mirror.

The copy is exact. A message in the mirror keeps the same sequence
number, the same timestamp, and the same subject it had upstream. If
`orders.created` was sequence `1` in `ORDERS`, it's sequence `1` in the
mirror too.

A mirror is read-only. You can't publish to it directly, because it
listens on no subjects of its own. Its only job is to follow the
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

The `--mirror ORDERS` flag tells the server this new stream is a mirror
of `ORDERS` rather than a normal stream. You don't give it `--subjects`,
because a mirror listens on no subjects of its own.

The CLI exposes only the simplest mirror. For a mirror that filters or
rewrites subjects you supply a JSON config instead. Here's the raw
command for the archive:

```bash
nats stream add ORDERS-ARCHIVE --mirror ORDERS
```

By default a mirror starts from the very beginning of the upstream; the
Reference covers how to control where replication starts.

Right after creation the mirror catches up. Within moments it holds the
same three orders that `ORDERS` does. Confirm it:

```bash
nats stream info ORDERS-ARCHIVE
```

The output carries a section that a normal stream doesn't have, the
mirror status:

```
Mirror Information:

          Stream Name: ORDERS
                  Lag: 0
               Active: 1.20s
```

Three fields describe the mirror's state.

**Stream Name** is the upstream the mirror follows: `ORDERS`.

**Lag** is how many messages the mirror is still behind the upstream. A
lag of `0` means fully caught up. A lag that climbs and stays high means
the mirror can't keep pace with how fast the upstream is being written.

**Active** is how long since the mirror last heard from the upstream. A
small, steady value is healthy.

Publish a fourth order into `ORDERS`, then re-run `nats stream info
ORDERS-ARCHIVE`. The mirror picks it up on its own, with no consumer and
no client code involved. The lag ticks to `0` again.

## A mirror cannot be edited

A mirror's configuration is fixed at creation. You can't point
`ORDERS-ARCHIVE` at a different upstream, add a filter, or change
where replication started. An update won't do it.

To change any of that, you delete the mirror and create it again. On the
fresh creation the new settings take effect, and the mirror catches up
from the upstream all over again.

A mirror is cheap to recreate because the upstream still holds the data,
so deleting and recreating is the supported way to change its config.

## Sources aggregate many streams into one

A source is the inverse of a mirror. Where a mirror copies from one
upstream, a stream with sources pulls from several upstreams at once
and merges them into a single stream.

Consider three regional order streams: `ORDERS-US`, `ORDERS-EU`,
`ORDERS-APAC`. A stream that lists all three as sources becomes one
combined `ALL-ORDERS` view, fed by every region:

```bash
nats stream add ALL-ORDERS --source ORDERS-US --source ORDERS-EU --source ORDERS-APAC
```

Messages from each upstream keep their own order. Across different
upstreams there's no ordering guarantee. The merged stream mixes their
messages together in the order they arrive.

A sourced stream can also listen on its own subjects. Unlike a mirror,
it may accept direct publishes alongside the messages it pulls in, so
one stream can hold both the messages it gathered and messages published
straight to it.

Sources can change after creation. You add an upstream, drop one, or
adjust a filter by updating the stream config, with no need to delete
and recreate the stream. That is the practical difference from a mirror.

## What each one is for

Use a mirror when you want a second copy of one stream. Examples are a
read replica close to a remote region, a stream that survives the loss
of the upstream's cluster, or a long-retention archive of a
short-retention stream.

Use sources when you want to combine many streams into one. Examples are
merging per-region or per-tenant streams for reporting, or building a
derived view that draws from several streams.

## Filters, transforms, and reach

A mirror or source can copy a subset of subjects with a filter, rewrite
subjects with a subject transform, or reach a stream in another account
or JetStream domain. Each is one extra field on the mirror or source
configuration.

Reaching across an account or domain involves three subjects, and each
has a required export type. The consumer API and flow-control subjects
are *services*, because they work as request and reply. Delivery is a
*stream*, because the messages flow one way. Setting the wrong type is a
common mistake; the Pitfalls below cover what goes wrong.

The full set of mirror and source options (`filter_subject`,
`subject_transforms`, `opt_start_seq`, `external`, and the rest) is
documented in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
We use only the plain `--mirror` and `--source` forms here.

Using mirrors for disaster recovery (switching over to a mirror when the
primary cluster is lost) is its own operational topic, covered in
[Operate → Backup & Recovery](/learn/backup-recovery/mirrors-and-sources).

## Pitfalls

Mirrors and sources add little configuration, but a few of their rules
are easy to get wrong the first time.

**Treating a mirror as writable.** A mirror listens on no subjects of its
own, so there's nothing on the mirror's name for a publish to reach. A
`nats pub` aimed at `ORDERS-ARCHIVE` doesn't fail with "this is a
mirror"; it comes back with `no responders available`, because no stream
is listening on that name. Don't publish to the mirror. Publish to the
upstream `ORDERS` stream and let the mirror copy the message on its own.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-publishToMirror"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Treating mirror contents as real-time.** A mirror is eventually consistent:
the server copies the upstream stream continuously, so the mirror can run
slightly behind. During a burst of writes, its `Lag` climbs above `0`
until it catches up. Don't assume a message in
`ORDERS` is already in `ORDERS-ARCHIVE` the instant it lands. Read the
`Lag` field first, and treat a lag that climbs and stays high as a sign
the mirror can't keep pace.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-mirrorLag"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Combining a filter with a transform on one source.** On a single source
or mirror entry, you can set `filter_subject` or `subject_transforms`,
but not both: the server rejects a config that sets both. Use
`filter_subject` when you only need to select a subset of subjects, and
`subject_transforms` when you also need to rename them (a transform
filters and renames in one step). Don't reach for both fields on the
same entry. Pick the one that fits.

**Cross-domain config that fails silently.** Reaching a stream in another
account or JetStream domain needs the `external` block plus matching
exports and imports on both sides, and each of the three subjects has a
required type. The consumer API and flow-control subjects are *service*
exports, because they work as request and reply. The delivery subject is
a *stream* export, because the messages flow one way. Get a type wrong
and replication doesn't fail with an error; the mirror just never catches
up. Check each import type against
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
Setting up cross-account and cross-domain access is part of configuring
accounts and authorization.

## Where you are

You now have:

- an `ORDERS` stream, unchanged
- an `ORDERS-ARCHIVE` mirror that holds an exact, read-only copy of it
- a mental model for sources as the aggregation counterpart to mirrors

## What's next

The next page covers [subject mapping](/learn/jetstream/subject-mapping):
rewriting subjects as a stream stores them, and republishing stored
messages onto live subjects. After that,
[per-message TTL](/learn/jetstream/message-ttl), then
[Where to go next](/learn/jetstream/where-next) recaps the chapter.

## See also

- [Reference → ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md) — the authoritative spec for
  mirroring and sourcing behavior.
- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — every mirror and source field and its valid values.
- [Operate → Backup & Recovery](/learn/backup-recovery/mirrors-and-sources)
  — using mirrors for disaster recovery.
