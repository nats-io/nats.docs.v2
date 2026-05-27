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

A running `nats-server` with JetStream enabled. If you have not yet:

```bash
nats-server -js
```

The `-js` flag turns on JetStream. Without it, the next command will
refuse to run.

## Create the stream

In another terminal:

```bash
nats stream add ORDERS --subjects "orders.>" --defaults
```

Two things matter here.

The first is the **stream name**: `ORDERS`. Stream names are
case-sensitive identifiers. They show up in every command and every
error message in this chapter.

The second is the **subjects** the stream captures: `orders.>`. That
is a wildcard. Any subject that starts with `orders.` will be stored
in this stream. `orders.created`, `orders.shipped`, `orders.cancelled`
— all three match. So would `orders.refunded` next month, with no
configuration change.

The `--defaults` flag tells `nats` not to ask for any of the other
config values, and to fill them in with sensible starting values
instead. We will look at what those defaults actually are in a
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

The **state** half describes what is actually in the stream right
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
first message you publish will get sequence `1`.

## A few words on the defaults

You did not ask for any of the configuration values above. The CLI
filled them in. They are worth a short tour so they stop being
mystery values.

- **Replicas: 1** — the stream lives on one server. Lose that
  server, lose the stream. Fine on a laptop, dangerous in production.
  We come back to this on the "Surviving node loss" page.
- **Storage: File** — messages are written to disk. The alternative
  is memory, faster but lost on restart.
- **Retention Policy: Limits** — the stream keeps messages until a
  limit is hit (size, age, count). The alternatives are `Interest`
  and `WorkQueue`, which delete messages once consumed. We cover the
  three policies on the "Delivery semantics" page.
- **Discard Policy: Old** — when a limit is finally hit, the
  oldest messages are deleted to make room. The alternative is
  `New`, which rejects writes when the stream is full.
- **Maximum Messages / Bytes / Age / Message Size: unlimited** — no
  upper bound today. On a real cluster you would always set at least
  one of these. We do that on the "Shaping the stream" page.
- **Duplicate Tracking Window: 2m0s** — for two minutes after a
  message is stored, the server will refuse a second message with
  the same `Nats-Msg-Id` header. This is what makes publish
  idempotent. Page 3 uses it.

The full set of stream configuration options is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create).
We use only the defaults here.

## Subjects bind to exactly one stream

A subject can be captured by one stream, not more. If you try to
create a second stream that also captures `orders.>`, the server
will reject it:

```bash
nats stream add ARCHIVE --subjects "orders.>" --defaults
```

```
nats: error: nats: subjects overlap with an existing stream
```

This is a deliberate guarantee. When a message lands on a subject,
JetStream knows exactly which stream it goes into. There is no
ambiguity to debug later.

To capture overlapping subjects, you reach for **mirrors** and
**sources** — a stream that copies from another stream. They are not
needed for the running scenario; the [Reference → Create
Stream](/reference/jetstream/api/stream/create) covers them in the
`mirror` and `sources` fields of the stream configuration.

## Where you are

You now have:

- An `ORDERS` stream bound to `orders.>`.
- Zero messages in it.
- A configuration full of defaults you can name.

The next page publishes the first few messages and looks at what the
server tells you back.

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create)
  — every configuration option and its valid range.
- [Reference → JetStream API](/reference/jetstream/api/) — the full
  list of stream and consumer operations.
