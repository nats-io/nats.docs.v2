---
id: market-data-fanout
title: "High-rate fan-out"
description: "Millions of updates per second to many subscribers with last-value caching and no persistence on the hot path"
tags: [core-nats, key-value]
---
# High-rate fan-out

:::note[Placeholder]
This page is part of the Architecture skeleton and hasn't been written yet. Scope: Core fan-out, KV as last-value cache, slow-consumer handling.
:::

## Summary

_Two to four sentences: the system, its scale, and the design's key choices._

## Requirements

_The use case with numbers: message rates, retention, regions, tenants, latency budget._

## Topology

_Which blueprint, and how it's sized for these requirements._

## Accounts and security

_Account layout, auth model, permissions, cross-account sharing._

## Subjects

_The subject hierarchy with examples._

## Streams and consumers

_Every stream and consumer with its config, and why._

## Sizing

_Storage, throughput, and replication math._

## Failure modes

_Region loss, node loss, slow consumer, poison message: what happens and what to do._

## Operations

_Monitoring, backup, upgrade, and capacity growth for this system._

## Rules applied

_Rule IDs this design depends on._

## Related

_Patterns, topologies, and decisions used here._

