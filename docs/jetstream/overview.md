---
title: Overview
description: How JetStream works and what it adds to Core NATS
sidebar_position: 1
---

# JetStream Overview

JetStream is the persistence and streaming layer built into the NATS server. It captures messages into **streams**, lets applications consume them through **consumers** with acknowledgements, and exposes higher-level abstractions like Key-Value and Object stores on top.

:::note
This page is a stub. Expanded prose, diagrams, and operational guidance are still to come.
:::

## What this section covers

- [Streams](./streams) — capturing and storing messages
- [Consumers](./consumers) — push and pull delivery with acks
- [Key-Value Store](./key-value) — KV built on streams
- [Object Store](./object-store) — object storage built on streams
- [Retention and Limits](./retention-and-limits) — how data ages out
- [Replication](./replication) — high availability for streams
- [Mirrors and Sources](./mirrors-and-sources) — copying streams across boundaries

## Mental model

Core NATS is a delivery fabric (at-most-once). JetStream is a storage layer for that fabric (at-least-once with acks). The two coexist on the same server, share the same subject space, and use the same auth.

## TODO

- Diagram of stream + consumer relationship
- When to choose JetStream vs Core NATS
- Storage backends (file vs memory) summary
- Sizing guidance pointers
