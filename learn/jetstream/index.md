---
id: index
title: JetStream Deep Dive
sidebar_position: 1
description: Streams, consumers, and the acknowledgment loop, built up step by step
---

# JetStream Deep Dive

JetStream is the persistence layer of NATS. This chapter walks through
it the way you would build up understanding by writing real code:
start with a single stream, add one consumer at a time, learn the
trade-offs as they come up.

By the end you will have:

- An `ORDERS` stream that captures order events on the subjects
  `orders.created`, `orders.shipped`, and `orders.cancelled`.
- A `shipping` consumer that pulls work from that stream, acknowledges
  each order it processes, and survives a worker restart without
  losing or duplicating completed work.
- A second `analytics` consumer that filters the same stream for
  `orders.shipped` only, replaying from any point in time.
- A working mental model of acknowledgment, retention, and
  replication.

## Who this is for

You have read the [Core Concepts](/concepts/jetstream/) primer or are
otherwise comfortable with NATS basics — publishing, subscribing,
subjects, and queue groups. This chapter does not re-teach those.

You do not need to know anything about JetStream specifically. We
start from "what is a stream and why would you want one" and grow
from there.

## How to read it

Each page introduces at most two new concepts. Pages build on the
previous one: the same `ORDERS` stream is used throughout, and you
can keep one terminal open through the whole chapter without
resetting state.

Where a feature has a long list of options, knobs, or error codes,
the page covers only what you need to understand the concept and
links to [Reference](/reference/) for the rest.

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | [Why a stream](./why-a-stream) | What core NATS does not give you, and why a stream is the answer |
| 2 | [Your first stream](./your-first-stream) | Create the `ORDERS` stream and read its anatomy |
| 3 | [Publishing](./publishing) | Publish into a stream and understand the `PubAck` contract |
| 4 | [Reading back the stream](./reading-back) | Replay stored messages with an ephemeral consumer |
| 5 | [Your first consumer](./your-first-consumer) | Create the `shipping` pull consumer and the acknowledgment loop |
| 6 | [Filtering what you consume](./filtering) | Narrow a consumer to subjects like `orders.shipped` |
| 7 | [Acknowledgment](./acknowledgment) | ack, nak, term, in-progress, and redelivery timing |
| 8 | [Pull consumers in depth](./pull-consumers) | fetch vs consume, and the knobs that bound a pull |
| 9 | [A pool of workers](./worker-pool) | Share one consumer across many workers |
| 10 | [Priority groups](./priority-groups) | Steer which client gets served: overflow and pinned_client |
| 11 | [Pausing a consumer](./pausing) | Stop delivery for a window, then resume |
| 12 | [Push vs pull](./push-vs-pull) | Why pull is the default, and when push still fits |
| 13 | [Shaping the stream](./shaping-the-stream) | Tune retention limits and discard behavior |
| 14 | [Delivery semantics](./delivery-semantics) | Limits, Interest, and WorkQueue retention |
| 15 | [Per-message TTL](./message-ttl) | Expire individual messages ahead of the stream |
| 16 | [Surviving node loss](./surviving-node-loss) | Replicas, leaders, and storage durability |
| 17 | [Mirrors and sources](./mirrors-and-sources) | Copy one stream, or aggregate many |
| 18 | [Where to go next](./where-next) | A map of what is beyond this chapter |

## Prerequisites

You will need:

- A working `nats-server` with JetStream enabled. The simplest way is
  `nats-server -js` — see [Getting Started](/concepts/getting-started/).
- The `nats` CLI installed and pointed at your server. The first few
  pages use only the CLI. Later pages add JavaScript, Go, Python,
  Java, Rust, and C# client examples for the same operations.

Open a terminal, run `nats-server -js`, and turn the page.
