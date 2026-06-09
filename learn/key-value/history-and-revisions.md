---
id: history-and-revisions
title: "3. History and revisions"
sidebar_position: 4
description: Track a key's revisions, read its history, and decrement safely with compare-and-swap
---

# 3. History and revisions

So far every write to a key has been a `put`: the new value lands, the old
one is gone, and you never had to think about who wrote last. That works
right up until two writers touch the same key at the same time.

This page adds the two ideas that make concurrent writes safe. The first
is the **revision**: every key carries a revision that counts its writes,
and `history` keeps the prior ones. The second is **compare-and-swap (CAS)**: a write
that only succeeds if the key still holds the revision you read. Together
they let the inventory service decrement `widget-blue` from 42 to 41
without ever losing a sale.

You still have the `INVENTORY` bucket from the first page, with
`widget-blue` set to 42, and the warehouse dashboard from the watching
page is still attached. We build on both.

## Every put bumps the revision

A **revision** is a per-key integer that counts the key's writes. It starts
at 1 when you first put a key, and every write that changes the key's value bumps it by one.
The revision is not something you set; the server assigns it, and `get`
returns it alongside the value as part of the **entry**.

The entry you got back on the first page already carried it. When you put
`widget-blue 42`, that value landed at revision 1. Put `41` over it and
the value is now at revision 2. The revision is the key's own count of how
many times it has been written, and you will use it in a moment to write
safely.

The bucket also keeps the **history**: the prior revisions of a key, up to
the bucket's history depth. You set that depth when you created the bucket
with `--history`. A bucket created with `--history 1` keeps only the
latest value — there is no prior revision to look at. A bucket with a
deeper history keeps a trail you can read back.

Read the history of `widget-blue`:

<div class="nats-example" data-type="learn-key-value-history-and-revisions-keyHistory" data-languages="cli,js,go,python,java,rust,csharp"></div>

With `--history 1`, history shows one entry: the current value. To keep a
trail, you would have created the bucket with a larger depth, and each
revision would appear as its own line — value, revision, timestamp, and
operation. The history depth caps at 64 revisions per key; the full set of
bucket configuration options is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create).

History is the kept past of a single key. It is not an audit log of the
whole bucket, and it does not grow without bound — once a key has more
revisions than the depth allows, the oldest one falls off. Think of it as
a short, fixed-length trail behind each key.

## Compare-and-swap: writing without locks

Here is the problem `put` cannot solve. Two copies of the inventory
service both sell a `widget-blue`. Both read the count as 42. Both compute
41. Both put 41. Two sales happened, but the count only dropped by one.
One write clobbered the other, and a unit of stock vanished from the
books.

The fix is **optimistic concurrency**: no locks, no waiting. Instead, each
writer reads the current revision, then writes *on the condition* that the
revision has not changed since. If another writer got there first, the
condition fails and the write is rejected — nothing is overwritten. The
rejected writer reads the fresh value and tries again.

The mechanism behind that condition is **compare-and-swap (CAS)**: you
hand the server the revision you expect the key to be at, and the server
swaps in your new value only if the key is still at that revision. NATS
exposes CAS through two operations:

- **create** writes a key only if it does not exist yet. It is CAS against
  the expectation "this key is at revision 0" — no value present.
- **update** writes a key only if it is at the revision you name. It is
  CAS against "this key is still at the revision I read."

To decrement `widget-blue` safely, the inventory service reads the entry,
takes its revision, computes the new count, and calls update with that
revision. If the key is still at the revision it read, the write lands. If
not, the write is rejected and nothing is lost.

<div class="nats-example" data-type="learn-key-value-history-and-revisions-casUpdate" data-languages="cli,js,go,python,java,rust,csharp"></div>

This is the read-modify-write you reach for whenever the new value depends
on the old one — a decrement, an increment, a status transition. The
revision is the guard that makes it safe.

<div class="nats-flow" data-scenario="kvCasRetryAnimated" data-width="600" data-height="350"></div>

The animation walks the conflict: the service gets `widget-blue` at
revision 7 and calls update expecting 7, but a concurrent writer has
already bumped the key to revision 8. The server rejects the update on the
revision mismatch. The service re-gets — now revision 8 — and retries with
the fresh revision, which the server accepts. No write was lost, and no
lock was ever held.

## Pitfalls

Two traps catch people the first time they rely on revisions. Both come
from treating a CAS write like an unconditional one.

**A rejected update is not queued — it is dropped, and you must retry.**
Optimistic concurrency does not wait its turn. When update finds the key
at a different revision than you named, the server returns an error and
your value is gone. If you fire-and-forget an update, a conflict silently
loses the write. Do not assume an update succeeded; check the result, and
on a revision mismatch, re-get the key and try again with the fresh
revision. That re-get-and-retry loop is the whole point of CAS — without
it you have the same lost-write bug `put` had.

Here is the handling: get the current revision, attempt the update, and on
a mismatch re-get and retry once with the new revision.

<div class="nats-example" data-type="learn-key-value-history-and-revisions-casConflictRetry" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Do not use put for a read-modify-write.** Put is unconditional: it
writes no matter what the key holds now, so it will happily overwrite a
value a concurrent writer just stored. Put is correct when the new value
does not depend on the old one — setting a SKU's count to a known
absolute number from an inventory recount, say. The moment the new value
is computed *from* the current value, like a decrement on a sale, reach
for update with the revision instead. Put for "set it to this"; update for
"change it from what it was."

## Where you are

You now have:

- An `INVENTORY` bucket whose `widget-blue` key has been decremented from
  42 to 41 with a CAS update, not a blind put.
- The ability to read a key's history and reason about its revision.
- A working model of optimistic concurrency: read the revision, write on
  that condition, retry on mismatch.

The warehouse dashboard from the watching page saw that decrement arrive
live, the same as any other change.

## What is next

The next page gives a key a lifetime of its own with a per-key **TTL**,
and bounds the whole bucket with limits.

Continue to [4. TTL and limits](/learn/key-value/ttl-and-limits).

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  every bucket configuration option, including history depth.
- [Watching](/learn/key-value/watching) — how a watcher receives the
  changes you make with update.
