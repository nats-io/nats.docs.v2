---
id: where-next
title: "6. Where to go next"
sidebar_position: 7
description: Recap the core NATS mental model and point to what comes after the foundation
---

# 6. Where to go next

You started this chapter with a single publish to `orders.created` and
no guarantee anyone was subscribed. You end it with `warehouse`,
`notifications`, and `analytics` reading the order subjects, an
`inventory` service answering requests on `orders.inventory.check`, a
`packers` queue group sharing the load on `orders.created`, and three
`shipping.quote` providers answering one scatter-gather request. That's
the whole Acme ORDERS world, built on core NATS alone.

This page doesn't teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The four core ideas

Every page in this chapter circled the same four ideas. If you remember
nothing else, remember these.

A **subject** is the address. A publisher publishes to a subject and
never names a receiver. The subject is the only thing the publisher and
the subscriber agree on, and wildcards let one subscription match a whole
hierarchy of subjects at once.

**Interest** is what makes a message move. The server keeps an in-memory
graph of which subscribers want which subjects, and a published message
goes to every interested subscriber, or to nobody, in which case it's
discarded. With no interest, no copy is made and nothing is recorded.

A **reply subject** turns one-way publish into a two-way exchange. The
client subscribes to a unique `_INBOX` subject, sends it alongside the
request, and the responder publishes the answer back to it. The same
mechanism surfaces failure as a no-responders signal when no responder
is subscribed.

A **queue group** is how many subscribers share one subject's load. Each
message goes to exactly one member of the group, chosen by the server,
with no broker or coordinator deciding for you.

The four ideas are subject, interest, reply subject, and queue group.
Scatter-gather is not a fifth idea. It is a reply subject with the
first-answer-wins step removed, gathering every responder instead of
one. Everything in core NATS is those four mechanics arranged
differently.

## What core NATS does not store

Core NATS does not store messages. A message exists only while it's in
flight to a live subscriber. Once it's delivered, or discarded for lack
of interest, it no longer exists anywhere. That property has a name you
met on the first page: **at-most-once** delivery.

This is a deliberate design choice rather than a missing feature. It's
what makes core NATS fast and what keeps a publisher from blocking on
subscribers that are slow or offline. For the Acme ORDERS world, though,
an order that arrives while the warehouse is restarting is an order lost.
That's exactly the gap the next chapter fills.

The [JetStream deep dive](/learn/jetstream) adds a server-side store on
top of the same subjects you already use. Start with
[Why a stream](/learn/jetstream/your-first-stream#why-a-stream): it picks up the identical
Acme ORDERS world at the exact point this chapter leaves it, and shows
what changes when a message can wait.

## Where the details live now

This chapter is unversioned and concept-first. The exact flags,
defaults, and the byte-level frames live in **Reference**, which is
versioned and exhaustive.

The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
[Reference → Client protocol](/reference/protocols/client). We only
needed the behavior here; that page has the bytes.

The [Reference root](/reference/) is the entry point for everything
else: every flag and default, versioned in full.

## Sibling deep dives

Core NATS is the foundation. The other chapters build directly on the
four mechanics you just learned.

The [Services deep dive](/learn/services) takes request-reply and queue
groups (the two patterns from pages 3 and 4) and wraps them in a
framework that adds discovery, schemas, and built-in metrics. If you find
yourself hand-rolling many request-reply responders, that's the chapter
to read next. Start with
[your first service](/learn/services/your-first-service).

The [Resilient clients deep dive](/learn/resilient-clients) covers the
client-side behavior this chapter set aside: what happens when the
connection drops, how a client reconnects, and how to drain cleanly
without losing in-flight work. Its pages on
[reconnection](/learn/resilient-clients/reconnection) and
[slow consumers](/learn/resilient-clients/slow-consumers) matter the
moment you move off a single local server.

The [Topologies deep dive](/learn/topologies/super-clusters) explains how
the interest graph you met on page 1 stretches across clustered and
geographically separated servers, including how a queue group prefers a
local member when the same group spans regions.

The [Security deep dive](/learn/security) covers who's allowed to
publish or subscribe to which subjects. The subject hierarchy from page 2
is also the unit of permission, so the addressing you designed is the
same thing you secure.

## Where you are

This is the end of the chapter. The whole arc is complete, and this
page adds no new scenario state. Your local `nats-server`, the three
order subscribers, the `inventory` service, the `packers` queue group,
and the `shipping.quote` providers are all still as you left them on the
previous page. Keep experimenting, or stop the server when you're done:
core NATS held nothing on disk, so there's nothing to clean up.

You hold the core model: a subject is an address, interest decides who
receives, a reply subject makes the exchange two-way, and a queue group
shares the load. That model is the floor every other NATS feature stands
on.

## What's next

The most important link to follow is the
[JetStream deep dive](/learn/jetstream), which is what core NATS becomes
when a message needs to survive. It resumes the same Acme ORDERS story
right where you are now.

## Production checklist

The pitfalls scattered across this chapter collapse into one list. Run
through it before you put a core NATS service in front of real traffic.
Each group links back to the page that explains the why.

### Publish-subscribe — see [Pitfalls](/learn/core-nats/publish-subscribe#pitfalls)

- [ ] Ask the server for `max_payload` and keep payloads under it; pass a
  reference for anything large.
- [ ] Flush or drain before a short-lived publisher exits, so buffered
  messages reach the server.
- [ ] Process messages fast enough (or hand off to a worker) so a slow
  subscriber isn't cut off.

### Subjects & wildcards — see [Pitfalls](/learn/core-nats/subjects-and-wildcards#pitfalls)

- [ ] Put `>` only as the last token; use `*` for a free token in the
  middle.
- [ ] Publish a fully-qualified subject; never publish "to a wildcard."
- [ ] Subscribe to the narrowest pattern that covers your need, not a
  catch-all `orders.>`.
- [ ] Keep whitespace out of subjects, and stay clear of `$` and `_INBOX`
  prefixes.

### Request-reply — see [Pitfalls](/learn/core-nats/request-reply#pitfalls)

- [ ] Pass a timeout on every request, sized to the responder's work plus
  the round-trip.
- [ ] Branch on no responders separately from a timeout.
- [ ] Gather explicitly when more than one service may answer; don't
  assume exactly one reply.
- [ ] Keep the reply path fast, or spread responders across a queue group.

### Queue groups — see [Pitfalls](/learn/core-nats/queue-groups#pitfalls)

- [ ] Give every member the byte-for-byte identical queue group name.
- [ ] Don't expect ordering or an even split; keep strictly-ordered work
  on a single subscriber.
- [ ] Make a member's work safe to repeat, since core NATS does not
  redeliver after a hand-off.

### Scatter-gather — see [Pitfalls](/learn/core-nats/scatter-gather#pitfalls)

- [ ] Gather replies in a loop instead of taking the first reply.
- [ ] Bound the wait with a deadline so a missing responder costs only the
  timeout.
- [ ] Treat the gathered set as unordered; compare every reply on its
  merits, never by arrival order.

## See also

- [JetStream deep dive](/learn/jetstream) — the next chapter, which adds
  persistence to the subjects you already use.
- [Services deep dive](/learn/services) — request-reply and queue groups
  wrapped in a framework with discovery and metrics.
- [Reference](/reference/) — every flag, default, and the wire protocol,
  versioned and exhaustive.
