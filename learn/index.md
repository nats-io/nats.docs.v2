---
id: index
title: Learn
sidebar_position: 1
description: Long-form deep dives into NATS subsystems
---

# Learn

This section is the long-form half of the NATS documentation. Each deep
dive walks through one subsystem from first encounter to working
confidence, building up a single running scenario step by step.

Deep dives sit between two other layers of the docs:

- **[Concepts](/concepts/intro/)** — short concept primers and Getting Started.
  Read those first if you are new to NATS.
- **[Reference](/reference/)** — the exhaustive, versioned catalog of
  every configuration option, header, and wire-protocol detail. Deep
  dives link out to Reference for the full surface area; Reference
  does not teach.

## Available deep dives

### [JetStream](/learn/jetstream/)

Streams, consumers, and the acknowledgment loop. Builds an `ORDERS`
stream from scratch and grows it across eleven chapters. Read this if
you want to actually understand how JetStream stores, replays, and
delivers messages — not just which CLI flags to type.

## Coming later

The Learn section is new. Sibling deep dives are planned for:

- **Key-Value Store** — buckets, watches, history, and how KV sits on
  top of a stream.
- **Object Store** — chunked blobs over JetStream, with links and
  metadata.
- **Clustering & Operations** — what `R=3` actually buys you, leaders,
  placement, backup and restore.
- **Security** — accounts, JWT, NKeys, and how authorization composes.

Each follows the same pattern as the JetStream deep dive: one running
scenario, one concept per page, references linked out for the long
tail.
