---
title: Mirrors and Sources
description: Copying streams across clusters and accounts
sidebar_position: 8
---

# Mirrors and Sources

**Mirrors** and **sources** let one stream pull data from one or more other streams. They're the building blocks for cross-region replicas, multi-account fan-in, and read-only copies.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Mirror

A stream that exactly mirrors a single upstream stream. Read-only on the mirror side. Useful for geo-distributed read replicas.

## Source

A stream that ingests messages from one or more upstream streams (with optional filtering and subject mapping). Useful for aggregation.

## Subject filters and transforms

How subjects are filtered and re-mapped on the way in.

## Cross-account / cross-cluster

How mirrors and sources combine with imports/exports and gateways.

## TODO

- Diagram of source vs mirror
- Worked example: regional mirror for read traffic
- Failover patterns
