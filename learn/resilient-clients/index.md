---
id: index
title: "Resilient Clients Deep Dive"
sidebar_position: 1
description: The client connection as a state machine that detects faults, buffers through them, and recovers
---

# Resilient Clients Deep Dive

Core NATS taught you to publish and subscribe on a single server running
on your laptop. This chapter takes those same publishers and subscribers
and asks the harder question: what happens when the server goes away, the
network stalls, or the handler can't keep up?

The answer isn't new application code but the **connection**, the live
link from your client to a server, configured to survive faults. A
resilient client detects when its connection breaks, buffers work while
it's broken, recovers without losing the application's place, and shuts
down without losing in-flight work.

One idea holds the whole chapter together: the connection is a **state
machine**. It moves through a small set of states (DISCONNECTED,
CONNECTING, CONNECTED, RECONNECTING, DRAINING, CLOSED), and every fault
is just a transition between them. A server dying moves a
CONNECTED client to RECONNECTING. A clean shutdown moves it to DRAINING
and then CLOSED. Once you can picture that machine, each mechanism in this
chapter is one well-defined edge on it.

We harden one running system: the Acme `ORDERS` app you already know.
The `order-svc` publisher and the `warehouse`, `notifications`, and
`analytics` subscribers keep their code; what changes is the connection
each one opens. Every example uses the same order event:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

## By the end you'll have

- An `order-svc` connection that opens with a name, a **server pool**
  (the list of server URLs the client may connect to), and a sane connect
  timeout, instead of a bare default connection.
- A connection that reconnects with backoff and jitter when a server
  goes away, cycling the `n1`/`n2`/`n3` pool and flushing buffered
  publishes the moment it rejoins.
- A connection whose events are all wired to one place and whose state
  feeds a readiness probe, so a recoverable disconnect and a permanent
  close each get the right response instead of going unnoticed.
- A clean shutdown that drains in-flight work instead of dropping it,
  triggered on a SIGTERM.
- Subscribers that bound their memory with pending limits and surface
  a backlog through the async error callback instead of growing until the
  process is killed.
- A request-reply call that tells "the responder is absent" apart from
  "the responder is slow" and retries each one differently and safely.
- A connection that presents the `order-svc` credentials over a
  CA-validated TLS link.

## Who this is for

You've read the [Core NATS deep dive](/learn/core-nats), so publish,
subscribe, and request-reply are familiar, and ideally the
[JetStream deep dive](/learn/jetstream), so you know what a stream and a
consumer are. This chapter reuses the `ORDERS` stream and its consumers
rather than re-introducing them.

You don't need to have run NATS clients in production before. We start
from "open a connection the right way" and grow one fault at a time.

Unlike the other Learn chapters, this one has no Core Concepts primer to
read first. [Core NATS → Connection lifecycle](/learn/core-nats/connection-lifecycle)
introduces the model — what a drop does to your client, the reconnect
callbacks, and the buffer that holds your publishes through the gap — and
this chapter takes it to production depth. Every term still gets defined
in the page that first uses it: RECONNECTING, drain, slow consumer, no
responders, and the rest.

## How to read it

Each page introduces at most two new concepts and carries the same
`order-svc` connection forward. You [open the connection](/learn/resilient-clients/connecting),
[make it reconnect](/learn/resilient-clients/reconnection),
[watch its events](/learn/resilient-clients/connection-events),
[drain it](/learn/resilient-clients/drain-and-shutdown), and so on: one
resilience option per page, never a fresh example.

This chapter only ever talks about what the client does. When a page
reaches the edge of the client (*why* a server went away, *how* a
credential was issued, what happens to a JetStream consumer's
acknowledgment position across a reconnect), it names the gap in one
sentence and links out rather than re-explaining it here. Server-side
faults live in [Topologies](/learn/topologies); consumer acknowledgment
lives in [JetStream → Acknowledgment](/learn/jetstream/acknowledgment);
issuing credentials lives in [Security](/learn/security).

Where a feature has a long list of options, the page covers only the ones
that change how a connection behaves under fault. The exact option names
and defaults live in your client's API reference, while
[Reference](/reference/) covers the wire protocol and server configuration.

## Map

| Page | What you learn |
|---|---|
| Resilient Clients Deep Dive | The connection as a state machine, and the faults this chapter survives |
| [Connecting](/learn/resilient-clients/connecting) | Open `order-svc` with a name, a server pool, and a connect timeout, and read the connect handshake |
| [Reconnection](/learn/resilient-clients/reconnection) | Reconnect with backoff and jitter, retry the first connect, cycle the pool, and buffer publishes while disconnected |
| [Connection Events](/learn/resilient-clients/connection-events) | Wire every connection event and poll the connection state for a health check |
| [Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown) | Drain in-flight work on shutdown, drain one subscription on its own, and flush pending publishes |
| [Slow Consumers](/learn/resilient-clients/slow-consumers) | Bound a subscription's pending buffer and detect overflow before it OOMs |
| [Request-Reply Resilience](/learn/resilient-clients/request-reply-resilience) | Tell no-responders apart from a timeout, and retry each one safely |
| [TLS & Auth](/learn/resilient-clients/tls-and-auth) | Consume a credentials file, trust a CA, and stop retrying on a repeated auth error |
| [Where Next](/learn/resilient-clients/where-next) | A production checklist and a map of what's beyond the client |

## Prerequisites

You'll need:

- A working `nats-server`. The early pages use a single
  `nats-server`; once reconnection enters, the pages point the client at
  the three-server cluster from the
  [Topologies deep dive](/learn/topologies) (built there as
  `n1-east`/`n2-east`/`n3-east`; this chapter shortens the names to
  `n1`/`n2`/`n3`), used only as a server pool the client connects to.
- The `nats` CLI installed and pointed at your server. The examples run
  in the CLI; client options the CLI can't express, such as pending
  limits and the reconnect callbacks, appear in the text as the named
  client-library calls.

Open a terminal, start your server, and turn to
[Connecting](/learn/resilient-clients/connecting).

## See also

- [Core NATS deep dive](/learn/core-nats) — the publishers, subscribers,
  and request-reply calls this chapter hardens.
- [JetStream deep dive](/learn/jetstream) — the `ORDERS` stream and
  consumers whose connections this chapter makes resilient.
- [Topologies deep dive](/learn/topologies) — how to build the
  three-server cluster this chapter treats only as a server pool
  (`n1`/`n2`/`n3` here, `n1-east`/`n2-east`/`n3-east` there).
