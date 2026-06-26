---
id: request-reply
title: "Request-reply"
sidebar_position: 4
description: Build a reply on top of pub/sub with a private inbox, a timeout, and the no-responders signal
---

# Request-reply

Pub/sub is one-way. A publisher publishes to `orders.created`, and a
copy goes to every interested subscriber. The publisher never hears
back.

Acme needs the other direction too. When an order arrives, the
warehouse wants to ask one question and get one answer: _is this item
in stock?_ That's a request and a reply, not a broadcast.

This page builds an **inventory** service that answers that question
on the subject `orders.inventory.check`. Along the way it shows the
two things that make request-reply work: the private reply subject the
client sets up for itself, and what happens when nobody is there to
answer.

## How request-reply uses pub/sub

Request-reply isn't a new protocol; it's the pub/sub you already know,
used twice.

Here are all the steps. The client invents a fresh, unique subject
to receive the answer on. It subscribes to that subject. It then
publishes the request, and includes that reply subject as a field on
the message. The responder reads the request, sees the reply subject,
and publishes its answer there. The client's subscription receives it.

<div class="nats-flow" data-scenario="requestReply" data-width="800" data-height="350"></div>

The orange arrow is the request traveling out on
`orders.inventory.check`. The green dashed arrow is the reply
traveling back on the private subject the client made for this one
call.

Every NATS client wraps those steps in a single `request()` call, so
you never write the subscribe-publish-wait by hand. The mechanism
underneath is exactly the four pub/sub operations above.

## The inbox

The private reply subject has a name and a convention. It's called an
**inbox**, and clients generate it under the reserved `_INBOX.`
prefix: something like `_INBOX.nQ4k2v8...` with a random unique tail.

The inbox is per-request. Each call to `request()` creates a fresh
inbox subject, subscribes to it, sends the request, waits for one
message, then unsubscribes. The next call gets a new inbox. Nothing
about the reply subject is shared or reused across requests, which is
why two in-flight requests never get each other's replies.

The `_INBOX.` prefix is reserved precisely so it doesn't collide with
your own subjects. You publish to `orders.created`; you never publish
to `_INBOX.something` yourself. The client owns that namespace.

There's a size budget on the reply subject. The server limits the
length of a single protocol line, subject plus reply subject
combined, to 4 KB by default (`max_control_line`). Generated inbox
names sit far under that, so this only matters if you hand-build
unusually long subjects.

The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
[Reference → Client protocol](/reference/protocols/client). We only
need the behavior here.

## The inventory service

Now make the responder real. The inventory service subscribes to
`orders.inventory.check` and replies to each request with an
in-stock answer.

From the CLI, `nats reply` does exactly this: it subscribes to the
subject and publishes a reply to whatever inbox each request carries.

<div class="nats-example"
     data-type="learn-core-nats-request-reply-respond"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Leave that running. It's now the one service in the Acme world that
answers questions instead of just receiving messages. The warehouse,
notifications, and analytics subscribers from the earlier pages keep
running unchanged. Request-reply doesn't replace them; it runs
alongside them.

## Sending a request

In a second terminal, ask the question. The warehouse sends the order
payload to `orders.inventory.check` and waits for the inventory
service to answer.

<div class="nats-example"
     data-type="learn-core-nats-request-reply-request"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

You should see the reply printed back. Behind that one line, the
client created an inbox, subscribed, published your payload with the
inbox attached, received the answer, and unsubscribed the inbox.

## Every request needs a timeout

A request can fail to come back. The responder might be slow, or busy,
or the reply might be lost in flight. Core NATS does not retry a reply
or hold it for later. That's the at-most-once guarantee from the
publish-subscribe page, and it applies to replies too. A reply that
doesn't arrive is gone.

So every request carries a **timeout**: the longest the client will
wait for the answer before giving up. The CLI sets `--timeout` for you
(five seconds by default), and the request snippet above makes it
explicit with `--timeout 2s`. Pick a value that covers the responder's
work plus the network round-trip. In a client library you pass the
timeout on every `request()` call, so a request can't wait
indefinitely.

When the timeout expires with no reply, the call returns a timeout
error. Your code decides what to do next: retry, fall back, or fail
the caller. Core NATS won't make that decision for you, and it won't
deliver the answer late.

A timeout tells you the answer didn't arrive in time, but it doesn't
tell you _why_. The responder might be slow, or it might not exist at
all. The next section covers how to tell those two cases apart.

## No responders

Waiting two seconds to discover that nobody is even listening is
wasteful. NATS has a faster signal for that exact case.

When you send a request to a subject with zero subscribers, the
server knows immediately that nobody can answer. Rather than let your
timeout run, it sends back a **no responders** signal right away: a
reply carrying a `503` status. Your client surfaces it as a distinct
no-responders error, not a timeout.

This is the difference between "the inventory service is slow" (you
get a timeout after 2s) and "the inventory service isn't running at
all" (you get no responders in milliseconds). One is a latency
problem; the other is a deployment problem. The signal lets your code
react correctly to each.

See it for yourself. Stop the inventory service from the first
terminal, then send the request again:

```bash
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 2s
```

```
nats: error: no responders available for request
```

The error comes back instantly, not after two seconds. Start the
service again and the same request succeeds.

One more detail about how this works: the no-responders signal
uses the message header mechanism. The server delivers it as a
reply whose header line is `NATS/1.0 503`, and it includes a
`Nats-Subject` header naming the request subject. A client must have
header support enabled to receive it (every current client does). If a
client somehow asks for no-responders detection without header support,
the server refuses the connection rather than half-enable the feature.

## Headers

That `503` mechanism points to a wider capability: NATS messages can
carry **headers**, key/value metadata that travels alongside the
payload in a format that looks like HTTP. A request can attach
headers, and so can a reply.

You won't need them for the inventory call, so this page doesn't
build with them. The full header format and the API on each client are
in [Reference](/reference/). Reach for them when you want metadata
that isn't part of the business payload: a request ID, a trace
context, a content type.

## Request-reply, queue groups, and many answers

The inventory service has one responder. Two questions follow
naturally, and each is its own page.

What if you run several inventory instances for capacity, and want
exactly one of them to handle each request? That's a **queue group**,
and the [next page](/learn/core-nats/queue-groups) builds one.

What if you want _every_ responder on a subject to answer the same
request, and you collect all the replies? That's
[scatter-gather](/learn/core-nats/scatter-gather), two pages on.

If your request-reply services start to grow real endpoints,
discovery, and stats, you're describing the
[Services framework](/learn/services), a layer built on exactly the
request-reply and queue-group primitives in this chapter. This chapter
stays on the primitives.

## Pitfalls

Request-reply is pub/sub pointed back, so it inherits pub/sub's failure
modes plus a few of its own. These are the ones that show up in the Acme
order services.

**A request without a timeout can wait forever.** The CLI always sets
one (`--timeout`, five seconds by default), but a client library will
wait as long as you let it. Pass a deadline on every `request()` call,
sized to cover the responder's work plus the round-trip. A timeout set
too short is the other half of this: it gives up on a valid reply that
was merely slow, so measure before you shrink it.

**Treating no responders as a hang.** When nobody subscribes to the
subject, the server returns the no-responders `503` signal in
milliseconds; it's not a slow timeout. Branch on it separately:
no responders means the inventory service isn't deployed, while a
timeout means it's deployed but slow. Lumping them together hides a
deployment bug behind a latency retry.

**Assuming exactly one reply.** A plain `request()` returns the first
reply and discards the rest. If two inventory instances both answer on
`orders.inventory.check`, the second answer is lost silently, with no
indication that it ever arrived. When more than one service
may answer, ask for it explicitly and gather by count or deadline:

<div class="nats-example"
     data-type="learn-core-nats-request-reply-replies"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

When you actually want every responder to answer, that's
[scatter-gather](/learn/core-nats/scatter-gather), not a bug. When you
want exactly one of several instances to handle each request, that's a
[queue group](/learn/core-nats/queue-groups).

**Doing slow work inside the responder.** A responder that runs a slow
lookup before replying serializes every request behind it, so one
expensive call adds latency to all the callers waiting in line. Keep
the reply path fast, or run several instances in a
[queue group](/learn/core-nats/queue-groups) so the load spreads
across them instead of stacking on one.

## Where you are

The Acme world now has its first two-way conversation:

- An inventory service answers on `orders.inventory.check`, built
  with `nats reply` (or a client's `respond()`).
- The warehouse asks with `nats request` (or `request()`), every call
  bounded by a timeout.
- A missing responder surfaces instantly as no responders, not as
  a slow timeout.
- Replies are at-most-once like everything else in core NATS: not
  retried, not held.

The pub/sub subscribers from earlier pages are still running. Nothing
about request-reply changed them.

## What's next

The inventory service is a single process. To scale it, you run
several copies and let NATS hand each request to exactly one of them.
That's a queue group: built-in load balancing with no broker in the
middle. Build one on the next page:
[Queue groups](/learn/core-nats/queue-groups).

## See also

- [Core Concepts → Request-reply](/concepts/request-reply) — the
  five-minute overview of the same pattern.
- [Learn → Services](/learn/services) — the framework that turns
  request-reply responders into discoverable services.
- [Reference → Client protocol](/reference/protocols/client) — the
  wire-level `PUB`/`SUB`/`MSG` and header format.
