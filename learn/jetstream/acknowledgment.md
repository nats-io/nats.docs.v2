---
id: acknowledgment
title: "7. Acknowledgment"
sidebar_position: 8
description: The four ways a client answers a message, and the server controls that drive redelivery
---

# 7. Acknowledgment

The `shipping` consumer was created with `AckPolicy=explicit`. That
choice means every message it delivers must be answered. Nothing is
considered done until the client says so.

This page is about that answer. It has two halves: the four responses a
client can give — not just ack and nak, but also term, a client's "give
up on this one," and in-progress, "still working" — and the server-side
controls that decide what happens when an answer is late or never comes.

## Why the server waits for an answer

A message stays in flight from the moment the server delivers it until
the moment the consumer answers. The server keeps a copy on the pending
list and starts a timer.

If the answer never comes, the server assumes the worker died and
delivers the message again. This is the redelivery loop you met on the
first consumer page. Now we name its parts.

The first part is the timer. Its length is **AckWait**, and it defaults
to thirty seconds.

The second part is the answer itself. There are four of them.

## The four responses

A client answers a delivered message in exactly one of four ways.

**ack** — the acknowledgment. Processing succeeded. The server removes
the message from the pending list and never delivers it again. This is
the answer your happy path gives.

**nak** — a negative acknowledgment. Processing failed, redeliver this
message. The server puts it back for another attempt. A plain nak asks
for redelivery right away.

**term** — stop trying. This message can never be processed, so do not
deliver it again to anyone. The server drops it from the pending list
like an ack, but the work was never done.

**in-progress** — still working. This is not a final answer. It resets
the AckWait timer so a long job does not trip redelivery, then the
client keeps going and answers for real later.

Three of these are final: ack, nak, and term each close out a delivery.
in-progress is the one that buys more time.

## Negative ack with a delay

A plain nak redelivers immediately. That is rarely what you want.

A failure is often transient — a downstream service is briefly down, a
row is locked, a rate limit is hit. Redelivering in the same
millisecond just fails again, in a tight loop, as fast as the network
allows.

The fix is to nak with a delay. The client tells the server "redeliver
this, but wait this long first." The server holds the message for that
delay, then puts it back.

<div class="nats-example" data-type="learn-jetstream-acknowledgment-nakWithDelay" data-languages="cli,js,go,python,java,rust,csharp"></div>

A nak hands the message back to the consumer, not to the worker that
nak'd it. If several workers share one consumer, the redelivery can land
on a different worker — see [worker pool](/learn/jetstream/worker-pool).

A delayed nak backs off one redelivery at a time, under the client's
control. For a delay schedule the server applies on its own — growing
the wait on each successive attempt — you set a **backoff** on the
consumer. We come to that below.

## Term: the poison message path

Some failures are not transient. A message with a malformed payload, or
one that fails a validation that will never pass, is a poison message.
Redelivering it wastes attempts and blocks the worker behind it.

For these, the client answers term. The message leaves the pending list
and the server never delivers it again — regardless of how many
attempts remain.

<div class="nats-example" data-type="learn-jetstream-acknowledgment-termPoison" data-languages="cli,js,go,python,java,rust,csharp"></div>

term is a decision, not a failure signal. Reach for it only when the
code can tell that no future attempt will succeed. When in doubt, nak
with a delay and let the delivery limit below decide.

## The server controls

The four responses are the client's side. The server has two settings
that frame them, both on the consumer.

**AckWait** is the timer. If a delivery is neither ack'd, nak'd, nor
kept alive with in-progress before AckWait elapses, the server treats
it as a silent failure and redelivers. Thirty seconds is the default;
shorten it for fast work, lengthen it for slow work.

**MaxDeliver** is the ceiling on attempts. It caps how many times the
server will deliver one message before giving up. The default is `-1`,
which means unlimited — a message can be redelivered forever.

These two cover the two ways a delivery can fail. AckWait catches the
silent failure, where no answer arrives. MaxDeliver caps the loud
failure, where a worker keeps sending a nak on the same message.

A timeout and a nak reach the same redelivery loop. Whichever triggers
it, the backoff schedule below governs how long the server waits before
the next attempt — backoff is not limited to naks.

Set both on the consumer with `nats consumer edit`:

<div class="nats-example" data-type="learn-jetstream-acknowledgment-ackWait" data-languages="cli"></div>

Read them back from `nats consumer info ORDERS shipping`:

```
Configuration:

           Ack Policy: Explicit
             Ack Wait: 10.00s
   Maximum Deliveries: 5
        Replay Policy: Instant
      Max Ack Pending: 1,000
```

With `--max-deliver=5`, a message that fails five times stops being
delivered. Without a term path, that message is simply dropped after
the fifth attempt. With a term path, your code retires the poison
message itself, before the limit is reached.

## Backoff: a growing delay between attempts

A flat AckWait redelivers on the same interval every time. A backoff
makes the interval grow.

The server holds a list of delays, one per attempt: wait one second
before the second delivery, five seconds before the third, thirty
before the fourth. A worker that keeps failing gets more breathing room
each round instead of a steady drumbeat of retries.

The CLI builds the list for you from a range:

```bash
nats consumer edit ORDERS shipping --backoff=linear --backoff-steps=5 --backoff-min=1s --backoff-max=30s
```

If the list has fewer entries than MaxDeliver allows, the server reuses
the last entry for the remaining attempts.

The full set of backoff options is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We use only a linear range here.

## Two more policies, named only

The consumer config carries two policies this chapter mentions but does
not unpack here.

**AckPolicy** has three values you would reach for in practice:
`none` (no answer required), `all` (one ack answers every earlier
message too), and `explicit` (each message answered on its own). A
fourth value, `flow_control`, exists for push-delivery rate control
and is not used here. `shipping` uses `explicit`, and that is the
right default for work that must not be lost.

**ReplayPolicy** controls the pace of redelivery and replay: `instant`
delivers as fast as the client reads, while `original` paces delivery
to match the original timestamps. `instant` is the default and the only
one this chapter needs.

The full set of ack and replay policies is documented in
[Reference → Consumer API](/reference/jetstream/api/consumer).
We use only `explicit` and `instant` here.

## Pitfalls

The four responses and two controls are simple on their own. The traps
live where they meet.

**A plain nak loops as fast as the network.** A nak with no delay asks
for redelivery in the same instant, so a transient failure retries
immediately, fails again, and pins one worker on one message. Do not
nak a transient failure bare; nak with a delay, or set a backoff on the
consumer so the wait grows each round (covered above).

**A poison message with no term path burns every attempt.** Without
term, a malformed payload is nak'd over and over until MaxDeliver
gives up — wasting the full delivery budget and blocking the worker
behind it. When the code can tell no future attempt will succeed,
answer term so the message exits the pending list at once instead of
grinding through the limit.

**MaxDeliver drops a message with no dead-letter.** When a message hits
the delivery limit, the server removes it from the consumer's pending
list and never delivers it again. The message stays in the stream, but
the `shipping` consumer's normal output says nothing — the drop is easy
to miss. JetStream has no built-in dead-letter queue. The drop is
observable, though: the server publishes an advisory the moment a
message exceeds its limit. Subscribe to it so a poison
`order_id` does not vanish unnoticed:

<div class="nats-example" data-type="learn-jetstream-acknowledgment-watchMaxDeliveries" data-languages="cli,js,go,python,java,rust,csharp"></div>

**AckWait shorter than real processing time causes double work.** If a
job routinely takes longer than AckWait and the worker never sends
in-progress, the server decides the worker died and redelivers a
message that is still being processed — so two workers run the same
order. Either raise AckWait to cover the slow case, or send in-progress
to reset the timer while a long job runs (both covered above).

## Where you are

The `shipping` consumer is unchanged in shape — still pull, still
`AckPolicy=explicit` — but now fully understood. You know the four
answers a client gives, and the two server controls, AckWait and
MaxDeliver, that decide when a message comes back and when it stops. A
poison message has a clear exit through term.

## What is next

The next page goes deep on the consumer you have been driving from the
CLI: how a pull consumer fetches batches, how the server tracks what is
outstanding, and how a client controls the flow of messages it pulls.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer)
  — the exact ack reply protocol and every response type.
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — AckWait, MaxDeliver, backoff arrays, and every other field.
