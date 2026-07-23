---
id: delivery-and-acknowledgment
title: "Delivery and acknowledgment"
sidebar_position: 6
description: How a message is delivered and held in flight, what an ack and a double ack do, and how an unacked message comes back
---

# Delivery and acknowledgment

The [reading-back](/learn/jetstream/reading-back) and
[filtering](/learn/jetstream/filtering) pages created consumers —
`billing` to read the stream back, then `analytics` to filter it — and
acked each message on the happy path,
where every message succeeded. This page is the part those pages took for
granted: what an acknowledgment actually does, and what happens to a message
that's delivered but never acked.

That's the **ack/redeliver loop**, and it's one of the pieces that give
JetStream its **at-least-once** delivery: a message stays available and is
redelivered until a reader confirms it, so it's handled at least once even
when things fail. A reader can crash mid-message, a handler can throw, a
process can be killed — and the message it was working on comes back instead
of vanishing. (At-least-once also leans on the durable stream from the earlier
pages; the ack loop is the consumer half.)

You already have the orders in `ORDERS` and the `billing` and `analytics`
consumers from the previous pages.

## A consumer to experiment with

The demos below deliberately skip an ack to watch a message come back, so
they're easier to follow on a consumer of their own. Create one named
`shipping` — a pull consumer with explicit ack, the same kind you made on the
previous pages:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-create"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

It starts at the beginning of `ORDERS`, so it has the stored orders to work
through.

## The delivery lifecycle

A message moves through a few states on a consumer:

1. **Delivered, in flight.** The consumer hands the message to a reader. The
   message stays in the stream, and the consumer's **acknowledgment floor** —
   how far it has confirmed handling — hasn't moved past it. The message is in
   flight: out with a reader, not yet confirmed.
2. **Acked.** The reader processes the message and sends an **ack**. The floor
   advances past it; the message is done as far as this consumer is concerned.
3. **Redelivered.** If no ack arrives within the **Ack Wait** deadline, the
   server assumes the reader failed and delivers the message again — to the
   same reader or another one on the same consumer.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="380"></div>

The gap between what's been delivered and what's been acked is the set of
in-flight messages. The rest of this page opens and closes that gap on
purpose.

## Acknowledge a message

Pull one message from `shipping` and ack it:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-pullAndAck"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You get the first stored order, and the ack confirms it:

```
[10:14:52] subj: orders.created / tries: 1 / cons seq: 1 / str seq: 1 / pending: 2

{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}

Acknowledged message
```

`tries: 1` is the delivery count — this is the first time the message has gone
out. Check the consumer:

```
State:

  Last Delivered Message: Consumer sequence: 1 Stream sequence: 1
    Acknowledgment Floor: Consumer sequence: 1 Stream sequence: 1
        Outstanding Acks: 0 out of maximum 1,000
    Redelivered Messages: 0
```

Both cursors advanced to sequence 1: delivered, then acked, with nothing left
in flight. You read the `tries`, sequences, and pending count off the
delivered message itself — no `nats consumer info` call needed, as the
previous pages noted. The full `State` block is here only to show the floor
moving.

## Double ack: make sure the ack landed

A plain ack is fire-and-forget. The client sends it and moves on without
waiting to hear that the server recorded it. Almost always that's fine. But if
the ack is lost on the way to the server — a connection drops at the wrong
moment — the server never advances the floor, Ack Wait elapses, and the
message is redelivered. The reader handled it once and will see it again.

A **double ack** closes that window. The client sends the ack and waits for
the server to confirm it before treating the message as done. Reach for it
when reprocessing a message would be harmful and you can't make the handler
idempotent — a payment capture, say. It costs a round-trip per message, so
it's a deliberate choice, not the default.

<div class="nats-flow" data-scenario="doubleAckAnimated" data-width="560" data-height="240"></div>

There's no CLI flag for it — a double ack is a client-library call. Pull a
message and double-ack it:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-doubleAck"
     data-languages="js,go,python,java,rust,csharp,c"></div>

The call is named differently across clients — `DoubleAck` in Go, `ackAck` in
JavaScript, `ack_sync` in Python, `ackSync` in Java, `AckAsync` (with the
double-ack option) in .NET, `double_ack` in Rust — but each waits for the
server to confirm the ack before returning.

## Redelivery: when a message isn't acked

To see redelivery, pull a message but skip the ack:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-next"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

This delivers the next order, sequence 2, and leaves it in flight. The state
now shows the gap:

```
State:

  Last Delivered Message: Consumer sequence: 2 Stream sequence: 2
    Acknowledgment Floor: Consumer sequence: 1 Stream sequence: 1
        Outstanding Acks: 1 out of maximum 1,000
    Redelivered Messages: 0
```

Last Delivered moved to 2, but the Acknowledgment Floor stayed at 1. That one
message is in flight: `Outstanding Acks: 1`. Wait out the Ack Wait deadline —
30 seconds by default — pull again, and the server hands you sequence 2 a
second time, now with `tries: 2`. It came back because you never acked it.

A redelivery doesn't slot back into stream order. A consumer usually has
several messages in flight at once — the `out of maximum 1,000` in the state
above is **MaxAckPending**, the cap on how many it delivers before they're
acked. While one message waits to be redelivered, the consumer keeps handing
out later ones, so the repeat can arrive *after* messages with higher sequence
numbers.

<div class="nats-flow" data-scenario="redeliveryOrderAnimated" data-width="660" data-height="220"></div>

If a consumer must process strictly in order, set MaxAckPending to 1. It then
delivers one message at a time and won't move past it until it's acked, so a
redelivery always comes back before anything new:

```bash
nats consumer edit ORDERS shipping --max-pending 1
```

That ordering guarantee costs throughput — one message in flight means no
overlap between handlers — so use it only when order actually matters.

A reader doesn't have to wait out the deadline, and a stuck message doesn't
have to retry forever. A reader can answer a message in other ways — ask for
an immediate retry, give up on a message that can never be handled, or signal
that it's still working — and the server has controls that decide how long it
waits between retries and when it stops. Those responses and controls are the
[next page](/learn/jetstream/acknowledgment).

## Pitfalls

**Forgetting to ack.** A handler that processes a message but never acks looks
identical to a crashed reader: the message stays in flight, Ack Wait elapses,
and it's redelivered — and with the default unlimited delivery limit, that
repeats forever. Always ack on the success path. The
[next page](/learn/jetstream/acknowledgment) covers how to retire a message
that genuinely can't be processed, so it stops coming back.

**Acking the same message twice.** Once you ack a message, the floor moves
past it. A second ack does nothing useful. Some clients (Go, Python) reject it
locally with *"message was already acknowledged"*; others ignore or resend it,
and the server ignores the duplicate either way. Ack each delivery exactly
once, in one place in your handler.

## Where you are

`shipping` is a durable pull consumer with explicit ack, and you've seen the
core of the loop:

- a message is **delivered** and held **in flight** until it's confirmed
- an **ack** (or a **double ack**, when a lost ack would hurt) advances the
  acknowledgment floor past it
- an unacked message is **redelivered** after the Ack Wait deadline

The delivery count (`tries`) rides along on each message, so a reader always
knows how many times it's seen one.

## What's next

You've seen the happy path and that an unacked message comes back. The next
page goes deep on the four ways a client answers a message — ack, nak, term,
and in-progress — and the server controls (Ack Wait, MaxDeliver, backoff) that
decide when a message comes back and when it stops.

## See also

- [Reference → Create Consumer](/reference/jetstream/api/consumer/create)
  — every consumer option, the four ack policies, and push consumers.
