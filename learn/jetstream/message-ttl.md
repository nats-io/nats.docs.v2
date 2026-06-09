---
id: message-ttl
title: "15. Per-message TTL"
sidebar_position: 16
description: Make a single message expire ahead of the stream's MaxAge
---

# 15. Per-message TTL

The previous page capped `ORDERS` at a 7-day `MaxAge`. Every message in
the stream now lives the same seven days, then ages out.

That is one age for the whole stream. Sometimes one message needs a
different age.

## When one message should expire sooner

Picture an `orders.cancelled` message that only matters for an hour. A
downstream service has 60 minutes to react to a cancellation; after
that the message is noise. You do not want it sitting in the stream for
the full seven days.

`MaxAge` cannot express that. It is a single number that applies to
every message the same way.

A **per-message TTL** is the answer. It is a time-to-live attached to
one message, telling the server to delete that message after a stated
duration even when the stream's `MaxAge` would keep it longer.

You set it with a header named `Nats-TTL` at publish time. The value is
a duration: `1h`, `5s`, `30m`. The server deletes the message that long
after it was stored in the stream.

## The stream must opt in

Per-message TTL is off by default. A stream rejects a `Nats-TTL` header
until you turn the feature on.

The switch is a stream configuration field named `AllowMsgTTL`. Enable
it on `ORDERS` now:

```bash
nats stream edit ORDERS --allow-msg-ttl
```

Confirm it landed:

```bash
nats stream info ORDERS
```

The configuration block gains one line:

```
Allows Per-Message TTL: true
```

Two notes on this switch.

It is a one-way door. You can enable `AllowMsgTTL` on an existing
stream, but you cannot disable it again. The server refuses the
downgrade.

It needs server 2.11 or newer. On older servers the field does not
exist and the edit has no effect. The rest of this page assumes 2.11+.

## Publish a short-lived message

With the feature on, publish an `orders.cancelled` message that expires
in 60 seconds. The TTL rides along as the `Nats-TTL` header:

<div class="nats-example"
     data-type="learn-jetstream-message-ttl-publishWithTtl"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The publish returns a normal `PubAck` — the message is stored in the
stream like any other, with a sequence number. The only difference is
that the server now holds a deletion deadline for it: stored time plus
60 seconds.

Watch it go. Right after publishing, `nats stream info ORDERS` counts
the message. Wait past the minute, ask again, and the count drops back.
The message aged out on its own schedule, while every other message in
`ORDERS` keeps its full 7-day life.

## How TTL and MaxAge interact

A message lives until the *first* deadline that fires. The per-message
TTL and the stream `MaxAge` are both deadlines, and the earlier one
wins.

For the cancellation above, the 60-second TTL fires long before the
7-day `MaxAge`. The TTL wins, the message goes early.

The reverse never happens by accident: a per-message TTL only ever
makes a message expire *sooner* than `MaxAge` would, never later — with
one explicit exception.

That exception is the literal value `never`. A message published with
`Nats-TTL: never` is exempt from expiration, including the stream's
`MaxAge`. It stays until something deletes it by hand. Use it for the
rare message that must outlive everything around it — a schema
definition, a baseline snapshot.

## TTL is about storage, not delivery

A per-message TTL decides how long a message stays *stored in the
stream*. It says nothing about whether a consumer has read the message.

This is the same "stored is not delivered" split from the publishing
page, seen from the other end. A short TTL puts a clock on the stored
copy. If no consumer reads and acks the message before that clock runs
out, the message expires unread — the server deletes it on schedule
regardless.

Size the TTL to the work, then. A 60-second TTL on a cancellation only
makes sense if the consumer that cares about cancellations reads within
that minute. Set the TTL shorter than the window in which the message
still matters, but long enough for a healthy consumer to keep up.

## A few rules worth knowing up front

The duration has a floor. The smallest valid `Nats-TTL` is one second.
A sub-second value, or a literal `0`, is rejected, and the publish
fails with an invalid-TTL error instead of being stored.

A `Nats-TTL` header on a stream that has not opted in is also rejected,
with a TTL-disabled error. The header is never silently ignored — a
publish either honors the TTL or fails loudly.

The full set of TTL behavior — the `SubjectDeleteMarkerTTL` setting,
the delete markers the server leaves behind when a TTL empties a
subject, and the exact header semantics — is documented in
[Reference → Per-Message TTL](/reference/jetstream/api/headers). We
use only `AllowMsgTTL` and the `Nats-TTL` header here.

## Pitfalls

A few ways per-message TTL bites in practice.

**A TTL header on a stream that never opted in fails the publish — it
does not store the message untimed.** The server rejects the
`Nats-TTL` header with a `per-message TTL is disabled` error
(`err_code` 10166), and the publish returns no `PubAck`. The danger is
assuming the message landed with its TTL when it never landed at all.
Do check the `Allows Per-Message TTL` line in `nats stream info ORDERS`
before you rely on the header; do not treat a TTL publish as
fire-and-forget on a stream you have not confirmed opted in.

<div class="nats-example"
     data-type="learn-jetstream-message-ttl-ttl-on-disabled-stream"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A short TTL deletes the message whether or not a consumer read it.**
The TTL is a clock on the *stored copy*, not a delivery guarantee. If
the `shipping` consumer is down or backed up when a 60-second
`orders.cancelled` TTL fires, the server deletes the message unread and
nobody ever processes the cancellation. Do size the TTL to outlast the
slowest healthy consumer's lag; do not set a TTL shorter than the
window in which the message still has to be acted on.

**Enabling `AllowMsgTTL` leaves no trace when a TTL empties a
subject — delete markers are a second, separate opt-in.** With only
`AllowMsgTTL` on, an expired last-value-for-a-subject simply vanishes;
a watcher sees no signal that it went. Delete markers fix that, but
they need `SubjectDeleteMarkerTTL` set too — and once set, that value
becomes a *floor*: a per-message `Nats-TTL` below it is silently raised
to the floor, not rejected. Do set `--subject-del-markers-ttl` only
when downstream consumers must learn that a value expired, and keep it
at or below your shortest intended per-message TTL. The markers
themselves are documented in
[Reference → Per-Message TTL](/reference/jetstream/api/headers).

## Where you are

`ORDERS` now has `AllowMsgTTL` enabled — a switch you cannot turn back
off. You published an `orders.cancelled` message with a 60-second
`Nats-TTL`, watched it expire while the rest of the stream lived on, and
learned that the earlier of TTL and `MaxAge` always wins.

The stream still holds its earlier messages under the 7-day `MaxAge`
from the previous page. Nothing else changed.

## What is next

The next page steps up from a single server to a cluster, and what it
means for the stream to survive losing a node.

## See also

- [Reference → Per-Message TTL](/reference/jetstream/api/headers)
  — the `Nats-TTL` header, `SubjectDeleteMarkerTTL`, and delete markers
  in full.
- [Reference → Stream Configuration](/reference/jetstream/api/stream)
  — `AllowMsgTTL` alongside every other stream field.
