---
id: filtering
title: "6. Filtering what you consume"
sidebar_position: 7
description: Add a second consumer that reads only orders.shipped, and see consumers as independent views
---

# 6. Filtering what you consume

The `shipping` consumer reads every message in the `ORDERS` stream. That
is the right shape for a worker that handles each order end to end.

Now a second team shows up. The analytics team only cares about one
thing: when an order ships. They have no use for `orders.created` or
`orders.cancelled`. Delivering those messages to them would be wasted
work on both sides.

This page adds a consumer that reads only `orders.shipped`. Along the
way it shows why a second consumer does not interfere with the first.

## A filter narrows what a consumer sees

A **filter** is a subject pattern attached to a consumer. The consumer
only receives messages whose subject matches the filter. Everything else
in the stream is skipped for that consumer.

The stream still captures all of `orders.>` — nothing about the stream
changes. The filter lives on the consumer, and it decides which of the
stored messages this particular consumer is allowed to see.

Create the `analytics` consumer with a filter of `orders.shipped`:

<div class="nats-example"
     data-type="learn-jetstream-filtering-createFiltered"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The new flag is `--filter`. It pins the consumer to a single subject.
A message on `orders.shipped` reaches `analytics`; a message on
`orders.created` or `orders.cancelled` does not.

Ask the server to describe what you made:

```bash
nats consumer info ORDERS analytics
```

The configuration block now carries a line the `shipping` consumer did
not have:

```
Configuration:

                Name: analytics
           Pull Mode: true
      Filter Subject: orders.shipped
          Ack Policy: Explicit
            Ack Wait: 30.00s
       Replay Policy: Instant
```

`Filter Subject: orders.shipped` is the whole point. Without a filter,
that line reads `Filter Subject: ` (empty), meaning "every subject in
the stream."

## Two consumers, two positions

Here is the part worth slowing down on. The `analytics` consumer and the
`shipping` consumer read the **same** stream, but each tracks its own
position in it.

Recall from the previous page that a consumer keeps a cursor — the
sequence number of the last message it has delivered and had
acknowledged. That cursor belongs to the consumer, not to the stream.
Two consumers on one stream have two independent cursors.

The cursor is the consumer's own bookkeeping. The server stores it
alongside the consumer's config and ack state, separate from the
stream's messages. So when `analytics` advances its cursor past
sequence `3`, nothing about `shipping`'s position changes — they are
reading the same stored bytes through two separate bookmarks.

Pull from `analytics` and watch what comes back:

```bash
nats consumer next ORDERS analytics --count 5
```

`analytics` sees only the `orders.shipped` message stored back on the
publishing page — sequence `3`. The `orders.created` messages at
sequences `1` and `2` never appear for this consumer. They are still in
the stream; they are still readable by `shipping`. The filter simply
hides them from `analytics`.

Meanwhile `shipping` is wherever you left it. Reading from `analytics`
did not move `shipping`'s cursor, and it did not consume or delete a
single message from the stream.

## A consumer is a view, not a queue drain

This is the mental model to carry forward. A consumer is an independent
**view** over the stored messages — its own filter, its own cursor, its
own ack state. The stream is the shared source of truth; each consumer
reads it on its own terms.

That independence is what makes a filter the cheap fan-out tool. Adding
`analytics` cost one command. It did not copy any data, it did not slow
down `shipping`, and it can start, stop, or fall behind without affecting
any other consumer. The server keeps one copy of each message and serves
every consumer from it.

This is a different shape from the core NATS queue group you met in Core
Concepts. A queue group splits one subject's live traffic across workers
that share the load. Here, each consumer gets its own full view of the
stored stream, filtered to what it asked for. Sharing load _within_ one
consumer is what the next page covers.

## One filter here; more in Reference

The `analytics` consumer filters on a single subject. A consumer can also
filter on several subjects at once, or rewrite subjects as it reads them.
Those are more than the running scenario needs.

The full set of consumer filtering options — multiple filter subjects and
subject transforms — is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer). We
use only a single `Filter Subject` here.

## Where you are

The `ORDERS` stream now has two consumers reading it:

- `shipping` — no filter, reads every order, the worker from the previous
  page.
- `analytics` — filtered to `orders.shipped`, sees only ships.

Both read the same stored messages. Neither one's progress affects the
other. The stream itself is untouched by either read.

## What is next

Both consumers so far have been read by a single client at a time. The
next page puts several workers behind the one `shipping` consumer and
distributes the load across them — JetStream's answer to the worker pool.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer) —
  every consumer config field, including multiple filter subjects and
  subject transforms.
- [5. Your first consumer](/learn/jetstream/your-first-consumer) — where
  the cursor and ack model this page builds on were introduced.
