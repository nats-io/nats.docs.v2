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

| Page | What you learn |
|---|---|
| [Your first stream](./your-first-stream) | Why a stream, then create the `ORDERS` stream and read its anatomy |
| [Publishing](./publishing) | Publish into a stream and understand the `PubAck` contract |
| [Reading back the stream](./reading-back) | Read stored messages back with a durable consumer |
| [Filtering what you consume](./filtering) | Add a second consumer that reads only `orders.shipped` |
| [Delivery and acknowledgment](./your-first-consumer) | In-flight, ack, double ack, and redelivery |
| [Acknowledgment](./acknowledgment) | ack, nak, term, in-progress, and redelivery timing |
| [Subject mapping and transforms](./subject-mapping) | Rewrite subjects on the way into a stream, and republish stored messages |
| [Kinds of consumers](./consumer-kinds) | Push vs pull, durable vs ephemeral, and how retention shapes a consumer |
| [Pull consumers in depth](./pull-consumers) | fetch vs consume, and the knobs that bound a pull |
| [A pool of workers](./worker-pool) | Share one consumer across many workers |
| [Priority groups](./priority-groups) | Steer which client gets served: overflow and pinned_client |
| [Pausing a consumer](./pausing) | Stop delivery for a window, then resume |
| [Push vs pull](./push-vs-pull) | Why pull is the default, and when push still fits |
| [Shaping the stream](./shaping-the-stream) | Tune retention limits and discard behavior |
| [Delivery semantics](./delivery-semantics) | Limits, Interest, and WorkQueue retention |
| [Per-message TTL](./message-ttl) | Expire individual messages ahead of the stream |
| [Altering stream state](./altering-stream-state) | Delete a message or purge the stream, by hand |
| [Surviving node loss](./surviving-node-loss) | Replicas, leaders, and storage durability |
| [Mirrors and sources](./mirrors-and-sources) | Copy one stream, or aggregate many |
| [Advanced publishing](./advanced-publishing) | Async, atomic-batch, and fast-ingest publishing |
| [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A running `nats-server` with JetStream turned on. The simplest way to get one
  is `nats-server -js` (see [Getting Started](/concepts/getting-started/)).
- The `nats` CLI installed and pointed at your server.

Open a terminal and run `nats-server -js`.
