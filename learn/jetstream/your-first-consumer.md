---
id: your-first-consumer
title: "4. Your first consumer"
sidebar_position: 6
description: Create a durable pull consumer with explicit ack and learn the ack/redeliver loop
---

# 4. Your first consumer

The previous page read messages back with an ephemeral consumer. It
replayed the stream but tracked no position, so reopening it starts over
from the beginning.

A real service needs more than that. It has to remember which orders it
already handled, and the server has to redeliver an order if the process
dies before finishing it.

This page builds that consumer. It introduces the **durable cursor**
that records your position and the **ack/redeliver loop** that makes
delivery reliable.

**Entering:** three orders stored in the `ORDERS` stream, no consumer yet.

## Durable consumers

A **consumer** is the server-side object a reader connects to. So far the
consumers in this chapter have been ephemeral: created when a reader asks
for one and discarded when the reader disconnects.

A **durable** consumer has a name, and the server keeps its state on disk
under that name. That state is a **cursor**: the position of the last
message the reader has acknowledged. When the reader reconnects, the
consumer resumes from where the cursor points.

This is what lets a service restart without re-processing everything it
already did.

## Create the shipping consumer

Create a durable consumer named `shipping` on the `ORDERS` stream:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-create"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Three parts of this command matter.

`--pull` makes this a **pull consumer**. The reader asks the server for
messages when it's ready for them, rather than having the server send
them on its own. We use pull consumers throughout this chapter and
explain why on a later page.

`--ack explicit` sets the **acknowledgment policy**: the server won't
consider a message handled until an **acknowledgment**, or **ack**
for short, arrives. Every message this consumer delivers must be
individually acked by the reader.

The consumer name `shipping` (a positional argument, not a flag) makes
the consumer durable. A named consumer survives restarts; an unnamed one
doesn't.

Look at what you created:

```bash
nats consumer info ORDERS shipping
```

The output names the policy and the cursor position:

```
Information for Consumer ORDERS > shipping

Configuration:

                    Name: shipping
               Pull Mode: true
          Filter Subject:
          Deliver Policy: All
              Ack Policy: Explicit
                Ack Wait: 30.00s
           Replay Policy: Instant
         Max Ack Pending: 1,000

State:

   Last Delivered Message: Consumer sequence: 0 Stream sequence: 0
     Acknowledgment Floor: Consumer sequence: 0 Stream sequence: 0
         Outstanding Acks: 0 out of maximum 1,000
     Redelivered Messages: 0
```

Two fields in the `State` block are the cursor. **Last Delivered
Message** is how far the server has handed messages out.
**Acknowledgment Floor** is how far the reader has acked. Right now both
are zero: nothing delivered, nothing acked.

The **Ack Wait** field in the `Configuration` block (`30.00s` here) is
the redelivery deadline. The next section explains how it drives the
ack/redeliver loop.

## The ack/redeliver loop

The animation below shows the in-flight state and the redelivery loop: a
message delivered to a reader, held until it's acked, and delivered again
if the ack never arrives.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="380"></div>

When the consumer delivers a message, that message enters an
**in-flight** state. It stays in the stream and is not yet considered
handled; the reader has it, but the consumer's cursor has not advanced
past it.

The reader processes the message, then acks it. The ack tells the server
to advance the cursor past that message. Only then does the message leave
the in-flight state.

If the ack never comes, the server waits. The length of the wait is set
by Ack Wait, which the output above shows as 30 seconds. When Ack Wait elapses
with no ack, the server assumes the reader failed and **redelivers** the
message, either to the same reader or to another one reading the same
consumer.

This is what makes delivery reliable. A message stays in flight until
it's acked, so a reader that crashes mid-process never acks and the
message is delivered again.

## Pull one message and ack it

Pull a single message from `shipping` and acknowledge it:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-pullAndAck"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

This delivers stream sequence `1` (the first `orders.created` message
you published on page 2) and acks it. Watch the cursor move:

```bash
nats consumer info ORDERS shipping
```

```
State:

   Last Delivered Message: Consumer sequence: 1 Stream sequence: 1
     Acknowledgment Floor: Consumer sequence: 1 Stream sequence: 1
         Outstanding Acks: 0 out of maximum 1,000
     Redelivered Messages: 0
```

Both cursor fields advanced to stream sequence `1`. The next pull will
deliver sequence `2`, then `3`, because the cursor records the position.

## Skipping the ack

To see redelivery, pull a message but skip the ack:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-next"
     data-languages="cli"></div>

This delivers sequence `2` and leaves it in flight. Check the state and
you'll see one outstanding ack:

```
State:

   Last Delivered Message: Consumer sequence: 2 Stream sequence: 2
     Acknowledgment Floor: Consumer sequence: 1 Stream sequence: 1
         Outstanding Acks: 1 out of maximum 1,000
     Redelivered Messages: 0
```

The Last Delivered cursor moved to `2`, but the Acknowledgment Floor
stayed at `1`. The gap is the in-flight message. Wait 30 seconds for Ack
Wait to elapse, pull again, and the server hands you sequence `2` a
second time — now with `Redelivered Messages` counted. The message came
back because you never acked it.

## What we are not covering yet

Explicit ack is one policy of four, and `+ACK` is one reader response of
several. A reader can also negatively acknowledge a message to ask for
immediate redelivery, signal that it's still working, or terminate a
message so it never comes back.

Those responses, the other ack policies, and push consumers all belong
to the next layers. The full set of consumer options is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We use only explicit ack on a pull consumer here.

## Pitfalls

The ack/redeliver loop is reliable, but a few mistakes break it. Each one
below is scoped to this consumer.

**Ack Wait set too low.** Ack Wait is the deadline for an ack; its
default is 30 seconds. Set it shorter than your slowest handler and the
server redelivers a message that's still being processed, then
redelivers again, producing a redelivery storm where every message is
worked twice.

Don't guess Ack Wait. Set it comfortably longer than your slowest message
handler, with room to spare:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-ackWait"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Forgetting to ack.** A handler that processes a message but never
acks looks identical to a crashed reader: the message stays in flight,
Ack Wait elapses, and the server redelivers it — forever, since the
default delivery limit is unlimited. The `shipping` consumer will hand
you the same `ord_8w2k` order again and again.

Always ack on the success path. If a message can't be processed,
terminate it so it stops coming back (covered with
the other reader responses in [Reference → Consumer
Configuration](/reference/jetstream/api/consumer)).

**Acking the same message twice.** Once you ack a message, the server
advances the cursor past it. A second ack on the same message does
nothing useful, and most clients reject it with an error like
*"message was already acknowledged"* instead of sending it to the server.
Ack each delivery exactly once, in one place in your handler.

**Reusing a durable name with a different config.** A durable consumer
is identified by its name. Run `nats consumer add ORDERS shipping` again with
different flags and the server returns *consumer already exists*; it
won't silently reconfigure `shipping` out from under a running
reader. To change a durable, edit it (`nats consumer edit`) instead of
recreating it, or pick a new name.

## Where you are

You now have:

- A durable pull consumer named `shipping` on `ORDERS`, with
  `AckPolicy=explicit`.
- A cursor that remembers which messages you've acked, surviving
  restarts.
- The ack/redeliver loop: a message stays in flight until it's acked,
  and is redelivered after Ack Wait if it isn't.

The `ORDERS` stream still holds all three messages; a consumer reading
them doesn't delete them.

## What's next

One stream can feed many consumers, each at its own position. The next
page adds a second consumer that reads only `orders.shipped`, and shows
how a **filter** turns one stream into independent views.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including all four ack policies, push
  consumers, and the full set of reader responses beyond `+ACK`.
