---
id: metadata-and-links
title: Metadata and links
sidebar_position: 4
description: Attach a description, headers, and a metadata map to an object, then link one object to another
---

# Metadata and links

An object carries more than its bytes. So far `invoice-ord_8w2k.pdf` is only a
name and a payload: `warehouse` has to fetch the whole thing to learn
anything about it. This page adds metadata to the object: a human-readable
description, HTTP-style headers, and a free-form metadata map
that travel with the object. Then it teaches links, so one object can
stand in for another.

The invoices you stored on the previous pages are still in the `INVOICES`
bucket; keep that terminal open.

## Every object carries an ObjectInfo

When you `put` an object, the store writes the chunks and then one final
metadata message describing the whole thing. That metadata message is an
`ObjectInfo` record. Some of its fields the store computes for you: the
byte size, the chunk count, the SHA-256 digest, the modification time, and
whether the object is deleted. Three fields are ones you set.

The first is the **description**: a single human-readable label for the
object. The second is **headers**: HTTP-style key/value pairs, the same
shape as the headers on a NATS message. The third is the **metadata** map:
free-form key/value strings for whatever your application wants to record.

Set them on the put. `order-svc` stores the invoice with a description and a
`content-type` header so a reader knows the bytes are a PDF without fetching
them first:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-putWithMeta" data-languages="cli,js,go,python,java,rust,csharp"></div>

The object name and the bytes are unchanged: this is the same
`invoice-ord_8w2k.pdf` from your first object, now carrying a description and
a header. The metadata is held in that one trailing metadata message, so it
adds no extra storage cost and no extra read cost.

## Reading the metadata back

Reading the metadata doesn't fetch the object's bytes. The store keeps the
latest `ObjectInfo` for each name as one small message, so `warehouse` can
read an object's details without reading the bytes.

<div class="nats-example" data-type="learn-object-store-metadata-and-links-info" data-languages="cli,js,go,python,java,rust,csharp"></div>

The output shows your description and header next to the computed fields:
size, chunks, digest, modification time. `warehouse` reads the
`content-type` header and the size here, then decides whether to fetch the
bytes. The metadata is a low-cost index over the bucket, and you only read the
larger bytes when you need them.

There's one boundary to keep in mind. The metadata describes the *current*
object, not a history of past versions. Each re-put replaces the
metadata, keeping only the latest. If you want a full revision history per
name, that's the Key-Value store's job, covered in
[Key-Value](/learn/key-value); the object store keeps the current
`ObjectInfo`, not the trail of edits that produced it.

## Links point one object at another

A **link** is an object whose target is another object. A `get` on the link
transparently returns the target's bytes: you request the link, the store
follows it and returns the target. The link is a reference rather than a
copy: it stores no chunks of its own, only a record of the target's bucket
and name.

This is useful when two names should resolve to the same bytes. In the Acme
platform a shipping label and an invoice can share a document, or a stable
name can serve as the entry point for a frequently changing set of files. Here `label-ord_8w2k.png` becomes a
link to the invoice, so fetching the label returns the invoice's bytes:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-addLink" data-languages="cli,js,go,python,java,rust,csharp"></div>

A link can also target a whole bucket instead of a single object. That's a
**bucket link**: the target name is empty, so it records only a reference to
another bucket. A `get` on a bucket link doesn't return bytes — it returns an
error (`ErrCantGetBucket` in Go). You read the link's info to learn the target
bucket, then open that bucket yourself. Reach for a bucket link when you want a
stored pointer to another store, not a gettable object.

Two rules constrain links, and the store enforces both. A link can't point
at a deleted object, and a link can't point at another link — the store
won't build a chain of links you'd have to follow. When you add a link, the
store records the target as it stands at that moment and traverses it on
every get from then on.

The full set of `ObjectInfo` fields and link options is documented in
[Reference](/reference/). We only need the behavior here.

## Pitfalls

Metadata and links have two pitfalls: what a link does when its target
moves, and what `UpdateMeta` will and won't change.

**A link is a snapshot rather than a live reference.** Adding a link records the
target's bucket and name at creation time; it doesn't keep the target alive.
Delete the target and the link is left dangling: a get on the link
traverses to a deleted object and fails with `ErrObjectNotFound`. The link
still exists, but its destination does not. Renames break a link the same way:
the link holds the old name, so renaming the target leaves the link
pointing at a name that no longer resolves. Do not assume `addLink` keeps the
target around or follows it under a rename. Do verify the target exists with
`info` before you depend on the link, and re-create the link after you delete
or rename its target.

You can see the failure and the safe check side by side. Delete the invoice,
get the now-stale label link, confirm the target with `info`, then re-put the
invoice so the link resolves again and the bucket is back to where you left it:

<div class="nats-example" data-type="learn-object-store-metadata-and-links-staleLink" data-languages="cli,js,go,python,java,rust,csharp"></div>

**`UpdateMeta` changes the name, description, headers, and metadata, not the
chunk size or the link.** Changing the name renames the object in place. If
you hand `UpdateMeta` a new chunk size or a new link target, those fields are
discarded without error or notification: the call succeeds, but neither is
stored. The chunk size is fixed when the bytes are written, and a link target
is fixed when the link is created. Don't expect `UpdateMeta` to re-chunk an
object or to change a link target. To change the chunk size, delete the object
and put it again. To change a link target, delete the link and add a new one.
And don't rename onto a name already in use: renaming an object to an
existing, non-deleted name fails with `ErrObjectAlreadyExists`. You *can*
rename onto a name that was deleted; that reclaims the name for the renamed
object.

## Where you are

You now have:

- `invoice-ord_8w2k.pdf` carrying a description and a `content-type` header,
  readable without fetching the bytes.
- `label-ord_8w2k.png` as a link to the invoice, traversed transparently on
  get.
- A working sense of the two link rules (no link to a deleted object, no
  link to a link) and of what `UpdateMeta` does and doesn't touch.

The bucket now holds an object that carries its own metadata, and a link beside
it. The next page moves from single objects to the whole bucket: how to
take a snapshot of everything in it, and how to watch it change in real time.

## What's next

The next page teaches list and watch: a snapshot of every object in
the bucket, and a live stream of metadata updates as `analytics` watches the
bucket fill.

Continue to [Watching and listing](/learn/object-store/watching-and-listing).

## See also

- [Key-Value](/learn/key-value) — the multi-revision store, when you want a
  history per key rather than the latest object.
- [Reference](/reference/) — the full set of `ObjectInfo` fields and link
  options.
