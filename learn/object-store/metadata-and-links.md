---
id: metadata-and-links
title: 3. Metadata and links
sidebar_position: 4
description: Attach a description, headers, and a metadata map to an object, then link one object to another
---

# 3. Metadata and links

An object is more than its bytes. So far `invoice-ord_8w2k.pdf` is just a
name and a payload — `warehouse` has to fetch the whole thing to learn
anything about it. This page gives the object a voice of its own: a human-readable
**description**, HTTP-style **headers**, and a free-form **metadata** map
that travel with the object. Then it teaches **links**, so one object can
stand in for another.

These are the two new ideas on this page: metadata that describes an
object, and links that point one object at another. The invoices you stored
on the previous pages are still in the `INVOICES` bucket; keep that terminal
open.

## Every object carries an ObjectInfo

When you `put` an object the store writes the chunks and then one final
**metadata** message describing the whole thing. That metadata message is an
`ObjectInfo` record. Some of its fields the store computes for you — the
byte size, the chunk count, the SHA-256 digest, the modification time, and
whether the object is deleted. Three fields are yours to set.

The first is the **description**: a single human-readable label for the
object. The second is **headers**: HTTP-style key/value pairs, the same
shape as the headers on a NATS message. The third is the **metadata** map:
free-form key/value strings for whatever your application wants to record.

Set them on the put. `order-svc` stores the invoice with a description and a
`content-type` header so a reader knows the bytes are a PDF without fetching
them first:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-putWithMeta" data-languages="cli,js,go,python,java,rust,csharp"></div>

The object name and the bytes are unchanged — this is the same
`invoice-ord_8w2k.pdf` from your first object, now carrying a description and
a header. The metadata rides in that one trailing metadata message, so it
costs nothing extra to store and nothing extra to read.

## Reading the metadata back

Reading the metadata does not fetch the object's bytes. The store keeps the
latest `ObjectInfo` for each name as one small message, so `warehouse` can
ask "what is this?" without paying for the bytes.

<div class="nats-example" data-type="learn-object-store-metadata-and-links-info" data-languages="cli,js,go,python,java,rust,csharp"></div>

The output shows your description and header next to the computed fields —
size, chunks, digest, modification time. `warehouse` reads the
`content-type` header and the size here, then decides whether to fetch the
bytes. The metadata is a cheap index over the bucket; the bytes are the
expensive part you only pull when you need them.

There is one boundary worth naming. The metadata describes the *current*
object — it is not a history of past versions. Each re-put replaces the
metadata, keeping only the latest. If you want a full revision history per
name, that is the Key-Value store's job, covered in
[Key-Value](/learn/key-value); the object store keeps the current
`ObjectInfo`, not the trail of edits that produced it.

## Links point one object at another

A **link** is an object whose target is another object. A `get` on the link
transparently returns the target's bytes — you ask for the link, the store
follows it, and hands you the target. The link is a thin reference, not a
copy: it stores no chunks of its own, only a record of the target's bucket
and name.

This is useful when two names should resolve to the same bytes. In the Acme
platform a shipping label and an invoice can share a document, or a stable
name can front a churning set of files. Here `label-ord_8w2k.png` becomes a
link to the invoice, so fetching the label hands back the invoice's bytes:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-addLink" data-languages="cli,js,go,python,java,rust,csharp"></div>

A link can also target a whole bucket instead of a single object. That is a
**bucket link**: the target name is empty, and the link resolves to the
bucket on get. Reach for a bucket link when you want a stable alias for the
store as a whole rather than for one file inside it.

Two rules keep links sane, and the store enforces both. A link cannot point
at a deleted object, and a link cannot point at another link — the store
refuses to build a chain you would have to chase. When you add a link, the
store records the target as it stands at that moment and traverses it on
every get from then on.

The full set of `ObjectInfo` fields and link options is documented in
[Reference](/reference/). We only need the behavior here.

## Pitfalls

Two traps come with metadata and links. Each one is scoped to this page's
two concepts: what a link does when its target moves, and what `UpdateMeta`
will and will not change.

**A link is a snapshot, not a live reference.** Adding a link records the
target's bucket and name at creation time; it does not pin the target alive.
Delete the target and the link is left dangling — a get on the link
traverses to a deleted object and fails with `ErrObjectNotFound`. The link
still exists; its destination does not. Renames break a link the same way:
because the link holds the old name, renaming the target leaves the link
pointing at a name that no longer resolves. Do not assume `addLink` keeps the
target around or follows it under a rename. Do verify the target exists before
you depend on the link, or prefer a bucket link for loose coupling so a single
deleted or renamed object cannot strand it.

You can see the failure and the safe check side by side. Delete the invoice,
get the now-stale label link, then confirm the target with `info`:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-staleLink" data-languages="cli,js,go,python,java,rust,csharp"></div>

**`UpdateMeta` changes the name, description, headers, and metadata — not the
chunk size or the link.** Updating metadata rewrites the name, description,
headers, and metadata map. Changing the name renames the object in place. If
you hand `UpdateMeta` a new chunk size or a new link target, those fields are
discarded without error or notification — the call succeeds but neither is
stored. The chunk size is fixed when the bytes are written, and a link target
is fixed when the link is created. Do not expect `UpdateMeta` to re-chunk an
object or to change a link target. To change the chunk size, delete the object
and put it again. To change a link target, delete the link and add a new one.
And do not rename onto a name already in use: renaming an object to an
existing, non-deleted name fails with `ErrObjectAlreadyExists`. You *can*
rename onto a name that was deleted — that reclaims the name for the renamed
object.

## Where you are

You now have:

- `invoice-ord_8w2k.pdf` carrying a description and a `content-type` header,
  readable without fetching the bytes.
- `label-ord_8w2k.png` as a link to the invoice, traversed transparently on
  get.
- A working sense of the two link rules — no link to a deleted object, no
  link to a link — and of what `UpdateMeta` does and does not touch.

The bucket now holds an object with rich metadata and a link beside it. The
next page steps back from single objects to the whole bucket: how to take a
snapshot of everything in it, and how to watch it change in real time.

## What is next

The next page teaches **list** and **watch**: a snapshot of every object in
the bucket, and a live stream of metadata updates as `analytics` watches the
bucket fill.

Continue to [4. Watching and listing](/learn/object-store/watching-and-listing).

## See also

- [Key-Value](/learn/key-value) — the multi-revision store, when you want a
  history per key rather than the latest object.
- [Reference](/reference/) — the full set of `ObjectInfo` fields and link
  options.
