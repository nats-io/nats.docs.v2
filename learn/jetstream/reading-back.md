---
id: reading-back
title: "Reading back the stream"
sidebar_position: 4
description: Meet the producer, stream, and consumer; create a durable consumer and read everything the stream holds
---

# Reading back the stream

The `ORDERS` stream holds the orders you published on the previous page.
So far you've only seen them through `nats stream info`, which counts the
messages but doesn't show their contents.

This page reads them back through Acme's **billing** service. Billing acts on
every order — it charges the customer when one is created, captures the payment
when it ships, refunds a cancellation — so when it first comes up, or restarts
after downtime, it has to work through the whole stream from the first order and
miss none. That's a durable consumer reading the log from sequence 1, which is
what this page builds. First, the three pieces that move a message from a
publisher to a reader.

You might have run the publish commands once, or a few times while
experimenting, so the stream could hold three messages or thirty. None of
the steps below assume a number: they read back whatever is there.

## How a producer, a stream, and a consumer fit together

Three pieces move a message through JetStream:

- A **producer** publishes messages to a subject,
  reads the `PubAck` and retries on failure.
- A **stream** stores the messages, in order. As it stores each one it
  assigns a **stream sequence**, the message's position in the store.
- A **consumer** is a server-side cursor on a stream. A **client** connects
  to it to receive messages; the consumer tracks how far that client has
  progressed and hands out the next one. Each consumer keeps its own
  **consumer sequence**, a counter the server bumps on every delivery —
  redeliveries included — so it counts deliveries, not distinct messages.

<div class="nats-flow" data-scenario="jetStreamPipelineAnimated" data-width="640" data-height="260"></div>

A stream can feed many consumers at once, each reading at its own pace and
each with its own position. This page uses one consumer; later pages add
more.

## Streams keep messages

In core NATS, a message published to a subject exists only as long as it
takes to reach whoever is subscribed right now. The
[Why a stream](/learn/jetstream/your-first-stream#why-a-stream) page covers
why that's too short for orders.

A stream keeps its messages. They're durable records with fixed stream
sequences. They don't disappear when you read them, and they don't move.
Reading message 1 leaves message 1 where it was, available to the next
reader. You can re-read a stream whenever you want: a new consumer created
a month from now starts at the same sequence 1 you're about to read today.

## A consumer is a server-side object

To read a stream you create a consumer. A consumer isn't part of your
application; it's an object on the server, sitting next to the stream. Your
application is the **client**: it connects to the consumer to receive
messages. The stored messages and the read position both stay on the server,
so the client can disconnect and reconnect without losing its place or
tracking any sequence numbers itself.

<div class="nats-flow" data-scenario="consumerServerSideAnimated" data-width="640" data-height="220"></div>

Create a consumer named `billing`:

<div class="nats-example"
     data-type="learn-jetstream-reading-back-create"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Three settings define how it reads:

- **Deliver all** starts the consumer at the first message in the stream,
  sequence 1, so it reads the whole log.
- **Pull** means the client asks the server for messages when it's ready,
  rather than having the server push them on its own. Pull is the default
  for new consumers; an older push model exists, but the consumers you create
  in this chapter are pull.
- **Ack explicit** means the client acknowledges each message it handles,
  and the consumer's position advances only as acks arrive. It's the default
  for a pull consumer. On this page you read and ack on the happy path; a
  [later page](/learn/jetstream/delivery-and-acknowledgment) digs into what
  acknowledgment buys you — the redelivery loop that makes delivery reliable.

Look at the consumer before it has read anything:

```bash
nats consumer info ORDERS billing
```

```
State:

  Last Delivered Message: Consumer sequence: 0 Stream sequence: 0
    Acknowledgment Floor: Consumer sequence: 0 Stream sequence: 0
        Outstanding Acks: 0 out of maximum 1,000
    Redelivered Messages: 0
    Unprocessed Messages: 3
           Waiting Pulls: 0 of maximum 512
```

`Unprocessed Messages` is how many stored messages the consumer hasn't
delivered yet: the whole stream, since it hasn't started. Yours shows
however many you published. The acknowledgment fields below it stay at zero
until the consumer starts delivering and acking; the next page works through
them.

## Read the stored messages

Now read. Binding to the consumer reuses its position, delivers
everything it hasn't seen, and acknowledges each message as it goes:

<div class="nats-example"
     data-type="learn-jetstream-reading-back-read"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The messages arrive oldest first, each with its stream sequence:

```
[#1] Received JetStream message: stream: ORDERS seq: 1 / pending: 2 / subject: orders.created / time: 2026-05-22 10:14:22
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}

[#2] Received JetStream message: stream: ORDERS seq: 2 / pending: 1 / subject: orders.created / time: 2026-05-22 10:14:25
{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}

[#3] Received JetStream message: stream: ORDERS seq: 3 / pending: 0 / subject: orders.shipped / time: 2026-05-22 10:14:31
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}
```

The `pending` count is how many stored messages are still waiting. It
falls by one with each message and the read stops when it reaches `0`,
whether the stream held three messages or three hundred. The stream
sequences (`seq: 1`, `2`, `3`) match what `nats stream info` reported on
the previous page. You're reading the same append-only log, in order.

## Stream sequence versus consumer sequence

Read the consumer again, now that it has caught up:

```bash
nats consumer info ORDERS billing
```

```
State:

  Last Delivered Message: Consumer sequence: 3 Stream sequence: 3
    Acknowledgment Floor: Consumer sequence: 3 Stream sequence: 3
    Unprocessed Messages: 0
```

`Last Delivered Message` carries the two sequence numbers side by side, and
they're worth telling apart:

- **Stream sequence** is the message's fixed position in the log. The
  server assigned it when the message was published, and it never changes.
  It's the same number you saw in the `PubAck` and in `nats stream info`.
- **Consumer sequence** is this consumer's own counter. The server adds one
  every time the consumer delivers a message, redeliveries included, so it
  tracks how many deliveries this consumer has made, not how many distinct
  messages it has seen.

Here both read `3` because `billing` started at the beginning and
read straight through, so its third delivery was stream message 3. They
drift apart whenever a consumer delivers a different set of messages than
the stream stores in order: one that starts partway through, one that
[filters](/learn/jetstream/filtering) to a subset of subjects, or one that
has a message [redelivered](/learn/jetstream/delivery-and-acknowledgment). The
consumer sequence counts deliveries; the stream sequence stays pinned to
the message.

You read these numbers with `nats consumer info`, but in code you rarely need
that call. Every message a consumer delivers carries the same state in its
**metadata** — its stream and consumer sequence, how many messages are still
pending, how many times it's been delivered. That metadata rides along with
the delivery for free, while `nats consumer info` is a separate request to the
server: fine for a one-off check, too costly to call for every message. In a
handler, read the state off the message — the read example above already does
this, pulling the stream and consumer sequence straight from each delivery.

## The consumer remembers where it stopped

The position you just saw is on disk. To see it work, publish one more
order:

```bash
nats pub --jetstream orders.created \
  '{"order_id":"ord_5xk1","customer":"initech","total_cents":1500,"ts":"2026-05-22T11:02:00Z"}'
```

Then read again with the same command. The consumer delivers only the new
message, not the whole log:

```
[#1] Received JetStream message: stream: ORDERS seq: 4 / pending: 0 / subject: orders.created / time: 2026-05-22 11:02:00
{"order_id":"ord_5xk1","customer":"initech","total_cents":1500,"ts":"2026-05-22T11:02:00Z"}
```

It resumed from where it left off. A disconnect or a server restart
wouldn't change that: the position is durable, tied to the name
`billing`. An unnamed reader wouldn't have it, which the next section
gets to.

## Reading once without a named consumer

Creating a durable consumer is the right move when a reader comes back. For
a throwaway look at a stream you don't need one. Passing `nats sub` a
JetStream flag like `--all` switches it from a live core subscription to a
stream read: the CLI builds an **ephemeral** consumer, reads the backlog, and
discards the consumer when the command exits:

<div class="nats-example"
     data-type="learn-jetstream-reading-back-replay"
     data-languages="cli"></div>

An ephemeral consumer keeps no position you can return to. It's fine for a
one-off read, but for anything you need to resume after an interruption, use
the durable consumer from this page: an ephemeral one is removed once it goes
idle, and a reconnect then starts over from the beginning. In client code, the
same one-pass read has a dedicated form — see
[Ordered consumers](/learn/jetstream/ordered-consumer).

## The stream is unchanged

Run `nats stream info ORDERS` again. The `State` block holds the same
message count and sequences as before the read (plus the one order you just
published). Reading a stream doesn't remove its data. Unlike taking an item
off a queue, the messages stay in place for the next reader.

## Pitfalls

Reading a stream back is safe, but a few habits cause trouble the first
time you point a reader at real data.

**Re-running a caught-up reader waits.** The read command stops once it has
delivered everything stored, but if there's nothing new, there's nothing to
stop after, so it waits for the next message instead of returning. That's
correct for a live subscription and surprising for a one-shot read. To read
the current backlog and exit, run it when there's something to read; to
watch for new messages, leave it running and let them arrive.

**Replaying a huge stream from the beginning.** `Deliver all` starts at
sequence 1 and reads the entire log. On a three-message `ORDERS` stream
that's instant. On a stream holding millions of orders it takes time and
moves a lot of data. Read the whole history only when you want it. To start
elsewhere, create the consumer with a different delivery policy: the most
recent messages (`--deliver last`), messages from a window back to now
(`--deliver 1h`), or a known sequence (`--deliver 1000`). The full set
is in [Reference → Create Consumer](/reference/jetstream/api/consumer/create).

Delivery policy sets *where* a consumer starts; a separate **replay policy**
sets the *pace* once it's reading. The default, `instant`, hands messages
over as fast as the client reads them. The other value, `original`, spaces
deliveries out to match the gaps between the messages' original timestamps,
replaying recorded traffic at something like its real speed. This chapter
uses `instant` throughout; both are listed in
[Reference → Create Consumer](/reference/jetstream/api/consumer/create).

**Reusing a durable name with a different config.** A durable consumer is
identified by its name. Create `billing` again with different settings and the
server returns *consumer already exists*; it won't silently reconfigure a
consumer a reader is using. Edit the consumer (`nats consumer edit`) instead,
or pick a new name.

## Where you are

The `ORDERS` stream is unchanged by reading. You now have:

- the `ORDERS` stream bound to `orders.>`, holding the messages you
  published
- a durable consumer, `billing`, with a position saved on the server
- a clear split between the **stream sequence** (the message's fixed slot)
  and the **consumer sequence** (how far a reader has progressed)

## What's next

You've read the log with one consumer and acked each message. The next page
adds a second consumer with a filter and shows how several consumers read the
same stream as independent views, each at its own position.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including delivery policies and ordered consumers.
- [Filtering what you consume](/learn/jetstream/filtering) — add a second
  consumer that reads only the subjects it needs.
