---
id: policies
title: "Stream and consumer policies"
sidebar_position: 22
description: Every stream and consumer policy in one place, what each decides, and which ones you can still change
---

# Stream and consumer policies

Much of what you configured in this chapter came down to policies. A
**policy** is a config field that takes one value from a short, fixed
list, and each policy answers one question about how the stream or the
consumer behaves. You met most of them one page at a time as the
`ORDERS` walkthrough grew; this page lines up all nine in one place.

Two things are true of every policy. Each has a default, and the
defaults are safe to start with: `ORDERS` ran for most of the chapter
without you touching them. And five of the nine are fixed the moment
the stream or consumer exists. The server refuses the update, and the
only way to change your mind is to recreate the object. The table near
the end shows which ones.

## Stream policies

Five policies shape a stream.

**Retention** decides when a message leaves the stream. `limits` keeps
messages until a cap removes them. `interest` and `workqueue` remove
messages once consumers have acked them. `ORDERS` stayed on `limits`,
and the `FULFILLMENT` work queue ran on `workqueue`. Choosing among
the three is covered on
[Retention policies](/learn/jetstream/retention-policies).

**Discard** decides what happens when a stream at its limit receives
one more message. `old` deletes the oldest messages to make room; `new`
refuses the publish. `ORDERS` kept the default, `old`;
[Shaping the stream](/learn/jetstream/shaping-the-stream) covers when
`new` is worth the rejected publishes.

**Storage** decides where messages live. `file` writes them to disk and
they survive a server restart. `memory` keeps them only in RAM: faster,
and gone on restart. The choice applies to the whole stream, replicas
included. How storage and replicas together decide what survives a
failure is covered on
[Surviving node loss](/learn/jetstream/surviving-node-loss).

**Compression** is one this chapter didn't need. Setting it to `s2`
(from the default `none`) makes a file-storage stream compress message
blocks on disk, spending CPU to cut disk usage. Repetitive payloads
such as JSON compress well; already-compressed payloads such as images
don't. Set it at creation with `--compression s2` on `nats stream add`.
Editing it later is allowed, but the new setting waits until the
stream's store restarts, on a server restart or a leader change, and
blocks already on disk stay as they are.

**Persist mode** decides when the server acknowledges a publish
relative to writing it out. By default, the message is flushed to
storage first and the `PubAck` follows. On `async`, the server
acknowledges first and flushes in the background. That buys a higher
ingest rate in exchange for a window in which a crash can lose messages
the server already acked, so it fits data that arrives in volume and
tolerates a lost tail, such as metrics — not an order log. `async` is
only accepted on a file-storage stream with a single replica, and an
`async` stream refuses the atomic batch publishing from
[Advanced publishing](/learn/jetstream/advanced-publishing).

Every stream field, with each policy's values described inline, is in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).

## Consumer policies

Four policies shape a consumer.

**Deliver policy** decides where a consumer starts reading, once, at
creation. `billing` was created with `all`, which is also the default:
start at the stream's first message. `last` starts at the newest
message and continues live. `new` delivers only messages that arrive
after the consumer is created. `by_start_sequence` and `by_start_time`
start at a sequence or a point in time (`--deliver 1000`,
`--deliver 1h` for an hour back). The remaining value,
`last_per_subject`, starts with the newest message *for each subject*
the consumer matches. That gives a latest-state view per subject, and
it's what [Key-Value](/learn/key-value) watches are built on. Don't
confuse it with the `--last-per-subject` flag of
[Reading messages directly](/learn/jetstream/get-direct). The two are
different features that share a name: one is a consumer's start
position, the other a one-shot read.

**Ack policy** decides what the server needs before it considers a
delivered message handled. `shipping` used `explicit`; the others are
`none`, `all`, and `flow_control`, covered in
[Ack responses and redelivery](/learn/jetstream/acknowledgment).

**Replay policy** decides the pace of delivery. Every consumer in this
chapter ran on the default, `instant`, which
[Reading back the stream](/learn/jetstream/reading-back) introduced:
messages arrive as fast as the reader takes them. The other value,
`original`, spaces deliveries to match the gaps between the original
timestamps. A long quiet stretch in the stream is replayed as a long
quiet wait.

**Priority policy** decides which of a consumer's clients gets served.
The default, `none`, applies no steering: pulls are served as they
come. `overflow`, `pinned_client`, and `prioritized` each steer
differently, and they're covered on
[Priority groups](/learn/jetstream/priority-groups).

The consumer fields, including the start-position options the deliver
policy uses, are in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer/create).

## What you can change later

Five of the nine policies are fixed at creation. The server enforces
this on update, so settle these before you create anything you'll keep:

| Stream policy | On a live stream |
| --- | --- |
| Retention | `limits` ↔ `interest` allowed, though the switch re-applies to messages already stored; to or from `workqueue` refused |
| Discard | Can change |
| Storage | Fixed at creation |
| Compression | Can change; takes effect after a server or leader restart |
| Persist mode | Fixed at creation |

| Consumer policy | On a live consumer |
| --- | --- |
| Deliver policy | Fixed at creation |
| Ack policy | Fixed at creation |
| Replay policy | Fixed at creation |
| Priority policy | Can change; `nats consumer edit` has no flag for it, so pass a config file with `--config` |

## Pitfalls

**Changing a fixed policy means recreating the object.** The server is
explicit about it: editing a stream's storage type fails with `stream
configuration update can not change storage type`, and updating a
consumer's start position fails with `deliver policy can not be
updated`. Recreating a stream means moving the data too. A
[mirror](/learn/jetstream/mirrors-and-sources) can copy the messages
across, but a mirror is read-only, and turning it into a publishable
replacement takes steps of its own. Recreating a consumer loses the
saved position: the new consumer starts wherever its deliver policy
says, not where the old one stopped. Do settle the fixed policies
before creating anything durable. Don't count on `nats stream edit` or
`nats consumer edit` to fix them later.

**Expecting `new` to skip the backlog on every restart.** A deliver
policy applies once, when the consumer is created. A durable created
with `new` starts with the messages that arrive after that moment, and
it keeps a saved position like any other durable. When your client
restarts and attaches to it, it resumes from that position, backlog
included. Do use `new` to define where a consumer's history begins.
Don't use it hoping each reconnect jumps to live traffic.

**Two features answer to "last per subject".** The deliver policy value
gives a consumer a standing latest-per-subject view; the Direct Get
flag fetches the same shape once, with no consumer. Do check which
feature a flag or value belongs to before copying it. Don't assume the
phrase means the same thing in both places.

## Where you are

`ORDERS` and its consumers are unchanged. You now have:

- the nine policies mapped, most to the page where you used them
- compression and persist mode placed, the two `ORDERS` never set
- the five policies that are fixed at creation, and what the server
  says when you try to change one

## What's next

That's the full policy map. [Where to go
next](/learn/jetstream/where-next) recaps the model you built and
points to the chapters that take it further.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — every stream field, its type, range, and default.
- [Reference → Consumer Configuration](/reference/jetstream/api/consumer/create)
  — every consumer field, its type, range, and default.
