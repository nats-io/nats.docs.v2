---
id: message-ttl
title: "Per-message TTL"
sidebar_position: 16
description: Make a single message expire ahead of the stream's MaxAge
---

# Per-message TTL

The previous page capped `ORDERS` at a 7-day `MaxAge`. Every message in
the stream now lives the same seven days, then is removed. That's one
lifespan for the whole stream. Sometimes one message needs a different
lifespan.

## When one message should expire sooner

Consider an `orders.cancelled` message that only matters for an hour. A
service that reads from the stream has 60 minutes to react to a
cancellation. After that the message is no longer useful, and you don't
want it in the stream for the full seven days.

`MaxAge` applies one deadline to every message in the stream, so it
can't expire this one ahead of the rest.

A **per-message TTL** handles this case. TTL is short for time-to-live.
It's a lifespan attached to one message, telling the server to delete
that message after a stated time even when the stream's `MaxAge` would
keep it longer.

You set it with a header named `Nats-TTL` when you publish. The value is
a length of time: `1h`, `5s`, `30m`. The server deletes the message that
long after it was stored in the stream.

## The stream must opt in

Per-message TTL is off by default. A stream rejects a `Nats-TTL` header
until you turn the feature on.

The switch is a stream setting named `AllowMsgTTL`. Turn it on for
`ORDERS` now:

```bash
nats stream edit ORDERS --allow-msg-ttl
```

Confirm it landed:

```bash
nats stream info ORDERS
```

The settings block gains one line:

```
Allows Per-Message TTL: true
```

This switch comes with two catches.

It can't be reversed. You can turn `AllowMsgTTL` on for an existing
stream, but you can't turn it off again. The server refuses to take it
back off.

It needs server 2.11 or newer. On older servers the setting doesn't
exist and the edit has no effect. The rest of this page assumes 2.11+.

## Publish a short-lived message

With the feature on, publish an `orders.cancelled` message that expires
in 60 seconds. The TTL travels along as the `Nats-TTL` header:

<div class="nats-example"
     data-type="learn-jetstream-message-ttl-publishWithTtl"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The publish returns a normal `PubAck`. The message is stored in the
stream like any other, with a sequence number. The one difference is
that the server now holds a deletion time for it: stored time plus 60
seconds.

Right after publishing, `nats stream info ORDERS` counts the message.
Wait past the minute, ask again, and the count drops back. The message
expired on its own deadline, while every other message in `ORDERS`
keeps its full 7-day life.

## How TTL and MaxAge interact

A message lives until the *first* deadline that arrives. The per-message
TTL and the stream `MaxAge` are both deadlines, and the earlier one
wins.

For the cancellation above, the 60-second TTL arrives long before the
7-day `MaxAge`. The TTL wins, and the message expires early.

A per-message TTL only ever makes a message expire *sooner* than
`MaxAge` would, never later, with one exception covered next.

## How to make a message permanent

Sometimes a single message has to outlive everything around it: a
schema definition the rest of the stream depends on, or a baseline
snapshot you replay new consumers against. You want that one message
held past the stream's `MaxAge`, not just held a little longer.

The exact value `never` does this. A message published with
`Nats-TTL: never` never expires, not even at the stream's `MaxAge`. It
stays until something deletes it on purpose.

## Storage versus delivery

A per-message TTL decides how long a message stays *stored in the
stream*. It says nothing about whether a consumer has read the message.

This is the same split between storage and delivery from the publishing
page, seen from the other end. A short TTL puts a deadline on the stored
copy. If no consumer reads and acks the message before that deadline,
the message expires unread. The server deletes it on schedule either
way.

Size the TTL to the work. A 60-second TTL on a cancellation only makes
sense if the consumer that cares about cancellations reads within that
minute. Set the TTL shorter than the time in which the message still
matters, but long enough for a healthy consumer to keep up.

## Two ways a TTL publish can fail

The TTL has to be at least one second. The server rejects a sub-second
or zero `Nats-TTL` with an *invalid-TTL* error (`err_code` 10165) and
stores nothing. The message never lands.

A valid `Nats-TTL` on a stream that hasn't opted in fails differently.
The server rejects it with a *TTL-disabled* error (`err_code` 10166).
The result is the same: no message stored. But the cause differs, so
the two error codes are worth telling apart when you read a failed
`PubAck`.

In both cases the server never quietly drops the header. A TTL publish
either honors the TTL or returns an error.

## Pitfalls

A few ways per-message TTL goes wrong in practice.

**A TTL header on a stream that never opted in fails the publish. It
does not store the message without a TTL instead.** The server rejects
the `Nats-TTL` header with a `per-message TTL is disabled` error
(`err_code` 10166), and the publish returns no `PubAck`. The danger is
assuming the message landed with its TTL when it never landed at all.
Do check the `Allows Per-Message TTL` line in `nats stream info ORDERS`
before you rely on the header. Don't publish a TTL message and walk away
on a stream you haven't confirmed opted in.

<div class="nats-example"
     data-type="learn-jetstream-message-ttl-ttl-on-disabled-stream"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A short TTL deletes the message whether or not a consumer read it.**
The TTL is a clock on the *stored copy*, not a promise about delivery.
The clock runs on its own, no matter what any consumer is doing. If the
TTL runs out while the `shipping` consumer is down, backed up, or just
reading slowly mid-batch, the server deletes the message and nobody
processes the cancellation. A consumer that already holds a message
doesn't pause that message's TTL. Do size the TTL to outlast the lag of
your slowest healthy consumer. Don't set a TTL shorter than the time in
which the message still has to be acted on.

**Turning `AllowMsgTTL` on is a one-way door.** You can turn the feature
on with `nats stream edit ORDERS --allow-msg-ttl`, but the server
refuses to turn it back off. Do turn it on on purpose, knowing the
stream keeps the feature for life. Don't flip it on to test something
and expect to undo it.

## Where you are

`ORDERS` now has `AllowMsgTTL` turned on, a switch you can't turn back
off. You published an `orders.cancelled` message with a 60-second
`Nats-TTL` and saw it expire while the rest of the stream remained. The
earlier of TTL and `MaxAge` always wins.

The stream still holds its earlier messages under the 7-day `MaxAge`
from the previous page. Nothing else changed.

## What's next

The next page stays on your single server and covers two ways to control
what the stream holds: deleting a single message, and purging the
stream.

## See also

- [Reference → Per-Message TTL](/reference/jetstream/api/headers)
  — the `Nats-TTL` header, `SubjectDeleteMarkerTTL`, and delete markers
  in full.
- [Reference → Stream Configuration](/reference/jetstream/api/stream)
  — `AllowMsgTTL` alongside every other stream field.
