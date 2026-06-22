---
id: your-first-stream
title: 1. Your first stream
sidebar_position: 2
description: Why a stream, then create the ORDERS stream and read its anatomy
---

# 1. Your first stream

This page creates the `ORDERS` stream with one CLI command and inspects it
with another. First, though: why reach for a stream at all?

## Why a stream

The running example for this chapter is a small e-commerce backend, the
Acme `ORDERS` platform. Three things happen to an order: it's created,
shipped, or cancelled. Each shows up as a message on a
[subject](/concepts/subjects): `orders.created`, `orders.shipped`, and
`orders.cancelled`. A warehouse service packs the box on `orders.created`,
a notification service emails the customer on `orders.shipped`, and an
analytics pipeline counts everything.

Plain core NATS drops any of these the moment no service is subscribed. A
**stream** is what lets them wait: a server-side store that captures
messages on the subjects you choose, so you can replay history,
resume after a restart, or read them a month later.

## Prerequisites

A running `nats-server` with JetStream enabled. If you haven't yet:

```bash
nats-server -js
```

The `-js` flag turns on JetStream. Without it, the next command
refuses to run.

## Create the stream

In another terminal:

```bash
nats stream add ORDERS --subjects "orders.>" --defaults
```

Two things matter here.

The first is the **stream name**: `ORDERS`. Stream names are
case-sensitive and can't contain dots, `*`, `>`, spaces, or slashes, so a
subject like `orders.created` won't work as a name. They show up in every
command and every error message in this chapter.

The second is the **subjects** the stream captures: `orders.>`. That's
a [wildcard](/concepts/subjects#wildcards). Any subject that starts with `orders.` lands in this
stream. `orders.created`, `orders.shipped`, `orders.cancelled`
— all three match. So would `orders.refunded` next month, with no
configuration change.

The `--defaults` flag tells `nats` not to ask for any of the other
config values, and to fill them in with sensible starting values
instead. We'll look at what those defaults actually are in a
moment. For now: defaults are fine and its actually quite normal to rely on defaults.

You should see output ending with something like:

```
Stream ORDERS was created
```

If you instead see `JetStream system temporarily unavailable`, your
server was started without `-js`. Restart it with the flag and try
again.

## Look at what you made

Ask the server what it just stored:

```bash
nats stream info ORDERS
```

The output has two halves.

The **configuration** half describes what you asked for and what the
defaults filled in:

```
Information for Stream ORDERS

Configuration:

             Subjects: orders.>
             Replicas: 1
              Storage: File
   Retention Policy: Limits
       Discard Policy: Old
     Maximum Messages: unlimited
        Maximum Bytes: unlimited
          Maximum Age: unlimited
 Maximum Message Size: unlimited
    Maximum Consumers: unlimited
       Duplicate Tracking Window: 2m0s
```

The **state** half describes what's actually in the stream right
now:

```
State:

             Messages: 0
                Bytes: 0 B
        First Sequence: 0
         Last Sequence: 0
        Active Consumers: 0
```

A new stream is empty: zero messages, zero bytes, no consumers. The
first message you publish gets sequence `1`.

## A few words on the defaults

You didn't ask for any of the configuration values above. The CLI
filled them in. They're worth a short tour so they stop being
mystery values.

- **Replicas: 1**. The stream lives on one server. Lose that
  server, lose the stream. Fine on a laptop, dangerous in production.
  We come back to this on the "Surviving node loss" page.
- **Storage: File**. Messages are written to disk. The alternative
  is memory, faster but lost on restart.
- **Retention Policy: Limits**. The stream keeps messages until a
  limit is hit (size, age, count). The alternatives are `Interest`
  and `WorkQueue`, which delete messages once consumed. We cover the
  three policies on the "Delivery semantics" page.
- **Discard Policy: Old**. When a limit is finally hit, the
  oldest messages are deleted to make room. The alternative is
  `New`, which rejects writes when the stream is full.
- **Maximum Messages / Bytes / Age / Message Size: unlimited**. No
  upper bound today. On a real cluster you'd always set at least
  one of these. We do that on the "Shaping the stream" page.
- **Duplicate Tracking Window: 2m0s**. For two minutes after a
  message is stored, the server refuses a second message with
  the same `Nats-Msg-Id` header. This is what makes publish
  idempotent. The [Publishing](/learn/jetstream/publishing) page uses it.

The full set of stream configuration options is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create).
We use only the defaults here.

## Subjects bind to exactly one stream

Only one stream can capture a given subject. If you try to
create a second stream that also captures `orders.>`, the server
rejects it:

```bash
nats stream add ARCHIVE --subjects "orders.>" --defaults
```

```
nats: error: nats: subjects overlap with an existing stream
```

This is a deliberate guarantee. When a message lands on a subject,
JetStream knows exactly which stream it goes into. There's no
ambiguity to debug later.

To capture overlapping subjects, you reach for **mirrors** and
**sources**: a mirror keeps a copy of one other stream, and sources
aggregate messages from several streams into one. They aren't needed for
the running scenario, so we don't set one up here. The [Mirrors and
sources](/learn/jetstream/mirrors-and-sources) page builds both end to end,
and [Reference → Create Stream](/reference/jetstream/api/stream/create)
lists the `mirror` and `sources` configuration fields.

## Pitfalls

Three traps catch people on their very first stream. Each one is easy
to avoid once you've seen it.

**Unlimited defaults grow forever.** With `--defaults`, `Maximum
Messages`, `Maximum Bytes`, and `Maximum Age` are all `unlimited`. The
`ORDERS` stream then keeps every order it ever stored until the disk
fills, and a full disk takes the server down with it. Don't leave a
production stream unbounded: set at least one limit so old orders age
out on their own.

Check the limits, then cap the stream:

<div class="nats-example" data-type="learn-jetstream-your-first-stream-checkLimits" data-languages="cli,js,go,python,java,rust,csharp"></div>

The full set of storage limits is documented on the [Shaping the
stream](/learn/jetstream/shaping-the-stream) page. Here you only need
to know that the defaults set none.

**A stream name is permanent.** There's no rename. `nats stream edit`
has no `--name` flag, and the server rejects any update that changes an
existing stream's name with `stream configuration name must match
original`. The only way to "rename" `ORDERS` is to delete it and create
a new stream, which loses every order already stored. Pick the name
deliberately the first time:

<div class="nats-example" data-type="learn-jetstream-your-first-stream-renameRejected" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Switching to or from `WorkQueue` retention is rejected.** On an existing
stream you can move between `Limits` and `Interest`, but the server refuses
any change to or from `WorkQueue` at all, even on an empty stream
(`stream configuration update can not change retention policy to/from
workqueue`). The only way across that line is to delete and recreate the
stream, which drops every stored message, so decide on `WorkQueue` up front.
The three policies and when to reach for each live on the
[Delivery semantics](/learn/jetstream/delivery-semantics) page.

## Where you are

You now have:

- an `ORDERS` stream bound to `orders.>`
- zero messages in it
- a configuration full of defaults you can name

The next page publishes the first few messages and looks at what the
server tells you back.

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create):
  every configuration option and its valid range
- [Reference → JetStream API](/reference/jetstream/api/): the full
  list of stream and consumer operations
