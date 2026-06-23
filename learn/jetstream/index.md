---
id: index
title: JetStream Deep Dive
sidebar_position: 1
description: Streams, consumers, and the acknowledgment loop, built up step by step
---

# JetStream Deep Dive

JetStream is the persistence layer of NATS: it stores messages so they can
be replayed later, survive a restart, and be redelivered until a consumer
acknowledges them.

This chapter builds that up a page at a time around one running example,
the Acme `ORDERS` platform, with a single server running from the first
page to the last. Nothing resets between pages.

## Who this is for

You've read the [Core Concepts → JetStream](/concepts/jetstream) primer, or
you're otherwise comfortable with NATS basics: publishing, subscribing,
subjects, and queue groups.

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | [Your first stream](./your-first-stream) | Why a stream, then create the `ORDERS` stream and read its anatomy |
| 2 | [Publishing](./publishing) | Publish into a stream and understand the `PubAck` contract |
| 3 | [Reading back the stream](./reading-back) | Replay stored messages with an ephemeral consumer |
| 4 | [Your first consumer](./your-first-consumer) | Create the `shipping` pull consumer and the acknowledgment loop |
| 5 | [Filtering what you consume](./filtering) | Narrow a consumer to subjects like `orders.shipped` |
| 6 | [Acknowledgment](./acknowledgment) | ack, nak, term, in-progress, and redelivery timing |
| 7 | [Pull consumers in depth](./pull-consumers) | fetch vs consume, and the knobs that bound a pull |
| 8 | [A pool of workers](./worker-pool) | Share one consumer across many workers |
| 9 | [Priority groups](./priority-groups) | Steer which client gets served: overflow and pinned_client |
| 10 | [Pausing a consumer](./pausing) | Stop delivery for a window, then resume |
| 11 | [Push vs pull](./push-vs-pull) | Why pull is the default, and when push still fits |
| 12 | [Shaping the stream](./shaping-the-stream) | Tune retention limits and discard behavior |
| 13 | [Delivery semantics](./delivery-semantics) | Limits, Interest, and WorkQueue retention |
| 14 | [Per-message TTL](./message-ttl) | Expire individual messages ahead of the stream |
| 15 | [Altering stream state](./altering-stream-state) | Delete a message or purge the stream, by hand |
| 16 | [Surviving node loss](./surviving-node-loss) | Replicas, leaders, and storage durability |
| 17 | [Mirrors and sources](./mirrors-and-sources) | Copy one stream, or aggregate many |
| 18 | [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A working `nats-server` with JetStream enabled. The simplest way is
  `nats-server -js` (see [Getting Started](/concepts/getting-started/)).
- The `nats` CLI installed and pointed at your server.

Open a terminal, run `nats-server -js`, and turn the page.
