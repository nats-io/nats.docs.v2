---
id: watching
title: "Watching"
sidebar_position: 3
description: Watch a bucket for live stock changes — the initial snapshot, the end-of-initial-data signal, and wildcard filters
---

# Watching

You have the `INVENTORY` bucket from the last page, with `widget-blue`
at `42`. Reading it with get tells you the count *now*. The warehouse
dashboard needs the count the moment it changes, without polling get in
a loop.

A watch does that. This page runs the warehouse dashboard
watching `INVENTORY`, shows you the two things a watch always delivers in
order, and ends with a wildcard watch over a subset of keys.

## What a watch delivers

A **watch** delivers the current value of every matching key as an
initial snapshot, and then streams every later change as it happens. One
call gives you both halves: the state of the bucket now, and the changes
from now on.

Start the warehouse dashboard watching the whole bucket. Run this in its
own terminal and leave it running:

<div class="nats-example" data-type="learn-key-value-watching-watchBucket" data-languages="cli,js,go,python,java,rust,csharp"></div>

The snapshot comes first. The watch immediately prints the current value
of every key already in the bucket; right now that's one line for
`widget-blue` at `42`. Then it blocks, waiting.

Now, from another terminal, change a count:

```bash
nats kv put INVENTORY widget-blue 41
```

The line appears in the watching terminal the instant the put lands,
without polling and without delay. The dashboard receives the change as
soon as the inventory service records it.

The snapshot-then-live shape matters here. A new dashboard that
connects mid-day doesn't start without data: it gets the full current
picture first, then keeps up with every change after. A watch covers
both reading the state and watching for changes, so you don't have to
choose between them.

<div class="nats-flow" data-scenario="kvWatchAnimated" data-width="600" data-height="350"></div>

Underneath, a watch is an ephemeral ordered consumer on the backing
stream, replaying the last value per key and then following new writes.
You don't configure or manage it: opening the watch creates it, and
closing the watch removes it. How consumers track position and deliver messages
is the JetStream chapter's job; see
[Why a stream](/learn/jetstream/your-first-stream#why-a-stream) if you want the layer
below. Here, the behavior is what matters: snapshot, then live.

## The end-of-initial-data signal

There's a boundary between the snapshot and the live stream, and the
watch marks it for you. After the last snapshot entry and before the
first live change, the watch delivers one **end-of-initial-data signal**:
a single nil entry. It carries no key and no value. It indicates only
that the snapshot is complete and everything after it is a live change.

The CLI consumes that signal silently and keeps printing, so you never
see it on the command line. In client code you do see it, and you must
handle it. A `Watch` returns entries one at a time, and the nil entry is
one of them. Read it, recognize it as the boundary, and keep reading:

<div class="nats-example" data-type="learn-key-value-watching-eoiHandling" data-languages="cli,js,go,python,java,rust,csharp"></div>

The signal is useful beyond bookkeeping. A dashboard can
hold its "loading" state until the nil entry arrives, then flip to "live"
knowing it has the complete current picture. A cache-warming job can
populate from the snapshot, treat the nil entry as "warm," and switch to
incremental updates. The boundary carries information you can act on.

It's also the most common watch bug, and the Pitfalls section below
includes a runnable version.

## Watching a subset with a wildcard

Watching the whole bucket gives you every key. Often you want fewer. A
watch takes an optional key filter, and that filter is a wildcard matched
just as in NATS subjects: `*` matches a single token. (Keys map to
subject tokens; that's the [subjects](/concepts/subjects) model the
backing stream is built on.)

The warehouse dashboard cares only about widgets, not the `gadget-pro`
line. Filter to `widget-*`:

<div class="nats-example" data-type="learn-key-value-watching-watchFiltered" data-languages="cli,js,go,python,java,rust,csharp"></div>

The snapshot now lists only the matching keys, and the live stream only
carries changes to them. A put to `gadget-pro` never reaches this
watcher; a put to `widget-red` does. The filter applies to both halves,
snapshot and live, so a filtered watch is a smaller, cheaper view of the
bucket rather than every change for you to filter afterward.

A watch supports a few more options, each tuning the same two halves you
just saw: `IncludeHistory` replays the full history of every key instead
of just the current snapshot, `IgnoreDeletes` skips deleted keys,
`UpdatesOnly` drops the snapshot so you see only live changes, and
`MetaOnly` sends each entry's metadata without its value. They're
independent, so you can combine them. The full set of watch options is
documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create),
which is the configuration the watch's consumer is built from.

## Pitfalls

Two mistakes are common the first time you watch a bucket. Both come
from the two concepts above: the snapshot/live boundary, and
what a watch actually is.

**Don't stop reading at the nil entry.** The end-of-initial-data signal
is a nil entry in the same stream as your real entries. A loop that
treats nil as "the stream ended" and breaks will read the snapshot and
see the boundary marker, then quit before every live change that was the
reason to watch. The fix is one line: when an entry is nil, skip it and
keep looping. Do not break.

The handling example above doubles as the demo: the loop continues past
the nil entry instead of stopping on it.

<div class="nats-example" data-type="learn-key-value-watching-eoiHandling" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A watch is live state, not a point read.** A watch is an ephemeral
ordered consumer: it exists only while your process holds it open, and it
goes away when the process ends. It's the right tool when you want to
*keep up* with a bucket, and the wrong tool when you want a single
current value once. For that, reach for get, which you saw on the last
page, or history, which the next page covers. Don't open a watch, read
the first entry, and close it to fake a point read; you pay for a
consumer and a snapshot to get one value get would have handed you
directly.

## Where you are

You now have:

- The `INVENTORY` bucket with `widget-blue` at `41` (a put landed during
  the watch demo).
- A working warehouse dashboard: a watch that delivered the snapshot,
  then a live update.
- The end-of-initial-data signal in hand: you know it marks the
  snapshot/live boundary and must be consumed, not treated as the end.
- A wildcard watch (`widget-*`) that views a subset of keys.

## What's next

The next page reads the history each put creates and uses revisions to
make safe, concurrent updates:
[History and revisions](/learn/key-value/history-and-revisions).

## See also

- [Why a stream](/learn/jetstream/your-first-stream#why-a-stream) — the consumer model a
  watch is built on.
- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  the configuration behind a watch's consumer.
