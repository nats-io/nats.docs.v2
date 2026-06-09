---
id: your-first-consumer
title: "5. Your first consumer"
sidebar_position: 6
description: Create a durable pull consumer with explicit ack and learn the ack/redeliver loop
---

# 5. Your first consumer

The previous page read messages back with an ephemeral consumer. It
replayed the stream, but it tracked nothing. Close it, reopen it, and
it starts over from the beginning.

That is fine for a quick look. It is not how a real service reads a
stream. A warehouse process that ships orders needs to remember which
orders it already handled, and it needs the server to redeliver an
order if the process dies mid-ship.

This page builds that consumer. It introduces two ideas: the **durable
cursor** that remembers your position, and the **ack/redeliver loop**
that makes delivery reliable.

**Entering:** 3 orders stored in the `ORDERS` stream, no consumer yet.

## A durable consumer remembers

A **consumer** is the server-side object a reader binds to. So far the
consumers in this chapter have been ephemeral: created on the fly,
forgotten when the reader disconnects.

A **durable** consumer is the opposite. It has a name, and the server
keeps its state on disk under that name. The state it keeps is a
**cursor** — the position of the last message the reader has
acknowledged. Disconnect, reconnect, and the consumer resumes from
exactly where the cursor points.

This is what lets a service restart without re-processing everything
it already did. The cursor is the consumer's memory.

## Create the shipping consumer

Create a durable consumer named `shipping` on the `ORDERS` stream:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-create"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Three things carry the meaning here.

`--pull` makes this a **pull consumer**. The reader asks the server for
messages when it is ready for them, rather than having the server push
them out unprompted. We use pull consumers throughout this chapter and
explain why on a later page.

`--ack explicit` sets the **acknowledgment policy** — the server will
not consider a message handled until an **acknowledgment**, or **ack**
for short, arrives. Every message this consumer delivers must be
individually acked by the reader.

The consumer name `shipping` — a positional argument, not a flag — makes
the consumer durable. A named consumer survives restarts; an unnamed one
does not.

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

The **Ack Wait** field in the `Configuration` block — `30.00s` here — is
the redelivery deadline. The next section explains how it drives the
ack/redeliver loop.

## The ack/redeliver loop

The animation below shows this in-flight state and the redelivery loop:
a message handed to a reader, held until it is acked, and sent again if
the ack never arrives.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="380"></div>

Here is what explicit ack buys you. When the consumer delivers a
message, that message enters an **in-flight** state. It is not gone from
the stream, and it is not yet considered handled. It is on loan to the
reader.

The reader has one job: process the message, then ack it. The ack tells
the server "I am done with this one, advance the cursor past it." Only
then does the message leave the in-flight state.

If the ack never comes, the server waits. The wait is bounded by **Ack
Wait**, which the config above shows as 30 seconds. When Ack Wait
elapses with no ack, the server assumes the reader failed and
**redelivers** the message — to the same reader, or to another one
bound to the same consumer.

This is the loop that makes delivery reliable. A message stays in flight
until it is acked. A reader that crashes mid-process never acks, so the
message comes back. Nothing is lost to a badly-timed restart.

## Pull one message and ack it

Pull a single message from `shipping` and acknowledge it:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-pullAndAck"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

This delivers stream sequence `1` — the first `orders.created` message
you published on page 3 — and acks it. Watch the cursor move:

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
deliver sequence `2`, then `3`. The consumer remembers where it is.

## What no-ack looks like

To see redelivery, pull a message but skip the ack:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-next"
     data-languages="cli"></div>

This delivers sequence `2` and leaves it in flight. Check the state and
you will see one outstanding ack:

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
immediate redelivery, signal that it is still working, or terminate a
message so it never comes back.

Those responses, the other ack policies, and push consumers all belong
to the next layers. The full set of consumer options is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We use only explicit ack on a pull consumer here.

## Pitfalls

The ack/redeliver loop is reliable, but a few mistakes turn it against
you. Each one below is concept-scoped to this consumer.

**Ack Wait set too low.** Ack Wait is the deadline for an ack; its
default is 30 seconds. Set it shorter than your slowest handler and the
server redelivers a message that is still being processed, then
redelivers again, producing a redelivery storm where every message is
worked twice.

Do not guess Ack Wait. Set it longer than your slowest message handler,
with headroom:

<div class="nats-example"
     data-type="learn-jetstream-your-first-consumer-ackWait"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Forgetting to ack.** A handler that processes a message but never
acks looks identical to a crashed reader: the message stays in flight,
Ack Wait elapses, and the server redelivers it — forever, since the
default delivery limit is unlimited. The `shipping` consumer will hand
you the same `ord_8w2k` order again and again.

Always ack on the success path. If a message is genuinely unprocessable,
do not just drop it — terminate it so it stops coming back (covered with
the other reader responses in [Reference → Consumer
Configuration](/reference/jetstream/api/consumer)).

**Acking the same message twice.** Once you ack a message, the server
advances the cursor past it. A second ack on the same message is
meaningless, and most clients reject it locally with an error like
*"message was already acknowledged"* rather than make the request. Ack
each delivery exactly once, in one place in your handler.

**Reusing a durable name with a different config.** A durable consumer
is keyed by its name. Run `nats consumer add ORDERS shipping` again with
different flags and the server returns *consumer already exists* — it
will not silently reconfigure `shipping` out from under a running
reader. To change a durable, edit it (`nats consumer edit`) instead of
recreating it, or pick a new name.

## Where you are

You now have:

- A durable pull consumer named `shipping` on `ORDERS`, with
  `AckPolicy=explicit`.
- A cursor that remembers which messages you have acked, surviving
  restarts.
- A working mental model of the ack/redeliver loop: in flight until
  acked, back after Ack Wait if not.

The `ORDERS` stream still holds all three messages — a consumer reading
them does not delete them.

## What is next

One stream can feed many consumers, each at its own position. The next
page adds a second consumer that reads only `orders.shipped`, and shows
how a **filter** turns one stream into independent views.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including all four ack policies, push
  consumers, and the full set of reader responses beyond `+ACK`.
