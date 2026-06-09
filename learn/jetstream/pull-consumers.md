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

## The two knobs that bound a pull

Both patterns issue the same underlying pull request, and two fields on
that request decide how much a single pull pulls:

- **batch** — the maximum number of messages this pull may return. A
  bigger batch means fewer round trips and higher throughput. A smaller
  batch means lower latency per message and less work lost if the worker
  dies mid-batch.
- **expires** — how long the server holds the pull open waiting for
  messages before it returns what it has. This is the timeout you saw in
  the fetch above. It bounds latency on a quiet stream.

Client libraries pick sensible defaults for both, and the consume
pattern keeps a batch and an expiry in flight for you, so a plain
consume loop already behaves well without tuning.

The full set of pull request fields is documented in
[Reference → Consumer API](/reference/jetstream/api/consumer/get-next).
We use only `batch` and `expires` here.

## Pitfalls

A pull is forgiving, but a few defaults bite once `shipping` carries real
order traffic. These are the ones worth knowing before you tune anything.

**An empty fetch is normal, not an error.** When no orders are waiting,
a fetch returns nothing once `expires` elapses — the server replies with
a `404 No Messages` or `408 Request Timeout` status, and every client
surfaces that as an empty batch (the CLI exits non-zero). A worker that
treats an empty fetch as a failure crashes on a quiet stream. Loop: an
empty result means "nothing right now," so wait and fetch again.

<div class="nats-example"
     data-type="learn-jetstream-pull-consumers-emptyFetch"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**A fetch with no expiry can stall.** Drop `expires` and a fetch waiting
for a batch that never fills has no ceiling — the call hangs until enough
orders arrive. Always set an expiry so a quiet stream returns control to
your loop instead of blocking it. The CLI sets one for you from
`--timeout`; in code, pass `expires` explicitly.

**`MaxAckPending` too low stalls throughput.** This is the ceiling on
un-acked messages the consumer will hand out before it waits for acks.
If you mistakenly set it well below your batch size — say a ceiling of 10
against a batch of 100 — the server delivers ten orders, then goes silent
until your worker acks, no matter how large the batch you ask for. Keep
it at or above your batch size. The default is 1000; lower it only when
you understand the in-flight count you want. The worker pool page shares
this single ceiling across every worker, so it matters even more there:
see [the worker pool page](/learn/jetstream/worker-pool).

**A batch too large blows up memory.** `batch` counts messages, not
bytes, so a big batch against large orders can pull more into memory in
one round than you expect. The Reference link below covers a companion
field, `max_bytes`, that caps the total size a pull may return —
whichever limit is hit first ends the pull.

## Where you are

You still have one stream, `ORDERS`, and one pull consumer, `shipping`.
What changed is how you drive it. You can fetch a bounded batch when your
code wants each round, or consume a continuous flow when you want a
long-running worker. Either way, you can bound a single pull with
`batch` and `expires`.

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
- [The worker pool page](/learn/jetstream/worker-pool) — sharing one
  pull consumer across many workers.
