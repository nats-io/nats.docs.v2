---
id: index
title: Core NATS Deep Dive
sidebar_position: 1
description: Publish-subscribe, subjects, request-reply, queue groups, and scatter-gather, built up step by step
---

# Core NATS Deep Dive

Core NATS is the foundation everything else is built on. It's a
publish-subscribe system: a publisher publishes a message to a
subject, and every subscriber interested in that subject receives a
copy. There's no broker queue, no storage, and no acknowledgment. The
message goes to whoever is listening right now, and it goes to nobody
else.

That single idea, subjects plus interest, is enough to build five
distinct communication patterns. This chapter walks through them the
way you'd discover them while writing real code: start with one
publisher and one subscriber, then add addressing, replies, load
balancing, and reply gathering, one page at a time.

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

## Core NATS is ephemeral

The one property to hold in your head for the whole chapter:
**core NATS is at-most-once**. A message reaches every interested
subscriber that's connected at the moment of publish, at most
once. If a subscriber is offline, restarting, or not
subscribed yet, it never sees that message. The server does not store
it for later.

That behavior is intentional. It keeps core NATS small and fast, and
it's exactly right when each message is superseded by the next one,
such as a live price, a current temperature, or a cache invalidation.

When you need messages to wait for a subscriber, survive a restart,
or be replayed later, you add a stream. That's
[JetStream](/learn/jetstream), the persistence layer that sits on top
of core NATS. This chapter is everything that happens *before* you
reach for it.

## The running scenario

Every page builds the same example: the Acme ORDERS platform, shown at
its foundation, before it adds any persistence. The order services
talk over core NATS only.

Three things happen to an order: it's created, shipped, or
cancelled. Each one shows up as a message on a subject:

```
orders.created
orders.shipped
orders.cancelled
```

The payload is a small JSON object, the same shape across every
example in this chapter:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Several services care about these messages. A `warehouse` process
packs the box on `orders.created`. A `notifications` service emails
the customer on `orders.shipped`. An `analytics` pipeline counts
everything. Later pages add an `inventory` service that answers
requests, a pool of `packers` that share the load, and three
shipping-quote providers that each reply to the same question.

You keep one `nats-server` running through the whole chapter and add
subscribers and services as you go. No page resets the world.

## Who this is for

You've read the [Core Concepts → Publish & Subscribe](/concepts/pub-sub-basics)
primer, or you're otherwise comfortable with the idea of subjects and
subscribers. Rather than re-teaching the *what*, this chapter shows
the *how*: the mechanism on the wire, the trade-off behind each
pattern, and a runnable session you build up command by command. Each
page introduces at most two new ideas and builds on the one before it.

## Map

| Page | What you learn |
|---|---|
| [Publish-subscribe](/learn/core-nats/publish-subscribe) | Fire-and-forget publish, the interest graph, at-most-once delivery, and the 1 MB max payload |
| [Subjects & wildcards](/learn/core-nats/subjects-and-wildcards) | Dot-delimited subject hierarchies and the `*` and `>` subscriber wildcards |
| [Request-reply](/learn/core-nats/request-reply) | The `_INBOX` reply subject, timeouts, and the no-responders signal |
| [Queue groups](/learn/core-nats/queue-groups) | Load balancing where each message goes to exactly one group member |
| [Scatter-gather](/learn/core-nats/scatter-gather) | Fan one request to many responders and gather the replies |
| [Where to go next](/learn/core-nats/where-next) | A map of what's beyond the foundation |

## Prerequisites

You'll need:

- A single local `nats-server`. The default build is all you need;
  core NATS requires no flags. Start it with `nats-server`.
- The `nats` CLI installed and pointed at your server. The first pages
  use only the CLI; later pages add JavaScript, Go, Python, Java,
  Rust, and C# client examples for the same operations.

Open a terminal, run `nats-server`, and continue to the next page.

## What's next

Start with [Publish-subscribe](/learn/core-nats/publish-subscribe):
one publisher, three subscribers, and the interest graph that decides
who gets a copy.

## See also

- [Core Concepts → Publish & Subscribe](/concepts/pub-sub-basics) —
  the five-minute overview of the same material.
- [JetStream Deep Dive](/learn/jetstream) — the persistence layer this
  chapter stops short of.
