---
id: mirrors-and-sources
title: "Mirrors and sources"
sidebar_position: 18
description: Copy one stream into another, or aggregate many streams into one
---

# Mirrors and sources

So far the running example has been a single `ORDERS` stream.

This page covers the two ways to build one stream from another.
A **mirror** is a read-only copy of a single stream. Sources
aggregate many streams into one.

Both behaviors are specified in
[ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md), the authoritative document for stream
sourcing and mirroring.

## What a mirror is

A mirror is a stream that continuously copies every message from one
upstream stream.

<div class="nats-flow" data-scenario="mirrorCopyAnimated" data-width="680" data-height="250"></div>

The copy is exact. A message in the mirror keeps the same sequence
number, the same timestamp, and the same subject it had upstream. If
`orders.created` was sequence `1` in `ORDERS`, it's sequence `1` in the
mirror too.

A mirror is read-only. You can't publish to it directly, because it
listens on no subjects of its own. Its only job is to follow the
upstream. A publish lands in whatever stream owns the subject, not the mirror.

A mirror keeps its own retention. The upstream might keep messages for
seven days while the mirror keeps them forever — the mirror's own limits
decide what it stores, independent of the upstream's.

Its configuration is fixed at creation. You can't point a mirror at a
different upstream or add a filter later; to change any of that you delete
it and create it again. That's cheap, because the upstream still holds the
data and the new mirror catches up on its own.

## What sources are

A **source** is the inverse of a mirror. Where a mirror copies from one
upstream, a stream with sources pulls from several upstreams at once and
merges them into a single stream.

Consider three regional order streams — `ORDERS-US`, `ORDERS-EU`,
`ORDERS-APAC`. A stream that lists all three as sources becomes one
combined `ALL-ORDERS` view, fed by every region.

<div class="nats-flow" data-scenario="sourcesMergeAnimated" data-width="680" data-height="280"></div>

The merge interleaves. Messages from one upstream keep their own order,
but across upstreams there's no ordering guarantee, and the aggregate
gives them fresh sequence numbers as they arrive — it doesn't preserve
each upstream's the way a mirror does.

A sourced stream can also listen on its own subjects. Unlike a mirror, it
may accept direct publishes alongside the messages it pulls in, so one
stream can hold both what it gathered and what was published straight to it.

Sources can also change after creation. You add an upstream, drop one, or
adjust a filter by updating the stream config — no need to delete and
recreate.

## Mirror or source?

The two solve different problems. A mirror is one stream copied exactly; a
source is many streams merged into one.

| | Mirror | Source |
| --- | --- | --- |
| Upstreams | exactly one | one or many |
| Sequence numbers | kept from the upstream | fresh, interleaved across sources |
| Own subjects, direct publishes | no — read-only | yes, optional |
| Change the config later | no — delete and recreate | yes — add, drop, or edit sources |

Reach for a **mirror** when you want a second copy of one stream: a read
replica close to a remote region, a stream that survives the loss of the
upstream's cluster, or a long-retention archive of a short-retention stream.

Reach for **sources** when you want to combine many streams into one:
merging per-region or per-tenant streams for reporting, or building a
derived view that draws from several streams.

## Build them

### Build the ORDERS-ARCHIVE mirror

Create a second stream that mirrors `ORDERS`. Call it `ORDERS-ARCHIVE`,
and give it no limits, so it becomes a permanent record of every order:

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-createMirror"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The `--mirror ORDERS` flag tells the server this new stream is a mirror of
`ORDERS` rather than a normal stream. You don't give it `--subjects`,
because a mirror listens on no subjects of its own. The CLI exposes only
the simplest mirror; for one that filters or rewrites subjects you supply a
JSON config, covered in the Reference.

Right after creation the mirror catches up. Within moments it holds the
same three orders that `ORDERS` does, reported in a section a normal stream
doesn't have:

```
Mirror Information:

          Stream Name: ORDERS
                  Lag: 0
            Last Seen: 1.20s
```

**Stream Name** is the upstream the mirror follows. **Lag** is how many
messages it's still behind — `0` means fully caught up, and a lag that
climbs and stays high means it can't keep pace. **Last Seen** is the time
since the last message or heartbeat from the upstream; a small, steady value is healthy.

Publish a fourth order into `ORDERS`, then re-run `nats stream info
ORDERS-ARCHIVE`. The mirror picks it up on its own, with no consumer and no
client code involved, and the lag ticks back to `0`.

### Build the ALL-ORDERS source

A source needs streams to aggregate. Create three regional streams, each
owning its own subjects, then create `ALL-ORDERS` to source all three at
once:

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-createSource"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

`ALL-ORDERS` takes no `--subjects` of its own here; it just lists its
upstreams. Its info carries a Source Information section — one block per
upstream, because each source replicates on its own:

```
Source Information:

          Stream Name: ORDERS-US
                  Lag: 0
            Last Seen: 1.20s

          Stream Name: ORDERS-EU
                  Lag: 0
            Last Seen: 1.20s

          Stream Name: ORDERS-APAC
                  Lag: 0
            Last Seen: 1.20s
```

Each upstream has its own Lag and Last Seen. `ALL-ORDERS` now holds every
order from every region, interleaved in arrival order. Add or drop a region
later by updating the stream — no recreation needed.

## Filters, transforms, and reach

A mirror or source can copy a subset of subjects with a filter, rewrite
subjects with a subject transform, or reach a stream in another account
or JetStream domain. Each is one extra field on the mirror or source
configuration.

Reaching across an account or domain involves three subjects, each with a
required export type. Setting one wrong is a common mistake — the Pitfalls
below cover which type each subject needs and what goes wrong.

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
own, so no subject routes a publish to it. Publish `orders.shipped` and the
message lands in the origin `ORDERS` stream that owns that subject — never in
`ORDERS-ARCHIVE`. A plain publish reaches the origin unless subject mapping or
a cross-domain setup redirects it, in which case it fails. Force the mirror by
name with a `Nats-Expected-Stream: ORDERS-ARCHIVE` header and the server rejects
the publish with `expected stream does not match` (error `10060`), because the
subject still routed to `ORDERS`, not the mirror. A mirror is read-only either
way: publish to the upstream `ORDERS` and let the mirror copy the message on
its own.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-publishToMirror"
     data-languages="cli"></div>

**Treating mirror contents as real-time.** A mirror is eventually consistent:
the server copies the upstream stream continuously, so the mirror can run
slightly behind. During a burst of writes, its `Lag` climbs above `0`
until it catches up. Don't assume a message in
`ORDERS` is already in `ORDERS-ARCHIVE` the instant it lands. Read the
`Lag` field first, and treat a lag that climbs and stays high as a sign
the mirror can't keep pace.

<div class="nats-example"
     data-type="learn-jetstream-mirrors-and-sources-mirrorLag"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
and replication doesn't fail with an error; the mirror never catches
up. Check each import type against
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
Setting up cross-account and cross-domain access is part of configuring
accounts and authorization.

## Where you are

You now have:

- an `ORDERS` stream, unchanged
- an `ORDERS-ARCHIVE` mirror — an exact, read-only copy of it
- an `ALL-ORDERS` aggregate that sources three regional streams into one

## What's next

The next page covers [reading messages directly](/learn/jetstream/get-direct):
getting one message or a batch straight from the stream, with no consumer,
served by any replica or mirror. After that,
[subject mapping](/learn/jetstream/subject-mapping),
[per-message TTL](/learn/jetstream/message-ttl), and
[stream and consumer policies](/learn/jetstream/policies), then
[Where to go next](/learn/jetstream/where-next) recaps the chapter.

## See also

- [Reference → ADR-59](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-59.md) — the authoritative spec for
  mirroring and sourcing behavior.
- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — every mirror and source field and its valid values.
- [Operate → Backup & Recovery](/learn/backup-recovery/mirrors-and-sources)
  — using mirrors for disaster recovery.
