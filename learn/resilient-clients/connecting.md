---
id: connecting
title: "1. Connecting"
sidebar_position: 2
description: Open order-svc with a name, a server pool, and a connect timeout, and read the connect handshake
---

# 1. Connecting

Every resilient connection starts the same way: a client opens it. So far
`order-svc` has connected with nothing but a server URL, a bare default
connection. That works on a laptop. It's the wrong starting point for
production, because the very first thing a connection does is the part most
likely to fail: finding a server, agreeing on terms, and proving who it is.

This page opens `order-svc`'s connection deliberately. It adds two things to
the bare default: a small set of connection options that name the
connection and point it at more than one server, and an understanding of the
connect handshake, the short conversation the client and server have
before the first message moves. Get these right and every later mechanism in
this chapter has a solid connection to build on.

## Connection options

A **connection option** is a setting you pass at connect time. It's fixed
for the life of the connection: you choose it when you open the connection,
not while messages flow. Three of them matter before anything else.

The first is the **connection name**. By default a connection is anonymous:
the server sees a client, but can't tell which application it is. Naming the
connection `order-svc` makes it identifiable in `nats server report
connections` and in the server logs, so when something goes wrong you can
find the right connection instead of guessing.

The second is the **server pool**: the list of server URLs the client may
connect to. With one URL, a client has one place to go, and if that server is
unreachable the connect fails. With several URLs the client has choices. It
tries them until one answers, which is failover at connect time, before a
single message is sent.

Here's `order-svc` opening a named connection to a single server, the
laptop setup from Core NATS:

<div class="nats-example" data-type="learn-resilient-clients-connecting-basic" data-languages="cli,js,go,python,java,rust,csharp"></div>

Every example on this page publishes the same canonical order event:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

## The server pool is randomized

Once `order-svc` runs against more than one server, the pool's *order*
matters. By default the client **randomizes** the pool before it dials. Give
it `n1`, `n2`, and `n3`, and one client may try `n2` first while another
tries `n1`. That randomization spreads connections evenly across the servers
instead of stacking every client on whichever URL happens to be first in the
list.

You can turn randomization off with a single option (every client calls it
some variant of `NoRandomize`) when you deliberately want a
preferred-server order. Most applications should leave it on so that a
restart of every `order-svc` instance doesn't hammer one server.

`order-svc` opens against the `n1`/`n2`/`n3` cluster, used here only as a
pool of three URLs the client can reach, not as a thing this chapter
explains:

<div class="nats-example" data-type="learn-resilient-clients-connecting-pool" data-languages="cli,js,go,python,java,rust,csharp"></div>

Why the cluster exists, and how those three servers coordinate behind the
pool, belongs to [Topologies → Your first
cluster](/learn/topologies/your-first-cluster). This chapter treats the pool
as a fact: three URLs the client may dial.

## The connect timeout bounds the dial

Dialing a server isn't instant. The client resolves the hostname, opens a
TCP socket, and waits for the server to answer. Any of those steps can hang:
a wrong DNS entry, a firewall that drops packets, a server that's up but
overloaded. Without a bound, the client waits indefinitely.

The **connect timeout** is that bound. It caps how long a single dial may
block before the client gives up and tries the next URL in the pool. The
default is short (two seconds in most clients), which is enough for a
healthy network and quick to move past a dead server. Set it deliberately
when your network is slower than that, or leave the default when it isn't.

The timeout and a server pool work together. A pool gives the client
somewhere else to go; the timeout decides how long it waits before going
there. One unreachable server in the pool costs you one timeout, then the
client moves on.

The full set of connection options is documented in
[Reference](/reference/); here we cover only the ones that change how a
connection behaves under fault.

## The connect handshake

Naming a connection and pointing it at a pool decides *where* the client
goes. The **connect handshake** is *what happens* when it gets there: the
short conversation that turns a TCP socket into a working NATS connection.

It runs in four steps, in order:

1. **TCP dial.** The client opens a socket to the chosen server. The connect
   timeout bounds this step.
2. **Server INFO.** The server immediately sends an `INFO` message
   describing itself: its `server_id`, its `max_payload`, whether
   authentication is required (`auth_required`), whether TLS is required
   (`tls_required`), and more.
3. **Client CONNECT.** The client replies with a `CONNECT` message carrying
   its name, any credentials, and the protocol features it supports.
4. **`+OK` or `-ERR`.** The server accepts with `+OK` or rejects with
   `-ERR`. After `+OK`, the connection is **CONNECTED** and messages may
   flow.

Picture the handshake and the two end states it can reach, CONNECTED or
rejected:

<div class="nats-flow" data-scenario="connectHandshakeAnimated" data-width="600" data-height="350"></div>

Two fields in that `INFO` message change how the client behaves, so they're
worth naming.

`auth_required` tells the client whether the server demands credentials. If
it's true and the client has none, the handshake ends in `-ERR` and the
connection never reaches CONNECTED. Supplying those credentials is the job of
[TLS & Auth](/learn/resilient-clients/tls-and-auth) later in this chapter;
here you only need to know the server announces the requirement up front, in
the handshake.

`max_payload` is the largest single message the server will accept, one
megabyte by default. The client reads it from `INFO` and enforces it
locally: a publish larger than `max_payload` fails *before* it leaves the
client, rather than being sent and rejected. That's why an oversized
`orders.created` event fails fast — the client already knows the limit.

## Pitfalls

Connecting fails in a few predictable ways. Each one happens before a single
order moves, so catching it at connect time saves a confusing debugging
session later.

**One URL is a single point of failure at connect time.** A connection
opened against a single server has nowhere to go if that server is
unreachable, and the connect fails. Don't hardcode one URL for a
production client. Pass the whole pool (several URLs, or several IPs behind
one name) so the client can fail over while it's still connecting.

**A blocked dial with no timeout hangs the startup.** If DNS resolution or
the TCP dial stalls and no connect timeout is set short, the client waits far
longer than you expect, and a service that hangs on startup looks dead rather
than slow. Do set a deliberate connect timeout, and pair it with a pool so a
single slow server costs one timeout, not the whole startup.

**An oversized message fails the publish, not the connect.** A message larger
than the server's `max_payload` (one megabyte by default) is refused by the
client itself, before it's sent. The connection is fine; the publish is the
thing that fails. Don't treat that error as a connection problem. Keep
messages under `max_payload`, and for large bodies store the blob elsewhere
and publish a reference.

Handle the connect failures at the boundary instead of letting them surface
deep in the application. The handler branches on whether the client could
reach any server in the pool at all:

<div class="nats-example" data-type="learn-resilient-clients-connecting-handle-connect-error" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

`order-svc` now opens its connection deliberately:

- It carries a name (`order-svc`), so the server can identify it.
- It points at a server pool (`n1`/`n2`/`n3`), randomized by default, so
  one unreachable server isn't fatal at connect time.
- It bounds each dial with a connect timeout, so a blocked server costs
  one timeout and no more.

And you can read the connect handshake: TCP, the server's `INFO`, the
client's `CONNECT`, and the `+OK` that means CONNECTED, plus what
`auth_required` and `max_payload` in `INFO` mean for the client.

## What's next

The connection is open. The next fault to survive is the server going away
*after* it's open. [Reconnection](/learn/resilient-clients/reconnection)
makes `order-svc` cycle the same pool with backoff and jitter, and buffer its
publishes until it rejoins.

Continue to
[2. Reconnection](/learn/resilient-clients/reconnection).

## See also

- [Topologies → Your first cluster](/learn/topologies/your-first-cluster) —
  what the `n1`/`n2`/`n3` pool actually is on the server side.
- [TLS & Auth](/learn/resilient-clients/tls-and-auth) — supplying the
  credentials the handshake may demand when `auth_required` is set.
