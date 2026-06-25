---
id: index
title: JetStream Deep Dive
sidebar_position: 1
description: Streams, consumers, and the acknowledgment loop, taught step by step
---

# JetStream Deep Dive

JetStream is the part of NATS that stores messages. Once a message is stored,
you can read it again later. It stays on disk through a server restart. And it
keeps getting redelivered until a consumer acknowledges it.

This chapter builds that up one page at a time, using a single running example:
the Acme `ORDERS` platform. The same server runs across the whole chapter, and
its data carries over from one page to the next.

## Who this is for

You've read the [Core Concepts → JetStream](/concepts/jetstream) primer, or
you're otherwise comfortable with NATS basics: publishing, subscribing,
subjects, and queue groups.

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | [Your first stream](./your-first-stream) | Why a stream, then create the `ORDERS` stream and read its anatomy |
| 2 | [Publishing](./publishing) | Publish into a stream and understand the `PubAck` contract |
| 3 | [Reading back the stream](./reading-back) | Read stored messages back with a durable consumer |
| 4 | [Filtering what you consume](./filtering) | Add a second consumer that reads only `orders.shipped` |
| 5 | [Delivery and acknowledgment](./your-first-consumer) | In-flight, ack, double ack, and redelivery |
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
| 18 | [Advanced publishing](./advanced-publishing) | Async, atomic-batch, and fast-ingest publishing |
| 19 | [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A running `nats-server` with JetStream turned on. The simplest way to get one
  is `nats-server -js` (see [Getting Started](/concepts/getting-started/)).
- The `nats` CLI installed and pointed at your server.

Open a terminal and run `nats-server -js`.
