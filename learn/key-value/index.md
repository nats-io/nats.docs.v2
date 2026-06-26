---
id: index
title: Key-Value Store
sidebar_position: 1
description: Buckets, keys, watching, revisions, and TTL, built on the stream you already have
---

# Key-Value Store

NATS gives you a key-value store. It is not a separate database: a
bucket is a JetStream stream named `KV_<bucket>` whose subjects are
`$KV.<bucket>.>`; a key is the last token of that subject, and a value is
a message on it. Everything in this chapter is that one stream presented
through a key-value API.

Keep that framing in mind from the start. A `put` of a value appends a
message, a `get` of a value reads the last message for a subject, and a
`watch` of a bucket opens a consumer. The API (`put`, `get`, `watch`,
`create`, `update`, TTL) is what you use day to day, and the stream
underneath is what makes it work.

This chapter teaches the abstraction first and describes the stream last.
The first four pages teach you the key-value API on its own terms, so you
can be productive without memorizing JetStream internals.
[Under the hood](./under-the-hood) shows you the stream that the API has
been using all along.

## By the end you will have

- An `INVENTORY` bucket whose keys are SKUs (`widget-blue`, `widget-red`,
  `gadget-pro`) and whose values are stock counts the inventory service
  reads and decrements.
- A warehouse dashboard that **watches** the bucket: it receives the
  current count of every key as a snapshot, then live updates as counts
  change.
- A safe decrement of `widget-blue` from 41 to 40 using **compare-and-swap**,
  so two concurrent sales never lose a write.
- A `flash-sale` key with a per-key **TTL** that expires on its own, and a
  feel for the bucket-wide limits that bound the whole thing.
- A clear picture of the `KV_INVENTORY` stream underneath: the subjects,
  the direct read path, and the difference between delete and purge.

## Who this is for

You've read the [JetStream Deep Dive](/learn/jetstream) or the
[Core Concepts → JetStream](/concepts/jetstream) primer, so the sentence
"a stream stores messages" already means something to you. This chapter
doesn't re-teach what a stream is, how a consumer tracks its position,
or how acknowledgment works. Where you'd want those, it names the gap
and links back to [JetStream](/learn/jetstream).

You don't need to know anything about key-value specifically. We start
from "what is a bucket and why would you want one" and grow from there.

## How to read it

Each page introduces at most two new concepts and builds on the one
before it: the same `INVENTORY` bucket carries through, and you can
keep one terminal open through the whole chapter without resetting state.
You create the bucket on [Your first bucket](./your-first-bucket), add a
watcher on [Watching](./watching), decrement a key safely on
[History and revisions](./history-and-revisions), give a key a TTL on
[TTL and limits](./ttl-and-limits), and inspect the stream underneath on
[Under the hood](./under-the-hood).

Key-value has many configuration options, covering bucket limits, watch
options, and headers on the wire. Where a feature has a long list, the
page covers only what you need to understand the concept. Because a bucket is created as a
stream, the full set of bucket configuration options lives in
[Reference → Create Stream](/reference/jetstream/api/stream/create).

## Map

| Page | What you learn |
|---|---|
| [Your first bucket](./your-first-bucket) | Create `INVENTORY`, put and get `widget-blue`, and read its status |
| [Watching](./watching) | Receive a snapshot of every key, then live changes as they happen |
| [History and revisions](./history-and-revisions) | Track revisions, read history, and decrement safely with compare-and-swap |
| [TTL and limits](./ttl-and-limits) | Expire a single key with a per-key TTL, and bound the bucket with limits |
| [Under the hood](./under-the-hood) | See the `KV_INVENTORY` stream, the direct read, and delete versus purge |
| [Where to go next](./where-next) | A map of what's beyond key-value, and one pre-production checklist |

## Prerequisites

You'll need:

- A working `nats-server` with JetStream enabled. The key-value store is
  built on JetStream, so JetStream must be on. The simplest way is
  `nats-server -js`.
- The `nats` CLI installed and pointed at your server. The first page
  uses only the CLI. Later pages add JavaScript, Go, Python, Java, Rust,
  and C# examples for the same operations.

Open a terminal, run `nats-server -js`, and continue to the first page.
