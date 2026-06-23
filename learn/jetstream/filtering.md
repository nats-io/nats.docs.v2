---
id: filtering
title: "5. Filtering what you consume"
sidebar_position: 7
description: Add a second consumer that reads only orders.shipped, and see consumers as independent views
---

# 5. Filtering what you consume

The `shipping` consumer reads every message in the `ORDERS` stream,
which fits a worker that handles each order end to end.

The analytics team needs only one thing: when an order ships. They have
no use for `orders.created` or `orders.cancelled`, so delivering those
messages to them would be wasted work on both sides.

This page adds a consumer that reads only `orders.shipped`, and shows
why a second consumer doesn't interfere with the first.

## What a filter does

A **filter** is a subject pattern attached to a consumer. The consumer
receives only the messages whose subject matches the filter; the rest of
the stream is skipped.

The stream still captures all of `orders.>`; nothing about the stream
changes. The filter lives on the consumer and decides which of the
stored messages this consumer receives.

Create the `analytics` consumer with a filter of `orders.shipped`:

<div class="nats-example"
     data-type="learn-jetstream-filtering-createFiltered"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The new flag is `--filter`. It ties the consumer to a single subject.
A message on `orders.shipped` reaches `analytics`; a message on
`orders.created` or `orders.cancelled` does not.

Ask the server to describe the consumer:

```bash
nats consumer info ORDERS analytics
```

The configuration block now carries a line the `shipping` consumer
didn't have:

```
Configuration:

                Name: analytics
           Pull Mode: true
      Filter Subject: orders.shipped
          Ack Policy: Explicit
            Ack Wait: 30.00s
       Replay Policy: Instant
```

`Filter Subject: orders.shipped` is the line that matters. The
`shipping` consumer has no filter, so its info output omits this line.
No filter line means every subject in the stream.

## Two consumers with separate positions

The `analytics` consumer and the `shipping` consumer read the same
stream, but each tracks its own position in it.

From the previous page, a consumer keeps a cursor: the sequence number
of the last message it delivered and saw acknowledged. That cursor
belongs to the consumer, not to the stream. Two consumers on one stream
have two separate cursors.

The server stores the cursor alongside the consumer's config and ack
state, separate from the stream's messages. When `analytics` advances
its cursor past sequence `3`, `shipping`'s position does not change.
Both consumers read the same stored messages from their own cursor.

Pull from `analytics` and see what comes back:

```bash
nats consumer next ORDERS analytics --count 5
```

`analytics` sees only the `orders.shipped` message stored on the
publishing page, sequence `3`. The `orders.created` messages at
sequences `1` and `2` do not appear for this consumer. They are still in
the stream, and `shipping` can still read them. The filter hides them
from `analytics`.

`shipping` stays wherever you left it. Reading from `analytics` did not
move `shipping`'s cursor, and it did not consume or delete any message
from the stream.

## A consumer is a view

A consumer is an independent **view** over the stored messages, with its
own filter, cursor, and ack state. The stream holds the one shared copy
of every message, and each consumer reads it from its own position.

Because consumers are independent, a filter is a cheap way to send the
same messages to more than one reader. Adding `analytics` cost one
command. It did not copy any data, it did not slow down `shipping`, and
it can start, stop, or fall behind without affecting any other consumer.
The server keeps one copy of each message and serves every consumer from
it.

This differs from the core NATS queue group you met in Core Concepts. A
queue group splits one subject's live traffic across workers that share
the load. Here, each consumer gets its own full view of the stored
stream, filtered to what it asked for. Sharing load within one consumer
is what the next page covers.

## Other filtering options

The `analytics` consumer filters on a single subject. A consumer can also
filter on several subjects at once, or rewrite subjects as it reads them.
Those go beyond what this scenario needs.

For the full set of consumer filtering options, including multiple filter
subjects and subject transforms, see
[Reference → Consumer Configuration](/reference/jetstream/api/consumer). We
use only a single `Filter Subject` here.

## Pitfalls

A filter is a small piece of config, but a wrong one fails quietly. Watch
for these three.

**A filter that matches nothing.** The server accepts any filter subject,
even one that matches no message in the stream. A typo like
`orders.shiped` creates a valid consumer that never receives anything.
There's no error and no warning, just an empty pull. Don't assume an
empty pull means the stream is empty; first confirm the filter matches a
subject the stream actually stores.

<div class="nats-example"
     data-type="learn-jetstream-filtering-filterMatchesNothing"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

When a pull comes back empty, run `nats consumer info` and check the
`Filter Subject` line against the stream's subjects. A filter outside
`orders.>` can never match.

**Expecting a filter to delete from the stream.** A filter narrows one
consumer's view; it never removes messages. After `analytics` reads
`orders.shipped`, every `orders.created` and `orders.cancelled` message is
still stored and still readable by `shipping`. Don't use a filter to
prune a stream. What stays and what ages out is controlled by the
stream's limits, covered in [12. Shaping the stream](/learn/jetstream/shaping-the-stream),
not by any consumer.

**Overlapping filters within one consumer.** Overlap _between_ consumers
is fine: two separate consumers whose filters match the same subject each
get their own full copy of those messages. That's the kind of sharing
this page relies on, and no retention policy changes it.

Overlap _inside_ one consumer is rejected by the server. You can give a
single consumer several filter subjects. But if one of those subjects
already covers another, the create call fails. The filters on one
consumer must not overlap each other. This rule holds whether the stream
uses limits, interest, or work-queue retention. For how work-queue
retention shapes delivery once filters are in place, see
[13. Delivery semantics](/learn/jetstream/delivery-semantics).

## Where you are

The `ORDERS` stream now has two consumers reading it:

- `shipping`: no filter, reads every order; the worker from the previous
  page
- `analytics`: filtered to `orders.shipped`, sees only ships

Both read the same stored messages. Neither consumer's progress affects
the other, and the stream itself is untouched by either read.

## What's next

So far a single client at a time has read each consumer. The next page
puts several workers behind the one `shipping` consumer and distributes
the load across them, the stream-based equivalent of core NATS queue
groups.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer) —
  every consumer config field, including multiple filter subjects and
  subject transforms.
- [4. Your first consumer](/learn/jetstream/your-first-consumer) — where
  you met the cursor and ack model this page builds on.
