---
id: chunking
title: Chunking
sidebar_position: 3
description: How a large invoice is split into chunks, reassembled, and verified by its digest
---

# Chunking

On the last page you put a small invoice into `INVOICES` and got it back.
The bytes were small enough to feel atomic: one put, one get, done. But
NATS messages have a size limit, and an invoice PDF can be far larger than
any single message. So how did a file land in a message store at all?

It did not land in one message; the store split it. This page is about
that split: how an object becomes **chunks**, how get puts them back
together, and what happens when a put fails partway through.

## An object is split into chunks

A **chunk** is one message holding a slice of an object. When you put an
object, the store doesn't try to fit the whole file in a single message.
It reads the bytes in order and cuts them at a fixed boundary called the
**chunk size**, writing each slice as its own message. A 3 MB invoice
becomes a sequence of chunk messages, not one giant one.

The default chunk size is **128 KB**. You did nothing to enable splitting
on the last page: your small invoice fit within a single chunk, well
under that 128 KB boundary, so there was nothing to split. A larger file
crosses the boundary and produces several chunks.

Put a 3 MB invoice and read the chunk count back:

<div class="nats-example" data-type="learn-object-store-chunking-putLarge" data-languages="cli,js,go,python,java,rust,csharp"></div>

This stores `invoice-ord_9x3m.pdf`, the large invoice for one Acme order.
The `nats object info` output now carries a `Chunks` field: the count of
chunk messages the bytes were split into. At the 128 KB default, a 3 MB
file lands in roughly 24 chunks.

You never ask for chunks and you never see them as separate things after
the fact. They're an implementation detail of how the store fits a file
into a message log. The object you put and the object you get are the same
bytes; the chunking happens in between.

## Get reassembles and verifies

A get is the split run backwards. The store reads the object's chunks in
order, concatenates them, and hands you the reassembled bytes, exactly
the file you put. You don't reassemble anything yourself; the convenience
forms (get-to-bytes, get-to-file, get-to-stream) all give you a whole
object.

While it reassembles, the store does one more thing: it recomputes the
SHA-256 **digest** over the bytes and compares it to the digest the store
recorded during the put. (You met the digest on the
[last page](/learn/object-store/your-first-object): it's the integrity
hash put computes as it stores.) If the two digests match, the bytes are
intact and you get them. If they don't match (a chunk is missing or
corrupted), the get fails instead of handing you a truncated file.

That verification is why get is safe even though the bytes traveled as
many separate messages. The digest is computed over the whole object, so a
single missing or reordered chunk changes it and the get refuses to
return.

The put/get flow looks like this: a put sends the chunks out, then a
metadata message; a get reads the metadata in, then the chunks, then runs
the digest check.

<div class="nats-flow" data-scenario="objectPutGetAnimated" data-width="600" data-height="350"></div>

The metadata message that follows the chunks carries the object's name,
size, digest, and chunk count. We define what else it holds (descriptions,
headers, links) on the [next page](/learn/object-store/metadata-and-links).
For now it's enough to know the chunks come first and the metadata closes
the put.

## A failed put leaves no half-objects

Chunks publish one after another, so a put isn't instantaneous. A network
drop or a crashed client can stop a put after some chunks have landed but
before the rest do. What happens to the chunks that made it?

The metadata message is written last, after all the chunks, so an
interrupted put never produces a gettable object: with no metadata record,
a get reports the name as not found rather than handing back a half-written
file. When the client survives the failure it also purges the partial chunks
it already wrote, so nothing is left in the stream. A hard crash is the
exception. A process killed mid-put runs no cleanup, so the chunks it had
already written stay in the stream as orphans: invisible to get, because no
metadata points at them, but still holding storage until the bucket's limits
or age reclaim them.

This works because each put gets a fresh **NUID**: a unique identifier
generated for that put alone, separate from the object's name. The chunks
of one put are tagged with this fresh identity. When you put the same
object name twice (a corrected invoice over a draft), the second put's
chunks never overlap the first's.
The store writes the new chunks under the new identity, points the object's
metadata at them, and the old chunks fall away. A re-put replaces the
object cleanly rather than merging new bytes into the old ones.

So the object you get is never half-written. A put that fails partway leaves
no gettable object, and a re-put doesn't splice new bytes into old ones.
Either you get the whole object you put, or the get returns an error.

## Choosing a chunk size

The chunk size is configurable. You can set it per put, and it changes how
many messages the object becomes:

<div class="nats-example" data-type="learn-object-store-chunking-chunkSize" data-languages="cli,js,go,python,java,rust,csharp"></div>

The same 3 MB invoice splits into more messages at a smaller chunk size
and fewer at a larger one. The default of 128 KB is a reasonable middle
for most files, and most of the time you leave it alone.

The full set of chunk-size options is documented in
[Reference](/reference/). We only need the behavior here.

## Pitfalls

Two traps show up once objects get large. Each is scoped to this page:
the chunk size, and the integrity check on get.

**A chunk size at the extremes causes problems.** Set it too small and a single file
becomes thousands of tiny messages. Each chunk is a NATS message that
carries its own protocol framing (headers and subject routing on top of
the slice of bytes), so very small chunks waste storage on per-message
overhead and slow puts and gets down. Set it too large and a single chunk
exceeds the server's maximum payload (`max_payload`, 1 MB by default) — or
any smaller max message size an operator has set on the backing stream — and
the put fails outright: the server rejects the oversized message rather than
splitting some other way. Don't tune the chunk size to chase a benchmark; the
128 KB default fits almost every file and stays well under the default
payload limit. If you must raise it, keep each chunk under `max_payload`,
covered on [Shaping the stream](/learn/jetstream/shaping-the-stream). Past
that limit the put stops storing anything.

**Always check the get result before you use the bytes.** A failed get
won't hand you a truncated file, so verify success first. Because chunks
publish asynchronously, an unchecked failure mid-put can leave an object
that fails its digest check on the way back out. A get that hits a missing
chunk or a digest mismatch errors instead of returning. So check the get
result, and re-put from the source on failure rather than shipping a
partial invoice. Don't assume a put "worked" without confirming a get
reassembles and verifies it.

Guard the get on its outcome, and re-put on failure:

<div class="nats-example" data-type="learn-object-store-chunking-verifyAfterGet" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

You now have:

- A large `invoice-ord_9x3m.pdf` stored across multiple chunks in
  `INVOICES`, with a `Chunks` count you can read.
- A mental model of put as split-then-store and get as
  reassemble-then-verify.
- The two guarantees that make that safe: a failed put purges its partial
  chunks, and a re-put under a fresh identity never overlaps old bytes.

The chunks carry the data. The metadata message that closes each put
carries everything *about* the object, which the next page covers.

## What's next

The metadata message named the object, its size, and its digest. It can
carry more: a human-readable **description**, HTTP-style **headers**, a
free-form key/value map, and **links** from one object to another.

Continue to [Metadata and links](/learn/object-store/metadata-and-links).

## See also

- [Your first object](/learn/object-store/your-first-object) — where you
  met put, get, and the digest.
- [Shaping the stream](/learn/jetstream/shaping-the-stream) — the message
  size limits that bound the chunk size.
