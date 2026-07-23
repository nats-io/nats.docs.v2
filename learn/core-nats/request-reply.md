---
id: request-reply
title: "Request-reply"
sidebar_position: 5
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

The orange arrow is the request traveling out on the request subject.
The green dashed arrow is the reply traveling back on the private
subject the client made for this one call.

Every NATS client wraps those steps in a single `request()` call, so
you never write the subscribe-publish-wait by hand.

## The inbox

The private reply subject is called an **inbox**, and clients generate it
under the reserved `_INBOX.` prefix: something like `_INBOX.nQ4k2v8...`
with a random unique tail.

The inbox is per-request: each `request()` uses a fresh inbox, so two
in-flight requests never get each other's replies. The `_INBOX.` prefix
is reserved, so it never collides with the subjects you pick yourself;
the client owns that namespace.

A client doesn't open a subscription for every `request()`. On its
first request it subscribes once to a wildcard that stays fixed for the
connection — a subject shaped like `_INBOX.<connection>.*` — and reuses
that one subscription for every request after. Each request adds only
its own final token to that prefix, so the per-request fresh inbox
amounts to that fresh token, and the client routes each reply back to
the request waiting on its token.

That's why thousands of concurrent requests cost one subscription, not
thousands: every reply arrives on the same wildcard, and its final
token identifies which request it belongs to. (Clients can be
configured to fall back to one subscription per request; the shared one
is the default.)

There's a size budget on the reply subject. The server limits the
length of a single protocol line, subject plus reply subject
combined, to 4 KB by default (`max_control_line`). Generated inbox
names sit far under that, so this only matters if you hand-build
unusually long subjects.

The default `_INBOX.` prefix is configurable per connection — a client
option, exposed in natscli as the global `--inbox-prefix` flag. It
exists for permissions: with a distinct prefix per application, an
operator can grant each one its own reply-subject namespace instead of
a shared `_INBOX.>`. Subject permissions are covered on the
[Authorization](/learn/security/authorization) page.

## The inventory service

Now make the responder real. The inventory service subscribes to
`orders.inventory.check` and replies to each request with an
in-stock answer.

From the CLI, `nats reply` does exactly this: it subscribes to the
subject (joining the default queue group `NATS-RPLY-22`) and publishes
a reply to whatever inbox each request carries.

<div class="nats-example"
     data-type="learn-core-nats-request-reply-respond"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Leave that running. It's now the one service in the Acme world that
answers questions instead of just receiving messages. The warehouse,
notifications, and analytics subscribers from the earlier pages keep
running unchanged, and request-reply runs alongside them.

## Sending a request

In a second terminal, ask the question. The warehouse sends the order
payload to `orders.inventory.check` and waits for the inventory
service to answer.

<div class="nats-example"
     data-type="learn-core-nats-request-reply-request"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the reply printed back. Behind that one line, the
client picked a fresh inbox subject, published your payload with the
inbox attached, and matched the answer back to this call by its token on
the subscription it already holds for its inbox prefix.

## Every request needs a timeout

A request can fail to come back — the responder might be slow or busy, or
the reply lost in flight. Replies are
[at-most-once](/learn/core-nats/publish-subscribe#at-most-once-delivery)
like everything else: one that doesn't arrive is gone, not retried.

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

A timeout tells you the answer didn't arrive in time, not _why_ — the
responder might be slow, or not there at all. The next section tells those
apart.

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
14:02:31 Sending request on "orders.inventory.check"
14:02:31 No responders are available
```

The no-responders signal comes back instantly, not after two seconds.
The CLI prints the line and exits cleanly; a client library surfaces
the same case as a distinct error you can branch on (`ErrNoResponders`
in the Go client, with an equivalent in each language). Start the
service again and the same request succeeds.

The signal rides the message header mechanism: the server delivers a
reply with the header line `NATS/1.0 503`. A client needs header support
to receive it, which every current client enables.

## Headers

That `503` mechanism points to a wider capability: NATS messages can
carry **headers**, key/value metadata that travels alongside the
payload in a format that looks like HTTP. A request can attach
headers, and so can a reply.

You won't need them for the inventory call, so this page doesn't
build with them. [Message headers](/learn/core-nats/headers) shows how
to set and read them; the full wire format is in
[Reference](/reference/). Reach for them when you want metadata
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

**A request without a timeout can wait forever.** Pass a deadline on
every `request()` call, sized to the responder's work plus the round-trip
— long enough not to give up on a merely-slow reply.

**Treating no responders as a hang.** No responders comes back in
milliseconds, not as a slow timeout. Branch on it separately: no
responders means nothing is deployed, a timeout means it's deployed but
slow.

**Assuming exactly one reply.** A plain `request()` returns the first
reply and discards the rest. If two inventory instances both answer on
`orders.inventory.check`, the second answer is lost silently, with no
indication that it ever arrived. When more than one service
may answer, ask for it explicitly and gather by count or deadline:

<div class="nats-example"
     data-type="learn-core-nats-request-reply-replies"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
