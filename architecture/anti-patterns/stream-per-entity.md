---
id: stream-per-entity
title: "A stream per tenant or entity"
description: "Creating a stream (or consumer) for every customer, device, or order"
tags: [jetstream, multi-tenant]
---

# A stream per tenant or entity

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

Creating a stream for each customer, device, or order turns a cheap subject
into an expensive replicated asset. Put the entity in the subject, keep the
stream count in tens, and use accounts when a tenant needs real isolation.

## What it looks like

A platform creates `ORDERS_<customer>` for every customer, or a device
fleet creates a stream per device, often with a consumer per stream to
match. The reasoning is usually one of: it keeps data separate, it makes
retention per customer easy, or it's what a topic per tenant looked like
elsewhere.

## Why it fails

Every replicated stream and consumer is a RAFT group with a leader, an
election, heartbeats, and an entry in the JetStream meta layer. A few
hundred is normal. Tens of thousands multiply memory, meta-layer size,
leader elections during a restart, and recovery time after one. The
JetStream limits per account also count streams and consumers, so the
design hits configured maximums long before it hits hardware.

Separation by stream isn't isolation either. Every stream in an account is
visible to every user in that account with JetStream permissions.

## Do this instead

- One stream per bounded context, with the entity in the subject:
  `orders.<customer>.<order-id>`. Filtered consumers give each reader the
  slice it needs.
- Per-subject limits (`MaxMsgsPerSubject`) for retention per entity, or a
  Key-Value bucket when what you want is the latest state per entity.
- An account per tenant when a tenant needs isolation, limits, or its own
  credentials. That's what accounts are for; see
  [How many accounts?](/architecture/decisions/accounts-and-tenancy).

## Related

- [How many streams, and what goes in each?](/architecture/decisions/stream-layout).
- [Think in NATS](/architecture/foundations/think-in-nats).
- [Multi-tenant platform](/architecture/topologies/multi-tenant-platform).
