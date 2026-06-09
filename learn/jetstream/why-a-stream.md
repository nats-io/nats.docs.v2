---
id: why-a-stream
title: 1. Why a stream
sidebar_position: 2
description: What core NATS leaves on the table, and why a stream is the answer
---

# 1. Why a stream

Before adding anything new, look at what core NATS already does. A
publisher publishes to a subject. Anyone subscribed to that subject
right now receives the message. Nobody else does. Nobody ever will.

That is enough for a lot of systems. Telemetry that you sample, chat
typing indicators, cache invalidations — anything where missing a
message is fine because another one is coming.

It is not enough for order events.

## The scenario

Our running example for this chapter is a small e-commerce backend.
Three things happen to an order: it gets created, it gets shipped, it
gets cancelled. Each one shows up as a message on a subject:

```
orders.created
orders.shipped
orders.cancelled
```

The payload is a small JSON object — the same shape across every
example in this chapter:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Several services care about these messages. A warehouse process picks
up `orders.created` and packs the box. A notification service sends
the customer an email on `orders.shipped`. An analytics pipeline
counts everything.

## What pub-sub cannot do here

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="380"></div>

Try the obvious thing first. Run each service with `nats sub
"orders.>"`. Publish a few `orders.created` messages. The warehouse,
notifications, and analytics all receive them. Good.

Now ask the harder questions.

**What happens when the warehouse service restarts?** It disconnects
for ten seconds while the new process boots. During those ten
seconds, three new orders come in. The new process subscribes when it
starts — and it never sees those three orders. The publisher already
moved on. The messages are gone.

**What happens when the analytics service is added a month later?**
It cares about every order from the last thirty days. Core NATS has
no way to deliver them. They were never stored anywhere it can ask.

**What happens when the warehouse worker crashes mid-pack?** It
received the message, started working, then died. Nothing tells the
next worker to pick that order up. The message was delivered exactly
once, to a process that no longer exists.

Each of these failures has the same shape: the publisher and the
subscriber had to be online at the same moment, and the message had
nowhere to wait.

## What a stream changes

A **stream** is a server-side store of messages. When you tell the
NATS server "capture everything published to `orders.>` into a stream
called `ORDERS`", it does exactly that. Each message is appended to
the stream and given a sequence number.

The stream is the missing piece. Once messages live in a stream, the
three failures above stop being problems:

- The warehouse can restart, then ask the server to replay messages
  it missed. The messages were never gone — they were stored in the
  stream, waiting.
- The analytics service can be added a month later and read from the
  beginning of the stream. The history is right there.
- A crashed worker leaves an unacked message in flight. The
  server redelivers it to another worker after a timeout.

That last one — _redelivery_ — is what gives JetStream the property
called **at-least-once delivery**. A message stays in flight until
the consumer acks it. We will work through the mechanics on
the consumer pages.

## What does not change

A stream does not change the way core NATS publishes and subscribes.
The wire protocol is the same. A publisher still calls publish on a
subject and does not know who, if anyone, is listening. The
difference is on the server: the message also lands in any streams
that capture matching subjects.

This matters because a subject can be captured by a stream and
listened to directly at the same time. A monitoring dashboard can
keep subscribing to `orders.>` over plain core NATS for a live feed,
while the warehouse, notifications, and analytics services read from
the `ORDERS` stream for reliable processing. The publisher does not
need to know.

A stream is also not infinite. It has limits — how many messages it
keeps, for how long, and on disk or in memory. Those limits are what
makes a stream a finite, manageable resource instead of an
ever-growing log. We will configure them on a later page.

## When you do not need a stream

Reaching for a stream is not free. Streams use disk (or memory), they
have a leader, they need cleaning up. If your messages truly do not
need to survive a restart, do not introduce one.

Good signals that pub-sub is still the right answer:

- The information in each message is _superseded_ by the next one
  (current price, current temperature, current cache key).
- A missing message has no consequence beyond "wait for the next one."
- The subscribers are always live during normal operation, and "the
  service crashed" is handled by another mechanism (a sync on
  reconnect, a periodic refresh, a separate durable store).

If any of those stop being true, a stream is what you want.

## Pitfalls

Two assumptions trip people up the first time they reach for a stream.

**A stream is not a responder.** Capturing `orders.>` into the `ORDERS`
stream stores every matching message. It does not make the subject
answer requests. A caller that publishes a request and waits for a
reply still gets _no responders_ when nobody is subscribed live — the
stream sits silently behind the subject and never replies.

Do not treat "the stream exists" as "someone will answer." If you need
a reply, run a service that subscribes and responds; the stream is for
storage and replay, not for request-reply.

<div class="nats-example" data-type="learn-jetstream-why-a-stream-no-responders" data-languages="cli,js,go,python,java,rust,csharp"></div>

The message in that request still lands in the `ORDERS` stream. Getting
it back out is a consumer's job, which we cover on the consumer pages —
it is never a reply to the original publisher.

**Reaching for a stream when pub-sub already works.** A stream is not
free: it writes to disk by default, it has a single leader until you
ask for more replicas, and it needs limits so it does not grow forever.
Adding one to a flow where missing a message has no consequence buys
you cost without buying you anything.

Do not store what the next message supersedes. The signals for staying
on plain pub-sub are listed under [When you do not need a
stream](#when-you-do-not-need-a-stream) above; if none of them hold, a
stream is the right call.

## What is next

The next page creates the `ORDERS` stream — one CLI command and a
look at what the server reports back. After that we publish into it
and see how stored messages differ from sent messages.

## See also

- [Core Concepts → JetStream](/concepts/jetstream) — the five-minute
  overview of the same material.
- [Core Concepts → Publish & Subscribe](/concepts/pub-sub-basics) —
  the layer this chapter builds on.
