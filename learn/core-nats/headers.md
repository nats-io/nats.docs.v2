---
id: headers
title: "Message headers"
sidebar_position: 8
description: Attach key/value metadata to any message with the NATS/1.0 header format, set and read it, and see the status line the server uses in-band
---

# Message headers

Every message so far has been a subject and a payload. NATS lets you attach a
third thing: **headers**, key/value metadata that rides with the message
alongside the payload. The payload is the business data. A header is anything
you want the receiver to know about that data without reading it out of the
body: who sent it, what format it's in, or an ID to trace it by.

You've already seen a header without naming it. When a request finds
[no responders](/learn/core-nats/request-reply#no-responders), the server
answers with a header and no payload. This page shows the whole mechanism
behind that signal.

## The header format

A header block is text, and it looks like HTTP. It opens with a version line,
`NATS/1.0`, followed by one or more `Key: Value` pairs, each on its own line:

```
NATS/1.0
Content-Type: application/json
Acme-Request-Id: req_7f3c9a
```

Each pair is one key and one value. A key can appear on more than one line to
carry several values, and the receiver reads back all of them. So a header is
really a key mapped to a list of values, even though most keys hold just one.

NATS keeps the case of your keys exactly as you write them and treats them as
case-sensitive, so `Content-Type` and `content-type` are two different keys.
Many HTTP libraries fold keys to a single canonical case; NATS doesn't, so
pick one spelling for a key and use it on both ends.

The header block travels as part of the message but separately from the
payload, so the body a receiver reads is exactly the bytes you published. A
service that ignores headers sees the same JSON it always did.

## Setting and reading headers

From the CLI, `-H` (or `--header`) attaches a header as a `Key:Value` pair, and
you repeat the flag for each one you want. `nats pub` takes it:

<div class="nats-example" data-type="learn-core-nats-headers-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

On the receiving side, `nats sub` prints each header as a `Key: Value` line
above the body, so you can see exactly what the publisher attached:

<div class="nats-example" data-type="learn-core-nats-headers-subscribe" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Client libraries expose the same thing as a header type on the message. You
build it with `Set` to give a key a value or `Add` to append another value to
a key, and read it back with `Get` for the first value of a key or `Values`
for the whole list.

`Content-Type` in the example is the one header nearly everyone uses: it tells
receivers how to read the body, `application/json` here. The rest of the keys
are yours to name. Keep the `Nats-` prefix out of your own keys, though, since
NATS reserves it for system headers; some of those drive
[JetStream](/learn/jetstream) and are out of scope for core NATS.

## A request ID and a trace ID

Request-reply is a natural place for headers. When the warehouse asks the
inventory service [whether an item is in stock](/learn/core-nats/request-reply),
the question and the answer are two messages, and headers let you tag them
without touching the order payload.

Attach an `Acme-Request-Id` to name this one call, and an `Acme-Trace-Id`, a
**correlation ID**: a value every message in the same logical operation
carries, so you can follow one order across services. The responder reads the
trace ID off the request and copies it onto the reply:

<div class="nats-example" data-type="learn-core-nats-headers-request" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Because the reply comes back carrying the trace ID you sent, you can match this
answer to the order you asked about, even with many checks in flight at once.
Your payload stayed a clean order document the whole way.

## Status codes from the server

The server uses headers as well. It signals a client in-band with a
**status code** placed right on the version line. Instead of `NATS/1.0` alone,
the line reads `NATS/1.0 503`, and the message carries no payload.

You've met exactly this. The [no responders](/learn/core-nats/request-reply#no-responders)
signal is a reply with the header line `NATS/1.0 503` and an empty body; your
client recognizes the code and turns it into a distinct no-responders error.
That's the whole mechanism: a status on the header line and no payload, read
by the client before your code ever sees a message.

## Header support is negotiated at connect

Headers work only when both ends agree to them, and they settle that when the
connection opens. The server advertises header support in the INFO line it
sends first, a `headers` field that's on by default. The client reads that and
declares its own support in the CONNECT it sends back. By the time you publish
anything, both sides know headers are in play.

Every current server and client supports headers, so this negotiation succeeds
quietly and you never think about it. It has one visible failure mode: a server
with `no_header_support` set in its configuration, or one old enough to predate
the feature. Against such a server the client sees no header support
advertised, and any publish that carries a header fails on the client with
`headers not supported by this server`, before the message reaches the wire.
The [Connecting](/learn/core-nats/connecting) page covers the INFO and CONNECT
handshake.

The same agreement gates the previous section: because the no-responders signal
arrives as a header, a connection without header support can't receive it
either.

## Try it

Open two terminals against your running server.

```bash
# Terminal 1 — watch orders.created with headers rendered
nats sub orders.created
```

```bash
# Terminal 2 — publish an order tagged with a content type and a request ID
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  -H 'Content-Type:application/json' \
  -H 'Acme-Request-Id:req_7f3c9a'
```

Terminal 1 prints the headers above the body (the two header lines can print
in either order):

```
[#1] Received on "orders.created"
Content-Type: application/json
Acme-Request-Id: req_7f3c9a

{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Now add `--headers-only` to the subscriber and publish again. You get the
header lines and no body, which is how you inspect metadata on a busy subject
without printing every payload.

## Pitfalls

**Reading a key with the wrong case.** Header keys are case-sensitive. If a
publisher sends `Content-Type` and you read `content-type`, you get an empty
value and no error. Match the exact spelling the sender used, and settle on one
convention across your services.

**Headers count against the payload limit.** The server checks the combined
size of the header block and the body against `max_payload`, the same 1 MB
ceiling the [payload faces on its own](/learn/core-nats/publish-subscribe#the-1-mb-payload-limit).
A large header block leaves less room for the body, and if the two together
cross the limit the server rejects the publish.

**Putting real data in headers.** Headers are for small metadata that describes
the message: an ID, a content type, a flag. Large or structured data belongs in
the payload, where receivers expect it. Data stuffed into headers inflates
every message and competes with the body for `max_payload`. Keep headers short
and keep the body authoritative.

## Where you are

The Acme world now tags its messages with metadata that travels beside the
payload:

- A publisher attaches headers with `-H` (or a client's `Set`/`Add`); a
  subscriber reads them with `nats sub` (or `Get`/`Values`).
- A request carries a request ID and a trace ID, and the responder copies the
  trace ID onto the reply so you can correlate the two.
- The server uses headers in-band as well, which is how the `NATS/1.0 503`
  no-responders signal reaches you.
- Header support is agreed at connect, and every current server and client has
  it.

## What's next

Headers travel with a message to wherever its subject leads. Sometimes you need
to change where that is: rewrite a subject as it enters the server, so
`orders.created` can also arrive under another name without the publisher
knowing. That's subject mapping, on the
[next page](/learn/core-nats/subject-mapping).

## See also

- [Request-reply → No responders](/learn/core-nats/request-reply#no-responders) —
  the status header this page generalizes.
- [Connecting](/learn/core-nats/connecting) — the INFO and CONNECT handshake
  that negotiates header support.
- [Reference → Client protocol](/reference/protocols/client) — the wire-level
  `HPUB`/`HMSG` frames and the exact header format.
