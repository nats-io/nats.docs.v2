---
id: publishing
title: 3. Publishing
sidebar_position: 4
description: Publish into a stream and understand the PubAck contract
---

# 3. Publishing

The `ORDERS` stream is empty. Time to put something in it.

This page does three things. It publishes a message. It looks at what
the server returns, because publishing into a stream is not
fire-and-forget. And it shows how to make publishing idempotent so a
retry does not store the same message twice.

## Publish from the CLI

Start in the terminal. Use `nats pub` exactly as you would for core
NATS:

```bash
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

There is nothing JetStream-specific about that line. The publisher
does not know or care that a stream is capturing the subject.

What is different is what the server does next. Because the `ORDERS`
stream captures `orders.>`, the message is appended to the stream and
given a sequence number. Confirm it:

```bash
nats stream info ORDERS
```

The `State` block now shows one message:

```
State:

             Messages: 1
                Bytes: 153 B
        First Sequence: 1 @ 2026-05-22T10:14:22Z
         Last Sequence: 1 @ 2026-05-22T10:14:22Z
        Active Consumers: 0
```

Sequence numbers start at `1` and never restart, never repeat, never
go backwards. The stream is an append-only log.

Publish two more messages so the stream has something to work with:

```bash
nats pub orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}'
```

`nats stream info ORDERS` now reports `Messages: 3`, last sequence
`3`. The stream is the running record of what happened.

## Publishing from a client library

`nats pub` is convenient but it is not what your production code
does. A client library publishes through the same wire protocol and
gets back a `PubAck` — a small reply from the server confirming that
the message was stored. The `PubAck` is the central artifact of
JetStream publishing, and the next section is about reading it.

This is the same three publishes as above, run from a client library:

<div class="nats-example"
     data-type="learn-jetstream-publishing-sync"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Two things to notice in any of those snippets:

1. You publish to a subject. You do not name the stream. The server
   figures out which stream captures the subject and stores the
   message there. Your code does not have to know which stream is
   bound to what.
2. The publish call returns a `PubAck`, not `void`. That return
   value is the proof that the message landed in a stream. We look
   at it next.

## What a PubAck tells you

A `PubAck` carries three useful pieces of information:

- **stream** — which stream stored the message. Helpful in tests and
  in logs; in normal code you already know.
- **sequence** — the sequence number the stream assigned. This is the
  value you see in `nats stream info`. If you store it alongside the
  business record, you can later replay starting from there.
- **duplicate** — `false` for a fresh write, `true` if the server
  recognized this message as a repeat. The next section explains how
  duplicate detection works.

Here is the same publish, now reading the `PubAck` back:

<div class="nats-example"
     data-type="learn-jetstream-publishing-pubAck"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The contract is: **a publish that does not return a `PubAck` did not
land in the stream.** A network timeout, a server error, a stream
that does not capture the subject — all of those surface as a failed
publish, never as a silent loss. Treat a failed `PubAck` the way you
would treat a failed write to a database: retry, or fail the caller.

## Stored is not delivered

A `PubAck` confirms that the server stored the message. It does
**not** mean any consumer has received it.

This is worth slowing down on. In core NATS, "the message was
delivered" and "the publisher's send completed" happen close enough
in time that people often conflate them. In JetStream they are
separate events:

1. The publisher publishes. The server stores the message and
   returns a `PubAck`.
2. _Some time later — minutes, hours, days_ — a consumer reads the
   message.
3. _After processing_ the consumer acknowledges it. Only at this
   point is the message considered handled.

The whole rest of this chapter is about step 2 and step 3. The point
of this page is just: step 1 is now done.

## Idempotent publishing

A real publisher retries on transient failures. Network hiccups,
broker reconnections, timeouts — code retries the publish. Without
help, that retry stores the same message twice.

JetStream offers help. If the publish carries a `Nats-Msg-Id` header,
the server keeps track of recently-seen IDs and refuses to store the
same one twice. "Recently" means inside the **duplicate tracking
window**, which is two minutes by default — you saw it in the stream
config on the previous page.

From the CLI you set the header with `--header`:

```bash
nats pub orders.created \
  --header "Nats-Msg-Id:ord_8w2k-created" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

Run that command twice. The first publish stores a new message. The
second one returns a `PubAck` with `duplicate: true`, and the stream
sequence does not advance.

The same flag, from a client library:

<div class="nats-example"
     data-type="learn-jetstream-publishing-dedup"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

A safe rule: every retryable publish has a `Nats-Msg-Id`. The ID
should be a stable identifier the producer can recompute — an order
ID, a request ID, a hash of the payload. With that in place, retries
are safe.

The full set of publish-related headers is documented in
[Reference → JetStream Headers](/reference/jetstream/api/headers). We
use only `Nats-Msg-Id` here.

## What we have skipped

A few things this page deliberately did not cover, kept for later or
for Reference:

- **Async publish.** Most client libraries can fire many publishes
  and collect `PubAcks` together for throughput. The mechanics
  differ by language but the contract is the same: a `PubAck` per
  message, eventually. See your client's reference.
- **Expected-stream and expected-sequence headers.** A publish can
  refuse to land unless the stream is in a specific state — useful
  for optimistic concurrency. Documented in
  [Reference → JetStream Headers](/reference/jetstream/api/headers).
- **Batch publish.** A way to land several messages atomically. Newer
  servers only; see the same reference page.

## Where you are

The `ORDERS` stream now has three messages. The publisher confirmed
each one with a `PubAck`. A duplicate publish is no longer a worry.

No consumer has read anything yet — those messages are sitting in
the stream, waiting. The next page is how you read them back.

## See also

- [Reference → JetStream Headers](/reference/jetstream/api/headers) —
  every JetStream publish-side header, including dedup, expected
  state, and batch.
- [Reference → Publish Acknowledgement](/reference/jetstream/api/stream/pub-ack)
  — the exact fields returned by every publish.
