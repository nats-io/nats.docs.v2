---
id: index
title: Services
sidebar_position: 1
description: The micro framework that turns a request-reply responder into a named, versioned, discoverable service
---

# Services

In the Core NATS chapter you wrote a responder by hand. It subscribed to
a subject, read each request, and replied. That works, but the responder
is only a function on a wire. It has no name you can look up and no
version. There's no way to tell how many copies are running, and no
built-in count of how many requests it has served.

The **Services framework** closes that gap. Its module is called `micro`
in some client libraries (Go, Python) and `service`/`services` in others
(JavaScript, Java, Rust, C#); the concept is the same everywhere. It takes
the same request-reply responder you
already know and formalizes it into a **service**: a named, versioned
handler that the server can discover, that reports its own stats, and
that load-balances across as many copies as you start. You add no new
infrastructure. A service is still request-reply underneath; the
framework connects those pieces for you.

This chapter promotes the Core NATS `inventory` responder into a real
`OrderInventory` service and grows it page by page. The order payload,
the subjects, and the single local server stay the same, only now with
a framework around the responder.

## By the end you'll have

- an `OrderInventory` service, version `1.0.0`, answering on
  `orders.inventory.check` with a named endpoint and the default queue
  group `"q"`
- a second `ShippingQuote` service, to show how one process can host
  multiple endpoints and group them under a subject prefix
- the ability to discover both services over the `$SRV` subjects:
  query which services are present, what endpoints they expose, and
  their current stats
- per-endpoint stats you can read back at any time: how many
  requests each endpoint served, how many failed, and how long they
  took
- two or more instances of `OrderInventory` sharing the load, with the
  queue group spreading requests across them and no coordinator
  involved

## Who this is for

You've read the [Core NATS deep dive](/learn/core-nats), or you're
otherwise comfortable with [request-reply](/learn/core-nats/request-reply)
and [queue groups](/learn/core-nats/queue-groups). This chapter doesn't
re-teach those mechanisms. It builds directly on top of them: a service
is a request-reply responder, and its default load balancing is a queue
group. When something in this chapter is really one of those underlying
mechanisms, the page names it and links back rather than explaining it
again.

You don't need to know anything about the micro framework itself. We
start from "what does the framework add to a plain responder" and grow
from there.

A service stores nothing; it answers a request and retains no record of
it. That's the at-most-once nature of request-reply. When you need the work to
survive a restart or be retried, that's a job for the persistence layer,
covered in the [JetStream deep dive](/learn/jetstream). We name that
boundary as it comes up.

## How to read it

Each page introduces at most two new concepts and carries the same Acme
ORDERS session forward. You keep the `OrderInventory` service running and
add an endpoint, a second service, a discovery query, a stats query, and
a second instance as the chapter progresses. You can keep one terminal
open the whole way through.

The framework exposes many configuration fields: every endpoint option,
every metadata map, the full discovery wire schema. Where a feature has a
long list, the page covers only the behavior you need and links to
[Reference](/reference/) for the exhaustive set.

## Map

| Page | What you learn |
|---|---|
| [Your first service](./your-first-service) | Create `OrderInventory` with one endpoint, and the handler contract |
| [Endpoints and groups](./endpoints-and-groups) | Host multiple endpoints in one service and group them under a subject prefix |
| [Discovery](./discovery) | The three `$SRV` verbs (PING, INFO, STATS) and why discovery is broadcast |
| [Observability](./observability) | Read per-endpoint stats and signal a service error |
| [Scaling](./scaling) | Run N instances and let the queue group balance the load |
| [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A single local `nats-server`. The Services framework needs nothing
  special enabled. It runs on ordinary request-reply, so a plain
  `nats-server` is enough. Topology is a separate concern, covered in the
  [Topologies deep dive](/learn/topologies).
- The `nats` CLI installed and pointed at your server. The CLI can
  request, list, and inspect services directly, and the examples use it
  to drive and observe a running service. Building the service itself
  (creating it, adding endpoints, writing handlers) is a client-library
  task, so reach for your client library (JavaScript, Go, Python, Java,
  Rust, or C#) when you build one for real.
- Comfort with [request-reply](/learn/core-nats/request-reply) and
  [queue groups](/learn/core-nats/queue-groups). The framework assumes
  both.

Open a terminal, start a `nats-server`, and continue to the next page.

## See also

- [Core NATS → Request-reply](/learn/core-nats/request-reply) — the
  mechanism every service is built on
- [Core NATS → Queue groups](/learn/core-nats/queue-groups) — the load
  balancing a service gets for free
- [Concepts → What is NATS](/concepts/what-is-nats) — the five-minute
  overview of the whole system
