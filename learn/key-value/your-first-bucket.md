---
id: your-first-bucket
title: Your first bucket
sidebar_position: 2
description: Create the INVENTORY bucket, put a stock count, and get back an entry
---

# Your first bucket

Time to make the `INVENTORY` bucket real. The inventory service keeps a
stock count for each SKU, and a bucket is where those counts live. This
page creates the bucket with one command, puts a count, gets it back, and
reads the bucket's status, and does nothing more than that.

The previous chapter gave you JetStream. A bucket rides on top of it: a
**bucket** is a JetStream stream the key-value API creates and configures
for you, so you never write the stream by hand. You ask for a bucket, and the
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

<div class="nats-example" data-type="learn-key-value-your-first-bucket-createBucket" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Two parts of this command matter. The first is the **bucket name**: `INVENTORY`. Bucket names are
case-sensitive identifiers, and they show up in every command and every
error message in this chapter. The name maps straight onto the backing
stream: `INVENTORY` becomes `KV_INVENTORY`.

The second is `--history 1`. **History** is how many prior values the
bucket keeps for each key. One means the bucket holds only the current
value of a key and forgets the rest. That's the default and all the
inventory service needs to start. The depth can go as high as 64, but no
higher; [History and revisions](./history-and-revisions) raises it so a key
remembers where it's been, and for now, one is enough.

You didn't set any other configuration. A bucket has the same long list
of stream knobs underneath, all filled with sensible defaults. The full
set of bucket configuration options lives in [Reference → Create
Stream](/reference/jetstream/api/stream/create), since a bucket is created
as a stream. We use only `History` here.

## Put a value, get an entry

The bucket is empty. Put the first stock count into it. The **key** is the
SKU, and the **value** is the count stored as bytes:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-putValue" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

That's a **put**: an unconditional write. It stores the value whether or
not the key already exists. Each write also gets a **revision**: a number
the bucket assigns from a single counter it keeps across every key, not a
per-key count. Because `INVENTORY` is empty, this first write lands at
revision 1; in a bucket that already holds other keys, the same put would
take the next number in the bucket's sequence instead. The put API returns
that revision to client code; the CLI prints only the value you stored.
Revisions are how the bucket tracks change over time, and
[History and revisions](./history-and-revisions) builds on them.

Now read it back:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-getValue" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

A **get** returns an **entry** rather than a bare
value: the value together with its revision and
the time it was written. The CLI's `--raw` flag strips the entry down to
just the value bytes (`42`), which is usually what a program wants, but the
full object is what the server actually sends.

That shape is intentional, because the inventory service rarely wants only the
count; it wants the count *and* the revision, because [history and
revisions](/learn/key-value/history-and-revisions) uses that revision to
decrement the value safely. The entry carries both in one
read, so you never have to make a second call to learn which revision you
just saw.

The timestamp on the entry matters too. It records when the value
was written, not when you read it, so the inventory service can tell a
count taken seconds ago from one that has sat untouched for a week. You
get all three facts — value, revision, and write time — from the single
get you already made.

## Read the bucket's status

One command summarizes the bucket as a whole:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-bucketStatus" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The status reports the bucket name, the history depth you set, and how many
values it holds. It also reports the **backing stream**: the stream the
bucket is built on, named `KV_INVENTORY`. That line is your first concrete
proof that a bucket is a stream with a friendlier name. The [under the
hood](/learn/key-value/under-the-hood) page opens that stream and reads
it directly.

## Pitfalls

Two mistakes are common on your very first bucket, and each is easy to avoid
once you've seen it.

**A get returns an entry rather than a value, and a missing key is signaled
distinctly from an empty one.** Reaching straight for the value bytes works only
when the key exists. A key that was never put doesn't return an empty
entry: the CLI and some clients (Go, Python, C#) fail with a key-not-found
error, while others (JavaScript, Rust, Java) return null or None. Either
way, absence is reported as its own thing, separate from a value that
happens to be empty: an empty value is a value, and a missing key is the
absence of one. Don't treat a missing key as "the count is zero." The get
example above ends with exactly this case: its last line gets a SKU that
was never stocked, the get signals absence, and the program decides what a
missing SKU means instead of reading a stale or zero count by accident.
Check for absence first, then read the value.

**Bucket and key names are validated.** A bucket name may contain only
letters, digits, dash, and underscore, and it can't be empty. A key is
more permissive (letters, digits, and the characters `-`, `/`, `_`, `=`,
and `.`), but nothing beyond that set, no leading or trailing dot, and no
two dots in a row (`a..b` is rejected even though `a.b` is fine). An order
id like `ord:8w2k` has a colon, so it can't be a key; the client library
validates the name and rejects the write before it's sent, rather than
storing a broken key. Pick names from the allowed set, and reach for an
underscore or dash where you'd have used a colon:

<div class="nats-example" data-type="learn-key-value-your-first-bucket-nameRejected" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Where you are

You now have:

- An `INVENTORY` bucket, backed by the stream `KV_INVENTORY`.
- The key `widget-blue` holding the value `42` at revision 1.
- The ability to put a value, get back its entry, and read the bucket's
  status.

## What's next

The next page puts the **warehouse dashboard** on the bucket: a watch that
streams every stock change live, starting with a snapshot of what's
already there.

Continue to [Watching](/learn/key-value/watching).

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  every configuration option a bucket inherits from its backing stream.
- [Core Concepts → JetStream](/concepts/jetstream) — the storage layer a
  bucket is built on.
- [Watching](/learn/key-value/watching) — stream live changes off the
  bucket.
