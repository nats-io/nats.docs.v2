---
id: filtering
title: "Filtering what you consume"
sidebar_position: 5
description: Add a second consumer that reads only orders.shipped, and see consumers as independent views
---

# Filtering what you consume

The `billing` consumer from the previous page reads every message in
the `ORDERS` stream — no filter, the whole log.

A reporting job needs only one thing: when an order ships. It has no use for
`orders.created` or `orders.canceled`, so delivering those messages to it
would be wasted work on both sides.

This page adds a second consumer that reads only `orders.shipped`, and shows
why one consumer doesn't interfere with another.

## What a filter does

A **filter** is a subject pattern attached to a consumer. The consumer
receives only the messages whose subject matches the filter; the rest of
the stream is skipped.

The pattern can be a literal subject like `orders.shipped`, or a wildcard: a
filter of `orders.*` matches every order event, while `orders.shipped` matches
only the ships. The `*` and `>` wildcards behave exactly as they do for a
[core subscription](/learn/core-nats/subjects-and-wildcards).

The stream still captures all of `orders.>`; nothing about the stream
changes. The filter lives on the consumer and decides which of the
stored messages this consumer receives.

Create the `analytics` consumer with a filter of `orders.shipped`:

<div class="nats-example"
     data-type="learn-jetstream-filtering-createFiltered"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The new flag is `--filter`. It ties the consumer to a single filter subject.
A message on `orders.shipped` reaches `analytics`; a message on
`orders.created` or `orders.canceled` does not.

Ask the server to describe the consumer:

```bash
nats consumer info ORDERS analytics
```

The configuration block now carries a line the `billing` consumer
didn't have:

```
Configuration:

                Name: analytics
           Pull Mode: true
      Filter Subject: orders.shipped
      Deliver Policy: All
          Ack Policy: Explicit
            Ack Wait: 30.00s
       Replay Policy: Instant
     Max Ack Pending: 1,000
   Max Waiting Pulls: 512
```

`Filter Subject: orders.shipped` is the line that matters. The
`billing` consumer has no filter, so its info output omits this line.
No filter line means every subject in the stream.

## Two consumers with separate positions

The `analytics` consumer and the `billing` consumer read the same
stream, but each tracks its own position in it.

From the previous page, a consumer keeps a cursor: the sequence number
of the last message it delivered and saw acknowledged. That cursor
belongs to the consumer, not to the stream. Two consumers on one stream
have two separate cursors.

The server stores the cursor alongside the consumer's config and ack
state, separate from the stream's messages. When `analytics` advances
its cursor past sequence `3`, `billing`'s position does not change.
Both consumers read the same stored messages from their own cursor.

<div class="nats-flow" data-scenario="twoConsumersAnimated" data-width="640" data-height="300"></div>

`billing` reads every order and advances through all of them; `analytics`
delivers only the `orders.shipped` messages and skips the rest, so the two
cursors come to rest at different positions. Neither one moves the other.

Pull from `analytics` and see what comes back:

```bash
nats consumer next ORDERS analytics --count 5
```

`analytics` sees only the `orders.shipped` message stored on the
publishing page, sequence `3`. The `orders.created` messages at
sequences `1` and `2` don't appear for this consumer. They're still in the
stream; the filter just hides them from `analytics`.

`billing` stays wherever you left it. Reading from `analytics` did not
move `billing`'s cursor, and it did not consume or delete any message
from the stream.

## A consumer is a view

A consumer is an independent **view** over the stored messages, with its
own filter, cursor, and ack state. The stream holds the one shared copy
of every message, and each consumer reads it from its own position.

Because consumers are independent, a filter is a cheap way to send the
same messages to more than one reader. Adding `analytics` cost one
command. It did not copy any data, it did not slow down `billing`, and
it can start, stop, or fall behind without affecting any other consumer.
The server keeps one copy of each message and serves every consumer from
it.

This differs from the core NATS [queue group](/learn/core-nats/queue-groups)
you met in core NATS. A queue group splits one subject's live traffic across
workers that share the load. Here, each consumer gets its own full view of the
stored stream, filtered to what it asked for. Sharing load within one consumer
— the [worker-pool pattern](/learn/jetstream/worker-pool) — comes later in the
chapter.

## Other filtering options

The `analytics` consumer filters on a single subject. A consumer can also
filter on several subjects at once. That goes beyond what this scenario
needs.

For the full set of consumer filtering options, including multiple filter
subjects, see
[Reference → Create Consumer](/reference/jetstream/api/consumer/create). We
use only a single `Filter Subject` here.

## Pitfalls

A filter is a small piece of config, but a wrong one fails quietly.

**A filter that matches nothing.** The server accepts any filter subject,
even one that matches no message in the stream. A typo like
`orders.shiped` creates a valid consumer that never receives anything.
There's no error and no warning, just an empty pull. Don't assume an
empty pull means the stream is empty; first confirm the filter matches a
subject the stream actually stores.

<div class="nats-example"
     data-type="learn-jetstream-filtering-filterMatchesNothing"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

When a pull comes back empty, run `nats consumer info` and check the
`Filter Subject` line against the stream's subjects. A filter outside
`orders.>` can never match.

**Expecting a filter to delete from the stream.** A filter narrows one
consumer's view; it never removes messages. After `analytics` reads
`orders.shipped`, every `orders.created` and `orders.canceled` message is
still stored and still readable by `billing`. Don't use a filter to
prune a stream. What stays and what ages out is controlled by the
stream's limits, covered in [Shaping the stream](/learn/jetstream/shaping-the-stream),
not by any consumer.

**Overlapping filters within one consumer.** Overlap _between_ consumers
is fine on limits and interest streams: two separate consumers whose
filters match the same subject each get their own full copy of those
messages. That's the kind of sharing this page relies on. The exception
is work-queue retention, where consumers' filters must not overlap each
other. See [Retention policies](/learn/jetstream/retention-policies).

Overlap _inside_ one consumer is different. You can give a single
consumer several filter subjects, but if one of those subjects already
covers another, like `orders.>` next to `orders.shipped`, the create call
fails with `consumer subject filters cannot overlap`. Filters that only
partly overlap, where neither covers the other, are accepted.

## Where you are

The `ORDERS` stream now has two consumers reading it:

- `billing`: no filter, reads every order; the reader from the previous
  page
- `analytics`: filtered to `orders.shipped`, sees only ships

Both read the same stored messages. Neither consumer's progress affects
the other, and the stream itself is untouched by either read.

## What's next

Both `billing` and `analytics` read on the happy path: pull a message,
ack it, move on. The next page is about what that acknowledgment actually
does — how a message is held in flight until it's confirmed, what a double
ack adds, and how an unacked message is redelivered.

## See also

- [Reference → Create Consumer](/reference/jetstream/api/consumer/create) —
  every consumer config field, including multiple filter subjects.
- [Reading back the stream](/learn/jetstream/reading-back) — where you met
  the consumer cursor this page builds on.
