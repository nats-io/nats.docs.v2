---
id: index
title: "Connect over WebSocket"
sidebar_position: 1
description: Run the NATS protocol over a WebSocket transport, so browsers and anything behind an HTTP ingress can reach the same server
---

# Connect over WebSocket

`nats-server` speaks the NATS protocol over WebSocket. Add a
`websocket {}` block with a `listen` address and the same binary that
serves clients on port 4222 also accepts WebSocket connections on a
listener of its own.

Nothing above the transport changes. The same client libraries connect,
publish to the same subjects, and use the same JetStream API. What
changes is the URL scheme: `ws://` or `wss://` instead of `nats://`.

## Who this is for

You're running a NATS system and something needs to reach it that a
plain client connection can't.

Most often that's **a browser**. A page running in a browser can't open
a TCP socket, so WebSocket is the only way it reaches NATS at all. A
dashboard, an admin console, or any front end subscribing to live
subjects connects this way.

The other case is **infrastructure that only speaks HTTP**. A cloud
HTTP load balancer or a CDN in front of your domain routes HTTP and
nothing else, so a `nats://` connection has no path through them.
Exposing NATS behind one means exposing the WebSocket listener. The
same applies to a leaf node reaching a hub that sits behind that kind
of edge.

If neither applies, keep using `nats://`. It's one less moving part, and
a plain TCP connection avoids the WebSocket framing overhead.

## Which clients can connect

Six of the seven [Tier 1 clients](/concepts/ecosystem#tier-1-clients)
implement the WebSocket transport: Go, JavaScript/TypeScript, Python,
Java, Rust, and C#/.NET. The C client has no WebSocket transport. For the
six that do, the change is the URL scheme and nothing else.

The `nats` CLI is built on the Go client, so it takes a `ws://` URL too.
That makes it the quickest way to prove a listener works, and this
chapter uses it for exactly that.

## A dashboard and a branch office

Acme runs its ORDERS platform on NATS. Two things need in, and neither
can open a plain connection to port 4222.

The **warehouse dashboard** is a page that staff keep open on a screen
by the packing benches. It subscribes to `orders.>` and shows each order
as it arrives. It runs in a browser, so WebSocket is the only option.

An Acme **retail branch** runs a leaf node so its tills keep working
when the link to head office drops. The `east` cluster is reached
through the same HTTPS ingress that fronts the rest of Acme's estate,
and that ingress publishes HTTP routes only, so the branch can't dial
the leafnode port directly.

Neither adds a subsystem. Both are new ways into the system the
earlier chapters set up.

## By the end you'll have

- a `websocket {}` listener running, and `nats -s ws://…` subscribing
  through it
- a browser page receiving `orders.>` live
- origin checking configured, and a clear view of what it does and
  doesn't protect
- TLS terminated at an ingress, with `advertise` telling clients the
  right address
- a leaf node joining the `east` cluster over `wss://`

## Map

| Page | What you learn |
|---|---|
| [Your first WebSocket connection](/learn/websocket/your-first-websocket-connection) | Enable the listener, connect the CLI, then a browser |
| [Browsers and origins](/learn/websocket/browsers-and-origins) | Origin checking, and how a browser presents credentials |
| [TLS and proxies](/learn/websocket/tls-and-proxies) | TLS on the listener or at an ingress, and what a proxy must pass through |
| [Leaf nodes over WebSocket](/learn/websocket/leaf-nodes-over-websocket) | Attaching an edge site through HTTP-only infrastructure |
| [Where to go next](/learn/websocket/where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- **A `nats-server`.** The examples use a single local server until
  [Leaf nodes over
  WebSocket](/learn/websocket/leaf-nodes-over-websocket), which uses the
  `east` cluster.
- **The `nats` CLI**, which connects over both `nats://` and `ws://`.
- **A browser**, for the dashboard pages.

No client libraries need installing. The browser example is a single
HTML file that loads nats.js from a module import.

Open a terminal and turn to [Your first WebSocket
connection](/learn/websocket/your-first-websocket-connection).

## See also

- [Reference → websocket](/reference/config/websocket/) — every field of
  the `websocket {}` block, versioned and exhaustive
- [Core NATS → Connecting](/learn/core-nats/connecting) — the connection
  this chapter changes the transport of
- [Topologies → Leaf nodes](/learn/topologies/leaf-nodes) — the leaf-node
  model the final page of this chapter carries over WebSocket
