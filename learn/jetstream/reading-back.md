---
id: reading-back
title: "3. Reading back the stream"
sidebar_position: 5
description: Replay everything stored in the stream from the beginning with an ephemeral consumer
---

# 3. Reading back the stream

The `ORDERS` stream holds three messages. So far you've only looked
at them through `nats stream info`, which counts them but doesn't show
their contents.

This page reads them back. It pulls every stored message, in order,
from the first one, without changing the stream and without
acknowledging anything yet.

## Streams keep messages, subjects don't

In core NATS, a message published to a subject exists only as long as
it takes to reach whoever is subscribed right now. The
[Why a stream](/learn/jetstream/your-first-stream#why-a-stream) page
covers why that's too short for orders.

A stream keeps its messages. The three messages are durable records
with fixed sequence numbers. They don't disappear when you read them,
and they don't move. Reading message 1 leaves message 1 where it was,
available to the next reader.

The rest of the chapter relies on this property: you can re-read a
stream whenever you want, as many times as you want. A service started
a month from now reads the same sequence 1 you're about to read today.

## Reading with an ephemeral consumer

To read messages out of a stream you need a **consumer**. A consumer is
the server-side cursor that tracks which messages a reader has seen and
delivers the next ones.

You'll build a long-lived consumer on the [next page](/learn/jetstream/your-first-consumer).
For now you want the lightest reader: one that exists only for this
replay and is removed when your session ends. That's an
**ephemeral consumer**, a consumer with no name you chose and no
server-side state that outlives your session.

The CLI creates one for you automatically. The command below delivers
every message the stream holds:

<div class="nats-example"
     data-type="learn-jetstream-reading-back-replay"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The `--all` flag tells the ephemeral consumer to start at the
beginning of the stream, sequence 1, rather than at whatever arrives
next. The `--terminate-at-end` flag stops the reader once it's read
everything currently stored, so the command returns instead of waiting
for more.

You see all three messages, oldest first:

```
[#1] Received JetStream message: stream: ORDERS seq 1
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}

[#2] Received JetStream message: stream: ORDERS seq 2
{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}

[#3] Received JetStream message: stream: ORDERS seq 3
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}
```

The sequence numbers match what `nats stream info` reported on the
previous page. You're reading the same append-only log, in order.

## No messages were processed

You read all three messages, but you did nothing with them. This
ephemeral replay consumer delivers everything the stream holds so you
can see what's stored. There's a separate mechanism for a reader to
confirm it's finished with a message, but you don't need it to read,
and the [next page](/learn/jetstream/your-first-consumer) is where it
matters.

## The stream is unchanged

Run `nats stream info ORDERS` again:

```bash
nats stream info ORDERS
```

The `State` block is identical to before the replay:

```
State:

             Messages: 3
                Bytes: 459 B
        First Sequence: 1 @ 2026-05-22T10:14:22Z
         Last Sequence: 3 @ 2026-05-22T10:14:31Z
        Active Consumers: 0
```

Three messages, same sequences, zero active consumers: the ephemeral
consumer was removed when the command exited. Reading a stream doesn't
remove its data. Unlike popping from a queue, the messages stay in
place.

## Starting somewhere other than the beginning

You passed `--all`, which means start from the beginning. A consumer
doesn't have to start there; you'll see the other starting points
later. Replaying from the beginning shows that the whole log is still
there.

## Pitfalls

Reading a stream back is read-only and safe, but a few habits cause
trouble the first time you point a replay at real data.

**Replaying a huge stream from sequence 1.** `--all` starts the
ephemeral consumer at sequence 1 and reads the entire log. On a
three-message `ORDERS` stream that's instant. On a stream holding
millions of orders it takes minutes and produces a lot of output and
network traffic. Use `--all` only when you want the whole history. To
read just the most recent messages instead, start near the end with `--last`, from a
point in time with `--since`, or from a known sequence with
`--start-sequence`.

**An ephemeral consumer disappearing mid-read.** The replay above uses
an ephemeral consumer, one with no name you chose and no state that
outlives your session. The server removes an idle ephemeral consumer
once it's been inactive for a configurable period (the
`inactive_threshold`), so if your reader stalls or its connection
drops while reading through a long stream, the cursor is gone and a
reconnect restarts from sequence 1. For a one-shot read that's fine.
For a read you need to resume after an interruption, create a named,
durable consumer instead; it keeps its cursor on the server across
disconnects:

<div class="nats-example"
     data-type="learn-jetstream-reading-back-durable-replay"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The durable, ack-based reader is the subject of the
[next page](/learn/jetstream/your-first-consumer); here it's the fix
for a replay that's interrupted partway through.

**`--all` vs `--new` confusion.** `--all` (the server's default
`DeliverAll` start) delivers everything stored from sequence 1 first,
then keeps the subscription open for live messages. `--new`
(`DeliverNew`) skips the backlog and delivers only messages published
after the consumer is created. Picking `--new` when you meant to audit
history delivers nothing of what's already stored; picking `--all`
when you only wanted live traffic delivers the entire backlog first.
Decide which one matches the question you're asking before you run the
command.

**Expecting `--all` to replay and then exit.** On its own, `--all`
reads the stored messages and then waits for the next message to
arrive. It's a long-lived subscription, not a one-shot read. The replay
command at the top of this page pairs it with `--terminate-at-end` so
it returns once the stored messages are read. Drop that flag and the
command waits after the last stored message until you interrupt it.

## Where you are

Nothing about the stream changed on this page. You still have:

- the `ORDERS` stream bound to `orders.>`
- three messages stored at sequences 1, 2, and 3
- zero durable consumers (the replay used a throwaway ephemeral one)

What changed is your understanding: a stream is a log you can replay
on demand, and reading it doesn't empty it.

## What's next

The next page creates your first real consumer: a named, durable one
that remembers where it left off.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including ordered consumers.
- [Your first consumer](/learn/jetstream/your-first-consumer) — the
  durable, ack-based reader that picks up where this replay leaves off.
