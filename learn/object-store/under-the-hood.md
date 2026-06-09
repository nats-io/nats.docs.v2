---
id: under-the-hood
title: 5. Under the hood
sidebar_position: 6
description: See the OBJ_INVOICES stream, the chunk and metadata subjects, and rollup versus soft delete
---

# 5. Under the hood

Four pages in, the `INVOICES` bucket has invoices, a 3 MB multi-chunk
invoice, metadata, a label link, and an `analytics` service watching it.
You have driven all of that through the friendly object API — `put`, `get`,
`list`, `watch`, `link` — without ever seeing a stream.

There has been a stream the whole time. This page lifts the lid. It shows
you the one stream your bucket really is, the two subject spaces objects map
onto, and the single header that keeps the bucket from growing a history it
never promised you.

## The bucket is a stream named OBJ_INVOICES

A bucket is not a new kind of storage. When you ran `nats object add
INVOICES`, the server created a JetStream stream and named it by convention:
`OBJ_<bucket>`. Your `INVOICES` bucket is the stream `OBJ_INVOICES`. Every
`put` was a publish to that stream; every `get` was a read from it.

Ask the server about that stream directly and the machinery is right there:

<div class="nats-example" data-type="learn-object-store-under-the-hood-streamInfo" data-languages="cli,js,go,python,java,rust,csharp"></div>

You are reading an ordinary stream — the same construct from the
[JetStream Deep Dive](/learn/jetstream). What a stream *is*, how a consumer
tracks its position, and how direct get works are all taught there; this page
only points at the stream, it does not re-explain it.

What is new is the shape of this particular stream. It captures **two subject
spaces**, and an object is split across both of them:

- `$O.INVOICES.C.>` holds the **chunk** messages — the bytes of every
  object, one message per chunk.
- `$O.INVOICES.M.>` holds the **metadata** messages — one `ObjectInfo` per
  object, describing its name, size, chunk count, and digest.

So a single object is several chunk messages on the `.C.` subjects plus one
metadata message on the `.M.` subjects. The chunk subject ends in a
per-put identity, `$O.INVOICES.C.<object-nuid>`, which is why a re-put never
collides with old chunks. The metadata subject ends in the object name,
base64url-encoded — `$O.INVOICES.M.<base64url(name)>` — so any object name,
spaces and slashes included, becomes a safe NATS subject.

That base64url metadata subject is the hinge of the next section, so hold
onto it: each object name maps to exactly one metadata subject.

## Rollup keeps the latest metadata, not a history

Put an object twice under the same name and you might expect two metadata
messages to pile up — a history of the object, like the revisions a
[Key-Value Store](/learn/key-value) keeps per key. The object store does not
work that way. It keeps exactly **one** current `ObjectInfo` per name. The
mechanism is **rollup**.

Every metadata publish carries one header, `Nats-Rollup: sub`. That header
tells the stream: when this message lands, purge every earlier message on the
same subject and keep only this one. Because each object name maps to one
metadata subject, a rollup on a re-put deletes the prior `ObjectInfo` for that
name and leaves the new one as the single current `ObjectInfo`.

<div class="nats-flow" data-scenario="objectRollupAnimated" data-width="600" data-height="350"></div>

This is why the store is rollup-latest, not multi-revision. A re-put gives you
a new current object; it does not give you the object's past. When you do want
the past — many small values with a full revision history per key — that is
the [Key-Value Store](/learn/key-value), not this one. The contrast the index
drew holds all the way down to the header.

The backing stream is configured to make rollup possible. `AllowRollup` is
true so the header is honored; `Discard` is `New` so the stream rejects writes
when full rather than dropping old chunks; `AllowDirect` is true so a get can
read the latest metadata without a consumer. Here is the shape of that
configuration:

```json
{
  "name": "OBJ_INVOICES",
  "subjects": ["$O.INVOICES.C.>", "$O.INVOICES.M.>"],
  "max_age": 0,
  "max_bytes": -1,
  "storage": "file",
  "num_replicas": 1,
  "discard": "new",
  "allow_rollup_hdrs": true,
  "allow_direct": true
}
```

You never write this config by hand — `nats object add` writes it for you.
The full set of stream configuration equivalents, including how to raise
`num_replicas` for durability, is documented in
[JetStream](/learn/jetstream). We only need to recognize the shape here.

## Soft delete is a rollup that marks the object gone

Deleting an object is the same rollup mechanism wearing a different hat. The
store does not silently drop the name. It writes one more metadata message —
a **soft delete** — that marks the object `Deleted=true`, sets `Size` and
`Chunks` to zero, and clears the digest. Because that message carries the
rollup header, it replaces the object's current `ObjectInfo`, and the object's
chunk messages are then purged from the stream.

<div class="nats-example" data-type="learn-object-store-under-the-hood-status" data-languages="cli,js,go,python,java,rust,csharp"></div>

After a soft delete the name resolves to an `ObjectInfo` that says "gone,"
so a get fails with a not-found error and the bytes are reclaimed. The name
itself still has one metadata message — the soft-delete marker saying it is
gone — which is what lets `watch` tell a subscriber that an object disappeared.

Securing these subjects — limiting who can publish to `$O.INVOICES.C.>` or
read `$O.INVOICES.M.>`, or exporting the bucket to another account — is a
security concern, not an object-store one. It is covered in
[Security](/learn/security).

## Pitfalls

Two traps catch people the first time they look under the lid. Both come from
expecting the backing stream to behave like something it is not.

**A soft delete does not reclaim disk the instant you call it.** A delete
writes the soft-delete metadata message and then purges the object's chunks.
The purge is what frees the bytes, and on a busy file-backed stream the
on-disk space is reclaimed as the stream cleans up, not synchronously at the
call. Do not delete a large object and immediately assert the disk is smaller.
Do confirm the object is gone the right way — by reading its status, where
`Deleted=true` and `Size=0` tell you the soft delete landed:

<div class="nats-example" data-type="learn-object-store-under-the-hood-status" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A re-put after a delete is a new object identity, not a restored history.**
Because each put gets a fresh per-put identity and rollup keeps only the
latest metadata, putting `invoice-ord_8w2k.pdf` again after deleting it does
not bring back the old chunks or the old `ObjectInfo`. It creates a brand-new
object that happens to share the name. Do not reach for the object store when
you need the *previous* version after an overwrite — that history lives in the
[Key-Value Store](/learn/key-value). Do treat every put as authoritative for
the current object and nothing more.

## Where you are

You now have:

- The bucket revealed as the stream `OBJ_INVOICES`, captured with
  `nats stream info`.
- The two subject spaces named: `$O.INVOICES.C.>` for chunks and
  `$O.INVOICES.M.>` for metadata, with the metadata subject base64url-encoding
  the object name.
- The rollup header explained — why a re-put leaves one current `ObjectInfo`
  and not a history.
- Soft delete explained — a rollup metadata write that marks the object gone
  and purges its chunks.

The friendly API and the stream underneath are now one picture in your head.
Nothing the object store does is magic; it is chunks plus rollup metadata on a
JetStream stream.

## What is next

That is the whole mechanism. The last page is navigation: a recap of the whole
game, a checklist that collects every pitfall in this chapter, and pointers to
where the deeper details — replicas, security, backup, monitoring — actually
live.

Continue to [6. Where to go next](/learn/object-store/where-next).

## See also

- [JetStream Deep Dive](/learn/jetstream) — what the backing stream is, and
  the stream config equivalents for replicas and retention.
- [Key-Value Store](/learn/key-value/under-the-hood) — the multi-revision
  store, for when you need the history rollup does not keep.
- [Security](/learn/security) — securing or exporting the bucket's subjects.
