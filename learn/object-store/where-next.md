---
id: where-next
title: "Where to go next"
sidebar_position: 7
description: Recap the object store mental model and point to what comes after this chapter
---

# Where to go next

You started this chapter with files that were too large or too binary to
send as a plain message and had nowhere to store them. You end it with an
`INVOICES` bucket holding chunked invoices, each one carrying metadata and a
link, with `analytics` watching for new arrivals and the `OBJ_INVOICES`
stream visible underneath. That covers the full chapter.

This page doesn't teach anything new. It collects the model you built into
one place and points you at the chapters and Reference that take it further.

## The three core ideas

Every page in this chapter came back to the same three ideas. These are the
ones to remember.

A **bucket** is a named object store. You `put` a file into it by name and
`get` it back by name, and you never touch the messages underneath. The
bucket is the API (`put`, `get`, `list`, `watch`, `link`) over
a single JetStream stream named `OBJ_<bucket>`.

A **chunk** is one slice of an object. A put splits the bytes at the chunk
size, writes each slice as a message, computes a SHA-256 **digest** over the
whole object, and follows the chunks with one metadata message. A get reads
that metadata, replays the chunks in order, and verifies the digest before
handing you the bytes.

A **rollup** is what keeps the bucket current rather than historical. Each
metadata write carries a rollup header, so the stream keeps only the latest
metadata per object name. Re-put an object and you get one current
description, not a revision history. That's what distinguishes the object
store from key-value.

Those three are bucket, chunk, and rollup. Everything else in this chapter
(metadata, links, watch, list, soft delete) is a refinement of them.

## Where the details live now

The chapter is unversioned and concept-first. The exact flags, defaults, and
ranges live in **Reference**, which is versioned and exhaustive. When you
need the precise chunk-size range, the full `ObjectInfo` field list, or the
exact watch options, that's where to look.

The full set of object store configuration options is documented in
[Reference](/reference/). We only need the behavior here. The handoff phrases
throughout this chapter ("the full set of options is documented in
Reference") all point into it.

## Sibling deep dives

The object store sits on top of JetStream and beside the other storage
abstractions, so the chapters around it all connect to the model you just
built.

The [JetStream deep dive](/learn/jetstream) is the layer everything here
rests on. When you want to understand the `OBJ_INVOICES` stream as a stream
(its consumers, its retention, its direct get), that's the chapter that
teaches it from the ground up.

The [Key-Value deep dive](/learn/key-value) is the sibling store for the
other shape of data. Where the object store keeps large chunked files and
only the latest metadata, key-value keeps small structured values and a full
revision history per key. When you need versioning of a value, that's where
to go, and its [watching page](/learn/key-value/watching) shows the per-key
watch the object store doesn't have.

The [Clustering & Replication deep dive](/learn/clustering) covers what
`replicas` means for the backing stream: how `R=3` survives a node loss,
how placement works, and what an object store looks like spread across a
cluster.

The [Monitoring deep dive](/learn/monitoring) covers how to watch the backing
stream in production: its size, its growth, and the signals that tell you a
bucket is filling faster than you expected.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
operational side: snapshotting the `OBJ_INVOICES` stream and restoring it, so
the objects survive more than a single disk.

The [Security deep dive](/learn/security) covers locking down a bucket. The
chunk and metadata subjects are ordinary JetStream subjects, so the account,
export, and permission model applies to them directly.

## Where you are

This is the end of the chapter. The whole arc is complete, and this page
adds no new scenario state. The `INVOICES` bucket, its invoices, the
`label-ord_8w2k.png` link, and the `analytics` watcher are still running in
your session exactly as you left them on the previous page. You can keep
experimenting with them, or tear them down with `nats object rm INVOICES`
when you're done.

You hold the core model: a bucket stores files as chunks, a digest verifies
the bytes are unchanged after the round trip, and a rollup keeps the metadata
current. That model is the foundation for every other object store feature.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects the
action items from all of them in one place: a last pass before you trust a
bucket with real invoices. Each group links back to the page that explains
the why.

### Your first object — see [Pitfalls](/learn/object-store/your-first-object#pitfalls)

- [ ] Check the result and error of every get before you use the bytes; an interrupted put leaves no gettable object, and lost or corrupted chunks make a get fail its digest check.
- [ ] Retry a failed get or put with backoff rather than treating one attempt as proof; a `put` isn't "done" until you confirm it.
- [ ] Treat `ErrObjectNotFound` as a normal outcome on a missing or deleted name, not a crash.

### Chunking — see [Pitfalls](/learn/object-store/chunking#pitfalls)

- [ ] Leave the chunk size at its default unless you have a reason; too small floods the stream with messages and overhead, too large can exceed the stream's max message size.
- [ ] Check the get result before you use the bytes; an unchecked async put failure can leave an object that fails its digest check on the way back out.
- [ ] Re-put from the source on a failed get rather than shipping a partial file; don't assume a put "worked" without a get that reassembles and verifies it.

### Metadata and links — see [Pitfalls](/learn/object-store/metadata-and-links#pitfalls)

- [ ] Verify a link's target still exists before relying on get-via-link; a link is a snapshot at creation, and deleting the target makes the link fail with `ErrObjectNotFound`.
- [ ] Re-create a link after you delete or rename its target; a link is a snapshot and does not follow the target, and a get on a bucket link returns an error (`ErrCantGetBucket`) rather than bytes.
- [ ] Delete and re-put to change an object's chunk size, and delete and re-add to change a link target; `UpdateMeta` silently keeps the old chunk size and link.
- [ ] Don't rename an object onto a name already in use; renaming onto an existing, non-deleted name fails with `ErrObjectAlreadyExists`.

### Watching and listing — see [Pitfalls](/learn/object-store/watching-and-listing#pitfalls)

- [ ] Use watch to learn what changed, then issue a separate get for the bytes; watch delivers metadata only, never the chunk data.
- [ ] Never try to read a large payload off the watch channel; the bytes live on a different subject entirely.
- [ ] Treat an empty bucket as an empty result, not an error; list returns `ErrNoObjectsFound` when there's nothing to list.

### Under the hood — see [Pitfalls](/learn/object-store/under-the-hood#pitfalls)

- [ ] Expect a soft delete to mark the object deleted and purge its chunks, but not to reclaim disk until that purge completes; size the backing stream accordingly.
- [ ] Treat a re-put after a delete as a new object identity, not a restored history; the object store keeps the latest metadata, never a revision log.

## See also

- [Reference](/reference/) — every config field, flag, default, and error
  code, versioned and exhaustive.
- [JetStream deep dive](/learn/jetstream) — the stream layer every bucket
  rests on.
- [Key-Value deep dive](/learn/key-value) — the sibling store for small
  versioned values.
