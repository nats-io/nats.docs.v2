---
id: under-the-hood
title: Under the hood
sidebar_position: 6
description: The KV_INVENTORY stream behind the bucket, the direct read path, and delete versus purge
---

# Under the hood

You've built a whole `INVENTORY` bucket: keys with values, a watcher, safe
decrements with compare-and-swap, and a TTL'd key that expires on its own. Every
one of those used the key-value API and never mentioned a stream. This
page shows the underlying mechanism. The bucket was a JetStream stream the whole
time, and seeing it lets you understand how KV works internally.

This page first proves the bucket is a stream and traces one
key down to the message that holds it. It then covers the one operation where
the abstraction behaves differently depending on what you ask for: delete versus purge.

## A bucket is a stream

The index page stated it; here you can check it. A bucket is a JetStream stream
named `KV_<bucket>` whose subjects are `$KV.<bucket>.>`. A key is the last token
of that subject, and a value is a message on it. For `INVENTORY` the backing
stream is `KV_INVENTORY`, its subjects are `$KV.INVENTORY.>`, and the key
`widget-blue` is the message on `$KV.INVENTORY.widget-blue`.

The KV commands don't show the stream name, but the stream commands report it
directly. Ask the server for the stream behind the bucket:

<div class="nats-example" data-type="learn-key-value-under-the-hood-streamInfoOfBucket" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The configuration the server prints back is every KV claim from this chapter,
written in stream terms:

- **Subjects: `$KV.INVENTORY.>`**. There is one subject branch, with one key per token under it.
- **Maximum Per Subject: `10`**. This *is* the history depth. You raised it to 10
  on the history page to keep prior revisions; the bucket's history is the stream
  keeping more than one message per subject.
- **Discard Policy: `New`**. Once the bucket hits a limit, it rejects the
  newest write rather than silently dropping older messages to make room. This is
  why limits reject: the bucket keeps the messages it already holds rather than
  evicting them.
- **Direct Get: `true`**. Get doesn't open a consumer. More on that next.
- **Allows Rollups: `true`**. Purge replaces a key's whole subject with one
  message. More on that below.
- **Allows Msg Delete: `false`**. This maps to the stream's `deny_delete`
  setting: the stream refuses the JetStream message-delete API, so raw stream ops
  can't remove entries behind the KV API's back.

This is the same stream-storage model the JetStream chapter drew. The animation
below is the one from that chapter, reused on purpose: the layer under your
bucket is exactly the stream described there.

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="350"></div>

The full set of stream configuration the server reports here is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create). You didn't
set any of these by hand; the client mapped your bucket settings onto them.

## Get reads the last message, with no consumer

Reading a value doesn't replay the stream and doesn't open a consumer. It uses
**direct get**: the server returns the last message on a subject straight from
storage. The request goes to `$JS.API.DIRECT.GET.<stream>.<subject>` (for our
key, `$JS.API.DIRECT.GET.KV_INVENTORY.$KV.INVENTORY.widget-blue`), and the
server answers with the latest message there. That last message is the current
value, its sequence is the revision, and its store time is the entry timestamp.

This is why `nats kv get INVENTORY widget-blue` is fast and stateless. There's no
position to track, no message to acknowledge, and no consumer to clean up, so a get
is one request and one reply. It's the reason a bucket behaves as a key-value
store even though it's built from an append-only log: the bucket interface hides
the stream, so you see key-value pairs rather than messages. Each get returns the last
message per subject, served directly.

`Direct Get: true` in the stream config is what enables this path. It's set
for you when the bucket is created. The exhaustive direct-read API lives in
[Reference → Get Stream Message](/reference/jetstream/api/stream/msg-get); here
you only need its shape, which is the last message for a subject, with no consumer.

## Delete versus purge

Removing a key is the one operation where the abstraction behaves differently
depending on what you ask for, because "gone" can mean two different things underneath.

A **delete** leaves a non-destructive **marker**: a message with a
`KV-Operation: DEL` header. The key now reads empty, but every prior revision the
bucket still keeps — up to its history depth — stays in the stream and readable
through history. Delete is the common case
when you want a key to read as absent but don't need its past erased. (The
marker is what other systems call a tombstone; after this paragraph we'll call it
a marker.)

A **purge** is destructive. It writes a marker with a `KV-Operation: PURGE`
header *and* a `Nats-Rollup: sub` header. The rollup tells the stream to drop
every earlier message on that subject and keep only this one marker. History
collapses to a single entry; the prior values are gone from disk. Reach for purge
when you must actually remove the old values (for size, or because they were
sensitive), not just hide them.

<div class="nats-example" data-type="learn-key-value-under-the-hood-deleteVsPurge" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Both make a `get` report the key as gone. The difference is entirely in what
history can still show you afterward: delete keeps the prior revisions, while
purge erases them.

A bucket's `Replicas` field (how many servers hold a copy) is named here for
completeness, because it shows up in the stream config too. Replication, leader
election, and placement belong to [Clustering](/learn/clustering) and aren't
taught in this chapter.

## Pitfalls

Once you can see the stream, a few mistakes become tempting. Most come from
treating the backing stream as something you operate directly.

**Delete does not remove history; only purge does.** It's easy to read "I
deleted the key" as "the old values are gone." They are not. A deleted key still
has every prior revision available through history, because delete only appends a
marker. If you delete `widget-blue` to scrub a wrong count and assume the bad
value is unrecoverable, it's sitting one `nats kv history` away. To actually
drop prior values, purge.

The example above is the proof: delete `widget-blue`, then read its
history and see the old revisions still there; purge `widget-red`, then read its
history and see it collapsed to a single marker. Choose the operation by what you
need to keep, the prior revisions or the disk space they occupy.

**Do not operate the backing stream directly.** The bucket is a managed stream.
Don't hand-edit `KV_INVENTORY`'s configuration, and don't publish to
`$KV.INVENTORY.>` with raw `nats pub`. The KV API sets the headers that make the
store correct: the expected-revision header for compare-and-swap, the
`KV-Operation` and `Nats-Rollup` headers for delete and purge. A raw publish
writes a bare message with none of them, so a watcher can't tell it from a real
put and a purge you meant never happens. The stream is built with `deny_delete`
on so raw stream operations can't remove entries behind the KV API's back, but
that setting doesn't stop a raw publish — which is exactly why you avoid one. Use
`nats kv put`, not `nats pub`; use `nats kv del` and `nats kv purge`, not stream
message deletion.

**A key has to be a legal subject token.** Now that you can see a key becomes
the last token of `$KV.INVENTORY.<key>`, the name rules make sense: a key may
contain only letters, digits, and `-`, `/`, `_`, `=`, and `.`, with no leading
or trailing dot and no two dots in a row, because anything else would be an
illegal subject. An order id like `ord:8w2k` carries a colon, so it can't be a
key, and the bucket rejects the write instead of storing a broken key. This is
the same validation introduced on
[Your first bucket](/learn/key-value/your-first-bucket#pitfalls); the backing
stream is why it exists.

## Where you are

You now have:

- The same `INVENTORY` bucket you built across the first four pages, from
  [Your first bucket](./your-first-bucket) through
  [TTL and limits](./ttl-and-limits), plus the ability to inspect it as the
  `KV_INVENTORY` stream it's always been.
- A map from every KV operation to its stream mechanism: put is a message, get is
  a direct read of the last message per subject, history is messages kept per
  subject, a revision is a sequence number, a watch is a consumer.
- A clear distinction between delete (marker, history kept) and purge (rollup
  marker, history dropped), and the rule never to operate the backing stream
  directly.

The abstraction is no longer opaque. It's a stream presented through the KV API,
and you can now see both the KV interface and the stream beneath it.

## What's next

The last page steps back: it recaps the whole chapter, points you at where the
exhaustive details live, and collects every page's pitfalls into one
pre-production checklist.

Continue to [Where to go next](/learn/key-value/where-next).

## See also

- [Reference → Get Stream Message](/reference/jetstream/api/stream/msg-get) — the
  direct-get read path in full.
- [JetStream Deep Dive](/learn/jetstream) — the stream and consumer model this
  bucket is built on.
- [Clustering](/learn/clustering) — replicas, placement, and leader election for
  the backing stream.
