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
| 4 | Reading back the stream | _coming next_ |
| 5 | Your first consumer | _coming next_ |
| 6 | Filtering what you consume | _coming next_ |
| 7 | A pool of workers | _coming next_ |
| 8 | Shaping the stream | _coming next_ |
| 9 | Delivery semantics | _coming next_ |
| 10 | Surviving node loss | _coming next_ |
| 11 | Where to go next | _coming next_ |

## Prerequisites

You will need:

- A working `nats-server` with JetStream enabled. The simplest way is
  `nats-server -js` — see [Getting Started](/concepts/getting-started/).
- The `nats` CLI installed and pointed at your server. The first few
  pages use only the CLI. Later pages add JavaScript, Go, Python,
  Java, Rust, and C# client examples for the same operations.

Open a terminal, run `nats-server -js`, and turn the page.
