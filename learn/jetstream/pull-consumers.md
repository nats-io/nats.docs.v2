---
id: pull-consumers
title: "Pull consumers in depth"
sidebar_position: 8
description: Fetch a batch versus consume a continuous flow, and the fields that bound each pull
---

# Pull consumers in depth

The `shipping` consumer delivers the next message to a worker when the
worker asks. That ask is a **pull**. The page that created the consumer
treated a pull as a single "give me one message."

A worker often wants more than one message at a time. It might want a
handful, process them, and come back. It might want a continuous flow
where new messages arrive as soon as they reach the stream. This page
covers both patterns and the fields that bound them.

The `shipping` consumer doesn't change. It stays a pull consumer with
explicit ack. What changes is how your code drives it.

## Two ways to pull

There are two pull patterns, and every client library names them the
same way.

**Fetch** asks for a batch of up to _N_ messages. The call returns when
the batch is full or when a timeout expires, whichever comes first. You
get a finite set of messages, you process them, and the call is done. To
keep going, you fetch again.

**Consume** sets up a continuous flow. You pass it a function. The
library sends pull requests in the background and adds new ones as
messages arrive. It calls your function for each message. It runs until
you stop it instead of returning after a batch.

Use fetch when your code wants control over each round, such as a cron
job that drains what's queued or a request handler that takes a few
messages. Use consume when you want a long-running worker that processes
messages as fast as they arrive. Most services use consume.

## Fetch a batch

A fetch names a batch size and a timeout. Here's a worker asking for up
to ten messages and waiting up to two seconds for them:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-fetchBatch"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Two outcomes are normal.

If ten messages are queued, the call returns all ten immediately. The
worker processes and acks them, then fetches again.

If only three messages are queued, the call returns those three and then
waits up to two seconds for a fourth. When the two seconds pass, it
returns the three it has. The timeout is the ceiling, so a fetch always
returns within it.

The CLI has no single batch fetch. `nats consumer next --count N`
retrieves N messages by issuing N single-message pulls in a row, each
bounded by `--timeout`, so it approximates a fetch loop rather than one
batch request:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-fetch"
     data-languages="cli"></div>

Run it twice and you walk the stream a batch at a time. The consumer's
cursor advances as messages are acked, the same way it did one message
at a time on the consumer page.

## Consume a continuous flow

A long-running worker shouldn't loop on fetch by hand. The consume
pattern does the looping for you. It keeps pull requests open so a new
message is delivered as soon as it's stored in the stream:

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-consumeContinuous"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Your function runs once per message and acks on success. The library
handles the pull requests, sends new ones as the old ones empty, and
keeps going until you stop it. Most order-processing workers use this
pattern.

## The two fields that bound a pull

Both patterns issue the same underlying pull request, and two fields on
that request decide how much a single pull returns:

- **batch**: the maximum number of messages this pull may return. A
  bigger batch means fewer round trips and higher throughput. A smaller
  batch means lower latency per message and less work lost if the worker
  dies mid-batch.
- **expires**: how long the server holds the pull open waiting for
  messages before it returns what it has. This is the timeout from the
  fetch above. It bounds latency on a quiet stream.

Client libraries set defaults for both, and the consume pattern keeps a
batch and an expiry in flight for you, so a plain consume loop behaves
well without tuning.

For the full set of pull request fields, see
[Reference → Get next message](/reference/jetstream/api/consumer/get-next).
This page uses only `batch` and `expires`.

## Pitfalls

A couple of defaults trip people up once `shipping` carries real order
traffic.

**An empty fetch is normal.** When no orders are queued, a fetch returns
nothing once `expires` elapses. The server replies with a `408 Request
Timeout` status (a no-wait fetch with no messages gets `404 No Messages`
instead), and every client reports that as an empty batch (the CLI exits
non-zero). A worker that treats an
empty fetch as a failure fails on a quiet stream. An empty result means
nothing is available right now, so keep looping: wait and fetch again.

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-emptyFetch"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**A raw fetch with no expiry can stall.** A pull request with `expires`
set to zero never times out: the server holds it until the batch fills.
Client libraries protect you from that with a default of about 30
seconds, so a fetch from client code returns control on a quiet stream
even when you don't set `expires`. Set it yourself when you want a
specific ceiling instead of relying on the default. The CLI bounds each
pull with `--timeout`.

**`MaxAckPending` set too low limits throughput.** This is the limit on
un-acked messages the consumer hands out before it waits for acks. If you
set it well below your batch size (a limit of ten against a batch of
100), the server delivers ten orders, then stops until your worker acks,
no matter how large a batch you ask for. Keep it at or above your batch
size. The default is 1000; lower it only when you know the in-flight
count you want. The worker pool shares this single limit across every
worker, so it matters even more there: see [the worker pool
page](/learn/jetstream/worker-pool).

**A batch set too large uses more memory than expected.** `batch` counts
messages, not bytes, so a large batch against large orders can pull more
into memory in one round than you expect. Most clients let you bound a
pull by total size instead — a `max_bytes` option on fetch or consume —
so you can cap memory directly; whichever limit is hit first ends the pull.

## Where you are

You still have one stream, `ORDERS`, and one pull consumer, `shipping`.
What changed is how you drive it. You can fetch a bounded batch when your
code wants each round, or consume a continuous flow when you want a
long-running worker. In both cases you bound a single pull with `batch`
and `expires`.

## What's next

The next page puts several workers on the `shipping` consumer at once
and shows the server splitting the stream between them: a pool of workers
sharing one cursor. That's also where `MaxAckPending`, the limit on
un-acked messages across the whole consumer, starts to matter, since the
pool shares one limit between every worker.

## See also

- [Reference → Get next message](/reference/jetstream/api/consumer/get-next)
  — every field of a pull request, including `no_wait` and the
  `min_pending` controls this page left out.
- [The worker pool page](/learn/jetstream/worker-pool) — sharing one
  pull consumer across many workers.
