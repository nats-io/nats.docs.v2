---
title: Key-Value Store
description: A distributed key-value store built on JetStream
sidebar_position: 4
---

# Key-Value Store

JetStream's **Key-Value (KV) store** is a higher-level abstraction backed by a stream. It exposes familiar `get` / `put` / `delete` / `watch` semantics with versioning and history.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Buckets

Creating and configuring KV buckets: history depth, TTL, max value size, replicas.

## Operations

`put`, `get`, `delete`, `purge`, `create` (compare-and-set on first put), `update` (compare-and-set on revision).

## Watches

Watching a key or pattern for changes; initial state vs updates-only.

## Under the hood

How KV maps to a JetStream stream and what that means for backups and replication.

## TODO

- Worked example: feature-flag bucket
- CLI vs SDK code samples
- Performance and sizing notes
