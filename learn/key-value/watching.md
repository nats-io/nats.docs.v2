---
id: watching
title: "2. Watching"
sidebar_position: 3
description: Watch a bucket for live stock changes — the initial snapshot, the end-of-initial-data signal, and wildcard filters
---

# 2. Watching

You have the `INVENTORY` bucket from the last page, with `widget-blue`
sitting at `42`. Reading it with get tells you the count *now*. But the
warehouse dashboard does not want to poll get in a loop — it wants to be
told the moment a count changes.

That is what a **watch** does. This page runs the warehouse dashboard
watching `INVENTORY`, shows you the two things a watch always delivers in
order, and ends with a wildcard watch over a subset of keys.

## A watch is snapshot, then live

A **watch** delivers the current value of every matching key as an
initial snapshot, and then streams every later change as it happens. One
call gives you both halves: the state of the bucket now, and the changes
from now on.

Start the warehouse dashboard watching the whole bucket. Run this in its
own terminal and leave it running:

<div class="nats-example" data-type="learn-key-value-watching-watchBucket" data-languages="cli,js,go,python,java,rust,csharp"></div>

The snapshot comes first. The watch immediately prints the current value
of every key already in the bucket — right now that is one line for
`widget-blue` at `42`. Then it blocks, waiting.

Now, from another terminal, change a count:

```bash
nats kv put INVENTORY widget-blue 41
```

The line appears in the watching terminal the instant the put lands. No
poll, no delay. The dashboard learned about the sale as soon as the
inventory service recorded it.

That snapshot-then-live shape is the whole point. A new dashboard that
connects mid-day does not start blind — it gets the full current picture
first, then keeps up with every change after. You never have to choose
between "read the state" and "watch for changes"; a watch is both.

<div class="nats-flow" data-scenario="kvWatchAnimated" data-width="600" data-height="350"></div>

Underneath, a watch is an ephemeral ordered consumer on the backing
stream, replaying the last value per key and then following new writes.
You do not configure or manage it — opening the watch creates it, closing
the watch removes it. How consumers track position and deliver messages
is the JetStream chapter's job; see
[Why a stream](/learn/jetstream/why-a-stream) if you want the layer
below. Here, all you need is the behavior: snapshot, then live.

## The end-of-initial-data signal

There is a boundary between the snapshot and the live stream, and the
watch marks it for you. After the last snapshot entry and before the
first live change, the watch delivers one **end-of-initial-data signal**:
a single nil entry. It carries no key and no value. Its only job is to
say "the snapshot is complete; everything after this is a live change."

The CLI consumes that signal silently and keeps printing, so you never
see it on the command line. In client code you do see it, and you must
handle it. A `Watch` returns entries one at a time, and the nil entry is
one of them. Read it, recognize it as the boundary, and keep reading:

<div class="nats-example" data-type="learn-key-value-watching-eoiHandling" data-languages="cli,js,go,python,java,rust,csharp"></div>

The signal is genuinely useful, not just bookkeeping. A dashboard can
hold its "loading" state until the nil entry arrives, then flip to "live"
knowing it has the complete current picture. A cache-warming job can
populate from the snapshot, treat the nil entry as "warm," and switch to
incremental updates. The boundary is information.

It is also the most common watch bug, which the Pitfalls section below
makes runnable.

## Watching a subset with a wildcard

Watching the whole bucket gives you every key. Often you want fewer. A
watch takes an optional key filter, and that filter is a wildcard matched
just as in NATS subjects: `*` matches a single token. (Keys map to
subject tokens — that is the [subjects](/concepts/subjects) model the
backing stream is built on.)

The warehouse dashboard cares only about widgets, not the `gadget-pro`
line. Filter to `widget-*`:

<div class="nats-example" data-type="learn-key-value-watching-watchFiltered" data-languages="cli,js,go,python,java,rust,csharp"></div>

The snapshot now lists only the matching keys, and the live stream only
carries changes to them. A put to `gadget-pro` never reaches this
watcher; a put to `widget-red` does. The filter applies to both halves,
snapshot and live, so a filtered watch is a smaller, cheaper view of the
bucket rather than a firehose you sift afterward.

A watch supports a few more options, each tuning the same two halves you
just saw: `IncludeHistory` replays the full history of every key instead
of just the current snapshot, `IgnoreDeletes` skips deleted keys,
`UpdatesOnly` drops the snapshot so you see only live changes, and
`MetaOnly` sends each entry's metadata without its value. They are
independent — you can combine them. The full set of watch options is
documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create),
which is the configuration the watch's consumer is built from.

## Pitfalls

Two traps catch people the first time they watch a bucket. Both come
straight from the two concepts above: the snapshot/live boundary, and
what a watch actually is.

**Do not stop reading at the nil entry.** The end-of-initial-data signal
is a nil entry in the same stream as your real entries. A loop that
treats nil as "the stream ended" and breaks will read the snapshot, see
the boundary marker, quit — and miss every live change that was the whole
reason to watch. The fix is one line: when an entry is nil, skip it and
keep looping. Do not break.

The handling example above doubles as the demo: the loop continues past
the nil entry instead of stopping on it.

<div class="nats-example" data-type="learn-key-value-watching-eoiHandling" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A watch is live state, not a point read.** A watch is an ephemeral
ordered consumer: it exists only while your process holds it open, and it
goes away when the process ends. It is the right tool when you want to
*keep up* with a bucket. It is the wrong tool when you want a single
current value once — for that, reach for get, which you saw on the last
page, or history, which the next page covers. Do not open a watch, read
the first entry, and close it to fake a point read; you pay for a
consumer and a snapshot to get one value get would have handed you
directly.

## Where you are

You now have:

- The `INVENTORY` bucket with `widget-blue` at `41` (a put landed during
  the watch demo).
- A working warehouse dashboard: a watch that delivered the snapshot,
  then a live update.
- The end-of-initial-data signal in hand — you know it marks the
  snapshot/live boundary and must be consumed, not treated as the end.
- A wildcard watch (`widget-*`) that views a subset of keys.

## What is next

The next page reads the history each put creates and uses revisions to
make safe, concurrent updates:
[3. History and revisions](/learn/key-value/history-and-revisions).

## See also

- [Why a stream](/learn/jetstream/why-a-stream) — the consumer model a
  watch is built on.
- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  the configuration behind a watch's consumer.
