---
title: Object Store
description: Large-object storage built on JetStream
sidebar_position: 5
---

# Object Store

The **Object Store** is a JetStream-backed abstraction for storing larger blobs — files, images, snapshots — that don't fit comfortably in single NATS messages. Objects are chunked, content-addressed, and replicated like any other stream.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Buckets and objects

Creating buckets, configuring chunk size and replicas, naming conventions.

## Operations

Put, get, delete, list, watch. Streaming uploads and downloads.

## Metadata and digests

How NATS tracks size, digest, and per-object metadata.

## When to use Object Store vs an external blob store

Trade-offs and integration patterns.

## TODO

- Diagram of chunking
- Code sample uploading a file from disk
- Sizing and storage-cost notes
