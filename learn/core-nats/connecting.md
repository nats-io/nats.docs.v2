---
id: connecting
title: "Connecting"
sidebar_position: 2
description: One long-lived TCP connection that carries every publish and subscribe, named at connect time and kept alive with PING/PONG heartbeats
---

# Connecting

A NATS application talks to the network through a **client**: a library you
embed in your program, or the `nats` command-line tool, that opens a connection
to a server and moves messages over it. Before any pattern in this chapter
works, the client has to connect. This page is about that connection itself:
what it is, how you open one, and the few choices you make when you do.

You need one local `nats-server` running for this chapter. The default build
needs no configuration:

```bash
nats-server
```

Leave it running. It listens on port 4222, and every page in this chapter
connects to it.

## One connection carries everything

A **connection** is a single, long-lived TCP connection between the client and
the server. The client opens it once, when your application starts, and keeps
it open for the application's lifetime.

Everything the client does travels over that one connection. Every message you
publish, and every **subscription** you register (a standing request to receive
messages addressed to a given subject), is multiplexed onto the same TCP
connection and tagged so both ends can tell the streams apart. The client
doesn't open a new connection per subject or per message; one connection
carries them all.

That's why you connect once and reuse the result. A single connection handles
thousands of subscriptions and a high message rate, and sharing it across every
publish and subscribe is the pattern the clients are built for.

## The connect URL

The client opens a connection by dialing a **connect URL**: the address of the
server, in the form `nats://host:port`. Servers listen on port 4222 by
default, so a server on your own machine is `nats://127.0.0.1:4222`. That's also
what a client dials when you don't give it a URL, and what the `nats` CLI uses
until you point it elsewhere with `--server` or a saved context.

The scheme names the transport. `tls://` is the same connection encrypted, and
`ws://` or `wss://` carries the protocol over WebSocket — the transport a
browser has to use, and the one that gets through a network allowing only
outbound 443. [Connect over WebSocket](/learn/websocket/) covers that case.

One URL names one server. A production client usually passes several URLs so it
can fail over when one server is unreachable; that list, and how the client
works through it, belong to [Resilient clients →
Connecting](/learn/resilient-clients/connecting). Here, one local server is all
you need.

## The connect handshake

When the client reaches the server, the two run a short exchange, the **connect
handshake**, before any message flows.

The server sends first. It immediately sends an `INFO` message announcing
itself and the limits it enforces, among them `max_payload` (the largest
message it accepts, 1 MB by default) and whether it supports message headers.
The client reads `INFO`, then replies with a `CONNECT` message that declares
what it wants: its name, the protocol features it supports, and any credentials.
The server accepts, and the connection is ready to carry messages.

You can watch the first half of that exchange directly. Point any raw TCP tool
at the server and it prints the `INFO` line the instant it connects:

<div class="nats-example" data-type="learn-core-nats-connecting-see-the-handshake" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

These messages are plain text, each line ending in a carriage return and line
feed, the same wire format as the `PUB` and `SUB` lines that carry your
messages and the `PING`/`PONG` described below. You never write them yourself;
the client library runs the whole handshake when you call connect. The
step-by-step walkthrough, and every field the two sides exchange, is in
[Resilient clients → Connecting](/learn/resilient-clients/connecting).

## Naming the connection

One field in that `CONNECT` message is worth setting yourself: the **connection
name**. By default a client connects without a meaningful name, and server
monitoring shows it with no name at all (the `nats` CLI substitutes a generic
`NATS CLI Version …` label). Give it a name and that name identifies the
connection instead.

The `nats` CLI sets the name with the global `--connection-name` flag. Name a
connection after the service that owns it. Here it's `warehouse`, the first
Acme service, which opens a connection and confirms it can reach the server:

<div class="nats-example" data-type="learn-core-nats-connecting-connect-and-name" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The name then surfaces wherever the server lists its connections: `nats server
report connections` and the [monitoring
endpoint](/learn/monitoring/monitoring-endpoints). When you're staring at a
list of connected clients, the name tells you which application each one is,
instead of leaving you to guess from an address and a number. The report
command answers fully once you connect with system-account credentials; the
monitoring endpoint (`nats-server -m 8222`) is the no-credentials alternative.

## Receiving your own messages

Another connect-time choice is **echo**. By default a connection receives its
own messages: if one client publishes to a subject and also holds a
subscription on that same subject, the server delivers a copy back to that
client, exactly as it delivers to any other subscriber.

Most of the time this goes unnoticed, because a client subscribes to subjects
that other clients publish. It matters when a single client does both on one
subject, such as a service that publishes an update and also listens for
updates: it receives what it just published. Turning echo off at connect time
(clients call the option `NoEcho`) tells the server to skip the originating
connection when it delivers, so a client never gets a copy of its own message.
Like the name, it's fixed for the life of the connection: you choose it when
you open the connection, not while messages flow.

## Staying connected with PING/PONG

An open connection can sit idle between messages. To notice when the peer at the
other end has gone away, crashed or cut off from the network, without waiting
for the next message to fail, both ends exchange heartbeats.

The mechanism is **PING/PONG**. Each side periodically sends a `PING` and
expects a `PONG` back. When too many PINGs go unanswered, that side treats the
peer as dead and closes the connection. The
client and the server each run this on their own, so either end can detect a
peer that stopped responding. The defaults match on both sides: a PING every
two minutes, and the connection is declared dead after two unanswered PINGs.

The `nats rtt` command you ran above triggers this exchange on demand. Each
round trip it reports is one `PING` sent to the server and the `PONG` the server
sent back, and by default it averages five of them.

The heartbeat only detects the drop. Recovering from it, by reconnecting and
buffering publishes while the client is disconnected, is
[Connection lifecycle](/learn/core-nats/connection-lifecycle) later in this
chapter, and [Resilient clients →
Reconnection](/learn/resilient-clients/reconnection) for production tuning.

## Pitfalls

**Opening a new connection per message.** The connection is meant to be opened
once and shared. Connecting, publishing a single message, and disconnecting
repeats the whole handshake every time and discards a connection built to carry
thousands of messages. Open one connection when your service starts, hold it,
and reuse it for every publish and subscribe.

**A client that publishes and subscribes on one subject receives its own
messages.** With echo on (the default), a client's own published messages come
back to its matching subscriptions. If that isn't what you want, open the
connection with echo off (`NoEcho`) so the originating connection is skipped.

**Exiting before buffered publishes are sent.** A publish hands the message to
the client's write buffer and returns right away, so a short-lived program that
exits immediately can quit before the buffer reaches the server. Flush before
you exit. The [Publish-subscribe
pitfall](/learn/core-nats/publish-subscribe#pitfalls) covers this in full; it's
the same buffer whether you publish one message or many.

## Where you are

The Acme world now has a running server and a client that can reach it:

- One local `nats-server` is up, listening on `nats://127.0.0.1:4222`.
- You understand a connection as one long-lived TCP connection that multiplexes
  every publish and subscription.
- You open it by dialing a URL, and the connect handshake exchanges the server's
  `INFO` and the client's `CONNECT` before any message moves.
- The `warehouse` connection carries a name, set with `--connection-name`, so
  the server can identify it.
- Echo delivers a client its own messages by default, and `PING`/`PONG`
  heartbeats let both ends notice a dead peer.

## What's next

The connection is open. Now put it to work: publish a message to a subject and
have other clients receive a copy. [Publish-subscribe](/learn/core-nats/publish-subscribe)
introduces the one operation the rest of core NATS is built on, and the interest
graph that decides who gets each message.

## See also

- [Core Concepts → What is NATS?](/concepts/what-is-nats) — the client, the
  server, and the messaging model in five minutes.
- [Resilient clients → Connecting](/learn/resilient-clients/connecting) —
  connection options, server pools, connect-timeout tuning, and the full
  handshake walkthrough for production.
- [Reference → Client protocol](/reference/protocols/client) — the wire-level
  `INFO`, `CONNECT`, `PING`, and `PONG` this page describes at the model level.
