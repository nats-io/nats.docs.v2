---
id: acknowledgment
title: "Ack responses and redelivery"
sidebar_position: 7
description: The four ways a client answers a message, and the server controls that drive redelivery.
---

# Ack responses and redelivery

The `shipping` consumer was created with `AckPolicy=explicit`. That
choice means every message it delivers must be answered. A message is
not done until the client says so.

This page covers the four responses a client can give — ack, nak,
term ("give up on this one"), and in-progress ("still working") — and
the server-side controls that decide what happens when an answer is
late or never comes.

## Why the server waits for an answer

A message stays in flight from the moment the server delivers it until the
consumer answers. The server keeps a copy on the pending list and
starts a timer.

If the answer never comes, the server assumes the worker stopped and
delivers the message again. This is the redelivery loop from the previous
page. It has two parts.

The first part is the timer. Its length is AckWait, and it defaults
to 30 seconds.

The second part is the answer itself. The answer takes one of four
forms.

## The four responses

A client answers a delivered message in exactly one of four ways.

**ack**: the acknowledgment. The work succeeded. The server removes
the message from the pending list and never delivers it again. This is
the answer you send when a message is handled.

**nak**: a negative acknowledgment. The work failed, redeliver this
message. The server puts it back for another attempt. A plain nak asks
for redelivery right away, or after a delay you set — see
[below](#negative-ack-with-a-delay).

**term**: stop trying. This message can never be handled, so don't
deliver it again to anyone. The server drops it from the pending list
as it does for an ack, but the work was never done.

**in-progress**: still working. This is not a final answer. It resets
the AckWait timer so a long job doesn't trip redelivery. The client
then keeps going and answers for real later.

ack, nak, and term are final. Each one closes out a delivery.
in-progress extends the timer instead.

<div class="nats-flow" data-scenario="ackResponsesAnimated" data-width="660" data-height="240"></div>

The rest of this page takes the three non-trivial answers — nak, term, and the
controls behind them — one at a time.

## Negative ack with a delay

A plain nak redelivers immediately. That's rarely what you want.

A failure is often temporary. A service it calls is briefly down, a row
is locked, or a rate limit is hit. Redelivering in the same instant
fails again right away, and the message retries over and over with no
pause.

To avoid that, nak with a delay. The client tells the server to
redeliver the message but wait a given time first. The server holds
the message for that delay, then puts it back. Passing that delay is a
client-library call — the CLI's `--nak` only asks for immediate
redelivery — so there's no CLI tab here. (To space out redeliveries from
the CLI, set a consumer [backoff](#backoff-a-growing-delay-between-attempts)
instead.)

<div class="nats-example" data-type="learn-jetstream-acknowledgment-nakWithDelay" data-languages="js,go,python,java,rust,csharp,c"></div>

A nak returns the message to the consumer, not to the worker that
nak'd it. If several workers share one consumer, the redelivery can land
on a different worker (see [worker pool](/learn/jetstream/worker-pool)).
Each nak also raises a nak advisory on
`$JS.EVENT.ADVISORY.CONSUMER.MSG_NAKED.ORDERS.shipping`; its fields are in
[Reference → Nak advisory](/reference/jetstream/advisory/nak).

A delayed nak sets the wait one redelivery at a time, and the client
chooses it. A **backoff** on the consumer grows the wait automatically,
but it only shapes redeliveries that fire when the AckWait timer runs
out — it doesn't slow a nak. Backoff is covered below.

## Term: the poison message path

Some failures aren't temporary. A message with a broken payload, or one
that fails a check that will never pass, is a poison message.
Redelivering it just wastes delivery attempts.

For these, the client answers term. The message leaves the pending list
and the server never delivers it again, no matter how many attempts
remain.

<div class="nats-example" data-type="learn-jetstream-acknowledgment-termPoison" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**After a term**, the message is gone from this consumer but not from the
stream. Term runs through the same path as an ack: the pending entry clears and
the acknowledgment floor moves past the message, so it's never redelivered to
this consumer. The message itself stays in the stream under the default `Limits`
retention — other consumers still see it, and it ages out with the stream's
limits like any other message. On a `WorkQueue` or `Interest` stream, where a
handled message is removed, a term removes it just as an ack would; see
[Retention policies](/learn/jetstream/retention-policies).

The difference from an ack is that the work never happened, so the server
records the give-up. It publishes a **terminated advisory** on
`$JS.EVENT.ADVISORY.CONSUMER.MSG_TERMINATED.ORDERS.shipping`, carrying the
stream and consumer sequence, the delivery count, and an optional reason you can
attach to the term. Watch it the way the pitfall below watches the
max-deliveries advisory, so a terminated `order_id` doesn't disappear without a
trace. The advisory's fields are in
[Reference → Terminated advisory](/reference/jetstream/advisory/terminated).

Use term only when the code can tell that no future attempt will
succeed. When in doubt, nak with a delay and let the delivery limit
below decide.

## The server controls

The four responses are the client's side. The server has two settings
that work with them, both on the consumer.

**AckWait** is the timer. If a delivery is not ack'd, nak'd, or kept
alive with in-progress before AckWait runs out, the server treats it as
a silent failure and redelivers. The default is 30 seconds. Shorten it
for fast work, lengthen it for slow work.

**MaxDeliver** is the limit on attempts. It caps how many times the
server will deliver one message before giving up. The default is `-1`,
which means no limit. A message can be redelivered forever.

These two cover the two ways a delivery can fail. AckWait handles the
case where no answer arrives. MaxDeliver caps the case where a worker
keeps sending a nak on the same message.

A timeout and a nak both cause redelivery, but they're timed differently.
The backoff schedule below only spaces out redeliveries that fire when the
AckWait timer runs out. A bare nak redelivers right away, and a configured
backoff doesn't slow it — to delay a nak, the client attaches the delay to
the nak itself.

Set both on the consumer with `nats consumer edit`:

<div class="nats-example" data-type="learn-jetstream-acknowledgment-ackWait" data-languages="cli"></div>

Read them back from `nats consumer info ORDERS shipping`:

```
Configuration:

           Ack Policy: Explicit
             Ack Wait: 10.00s
        Replay Policy: Instant
   Maximum Deliveries: 5
      Max Ack Pending: 1,000
```

With `--max-deliver=5`, a message that fails five times stops being
delivered. Without a term path, that message is dropped after the
fifth attempt. With a term path, your code retires the poison
message itself, before the limit is reached.

## Backoff: a growing delay between attempts

A flat AckWait waits the same amount of time before every redelivery. A
backoff makes that wait grow.

The server holds a list of delays, one per attempt: wait one second
before the second delivery, five seconds before the third, 30 before
the fourth. The wait between attempts grows each round instead of
staying the same.

The CLI builds the list for you from a range:

```bash
nats consumer edit ORDERS shipping --backoff=linear --backoff-steps=5 --backoff-min=1s --backoff-max=30s
```

If the list has fewer entries than MaxDeliver allows, the server reuses
the last entry for the remaining attempts.

Setting a backoff replaces AckWait: the first entry in the list becomes
the wait before the first redelivery, so it's also the ack deadline for
the first delivery. Here `--backoff-min=1s` drops the effective AckWait
to 1 second, overriding the 10 seconds set earlier. Pick a `--backoff-min`
at least as long as normal processing takes, or a slow job trips
redelivery while it's still running.

`nats consumer edit --help` lists every backoff flag. We use only a
linear range here.

## Ack policy: the other values

This page assumed `explicit`, the policy `shipping` was created with.
AckPolicy has three more values.

`explicit` answers each message on its own. It's what `shipping` uses and
the right default for work that must not be lost — everything on this page
depends on it. `none` requires no answer at all: the server treats a
message as done the moment it's delivered, so there's no pending list, no
Ack Wait, and no redelivery, and nothing on this page applies. `all` lets
one ack answer every earlier message too — cheaper, but it only fits a
consumer that processes strictly in order, since acking message 10 also
retires 1 through 9. Strict order is a requirement you have to create,
not something a consumer does by default:
[Delivery and acknowledgment](/learn/jetstream/delivery-and-acknowledgment)
showed that a redelivery arrives after later messages unless `MaxAckPending`
is 1. On a consumer without that setting, acking message 10 also
retires a message 7 that failed and was waiting to come back — silent
data loss. A fourth value, `flow_control`, is for the push
consumers the server creates for durable mirrors and sources: acks ride
the flow-control responses and behave like `all`. You won't set it on a
work consumer like `shipping`.

The full list of available policies is in
[Reference → Consumer configuration](/reference/jetstream/api/consumer/create).
This page uses `explicit`.

## Pitfalls

Each response and control is simple on its own. Most traps come from
how they combine.

**A plain nak retries with no delay.** A nak with no delay asks
for redelivery in the same instant. A temporary failure then retries
right away, fails again, and ties up one worker on one message. Don't
send a bare nak for a temporary failure. Nak with a delay so the
redelivery waits before it retries (covered above). A consumer backoff
won't help here — it spaces out AckWait timeouts, not naks.

**A poison message with no term path uses every attempt.** Without
term, a broken payload is nak'd over and over until MaxDeliver
gives up, using the full set of attempts and holding up the messages
behind it. When the code can tell no future attempt will succeed,
answer term so the message leaves the pending list at once instead of
working through the limit.

**MaxDeliver drops a message with no dead-letter.** When a message hits
the delivery limit, the server removes it from the consumer's pending
list and never delivers it again. The message stays in the stream, but
the `shipping` consumer's normal output says nothing, so the drop is
easy to miss. JetStream has no built-in dead-letter queue. You can still
catch the drop: the server publishes a max-deliveries advisory on
`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.shipping` the moment a
message goes past its limit
([Reference → Max-deliveries advisory](/reference/jetstream/advisory/max-deliver)).
Subscribe to it so a poison `order_id` isn't dropped without notice:

<div class="nats-example" data-type="learn-jetstream-acknowledgment-watchMaxDeliveries" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**AckWait shorter than real processing time causes double work.** If a
job often takes longer than AckWait and the worker never sends
in-progress, the server decides the worker stopped and redelivers a
message that's still being handled, so two workers run the same
order. Either raise AckWait to cover the slow case, or send in-progress
to reset the timer while a long job runs (both covered above).

## Where you are

The `shipping` consumer is unchanged in shape (still pull, still
`AckPolicy=explicit`), but now you understand it fully. You know the four
answers a client gives, and the two server controls, AckWait and
MaxDeliver, that decide when a message comes back and when it stops. A
poison message has a clear exit through term.

## What's next

One worker pulls one order at a time. The next page covers the two ways a
client drives a pull consumer — [fetching a batch versus consuming a
continuous flow](/learn/jetstream/pull-consumers) — and when to reach for
each.

## See also

- [Reference → Consumer configuration](/reference/jetstream/api/consumer/create)
  — AckWait, MaxDeliver, backoff arrays, and every other field.
- [Reference → Terminated advisory](/reference/jetstream/advisory/terminated),
  [Nak advisory](/reference/jetstream/advisory/nak), and
  [Max-deliveries advisory](/reference/jetstream/advisory/max-deliver)
  — the events the server raises on term, nak, and a delivery-limit drop.
