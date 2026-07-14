---
id: where-next
title: "Where to go next"
sidebar_position: 7
description: Recap the key-value mental model and point to what comes after this chapter
---

# Where to go next

This chapter began with a JetStream stream and the claim that NATS
gives you a key-value store on top of it. By the end you have an `INVENTORY`
bucket: keys that are SKUs, values that are stock counts, a warehouse
dashboard watching for changes, safe decrements through compare-and-swap,
a key that expires on its own, and a clear view of the stream underneath.
That covers the chapter.

This page collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The key-value to JetStream mapping

Every page in this chapter came back to the same idea: a bucket is a stream
with a key-value interface over it. The point to remember is how the
key-value words map onto the JetStream words.

A **bucket** is a stream. When you create `INVENTORY` you create a stream
named `KV_INVENTORY` on the subjects `$KV.INVENTORY.>`. Every bucket limit
you set (history depth, max bytes, max value size) is a stream limit.

A **key** is a subject token. The key `widget-blue` is the last token of
the subject `$KV.INVENTORY.widget-blue`. A watch's key filter is a subject
filter, where `*` matches one whole token.

A **put** is a message. Each value you put is one message appended to the
stream; a **get** reads the last message for that subject.

A **revision** is a sequence number. Each put bumps the key's revision
because each message lands at the next sequence in the stream. History is
the prior messages the stream still holds for that subject.

A **watch** is a consumer. It's an ephemeral, ordered consumer that
replays the current value of every matching key, then streams live
changes.

In short: a bucket is a stream, a key is a subject, a put is a message, a
revision is a sequence, and a watch is a consumer. Everything else in this
chapter is a refinement of that mapping.

## Where the details live now

The chapter is unversioned and concept-first. The exact flags, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise type of a config field or the full list of bucket
options, that's where to look.

Because a bucket is created as a stream, the authoritative knob list is
the stream-create reference. The full set of bucket configuration options
is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create), and
the direct read path you met under the hood lives in
[Reference → Get Stream Message](/reference/jetstream/api/stream/msg-get).

## Sibling deep dives

Key-value sits on the JetStream foundation, so the stream model carries
straight into the chapters around it.

The [JetStream deep dive](/learn/jetstream) is the chapter underneath this
one. Every time this chapter said "that is a stream limit" or "a watch is
a consumer," that's where the mechanism is taught in full:
[why a stream](/learn/jetstream/your-first-stream#why-a-stream),
[retention policies](/learn/jetstream/retention-policies), and the
[per-message TTL](/learn/jetstream/message-ttl) that per-key TTL rides on.

The [Object Store deep dive](/learn/object-store) is the next step when a
value outgrows the bucket. Key-value values are small and capped; the
object store is built for large values, reassembled from multiple
messages on read. If you need to keep a file, a build artifact, or
something multi-megabyte, start with
[your first object](/learn/object-store/your-first-object).

The [Clustering & Replication deep dive](/learn/clustering) is where the
`Replicas` field you saw named under the hood takes effect. It covers how
a bucket survives node loss and explains the replication mechanics behind
that field in full.

There's one more direction worth mentioning. A bucket can be sourced from
or mirrored into another bucket: a regional `EU_INVENTORY` bucket could
source from `INVENTORY` so both hold the same keys, kept in sync by a
subject transform from `$KV.SRC.>` to `$KV.DST.>`. The chapter doesn't
build it, because the mechanism is the JetStream one; see
[mirrors and sources](/learn/jetstream/mirrors-and-sources).

## Where you are

This is the end of the chapter. The whole arc is complete, and this page
adds no new scenario state. The `INVENTORY` bucket, its watcher,
its history, and the `flash-sale` key are still in your session exactly as
you left them under the hood. You can keep experimenting with them, or
tear the bucket down with `nats kv rm INVENTORY` when you're done.

You have the core model: a bucket is a stream, a key is a subject token, a
put is a message, a revision is a sequence, and a watch is a consumer.
That mapping is the basis for every key-value feature you'll meet.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place, as a last pass before you
use a bucket for real inventory. Each group links back to the page that
explains the why.

### Your first bucket — see [Pitfalls](/learn/key-value/your-first-bucket#pitfalls)

- [ ] Check that an entry exists before reading its value; a key-not-found isn't the same as an empty value, and reading the value of a missing entry trips up.
- [ ] Keep bucket names to alphanumerics, dashes, and underscores; the server rejects anything else.
- [ ] Keep keys to alphanumerics and `-/_=.` with no leading or trailing dot; an order id with a `:` or a leading dot is rejected as a key.

### Watching — see [Pitfalls](/learn/key-value/watching#pitfalls)

- [ ] Consume the end-of-initial-data nil entry; ignoring it or stopping the loop at the snapshot boundary misses every live update.
- [ ] Treat a watch as live state, not a query; it's an ephemeral consumer that ends with the process, so use get or history for a point read.

### History and revisions — see [Pitfalls](/learn/key-value/history-and-revisions#pitfalls)

- [ ] Wrap every update in a re-get-and-retry loop; an update on a stale revision is rejected, not queued, and a missing retry loses the write.
- [ ] Reach for update (compare-and-swap), not put, for any read-modify-write like a decrement; an unconditional put clobbers a concurrent write.

### TTL and limits — see [Pitfalls](/learn/key-value/ttl-and-limits#pitfalls)

- [ ] Set a per-key TTL at create time only; passing a TTL to put or update does not change it, so delete then create to change a key's TTL.
- [ ] Size the bucket for the working set, not the average; a bucket at its byte limit rejects the next put with an error instead of making room by dropping old values.

### Under the hood — see [Pitfalls](/learn/key-value/under-the-hood#pitfalls)

- [ ] Reach for purge, not delete, when you must actually drop prior revisions; delete leaves a marker and keeps history.
- [ ] Use the key-value API, never raw `nats pub` to `$KV.INVENTORY.>` or hand edits to the `KV_INVENTORY` config; the backing stream is managed and the rollup and marker headers must stay correct.
- [ ] Keep keys to legal subject tokens, since a key becomes the last token of `$KV.INVENTORY.<key>`; a name with a `:` or two dots in a row is rejected.

## See also

- [Reference](/reference/) — every config field, flag, default, and
  error code, versioned and exhaustive.
- [Object Store deep dive](/learn/object-store) — the next chapter, for
  values too large for a bucket.
- [JetStream deep dive](/learn/jetstream) — the stream foundation every
  key-value feature rests on.
