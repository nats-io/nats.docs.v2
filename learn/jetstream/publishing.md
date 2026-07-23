---
id: publishing
title: Publishing
sidebar_position: 3
description: Publish into a stream and understand the PubAck contract
---

# Publishing

The `ORDERS` stream is empty. This page puts messages into it. Publishing
into a stream works like a normal NATS publish, with one difference: the
server sends back a confirmation that it stored the message. This page
covers that confirmation, called a `PubAck`, and how to make a publish
safe to retry.

<div class="nats-flow" data-scenario="publishAckAnimated" data-width="600" data-height="320"></div>

## Publish from the CLI

Start in the terminal. A plain `nats pub` is a core NATS publish: the
client sends the message and the server returns nothing. When you publish
into a stream you usually want a confirmation, so add the `--jetstream`
flag:

```bash
nats pub --jetstream orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

The server appends the message to `ORDERS` (the stream captures
`orders.>`) and replies on the same call:

```text
Stored in Stream: ORDERS Sequence: 1
```

That reply is the `PubAck`. It contains the name of the stream that
stored the message and the sequence number the stream gave it. Sequence
numbers start at `1` and only increase. The server gives each new message
the next number and never reuses one.

Publish two more messages so the stream has some content. Each one is
acknowledged with the next sequence number, `2` and then `3`:

```bash
nats pub --jetstream orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub --jetstream orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}'
```

You can check the whole stream with `nats stream info ORDERS`. It now
reports three messages:

```text
State:

                     Messages: 3
                        Bytes: 404 B
               First Sequence: 1 @ 2026-05-22 10:14:22
                Last Sequence: 3 @ 2026-05-22 10:14:31
             Active Consumers: 0
           Number of Subjects: 2
```

You didn't have to run that command to know the writes succeeded. Each
publish already reported its sequence number when it returned.

## Publish from a client library

On the CLI, the `PubAck` is printed to the screen. In application code it
is a return value: the same confirmation from the server, as an object
your program can read. The `PubAck` is the main thing you work with when
publishing to JetStream, and the next section covers what it contains.

Here are the same three publishes from a client library:

<div class="nats-example"
     data-type="learn-jetstream-publishing-sync"
     data-languages="js,go,python,java,rust,csharp,c"></div>

Two details show up in every one of these snippets:

1. You publish to a subject, not to a stream. The server finds the stream
   that captures the subject and stores the message there. Your code
   doesn't need to know which stream is bound to which subject.
2. The publish call returns a `PubAck` instead of nothing. That return
   value is how you know the message reached a stream. The next section
   reads it.

## What a PubAck contains

A `PubAck` has three fields you use regularly:

- **stream**: the stream that stored the message. Useful in tests and
  logs; in normal code you already know it.
- **sequence**: the sequence number the stream gave the message. It's the
  number shown by `nats stream info`. If you save it next to your business
  record, you can replay the stream from that point later.
- **duplicate**: `false` for a new message, `true` if the server
  recognized the message as a repeat. Duplicate detection is covered in
  [Avoiding duplicate writes](#avoiding-duplicate-writes) below.

A `PubAck` can also include a few situational fields, such as a `domain`
for multi-tenant or leaf-node setups. The full list is in
[Reference](/reference/jetstream/api/stream/pub-ack). The
three above are the ones day-to-day publishing code reads.

The snippets in the previous section already return this object; reading
its fields is all there is to it.

The rule: the `PubAck` is your only proof that the message was stored.
When a publish fails, what you know depends on how it failed. A subject
that no stream captures fails immediately (a "no responders" error), and
nothing was stored. But a network timeout means no confirmation, not no
write: the server may have stored the message and the ack got lost on the
way back. So handle a failed publish by retrying it or reporting the
failure — and make the retry safe with the `Nats-Msg-Id` header covered
in [Avoiding duplicate writes](#avoiding-duplicate-writes) below.

## Stored versus delivered

A `PubAck` confirms that the server stored the message. It does not
confirm that any consumer has received it. Storage and delivery are
separate.

In core NATS, a message is delivered at almost the same moment the
publish completes, so the two are easy to treat as one thing. In
JetStream they happen at different times:

1. The publisher publishes. The server stores the message and returns a
   `PubAck`.
2. Later (possibly minutes, hours, or days) a client reads the message
   through a consumer.
3. After processing it, the client acknowledges it. Only then is the
   message considered handled.

The rest of this chapter covers steps 2 and 3. This page has done step 1.

## Avoiding duplicate writes

A real publisher retries when a publish fails. But a failed publish
doesn't mean the message wasn't stored: a timeout can fire after the
server stored the message, with only the ack lost. A plain retry then
stores the same message twice. To prevent that, tag the publish with a
`Nats-Msg-Id` header. The server refuses to store the same ID twice
within the stream's duplicate-tracking window (the two-minute setting
from the previous page's config). A blocked duplicate is the
`duplicate: true` case in the `PubAck`.

On the CLI, set the header with `--header` and publish with
`nats pub --jetstream` so the `PubAck` is shown:

```bash
nats pub --jetstream orders.created \
  --header "Nats-Msg-Id:ord_8w2k-created" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

Run that command twice. The first call stores the message and prints its
sequence number (`Stored in Stream: ORDERS Sequence: …`). The second call
prints the same sequence number with `Duplicate: true`, and nothing new
is stored. The same header from a client library:

<div class="nats-example"
     data-type="learn-jetstream-publishing-dedup"
     data-languages="js,go,python,java,rust,csharp,c"></div>

Give every publish you might retry a stable `Nats-Msg-Id` that the
producer can recompute, such as an order ID, a request ID, or a hash of
the payload. The full set of publish headers is in
[Reference → JetStream Headers](/reference/jetstream/api/headers). The
tracking window is a stream setting, not a header: it's the
`Duplicate Window` covered on the
[stream page](/learn/jetstream/your-first-stream). This page uses only
`Nats-Msg-Id`.

## What we've skipped

A few things this page leaves out. The other publishing modes get their
own page later in the chapter; the rest is in Reference:

- **Async publish** — fire many publishes and collect the `PubAcks` later,
  for higher throughput. See [Advanced
  publishing](/learn/jetstream/advanced-publishing).
- **Atomic batch publish** — store a group of messages all-or-nothing
  (server 2.12+). See [Advanced publishing](/learn/jetstream/advanced-publishing).
- **Fast-ingest batch publish** — flow-controlled, high-throughput ingest
  without atomicity (server 2.14+). See [Advanced
  publishing](/learn/jetstream/advanced-publishing).
- **Expected-stream and expected-sequence headers** — fail a publish unless
  the stream is in a specific state, for optimistic concurrency. See
  [Reference → JetStream Headers](/reference/jetstream/api/headers).

## Pitfalls

Three mistakes are common on a first publish into a stream. Each follows
from something above.

**Ignoring the `PubAck`.** A publish returns a `PubAck`, and code that
discards it can't tell a stored message from a lost one. This is easy to
miss on the CLI: a plain `nats pub` is a core publish, so it prints
`Published N bytes` whether or not a stream captured the subject. That
line doesn't prove the message was stored. Read the `PubAck` instead: in
code, check the return value; on the CLI, publish with
`nats pub --jetstream`, which reports the stream and sequence number.

<div class="nats-example"
     data-type="learn-jetstream-publishing-confirmStored"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The plain publish reports `Published` even on a subject no stream
captures. The `--jetstream` version surfaces the miss as a "no
responders" error, and confirms a real write with
`Stored in Stream … Sequence …`.

**Retrying without a `Nats-Msg-Id`.** A publisher that retries after a
timeout (which any well-built publisher does) can store the message twice:
the timed-out publish may have been stored with only its ack lost, and the
retry adds a second copy unless it carries the same `Nats-Msg-Id`. The
duplicate-tracking window is two minutes by default, so a retry that
arrives after that also stores a second copy. Don't retry a bare publish. Give every retryable
publish a stable `Nats-Msg-Id`, as shown in
[Avoiding duplicate writes](#avoiding-duplicate-writes) above.

**Treating "published" as "delivered".** A `PubAck` means the stream
stored the message, not that a consumer processed it. Code that marks an
order shipped as soon as the `PubAck` returns is acting on a write that no
shipping logic has seen. Keep business outcomes separate from the publish.
The delivery-and-ack half of the story is on the
[next page](/learn/jetstream/reading-back) and in
[delivery and acknowledgment](/learn/jetstream/delivery-and-acknowledgment).

## Where you are

The `ORDERS` stream now holds three messages, each confirmed by a
`PubAck`, and a repeated publish no longer stores a second copy.

No consumer has read these messages yet. The next page,
[Reading back the stream](/learn/jetstream/reading-back), reads them back.

## See also

- [Reference → JetStream Headers](/reference/jetstream/api/headers) —
  every publish-side header, including dedup, expected state, and batch.
- [Reference → Publish Acknowledgement](/reference/jetstream/api/stream/pub-ack)
  — the exact fields returned by a publish.
