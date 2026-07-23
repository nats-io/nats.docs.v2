---
id: get-direct
title: "Reading messages directly"
sidebar_position: 19
description: Get one message or a bounded batch straight from the stream with Direct Get — no consumer, served by any replica
---

# Reading messages directly

[Reading back the stream](/learn/jetstream/reading-back) built a consumer to
walk the whole log in order. That's the right tool when a reader works through
every message and keeps its place between runs. Some reads need less than that:
one message by its sequence, or the latest order on a subject, with no consumer
to create and no position to track.

JetStream has a lighter read for those. You ask the stream for a message and the
server returns it straight from the store.

## Get one message

Every stored message has a sequence number, the one the `PubAck` returned when
you published it. Give the server that number and it hands the message back:

<div class="nats-example"
     data-type="learn-jetstream-get-direct-by-sequence"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

```
Item: ORDERS#2 received 2026-05-22 10:14:25 +0000 UTC (36h2m11s) on Subject orders.created

{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}
```

More often you don't have the sequence; you have the subject and want its most
recent message. `--last-for` returns the last message stored on a subject:

<div class="nats-example"
     data-type="learn-jetstream-get-direct-last-for-subject"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

```
Item: ORDERS#3 received 2026-05-22 10:14:31 +0000 UTC (36h2m05s) on Subject orders.shipped

{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}
```

This is the read a key-value lookup is built on. A KV bucket is a stream keyed
by subject, and "get the value for this key" is "get the last message on this
subject." The [Key-Value deep dive](/learn/key-value) uses exactly this read
underneath.

Both forms ask the stream's leader, the one server that holds the latest write,
so a `nats stream get` right after a publish always sees it.

## Direct Get reads from any replica

`nats stream get` goes to the leader. That's fine for the occasional lookup. For
a read you run often, or from far away, JetStream offers **Direct Get**: the same
by-sequence and by-subject reads, answered by *any* server that holds a copy of
the stream, not only the leader.

<div class="nats-flow" data-scenario="directGetAnimated" data-width="680" data-height="300"></div>

Direct Get is the stream's `allow_direct` setting. Check it with `nats stream info ORDERS`:
its output carries a `Direct Get: true` line when the setting is on, and no such
line when it's off. The CLI enables it for new streams, so `ORDERS` already has
it — turn it on for a stream that doesn't:

<div class="nats-example"
     data-type="learn-jetstream-get-direct-enable"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

With it on, read directly with the Direct Get API. This fetches the message at
sequence 1 from any replica that holds it, not just the leader:

<div class="nats-example"
     data-type="learn-jetstream-get-direct-direct-read"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

```
Subscribing to JetStream Stream (direct) holding messages with subject orders.> starting with sequence 1
[#1] Received JetStream message (direct): stream: ORDERS seq 1 / subject: orders.created / time: 2026-05-22 10:14:22
```

The `(direct)` marks the path: the message came from a server's local store over
the Direct Get API, not from the leader through the regular read. On a replicated
stream that spreads read load across the servers, and when a mirror stream sets
`mirror_direct`, the mirror's servers also answer Direct Get requests for the
origin, so a reader can be served by a nearby
[mirror](/learn/jetstream/mirrors-and-sources) instead of the origin.

The trade-off is freshness. A replica or mirror can sit a moment behind the
leader, so Direct Get is **not read-after-write coherent**: a message you just
published might not show up on a direct read for a beat, where `nats stream get`
against the leader always sees it. For a latest-value lookup that tolerates being
a little stale — a cache, a dashboard — that's a fair trade for spreading the
load. When you must see your own most recent write, read the leader with
`nats stream get`.

## Get a batch in one request

A single request can return more than one message. Ask Direct Get for a range and
the server streams the matching messages back over one request, instead of a round
trip each. This reads three messages starting at sequence 1:

<div class="nats-example"
     data-type="learn-jetstream-get-direct-batch-get"
     data-languages="cli,js,go,java,rust,csharp"></div>

Each message carries a `Nats-Num-Pending` header counting how many still match
after it, so the client knows when the batch is complete — the count reaches `0`
on the last message:

```
[#1] ... seq 1 ...   Nats-Num-Pending: 2
[#2] ... seq 2 ...   Nats-Num-Pending: 1
[#3] ... seq 3 ...   Nats-Num-Pending: 0
```

<div class="nats-flow" data-scenario="batchGetAnimated" data-width="680" data-height="300"></div>

That makes Direct Get a cheap way to pull a slice of the log without standing up
a consumer: a range from a sequence, the latest message on each of several
subjects (`--last-per-subject`), or a point-in-time snapshot across subjects. A
batch is bounded by a count or a byte budget; the request fields (`batch`,
`max_bytes`, `multi_last`) are in the
[reference](/reference/jetstream/api/stream/msg-get). `nats.js` sends a batched
Direct Get directly; Go, Rust, Java, and C# reach it through the
[Synadia Orbit](https://github.com/synadia-io) helper libraries.

A batch read is still a one-shot snapshot, not a subscription. It returns what's
stored when you ask and stops. To keep receiving new orders as they arrive, that's
a consumer's job.

## Direct Get or a consumer?

Both read a stream; they answer different needs.

- Reach for **Direct Get** (or `nats stream get`) for a point read: one message
  by sequence, the latest value on a subject, or a bounded batch snapshot.
  Nothing is acked, no position is kept, and any replica can answer.
- Reach for a **[consumer](/learn/jetstream/reading-back)** to work through the
  log: read every message in order, keep a durable position across restarts, ack
  as you go, and pick up new messages as they're published.

A direct read never moves a consumer's position and never removes a message. It
only reads what's stored.

## Pitfalls

A direct read is simple, but a few assumptions trip people up.

**Direct Get is off, so the read hangs.** If `allow_direct` isn't set, no server
answers the Direct Get subject and the request times out with nothing returned.
Check `nats stream info` for `Direct Get: true`, or set it with `nats stream edit
ORDERS --allow-direct`, before you point a direct reader at a stream.

**A direct read can be stale.** Direct Get answers from any replica or mirror,
which may trail the leader. Don't use it for read-after-write checks — confirming
a publish landed, reading a value you wrote a moment ago. Use `nats stream get`
against the leader for those, and keep Direct Get for high-volume or far-away
reads that tolerate a little lag.

**A batch isn't a subscription.** A direct batch returns the stored messages that
match and stops. Code that expects to keep receiving new messages from it reads
the backlog once and then sits idle. Use a consumer when you need to follow the
stream as it grows.

## Where you are

`ORDERS` is unchanged. You now have a second way to read it, alongside the
consumer from [reading back](/learn/jetstream/reading-back):

- `nats stream get` for one message, by sequence or by the last on a subject,
  answered by the leader and always current.
- **Direct Get** (`--direct`) for the same reads answered by any replica or
  mirror, and for pulling a bounded batch in one request — at the cost of
  read-after-write freshness.
- The split between a point read (Direct Get) and working through the log (a
  consumer).

## What's next

You've read messages by sequence and by subject. The next page changes the
subjects themselves: [subject mapping](/learn/jetstream/subject-mapping) rewrites
a message's subject on the way into a stream and on the way back out.

## See also

- [ADR-31: JetStream Direct Get](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-31.md)
  — the authoritative spec for `allow_direct`, the by-sequence, by-subject, batch,
  and multi-subject request forms, and the response headers.
- [Reference → Stream Configuration](/reference/jetstream/api/stream/create) —
  the `allow_direct` and `mirror_direct` fields alongside every other stream
  setting.
- [Reading back the stream](/learn/jetstream/reading-back) — the durable consumer
  that walks the whole log and keeps its place.
- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — mirrors that can
  answer Direct Get reads near a client.
