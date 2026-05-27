---
id: pull-consumers
title: "8. Pull consumers in depth"
sidebar_position: 9
description: Fetch a batch versus consume a continuous flow, and the knobs that bound each pull
---

# 8. Pull consumers in depth

The `shipping` consumer has been doing one thing: hand a worker the next
message when it asks. That ask is a **pull**. So far the page that
created the consumer treated a pull as a single, atomic "give me one
message."

A real worker rarely wants exactly one message at a time. Sometimes it
wants a handful, processes them, and comes back. Sometimes it wants a
never-ending flow with new messages arriving the moment they land in the
stream. This page covers both shapes and the knobs that bound them.

Nothing about the `shipping` consumer changes. It stays a pull consumer
with explicit ack. What changes is how your code drives it.

## Two ways to pull

There are two pull patterns, and every client library names them the
same way.

**Fetch** asks for a batch of up to _N_ messages, right now. The call
returns when the batch is full or when a timeout expires, whichever
comes first. You get a finite set of messages, you process them, and
the call is done. To keep going, you fetch again.

**Consume** sets up a continuous flow. You hand it a function, and the
library issues pull requests in the background, replenishing them as
messages arrive, calling your function for each message. It does not
return after a batch — it runs until you stop it.

The rule of thumb: reach for **fetch** when your code wants control over
each round (a cron job that drains what is waiting, a request handler
that grabs a few messages). Reach for **consume** when you want a
long-running worker that processes messages as fast as they arrive. Most
services want consume.

## Fetch a batch

A fetch names a batch size and a timeout. Here is a worker asking for up
to ten messages, willing to wait two seconds for them to show up:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-fetchBatch"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Two outcomes are normal.

If ten messages are waiting, the call returns all ten immediately. The
worker processes and acks them, then fetches again.

If only three messages are waiting, the call returns those three and
then keeps waiting up to two seconds for a fourth. When the two seconds
pass, it returns the three it has. A fetch never blocks forever — the
timeout is the ceiling.

From the CLI, `nats consumer next` is a single fetch. The `--count` flag
is the batch size:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-fetch"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Run it twice and you walk the stream a batch at a time. The consumer's
cursor advances as messages are acked, exactly as it did one message at
a time on the consumer page.

## Consume a continuous flow

A long-running worker should not loop on fetch by hand. The consume
pattern does the looping for you, keeping pull requests in flight so a
new message is delivered the instant it is stored in the stream:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-consumeContinuous"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Your function runs once per message. It acks on success. The library
handles the pull requests, refills them as they drain, and keeps going
until you stop it. This is the shape most order-processing workers want.

## The knobs that bound a pull

Both patterns issue the same underlying pull request, and that request
carries a few fields that bound how much a single pull pulls. You rarely
set all of them, but knowing the four that matter keeps throughput and
latency predictable.

- **batch** — the maximum number of messages this pull may return. A
  bigger batch means fewer round trips and higher throughput. A smaller
  batch means lower latency per message and less work lost if the worker
  dies mid-batch.
- **expires** — how long the server holds the pull open waiting for
  messages before it returns what it has. This is the timeout you saw in
  the fetch above. It bounds latency on a quiet stream.
- **max_bytes** — a cap on the total bytes a pull may return, applied
  alongside `batch`. Whichever limit is hit first ends the pull. Useful
  when message sizes vary and you care about memory per round, not just
  message count.
- **idle_heartbeat** — when the stream is quiet and the server has
  nothing to deliver, it emits an empty heartbeat message at this
  interval. The client uses the heartbeats to tell "no messages yet"
  apart from "the connection died." Miss several in a row and the client
  knows the pull has stalled.

Client libraries pick sensible defaults for all four. The consume
pattern in particular sets a batch, an expiry, and a heartbeat for you,
so a plain consume loop already behaves well without tuning.

The full set of pull request fields is documented in
[Reference → Consumer API](/reference/jetstream/api/consumer/get-next).
We use only `batch`, `expires`, `max_bytes`, and `idle_heartbeat` here.

## Where you are

You still have one stream, `ORDERS`, and one pull consumer, `shipping`.
What changed is how you drive it. You can fetch a bounded batch when your
code wants each round, or consume a continuous flow when you want a
long-running worker. Either way, you can bound a single pull with
`batch`, `expires`, `max_bytes`, and `idle_heartbeat`.

## What is next

The next page puts several workers on the `shipping` consumer at once
and watches the server split the stream between them — a pool of
workers sharing one cursor. That is also where `MaxAckPending`, the
ceiling on un-acked messages across the whole consumer, starts to
matter, since the pool shares one ceiling between every worker.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer/get-next)
  — every field of a pull request, including `no_wait` and the
  `min_pending` controls this page left out.
- [9. A pool of workers](/learn/jetstream/worker-pool) — sharing one
  pull consumer across many workers.
