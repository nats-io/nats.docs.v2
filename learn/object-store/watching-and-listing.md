---
id: watching-and-listing
title: Watching and listing
sidebar_position: 5
description: List the INVOICES bucket and watch it for new objects with the analytics service
---

# Watching and listing

The `INVOICES` bucket now holds a few objects: `invoice-ord_8w2k.pdf` with
its description and `content-type` header, the large multi-chunk
`invoice-ord_9x3m.pdf` from the Chunking page, and `label-ord_8w2k.png`
linked to the first invoice. Getting one back means knowing its name. But the `analytics`
service doesn't know the names ahead of time. It wants to discover what's
in the bucket, and to learn the moment a new object lands.

This page gives it two operations. List takes a snapshot of every
object in the bucket right now, and watch streams metadata updates as they
happen, so `analytics` sees each new invoice the instant `order-svc` puts
it. These are the two ways to read a bucket without already knowing what's
inside it.

## List is a snapshot

A **list** returns every non-deleted object in the bucket as a one-time
snapshot. It doesn't stay open and it doesn't stream changes; it answers
the question "what's in here now?" and returns.

Run it against `INVOICES`:

<div class="nats-example" data-type="learn-object-store-watching-and-listing-list" data-languages="cli,js,go,python,java,rust,csharp"></div>

The result is one entry per object: `invoice-ord_8w2k.pdf`,
`invoice-ord_9x3m.pdf`, and `label-ord_8w2k.png`. Each entry carries the
object's metadata (name,
size, chunk count, description, modification time) but not its bytes. A
list is cheap: it reads metadata, never chunks. You can list a bucket of
thousand-megabyte invoices without moving any of the object data.

A list skips soft-deleted objects. When `order-svc` removes an invoice,
the object is marked deleted and its chunks are purged, but a metadata
record lingers to mark the deletion. List filters those out, so it shows
only what's really there. The deletion mechanism itself lives on
[Under the hood](/learn/object-store/under-the-hood); here, the behavior
is all you need: list shows only live objects.

An empty bucket isn't an error. Listing a freshly created bucket returns
an empty result, not a failure. In the client libraries it surfaces as
a "no objects found" condition you treat as zero results, not as a
problem. The Pitfalls section makes that distinction runnable.

## Watch streams metadata updates

A **watch** is the live counterpart to list. It opens a stream of metadata
updates and stays open, delivering one update each time an object in the
bucket changes, whether that change is a new put, a re-put, or a delete.
It's how `analytics` keeps up with the bucket instead of polling list in a
loop.

Start `analytics` watching `INVOICES`. Run this in its own terminal and
leave it running:

<div class="nats-example" data-type="learn-object-store-watching-and-listing-watch" data-languages="cli,js,go,python,java,rust,csharp"></div>

The watch delivers in order. Updates arrive in the sequence the bucket
recorded them, so `analytics` never sees a later state before an earlier
one. When the watch has caught up with everything already in the bucket,
it delivers a single **nil sentinel**: one empty update that signals
"you're now current; everything after this is a live change." The
CLI consumes that sentinel for you and keeps printing. In client code you
see it and handle it: recognize the nil update as the boundary, then keep
reading.

Now, from another terminal, have `order-svc` put a new object, the
packing slip for the same order:

```bash
echo "PACK ord_8w2k: 3 items" | nats object put INVOICES --name packing-slip-ord_8w2k.txt
```

The update appears in the watching terminal the instant the put lands,
without any polling or delay. `analytics` learned about
`packing-slip-ord_8w2k.txt` as soon as `order-svc` stored it.

<div class="nats-flow" data-scenario="objectWatchSyncAnimated" data-width="600" data-height="350"></div>

That update carries the new object's *metadata* (name, size, chunk
count, digest) and nothing else; the bytes are not on the watch. That is
the most important fact about watch, and the next section covers it.

## Watch carries metadata, never the bytes

An object's metadata and its chunks live on two different subjects. A
watch subscribes to the metadata side. So every update it delivers is an
`ObjectInfo` record — never the chunk bytes that make up the object's
data.

This is by design, and it's what makes watch cheap. `analytics` can watch
a bucket of 3 MB invoices and 100 MB media files without any object data
crossing the watch. It learns that an object changed and what its metadata
says; if it wants the data, it issues a separate get.

The pattern is two steps: watch to learn what changed, then get the bytes
you actually want. `analytics` only needs the invoice total for its
dashboard, so it might read the metadata and never get the data at all. A
re-rendering service would watch, then get every new object. Both read the
same watch; they differ only in whether step two runs.

This separation is also the difference from the Key-Value store's watch.
There, a watch delivers each key's *value* directly, because values are
small. Here, an object can be gigabytes, so the watch delivers only the
metadata and leaves the data fetch to you. The contrast is covered on
[Key-Value → Watching](/learn/key-value/watching); the rule for objects
is that watch tells you what changed and get returns the bytes.

A watch has more options than the plain form shown here: replaying full
history, ignoring deletes, or skipping the catch-up snapshot to see only
new updates. They tune the same stream of metadata you just saw. The full
set of watch options is documented in [Reference](/reference/). We only
need the default behavior here.

## Pitfalls

Two mistakes are common the first time you read a bucket without knowing
its contents. Both come straight from this page's two concepts: what a
list returns, and what a watch delivers.

**Watch delivers metadata, not the bytes.** A watch update is an
`ObjectInfo` record: name, size, chunk count, digest. It is not the
object's data. A service that treats the watch update as the file, and
tries to read a 100 MB payload off the watch, finds only metadata and
breaks. The fix is the two-step pattern: use watch to learn *what*
changed, then issue a get for the objects whose bytes you actually need.
Do not expect the data to arrive on the watch.

Watch, then get only when you need the bytes:

<div class="nats-example" data-type="learn-object-store-watching-and-listing-watchThenGet" data-languages="cli,js,go,python,java,rust,csharp"></div>

**An empty bucket is an empty result, not an error.** Listing a bucket
with no live objects doesn't fail; it returns zero entries. In the
client libraries this surfaces as a distinct "no objects found" condition,
and code that treats it as a fatal error will crash on a bucket that's
just empty, or one whose objects were all deleted. Do treat an empty
list as the valid answer "nothing here yet." Don't conflate "no objects"
with "the bucket is missing"; those are different conditions, and only
the second is a real problem.

## Where you are

You now have:

- A list of `INVOICES`: a snapshot of `invoice-ord_8w2k.pdf`,
  `invoice-ord_9x3m.pdf`, and `label-ord_8w2k.png`, metadata only,
  soft-deleted objects filtered out.
- `analytics` watching the bucket, with `packing-slip-ord_8w2k.txt` added
  during the demo and surfaced as a live metadata update.
- The two-step pattern in hand: watch tells you what changed; get fetches
  the bytes.

## What's next

You've now used the bucket from every angle: put, get, chunking,
metadata, links, list, and watch. The last page shows the internals. The
bucket *is* a JetStream stream named `OBJ_INVOICES`, and the next page reads its
stream config to show you the chunk and metadata subjects, the rollup that
keeps one current record per object, and how a soft delete really works.

Continue to [Under the hood](/learn/object-store/under-the-hood).

## See also

- [Key-Value → Watching](/learn/key-value/watching) — the per-key watch
  that delivers values directly, and how it contrasts with object watch.
- [Under the hood](/learn/object-store/under-the-hood) — the metadata
  subject a watch reads and the soft delete a list filters out.
- [Reference](/reference/) — the full set of watch options.
