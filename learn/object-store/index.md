---
id: index
title: Object Store
sidebar_position: 1
description: Buckets, objects, chunks, metadata, and links, built on the stream you already have
---

# Object Store

NATS gives you a place to store files, and it isn't a separate service. An
**object** is a stored file: an invoice PDF, a shipping label, a packing
slip, anything too large or too binary to ride on a plain message. A
**bucket** is the named store you put those objects into. Both live inside a
single JetStream stream named `OBJ_<bucket>`, the same persistence layer the
[JetStream Deep Dive](/learn/jetstream) already taught you.

Keep that framing in mind from the start. When you
`put` an object the store splits its bytes into chunks, writes each chunk as
a message, and follows them with one metadata message describing the whole
object. When you `get` an object the store reads that metadata, replays the
chunks in order, and verifies them before handing you the bytes. The
friendly API (`put`, `get`, `list`, `watch`, `link`) is what you use day
to day, and the stream underneath is what makes it work.

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="350"></div>

This chapter teaches the object abstraction first and reveals the stream
last. The first four pages teach you the object store API on its own terms, so
you can be productive without re-deriving JetStream internals.
[Under the hood](./under-the-hood) shows you the `OBJ_INVOICES` stream that
was present the whole time.

Place this alongside its sibling store. The
[Key-Value Store](/learn/key-value) keeps small structured values and a full
revision history per key, so it retains every change. The Object Store keeps
large chunked files and only the latest metadata per object, so it retains
the current version rather than the history. Use key-value when you want
many small values that you read, overwrite, and audit; use the object
store when you want whole files that you put and fetch. That contrast holds for
the rest of the chapter, so we state it once here and move on.

## By the end you will have

- An `INVOICES` bucket (described as "Invoice PDFs") that the `order-svc`
  service puts invoices into after a payment is confirmed.
- The invoice `invoice-ord_8w2k.pdf` stored and fetched back, with the store
  computing and checking a SHA-256 **digest** so you know the bytes you get
  are the bytes you put.
- A 3 MB invoice, `invoice-ord_9x3m.pdf`, stored across many **chunks** and
  reassembled on the way out, with a feel for the chunk size that bounds each
  message.
- An invoice that carries a **description**, a `content-type` header, and a
  free-form metadata map, plus a `label-ord_8w2k.png` object **linked** to
  it and traversed transparently on get.
- An `analytics` service that **lists** the bucket as a snapshot and
  **watches** it for new objects in real time.
- A clear picture of the `OBJ_INVOICES` stream underneath: the chunk and
  metadata subjects, the rollup that keeps only the latest metadata, and what
  a soft delete really does.

## Who this is for

You've read the [JetStream Deep Dive](/learn/jetstream) or the
[Core Concepts → JetStream](/concepts/jetstream) primer, so the sentence
"a stream stores messages" already means something to you. This chapter
doesn't re-teach what a stream is, how a consumer tracks its position, or how
acknowledgment works. Where you'd want those, it names the gap and links
back to [JetStream](/learn/jetstream).

You don't need to know anything about the object store specifically. We
start from "what is a bucket and why would you want one" and grow from there.

## How to read it

Each page introduces at most two new concepts, and each builds on the last:
you use the same `INVOICES` bucket throughout, and you can keep one
terminal open through the whole chapter without resetting state. You create
the bucket and store your first invoice in
[Your first object](./your-first-object), store a large multi-chunk invoice
in [Chunking](./chunking), attach metadata and a link in
[Metadata and links](./metadata-and-links), list and watch the bucket in
[Watching and listing](./watching-and-listing), and inspect the stream
underneath in [Under the hood](./under-the-hood).

The object store has many knobs: chunk size, replicas, compression, every
field on the wire. Where a feature has a long list, the page covers only
what you need to understand the concept. The full set of configuration
options lives in [Reference](/reference/); here we only need the behavior.

## Map

| Page | What you learn |
|---|---|
| [Your first object](./your-first-object) | Create `INVOICES`, put `invoice-ord_8w2k.pdf`, and get it back with its digest verified |
| [Chunking](./chunking) | Store a 3 MB invoice across many chunks and read the chunk count |
| [Metadata and links](./metadata-and-links) | Attach a description, headers, and a metadata map, then link one object to another |
| [Watching and listing](./watching-and-listing) | List the bucket as a snapshot, then watch it for new objects live |
| [Under the hood](./under-the-hood) | See the `OBJ_INVOICES` stream, the chunk and metadata subjects, and rollup versus soft delete |
| [Where to go next](./where-next) | A map of what's beyond objects, and one pre-production checklist |

## Prerequisites

You'll need:

- A working `nats-server` with JetStream enabled. The object store is built
  on JetStream, so JetStream must be on. The simplest way is
  `nats-server -js`.
- The `nats` CLI installed and pointed at your server. This chapter uses
  the `nats` CLI for most operations; a few, like creating a link, are
  client-library only.

Open a terminal, run `nats-server -js`, and turn the page.
