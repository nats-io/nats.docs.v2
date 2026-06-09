---
id: under-the-hood
title: 5. Under the hood
sidebar_position: 6
description: The KV_INVENTORY stream behind the bucket, the direct read path, and delete versus purge
---

# 5. Under the hood

You have built a whole `INVENTORY` bucket: keys with values, a watcher, safe
decrements with compare-and-swap, and a TTL'd key that expires on its own. Every
one of those used the friendly key-value API and never mentioned a stream. This
page lifts the lid. The bucket was a JetStream stream the whole time, and once
you can see it, nothing about KV is magic anymore.

We do two things. First, we prove the bucket is a stream and trace one key down
to the message that holds it. Then we look at the one place the abstraction has a
real choice to make: delete versus purge.

## A bucket is a stream

The index page stated it; here you can check it. A bucket is a JetStream stream
named `KV_<bucket>` whose subjects are `$KV.<bucket>.>`. A key is the last token
of that subject, and a value is a message on it. For `INVENTORY` the backing
stream is `KV_INVENTORY`, its subjects are `$KV.INVENTORY.>`, and the key
`widget-blue` is the message on `$KV.INVENTORY.widget-blue`.

The KV commands hide the stream name, but the stream commands see straight
through to it. Ask the server for the stream behind the bucket:

<div class="nats-example" data-type="learn-key-value-under-the-hood-streamInfoOfBucket" data-languages="cli,js,go,python,java,rust,csharp"></div>

The configuration the server prints back is every KV claim from this chapter,
written in stream terms:

- **Subjects: `$KV.INVENTORY.>`** — one subject branch, one key per token under it.
- **Max Msgs Per Subject: `1`** — this *is* the history depth. You raised it to
  keep prior revisions; the bucket's history is the stream keeping more than one
  message per subject.
- **Discard Policy: `New`** — once the bucket hits a limit, it rejects the
  newest write rather than silently dropping older messages to make room. This is
  why limits matter: the bucket protects what it already holds.
- **Allow Direct: `true`** — get does not open a consumer. More on that next.
- **Allow Rollup: `true`** — purge replaces a key's whole subject with one
  message. More on that below.
- **Deny Delete: `true`** — the stream refuses raw message deletion, so the KV
  API stays the only door in and out.

This is the same stream-storage model the JetStream chapter drew. The animation
below is the one from that chapter, reused on purpose: the layer under your
bucket is exactly the stream you already met.

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="350"></div>

The full set of stream configuration the server reports here is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create). You did not
set any of these by hand; the client mapped your bucket settings onto them.

## Get reads the last message, with no consumer

Reading a value does not replay the stream. It does not open a consumer either.
It uses **direct get**: the server returns the last message on a subject straight
from storage. The request goes to `$JS.API.DIRECT.GET.<stream>.<subject>` — for our
key, `$JS.API.DIRECT.GET.KV_INVENTORY.$KV.INVENTORY.widget-blue` — and the
server answers with the latest message there. That last message is the current
value, its sequence is the revision, and its store time is the entry timestamp.

This is why `nats kv get INVENTORY widget-blue` is fast and stateless. There is
no position to track, nothing to acknowledge, no consumer to clean up. Get is one
request and one reply. It is the reason a bucket reads like a key-value store even
though it is built from an append-only log: the bucket interface hides the stream,
so you see key-value pairs, not messages — each get is just "the last message per
subject," served directly.

`Allow Direct: true` in the stream config is what enables this path. It is set
for you when the bucket is created. The exhaustive direct-read API lives in
[Reference → Get Stream Message](/reference/jetstream/api/stream/msg-get); here
you only need the shape: last message, by subject, no consumer.

## Delete versus purge

Removing a key is the one operation where the abstraction makes a real decision,
because "gone" can mean two different things underneath.

A **delete** leaves a non-destructive **marker** — a message with a
`KV-Operation: DEL` header. The key now reads empty, but every prior revision is
still in the stream and still readable through history. Delete is the common case
when you want a key to read as absent but do not need its past erased. (The
marker is what other systems call a tombstone; after this paragraph we call it a
marker.)

A **purge** is destructive. It writes a marker with a `KV-Operation: PURGE`
header *and* a `Nats-Rollup: sub` header. The rollup tells the stream to drop
every earlier message on that subject and keep only this one marker. History
collapses to a single entry; the prior values are gone from disk. Reach for purge
when you must actually remove the old values — for size, or because they were
sensitive — not just hide them.

<div class="nats-example" data-type="learn-key-value-under-the-hood-deleteVsPurge" data-languages="cli,js,go,python,java,rust,csharp"></div>

Both make a `get` report the key as gone. The difference is entirely in what
history can still show you afterward: delete keeps the trail, purge erases it.

A bucket's `Replicas` field — how many servers hold a copy — is named here for
completeness, because it shows up in the stream config too. Replication, leader
election, and placement belong to [Clustering](/learn/clustering) and are not
taught in this chapter.

## Pitfalls

Seeing the stream invites a few tempting mistakes. Most come from treating the
backing stream as something you operate directly.

**Delete does not remove history; only purge does.** It is easy to read "I
deleted the key" as "the old values are gone." They are not. A deleted key still
has every prior revision available through history, because delete only appends a
marker. If you delete `widget-blue` to scrub a wrong count and assume the bad
value is unrecoverable, it is sitting one `nats kv history` away. To actually
drop prior values, purge.

The handling example above is the proof: delete `widget-blue`, then read its
history and see the old revisions still there; purge `widget-red`, then read its
history and see it collapsed to a single marker. Choose the operation by what you
need to survive — the trail, or the space.

**Do not operate the backing stream directly.** The bucket is a managed stream.
Do not hand-edit `KV_INVENTORY`'s configuration, and do not publish to
`$KV.INVENTORY.>` with raw `nats pub`. The KV API sets the headers that make the
store correct: the expected-revision header for compare-and-swap, the
`KV-Operation` and `Nats-Rollup` headers for delete and purge. A raw publish
writes a bare message with none of them, so a watcher cannot tell it from a real
put and a purge you meant never happens. The stream is built with `Deny Delete`
on for exactly this reason — to keep the API the only door. Use `nats kv put`,
not `nats pub`; use `nats kv del` and `nats kv purge`, not stream message
deletion.

**A key has to be a legal subject token.** Now that you can see a key becomes
the last token of `$KV.INVENTORY.<key>`, the name rules make sense: a key may
contain only letters, digits, and `-`, `/`, `_`, `=`, and `.`, with no leading
or trailing dot and no two dots in a row, because anything else would be an
illegal subject. An order id like `ord:8w2k` carries a colon, so it cannot be a
key, and the bucket rejects the write instead of storing a broken key. This is
the same validation introduced on
[Your first bucket](/learn/key-value/your-first-bucket#pitfalls); the backing
stream is why it exists.

## Where you are

You now have:

- The same `INVENTORY` bucket from pages 1–4, plus the ability to inspect it as
  the `KV_INVENTORY` stream it has always been.
- A map from every KV operation to its stream mechanism: put is a message, get is
  a direct read of the last message per subject, history is messages kept per
  subject, a revision is a sequence number, a watch is a consumer.
- A clear distinction between delete (marker, history kept) and purge (rollup
  marker, history dropped), and the rule never to operate the backing stream
  directly.

The abstraction is no longer magic. It is a stream with a friendly face, and you
can see both halves.

## What is next

The last page steps back: it recaps the whole game, points you at where the
exhaustive details live, and collects every page's pitfalls into one
pre-production checklist.

Continue to [6. Where to go next](/learn/key-value/where-next).

## See also

- [Reference → Get Stream Message](/reference/jetstream/api/stream/msg-get) — the
  direct-get read path in full.
- [JetStream Deep Dive](/learn/jetstream) — the stream and consumer model this
  bucket is built on.
- [Clustering](/learn/clustering) — replicas, placement, and leader election for
  the backing stream.
