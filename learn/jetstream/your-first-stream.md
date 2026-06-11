---
id: your-first-stream
title: 2. Your first stream
sidebar_position: 3
description: Create the ORDERS stream and read its anatomy
---

# 2. Your first stream

Time to make the `ORDERS` stream real. This page uses one CLI command
to create it and one to inspect it. Nothing more.

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
case-sensitive identifiers. They show up in every command and every
error message in this chapter.

The second is the **subjects** the stream captures: `orders.>`. That's
a wildcard. Any subject that starts with `orders.` lands in this
stream. `orders.created`, `orders.shipped`, `orders.cancelled`
— all three match. So would `orders.refunded` next month, with no
configuration change.

The `--defaults` flag tells `nats` not to ask for any of the other
config values, and to fill them in with sensible starting values
instead. We'll look at what those defaults actually are in a
moment. For now: defaults are fine.

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
**sources**: a stream that copies from another stream. They aren't
needed for the running scenario; the [Reference → Create
Stream](/reference/jetstream/api/stream/create) covers them in the
`mirror` and `sources` fields of the stream configuration.

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

**Retention is hard to switch after data exists.** The default
`Retention Policy: Limits` can later move to `Interest`, but the server
refuses to switch an existing stream to or from `WorkQueue`. Choose the
retention policy when there are no messages to migrate, not after orders
are flowing. The three policies and when to reach for each live on the
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
