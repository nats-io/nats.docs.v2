---
id: your-first-bucket
title: 1. Your first bucket
sidebar_position: 2
description: Create the INVENTORY bucket, put a stock count, and get back an entry
---

# 1. Your first bucket

Time to make the `INVENTORY` bucket real. The inventory service keeps a
stock count for each SKU, and a bucket is where those counts live. This
page creates the bucket with one command, puts a count, gets it back, and
reads the bucket's status. Nothing more.

The previous chapter gave you JetStream. A bucket rides on top of it: a
**bucket** is a JetStream stream the key-value API creates and configures
for you. You never write the stream by hand. You ask for a bucket, and the
server stores one stream named `KV_INVENTORY` behind the friendly name
`INVENTORY`. The stream is the topic of the [under the
hood](/learn/key-value/under-the-hood) page; here you only need to know it
exists.

## Create the bucket

A running `nats-server` with JetStream enabled is the one prerequisite.
The key-value API is part of JetStream, so without `-js` the next command
has nothing to talk to:

```bash
nats-server -js
```

In another terminal, create the bucket:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-createBucket" data-languages="cli,js,go,python,java,rust,csharp"></div>

Two things matter here.

The first is the **bucket name**: `INVENTORY`. Bucket names are
case-sensitive identifiers, and they show up in every command and every
error message in this chapter. The name maps straight onto the backing
stream — `INVENTORY` becomes `KV_INVENTORY`.

The second is `--history 1`. **History** is how many prior values the
bucket keeps for each key. One means the bucket holds only the current
value of a key and forgets the rest. That is the default and all the
inventory service needs to start. Page 3 raises it so a key remembers
where it has been; for now, one is enough.

You did not set any other configuration. A bucket has the same long list
of stream knobs underneath, all filled with sensible defaults. The full
set of bucket configuration options is documented in [Reference → Create
Stream](/reference/jetstream/api/stream/create), since a bucket is created
as a stream. We use only `History` here.

## Put a value, get an entry

The bucket is empty. Put the first stock count into it. The **key** is the
SKU, and the **value** is the count stored as bytes:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-putValue" data-languages="cli,js,go,python,java,rust,csharp"></div>

That is a **put**: an unconditional write. It stores the value whether or
not the key already exists, and it hands back the key's new **revision** —
a number the bucket bumps on every write. The first write to a fresh key
lands at revision 1. Revisions are how the bucket tracks change over time;
page 4 builds on them, and for now the number is just a receipt.

Now read it back:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-getValue" data-languages="cli,js,go,python,java,rust,csharp"></div>

Here is the one surprise of this page. A **get** does not return a bare
value. It returns an **entry** — the value together with its revision and
the time it was written. The CLI's `--raw` flag strips the entry down to
just the value bytes (`42`), which is usually what a program wants, but the
full object is what the server actually sends.

That shape is deliberate. The inventory service rarely wants only the
count; it wants the count *and* the revision, because the next chapter uses
that revision to decrement the value safely. The entry carries both in one
read, so you never have to make a second call to learn which revision you
just saw.

## Read the bucket's status

One command summarizes the bucket as a whole:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-bucketStatus" data-languages="cli,js,go,python,java,rust,csharp"></div>

The status reports the bucket name, the history depth you set, and how many
values it holds. It also reports the **backing stream**: the stream the
bucket is built on, named `KV_INVENTORY`. That line is your first concrete
proof that a bucket is a stream wearing a friendlier name. The [under the
hood](/learn/key-value/under-the-hood) page opens that stream up and reads
it directly.

## Pitfalls

Two traps catch people on their very first bucket. Each is easy to avoid
once you have seen it.

**A get returns an entry, not a value — and a missing key is an error,
not an empty value.** Reaching straight for the value bytes works only
when the key exists. A key that was never put does not return an empty
entry; it returns a key-not-found error. Those are two different
situations: an empty value is a value, and a missing key is the absence of
one. Do not treat a failed get as "the count is zero." Check the error
first, then read the value:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-getValue" data-languages="cli,js,go,python,java,rust,csharp"></div>

The last line of that example gets a SKU that was never stocked. The get
fails, and the program decides what a missing SKU means instead of reading
a stale or zero count by accident.

**Bucket and key names are validated.** A bucket name may contain only
letters, digits, dash, and underscore. A key is more permissive — letters,
digits, and the characters `-`, `/`, `_`, `=`, and `.` — but nothing
beyond that set, and no leading or trailing dot. An order id like
`ord:8w2k` has a colon, so it cannot be a key; the server rejects the
write rather than storing a broken key. Pick names from the allowed set,
and reach for an underscore or dash where you would have used a colon:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-nameRejected" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

You now have:

- An `INVENTORY` bucket, backed by the stream `KV_INVENTORY`.
- The key `widget-blue` holding the value `42` at revision 1.
- The ability to put a value, get back its entry, and read the bucket's
  status.

## What is next

The next page puts the **warehouse dashboard** on the bucket: a watch that
streams every stock change live, starting with a snapshot of what is
already there.

Continue to [2. Watching](/learn/key-value/watching).

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  every configuration option a bucket inherits from its backing stream.
- [Core Concepts → JetStream](/concepts/jetstream) — the storage layer a
  bucket is built on.
- [Watching](/learn/key-value/watching) — stream live changes off the
  bucket.
