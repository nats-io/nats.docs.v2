---
id: publish-subscribe
title: "1. Publish-subscribe"
sidebar_position: 2
description: Fire-and-forget publish, the in-memory interest graph, and core NATS at-most-once delivery
---

# 1. Publish-subscribe

Everything in core NATS is one move: a client publishes a message to a
subject, and every client subscribed to that subject right now gets a
copy. This page takes that one move apart.

The concept primer already says *what* publish-subscribe is. This page
shows *how* it behaves on the wire: where the copies come from, what
happens when nobody is listening, and exactly what core NATS promises
about delivery.

## The scenario

Acme runs an order platform. Three things happen to an order, and each
one is a message on its own subject:

```
orders.created
orders.shipped
orders.cancelled
```

Every message in this chapter carries the same small JSON payload:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Three services care about these messages. The `warehouse` service
packs the box when an order is created. The `notifications` service
emails the customer. The `analytics` service counts everything. None
of them knows the others exist.

You need one local `nats-server` running for the rest of this chapter:

```bash
nats-server
```

That is the whole deployment. No flags, no persistence, no cluster.
Leave it running and add services to it as the chapter grows.

## Publishing a message

A **publisher** is a client that sends a message to a subject. The
warehouse does not subscribe to anything yet, so start by publishing
one `orders.created` message:

<div class="nats-example" data-type="learn-core-nats-publish-subscribe-publish" data-languages="cli,js,go,python,java,rust,csharp"></div>

The publish call returns immediately. It does not wait for a
subscriber, it does not report how many subscribers received the
message, and it does not report whether any did. This is
**fire-and-forget**: the publisher hands the message to the server and
moves on.

A publisher always names a fully-qualified subject. `orders.created`
is a concrete subject, not a pattern. Wildcards belong to subscribers,
and we cover them on the [next page](/learn/core-nats/subjects-and-wildcards).

## Subscribing to a subject

A **subscriber** is a client that registers interest in a subject and
receives a copy of every matching message. Start the warehouse service
as a subscriber on `orders.created`:

<div class="nats-example" data-type="learn-core-nats-publish-subscribe-subscribe" data-languages="cli,js,go,python,java,rust,csharp"></div>

Now publish again with the snippet above. The warehouse receives the
message. Run a second subscriber for `notifications` and a third for
`analytics`, each on `orders.created`, and every one of them receives
its own copy of the next publish.

A subscriber does not consume or remove the message. Subscribing is
not taking from a queue. Each subscriber gets an independent copy, and
one subscriber receiving a message takes nothing away from another.

If you want one subscriber to see *all* order subjects at once, it can
subscribe to `orders.>` instead of a single subject. That `>` is a
wildcard, and the [next page](/learn/core-nats/subjects-and-wildcards)
is where we explain it.

## The interest graph

The server tracks who is subscribed to what in an in-memory structure
called the **interest graph**. Each subscription adds an entry; each
disconnect removes it.

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

When a message arrives, the server looks up the subject in the
interest graph, finds the matching subscribers, and sends each one a
copy. With three services subscribed to `orders.created`, one publish
produces three deliveries. The publisher did nothing different; the
fan-out happened entirely on the server.

The interest graph is the source of the decoupling. The publisher
holds no list of subscribers. It publishes to a subject, and the
server resolves interest at the moment the message arrives.

This is also why services can come and go freely. Start a fourth
subscriber and it joins the graph; the next publish reaches it. Stop
one and its entry is gone; the next publish skips it. Nobody
coordinates, and the publisher never changes.

## When nobody is listening

Publish to `orders.created` while no service is subscribed. The
publish still succeeds, and the message is discarded. The server
finds no matching entry in the interest graph, so there is nothing to
deliver to, and the message is dropped on the floor.

This is the behavior to internalize: a publish with no interest is not
an error and not a stored backlog. It is a silent no-op. The publisher
cannot tell the difference between "delivered to three subscribers" and
"delivered to nobody" — both look like a successful publish.

That gap matters for orders. If the warehouse is restarting when an
`orders.created` message is published, that message is gone, and no
restart brings it back. Remembering messages for absent subscribers is
exactly what core NATS does not do. The [JetStream deep
dive](/learn/jetstream/why-a-stream) is the layer that adds it.

## At-most-once delivery

Core NATS delivers each message **at-most-once**. A subscriber that is
connected and interested when the message is published gets it once. A
subscriber that is absent, slow, or disconnected at that instant gets
it zero times. There is no second attempt.

At-most-once is a precise promise, so it is worth stating what it rules
out. Core NATS does not retry a missed message. It does not detect or
suppress duplicates. It does not guarantee that two subscribers see
messages in the same order under load. Each of those is a property you
add with [JetStream](/learn/jetstream), not something core provides.

At-most-once is the right guarantee for a large class of messages:
telemetry you sample, cache invalidations, a live dashboard feed. For
those, a missed message costs nothing because another is already on
the way. For an order that must be packed exactly once, it is not
enough — and that is the boundary this chapter respects.

## The 1 MB payload limit

A message payload has a maximum size. By default the server caps it at
**1 MB** (`max_payload`, `1048576` bytes). The server announces this
limit to every client when the connection opens, so the client knows
the ceiling before it ever publishes.

Exceeding the limit is not a soft failure. If a client publishes a
payload larger than `max_payload`, the server rejects it and closes the
connection. The Acme order payload is a few hundred bytes, so this
never bites here — but a service that tries to ship a large blob inside
a message will hit it.

The fix is not a bigger payload. For large data, publish a reference —
an object-store key or a URL — and let the receiver fetch the bytes out
of band. Subjects are cheap; large messages are not.

The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
[Reference → Client protocol](/reference/protocols/client). We only
need the behavior here.

## Try it in two terminals

Watch fire-and-forget and at-most-once with your own eyes. Open two
terminals against the running server.

```bash
# Terminal 1 — the warehouse subscribes
nats sub orders.created
```

```bash
# Terminal 2 — publish three orders
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.created '{"order_id":"ord_5kq1","customer":"initech","total_cents":1500,"ts":"2026-05-22T10:14:29Z"}'
```

Terminal 1 prints each message the instant it is published. Now stop
the subscriber in Terminal 1 with Ctrl-C, publish a fourth message,
and restart the subscriber. The fourth message never appears. It was
published into an empty interest graph and discarded. That is
at-most-once, demonstrated.

## Pitfalls

A few sharp edges show up the first time you build on publish-subscribe.
None of them is a bug; each is a direct consequence of the model this
page just described.

**Publishing over the limit drops your connection.** A payload larger
than `max_payload` is not truncated or queued — the server rejects it
and closes the connection. The Acme order payload is tiny, but a service
that tries to ship a large blob inside a message hits this. Do not guess
the ceiling: ask the server for it, then keep payloads under it and pass
a reference for anything large.

<div class="nats-example" data-type="learn-core-nats-publish-subscribe-check-max-payload" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Exiting before the publish leaves the client drops it.** The publish
call returns immediately because the client buffers the message and
sends it in the background. A short-lived publisher that exits right
after the call can quit before that buffered message reaches the server,
and the message is gone. Flush (or drain) before you exit so the client
waits for the server to acknowledge the buffered publishes:

```go
nc.Publish("orders.created", payload)
nc.Flush() // wait until the server has the message, then exit
nc.Close()
```

**A slow subscriber gets cut off.** A subscriber that cannot keep up
with the rate of matching messages builds a backlog on the server. Past
a threshold the server stops protecting it, logs `Slow Consumer
Detected`, and closes its connection — the other subscribers are
unaffected. The fix lives in the client: process messages fast enough,
or hand them to a worker. [Resilient clients →
Slow consumers](/learn/resilient-clients/slow-consumers) covers the
tuning and recovery.

## Where you are

You have one local `nats-server` running, and the Acme order services
talking over core publish-subscribe:

- A publisher sends `orders.created` messages fire-and-forget.
- The `warehouse`, `notifications`, and `analytics` subscribers each
  receive their own copy.
- A message published with no interest is discarded, and delivery is
  at-most-once.

## What is next

Right now every service subscribes to one exact subject. The next page,
[Subjects & wildcards](/learn/core-nats/subjects-and-wildcards), shows
how subjects form a hierarchy and how a subscriber uses `*` and `>` to
match many subjects at once — including regional orders like
`orders.us.created`.

## See also

- [Core Concepts → Publish-subscribe](/concepts/pub-sub-basics) — the
  five-minute overview of this pattern.
- [Learn → JetStream → Why a stream](/learn/jetstream/why-a-stream) —
  the layer that remembers messages core NATS discards.
- [Reference → Client protocol](/reference/protocols/client) — the
  wire-level `PUB`/`SUB`/`MSG` details.
