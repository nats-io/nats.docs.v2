---
id: your-first-stream
title: Your first stream
sidebar_position: 2
description: Why you want a stream, then create the ORDERS stream and look at its configuration
---

# Your first stream

This page creates the `ORDERS` stream with one CLI command, then looks at
it with another.

## Why a stream

The running example for this chapter is a small online store, the
Acme `ORDERS` platform. Each thing that happens to an order shows up as a
message on a [subject](/concepts/subjects):

- `orders.created` — a new order comes in
- `orders.shipped` — the order leaves the warehouse
- `orders.canceled` — the order is called off

Services react to those messages:

- a warehouse service packs the box on `orders.created`
- a notification service emails the customer on `orders.shipped`
- an analytics service counts everything

Plain core NATS drops any of these messages the moment no service is
listening. A **stream** saves them instead. A stream is a store that
runs on the server and keeps every message on the subjects you choose.
You can read the saved messages again whenever you need them, minutes
or a month after they arrived.

## Prerequisites

A running `nats-server` with JetStream enabled. If you haven't yet:

```bash
nats-server -js
```

The `-js` flag turns on JetStream. Without it, the next command
won't run.

## Create the stream

In another terminal:

<div class="nats-example" data-type="learn-jetstream-your-first-stream-create" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Two parts of that command matter.

The first is the **stream name**: `ORDERS`. Stream names are
case-sensitive. They can't contain dots, `*`, `>`, spaces, or slashes, so
a subject like `orders.created` won't work as a name. The name shows up in
every command and every error message in this chapter.

The second is the **subjects** the stream keeps: `orders.>`. That's
a [wildcard](/concepts/subjects#wildcards). Any subject that starts with
`orders.` goes into this stream. `orders.created`, `orders.shipped`, and
`orders.canceled` all match. So would `orders.refunded` next month, with
no change to the stream.

The `--defaults` flag tells `nats` not to prompt you for the other
settings. The server fills them in with its standard defaults. We'll look
at what those values are in a moment. For now, the defaults are fine.

You should see output ending with something like:

```text
Stream ORDERS was created
```

If the command fails instead with `no responders available for request`,
your server started without `-js`: JetStream isn't running, so nothing
answers the request. Restart it with the flag and try again.

## Checking the created stream

Look at what the server just created:

<div class="nats-example" data-type="learn-jetstream-your-first-stream-info" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The output has two halves.

The **configuration** half shows what you asked for and what the
defaults filled in — the header plus the `Options` and `Limits`
sections:

```text
Information for Stream ORDERS

                     Subjects: orders.>
                     Replicas: 1
                      Storage: File

Options:

                    Retention: Limits
              Acknowledgments: true
               Discard Policy: Old
             Duplicate Window: 2m0s

Limits:

             Maximum Messages: unlimited
          Maximum Per Subject: unlimited
                Maximum Bytes: unlimited
                  Maximum Age: unlimited
         Maximum Message Size: unlimited
            Maximum Consumers: unlimited
```

The `Options` section also lists a `Direct Get` line and a run of
`Allows …` feature toggles. The CLI turns direct get on by default, so
that line shows here; client libraries leave it off unless you set it.
They're trimmed and covered where each feature comes up.

The **state** half shows what's in the stream right
now:

```text
State:

                     Messages: 0
                        Bytes: 0 B
               First Sequence: 0
                Last Sequence: 0
             Active Consumers: 0
```

A new stream is empty: zero messages, zero bytes, no consumers. The
first message you publish gets sequence `1`.

## The defaults

You didn't set any of the configuration values above. The server filled
them in with its standard defaults, the values a stream gets whenever a
field is left unset. Here is what each one means.

- **Replicas: 1**. The stream lives on one server. If that server goes
  down, the stream goes down with it. That's fine on a laptop, but
  risky in production. We come back to this on the
  [Surviving node loss](/learn/jetstream/surviving-node-loss) page.
- **Storage: File**. Messages are written to disk. The other option is
  memory, which is faster but lost on restart.
- **Retention: Limits**. The stream keeps messages until it
  hits a limit (size, age, or count). The other options are `Interest`
  and `WorkQueue`, which delete messages once a consumer has read them.
  We cover the three policies on the
  [Retention policies](/learn/jetstream/retention-policies) page.
- **Discard Policy: Old**. When the stream finally hits a limit, the
  oldest messages are deleted to make room. The other option is
  `New`, which turns away new messages when the stream is full.
- **Maximum Messages / Bytes / Age / Message Size: unlimited**. No
  upper bound today. On a real cluster you'd always set at least
  one of these. We do that on the
  [Shaping the stream](/learn/jetstream/shaping-the-stream) page.
- **Duplicate Window: 2m0s**. For two minutes after a
  message is stored, the server turns away a second message that
  carries the same [`Nats-Msg-Id`](/reference/jetstream/api/headers)
  header. This is what lets you publish
  the same message twice without storing it twice. The
  [Publishing](/learn/jetstream/publishing) page uses it.

The full set of stream configuration options is listed in
[Reference → Create Stream](/reference/jetstream/api/stream/create).
We use only the defaults here.

## Subjects bind to exactly one stream

Only one stream can keep a given subject. If you try to
create a second stream whose subjects overlap `orders.>`, the server
turns it down:

```bash
nats stream add ARCHIVE --subjects "orders.*" --defaults
```

```text
nats: error: could not create Stream: subjects overlap with an existing stream (10065)
```

The check covers any overlap, not just the identical filter: `ORDERS`
keeps `orders.>`, so a new stream asking for `orders.*`, or even the
single subject `orders.created`, is turned down the same way.

This is on purpose. When a message lands on a subject, JetStream always
knows which stream it goes into.

To keep overlapping subjects, you use **mirrors** and **sources**. A
mirror keeps a copy of one other stream. Sources pull messages from
several streams into one. The running scenario doesn't need either, so we
don't set one up here. The [Mirrors and
sources](/learn/jetstream/mirrors-and-sources) page builds both from start
to finish, and [Reference → Create
Stream](/reference/jetstream/api/stream/create) lists the `mirror` and
`sources` configuration fields.

## Pitfalls

A few things catch people on a first stream.

**Unlimited defaults grow forever.** With `--defaults`, `Maximum
Messages`, `Maximum Bytes`, and `Maximum Age` are all `unlimited`. The
`ORDERS` stream then keeps every order it ever stored until the disk
fills up, and a full disk takes the server down with it. That's fine
while you're learning on a laptop, but a production stream needs at least
one limit so old orders age out before the disk does. Setting limits is
the [Shaping the stream](/learn/jetstream/shaping-the-stream) page; here
the defaults are deliberately left unbounded.

**A stream name is permanent.** There's no rename. `nats stream edit`
has no `--name` flag, and the server turns down any update that changes an
existing stream's name with `stream configuration name must match
original`. The only way to "rename" `ORDERS` is to delete it and create
a new stream, which loses every order already stored. So pick the name
carefully the first time. If you do outgrow a name, the safe move is to
add a new stream on new subjects and let the old one age out.

## Where you are

You now have:

- an `ORDERS` stream bound to `orders.>`
- zero messages in it
- a configuration of default values

The next page, [Publishing](/learn/jetstream/publishing), sends the
first few messages and shows what the server returns.

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create):
  every configuration option and its valid range
- [Reference → JetStream API](/reference/jetstream/api/): the full
  list of stream and consumer operations
