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
network stalls, or the handler cannot keep up?

The answer is not new application code. It is a **connection** — the live
link from your client to a server — that is configured to survive faults.
A resilient client detects when its connection breaks, buffers work while
it is broken, recovers without losing the application's place, and shuts
down without dropping work on the floor.

The idea that holds the whole chapter together is this: the connection is
a **state machine**. It moves through a small set of states —
DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, DRAINING, CLOSED — and
every fault is just a transition between them. A server dying moves a
CONNECTED client to RECONNECTING. A clean shutdown moves it to DRAINING
and then CLOSED. Once you can picture that machine, each mechanism in this
chapter is one well-defined edge on it.

We harden one running system: the Acme **ORDERS** app you already know.
The `order-svc` publisher and the `warehouse`, `notifications`, and
`analytics` subscribers keep their code; what changes is the connection
each one opens. Every example uses the same order event:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

## By the end you will have

- An `order-svc` connection that opens with a name, a **server pool** —
  the list of server URLs the client may connect to — and a sane connect
  timeout, instead of a bare default connection.
- A connection that **reconnects** with backoff and jitter when a server
  goes away, cycling the `n1`/`n2`/`n3` pool and flushing buffered
  publishes the moment it rejoins.
- A clean shutdown that **drains** in-flight work instead of dropping it,
  triggered on a SIGTERM.
- Subscribers that bound their memory with **pending limits** and surface
  a backlog through the async error callback instead of growing until the
  process is killed.
- A request-reply call that tells "the responder is absent" apart from
  "the responder is slow" and **retries** each one differently and safely.
- A connection that presents the `order-svc` credentials over a
  CA-validated TLS link.

## Who this is for

You have read the [Core NATS deep dive](/learn/core-nats), so publish,
subscribe, and request-reply are familiar, and ideally the
[JetStream deep dive](/learn/jetstream), so you know what a stream and a
consumer are. This chapter reuses the `ORDERS` stream and its consumers
rather than re-introducing them.

You do not need to have run NATS clients in production before. We start
from "open a connection the right way" and grow one fault at a time.

Unlike the other Learn chapters, this one has no Core Concepts primer to
read first — the connection lifecycle is taught here and nowhere else. So
every term gets defined in the page that first uses it: DISCONNECTED,
drain, slow consumer, no responders, and the rest.

## How to read it

Each page introduces at most two new concepts and carries the same
`order-svc` connection forward. You open the connection on page 2, make it
reconnect on page 3, drain it on page 4, and so on — one resilience option
added per page, never a fresh example.

This chapter only ever talks about what the **client** does. When a page
reaches the edge of the client — *why* a server went away, *how* a
credential was issued, what happens to a JetStream consumer's
acknowledgment position across a reconnect — it names the gap in one
sentence and links out rather than re-explaining it here. Server-side
faults live in [Topologies](/learn/topologies); consumer acknowledgment
lives in [JetStream → Acknowledgment](/learn/jetstream/acknowledgment);
issuing credentials lives in [Security](/learn/security).

Where a feature has a long list of options, the page covers only the ones
that change how a connection behaves under fault. The full set of
connection options is documented in [Reference](/reference/).

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | Resilient Clients Deep Dive | The connection as a state machine, and the seven faults this chapter survives |
| 2 | [Connecting](/learn/resilient-clients/connecting) | Open `order-svc` with a name, a server pool, and a connect timeout, and read the connect handshake |
| 3 | [Reconnection](/learn/resilient-clients/reconnection) | Reconnect with backoff and jitter, cycle the server pool, and buffer publishes while disconnected |
| 4 | [Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown) | Drain in-flight work on shutdown instead of dropping it with a bare close |
| 5 | [Slow Consumers](/learn/resilient-clients/slow-consumers) | Bound a subscription's pending buffer and detect overflow before it OOMs |
| 6 | [Request-Reply Resilience](/learn/resilient-clients/request-reply-resilience) | Tell no-responders apart from a timeout, and retry each one safely |
| 7 | [TLS & Auth](/learn/resilient-clients/tls-and-auth) | Consume a credentials file and trust a CA so the connection is authenticated and encrypted |
| 8 | [Where Next](/learn/resilient-clients/where-next) | A production checklist and a map of what is beyond the client |

## Prerequisites

You will need:

- A working `nats-server`. The early pages use a single
  `nats-server`; once reconnection enters, the pages point the client at
  the `n1`/`n2`/`n3` cluster from the
  [Topologies deep dive](/learn/topologies) — used only as a server pool
  the client connects to.
- The `nats` CLI installed and pointed at your server. The CLI carries
  the first tab of each example; the JavaScript, Go, Python, Java, Rust,
  and C# tabs carry the client options the CLI cannot express, such as
  pending limits and the reconnect callbacks.

Open a terminal, start your server, and turn to
[Connecting](/learn/resilient-clients/connecting).

## See also

- [Core NATS deep dive](/learn/core-nats) — the publishers, subscribers,
  and request-reply calls this chapter hardens.
- [JetStream deep dive](/learn/jetstream) — the `ORDERS` stream and
  consumers whose connections this chapter makes resilient.
- [Topologies deep dive](/learn/topologies) — the `n1`/`n2`/`n3` cluster
  this chapter treats only as a server pool.
