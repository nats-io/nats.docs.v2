---
id: index
title: Core NATS Deep Dive
sidebar_position: 1
description: Publish-subscribe, subjects, request-reply, queue groups, and scatter-gather — from the first connection to debugging delivery, built up step by step
---

# Core NATS Deep Dive

Core NATS is the foundation everything else is built on. It's a
publish-subscribe system: a publisher publishes a message to a
subject, and every subscriber interested in that subject receives a
copy. There's no broker queue, no storage, and no acknowledgment. The
message goes to whoever is listening right now, and it goes to nobody
else.

That single idea, subjects plus interest, is enough to build four
communication patterns and the addressing they share. This chapter
walks through them the way you'd discover them while writing real
code: start with one publisher and one subscriber, then add
addressing, replies, load balancing, and reply gathering, one page
at a time. The chapter starts a step before that, with the
connection every client opens first, and continues past the
patterns into message headers, server-side subject mapping,
connection lifecycle, and debugging delivery.

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
canceled. Each one shows up as a message on a subject:

```
orders.created
orders.shipped
orders.canceled
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
the customer when an order ships. An `analytics` pipeline counts
everything. Later pages add regional analytics and audit views on
wildcard subjects, an `inventory` service that answers requests, a pool
of `packers` that share the load, and three shipping-quote providers
that each reply to the same question.

You keep a single local `nats-server` through the whole chapter —
two later pages restart it with a flag or a config file — and add
subscribers and services as you go.

## Who this is for

You've read the [Core Concepts → Publish & Subscribe](/concepts/pub-sub-basics)
primer, or you're otherwise comfortable with the idea of subjects and
subscribers. Rather than re-teaching the *what*, this chapter shows
the *how*: the mechanism on the wire, the trade-off behind each
pattern, and a runnable session you build up command by command. Each
page introduces one or two new ideas and builds on the one before it.

## Map

| Page | What you learn |
|---|---|
| [Connecting](/learn/core-nats/connecting) | One long-lived connection per client, the connect URL and handshake, connection names, and PING/PONG heartbeats |
| [Publish-subscribe](/learn/core-nats/publish-subscribe) | Fire-and-forget publish, subscribing and unsubscribing, the interest graph, at-most-once delivery, and the 1 MB max payload |
| [Subjects & wildcards](/learn/core-nats/subjects-and-wildcards) | Dot-delimited subject hierarchies and the `*` and `>` subscriber wildcards |
| [Request-reply](/learn/core-nats/request-reply) | The `_INBOX` reply subject, timeouts, and the no-responders signal |
| [Queue groups](/learn/core-nats/queue-groups) | Load balancing where each message goes to exactly one group member |
| [Scatter-gather](/learn/core-nats/scatter-gather) | Fan one request to many responders and gather the replies |
| [Message headers](/learn/core-nats/headers) | Key/value metadata in the `NATS/1.0` format, setting and reading it, and the status codes the server sends in-band |
| [Subject mapping](/learn/core-nats/subject-mapping) | Server-side rewriting of a subject before routing, to rename it, split its traffic by weight, or shard it by a hashed token |
| [Connection lifecycle](/learn/core-nats/connection-lifecycle) | What a dropped connection does to your client and in-flight messages, the client-owned reconnect, and the lifecycle callbacks that watch it |
| [Debugging delivery](/learn/core-nats/debugging-delivery) | Why a published message never arrived, found with a wire tap, the server's subscription list, and message tracing |
| [Where to go next](/learn/core-nats/where-next) | The four-idea recap and a map of what's beyond the foundation |

## Prerequisites

You'll need:

- A single local `nats-server`. The default build is all you need;
  core NATS requires no flags. Start it with `nats-server`.
- The `nats` CLI installed and pointed at your server. Every example
  leads with the CLI; most pages show the same operation in
  JavaScript, Go, Python, Java, Rust, and C# as well. The two
  server-side pages (Subject mapping, Debugging delivery) are
  CLI-only.
- One later page, [Subject mapping](/learn/core-nats/subject-mapping),
  starts the server from a config file with `nats-server -c
  server.conf`; that page gives you the file.
- [Debugging delivery](/learn/core-nats/debugging-delivery) reads the
  server's monitoring port, which you turn on with `nats-server -m
  8222`.

Open a terminal, run `nats-server`, and continue to the next page.

## What's next

Start with [Connecting](/learn/core-nats/connecting): the one
long-lived connection every client opens before it can publish or
subscribe, and the handshake that opens it and the heartbeats that
keep it alive.

## See also

- [Core Concepts → Publish & Subscribe](/concepts/pub-sub-basics) —
  the five-minute overview of the same material.
- [JetStream Deep Dive](/learn/jetstream) — the persistence layer this
  chapter stops short of.
