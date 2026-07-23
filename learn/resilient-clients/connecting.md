---
id: connecting
title: "Connecting"
sidebar_position: 2
description: Open order-svc with a name, a server pool, and a connect timeout, and read the connect handshake
---

# Connecting

Every resilient connection starts the same way: a client opens it. So far
`order-svc` has connected with nothing but a server URL, a bare default
connection. That works on a laptop, but it's the wrong starting point for
production. The very first thing a connection does is also the part most
likely to fail: the client has to reach a server and pass authentication
before anything else works.

This page opens `order-svc`'s connection deliberately. It adds two things to
the bare default: a small set of connection options that name the
connection and point it at more than one server, and an understanding of the
connect handshake, the short exchange between client and server
before the first message moves. Once these are correct, every later mechanism
in this chapter has a working connection to build on.

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

<div class="nats-example" data-type="learn-resilient-clients-connecting-basic" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Every example on this page publishes the same canonical order event:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

## The server pool is randomized

Once `order-svc` runs against more than one server, the pool's *order*
matters. By default the client **randomizes** the pool before it dials. Give
it `n1`, `n2`, and `n3`, and one client may try `n2` first while another
tries `n1`. That randomization spreads connections evenly across the servers
instead of concentrating every client on whichever URL happens to be first in
the list.

You can turn randomization off with a single option (most clients call it
some variant of `NoRandomize`; Python calls it `dont_randomize`, Rust
`retain_servers_order`) when you deliberately want a
preferred-server order. Most applications should leave it on so that a
restart of every `order-svc` instance doesn't overload one server.

`order-svc` opens against the `n1`/`n2`/`n3` cluster, used here only as a
pool of three URLs the client can reach, not as a thing this chapter
explains:

<div class="nats-example" data-type="learn-resilient-clients-connecting-pool" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Why the cluster exists, and how those three servers coordinate behind the
pool, belongs to [Topologies → Your first
cluster](/learn/topologies/your-first-cluster). This chapter treats the pool
as a fact: three URLs the client may dial.

## Discovered servers

Your configured URLs are one source for the pool; the cluster itself is the
other. Each server tells clients about its peers: the `INFO` message it
sends when a client connects (the [connect
handshake](#the-connect-handshake) below walks through it) carries a
`connect_urls` field listing the client addresses of the cluster
members, and the server sends a fresh `INFO` whenever that list changes,
for as long as the connection lives. This advertising is usually called
**gossip**. The client merges each list into its pool, and a pool entry
that arrived this way is a **discovered server**.

Discovered URLs behave like configured ones. They follow the same
randomization rule as the rest of the pool, and reconnect treats them as
candidates, so after a failure `order-svc` can rejoin the cluster on a
server no configuration ever named. The difference shows when the cluster
shrinks: a configured URL stays in the pool for the life of the connection,
while a discovered one can be dropped once the cluster stops advertising
it. Give `order-svc` nothing but `n1`, and its pool still holds
`n1`/`n2`/`n3` right after the first `INFO`.

Merging is on by default in every client; turning it off is where they
differ. Go (`IgnoreDiscoveredServers`), Java (`ignoreDiscoveredServers()`),
and Rust (`ignore_discovered_servers`) name the opt-out after discovered
servers; JavaScript calls it `ignoreClusterUpdates`. Python and C# have no
opt-out — those two always merge. The usual reason to opt out is
reachability: the cluster advertises addresses that may not be dialable
from the network your client runs in.

Some clients also signal when discovery adds a server to the pool. Go fires
the `DiscoveredServersCB` callback, Python `discovered_server_cb`, and Java
the `DISCOVERED_SERVERS` connection-listener event; JavaScript reports an
`update` status carrying the added and deleted URLs. Rust and C# have no
discovered-servers signal. The full set of connection callbacks is the
subject of [Connection
events](/learn/resilient-clients/connection-events) later in this chapter.

The CLI registers Go's callback for you: run any command with `--trace`,
and when a server the client hasn't seen before joins the cluster, it logs
`>>> Discovered new servers, known servers are now ...` with the whole
pool:

<div class="nats-example" data-type="learn-resilient-clients-connecting-discovered" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

All of this depends on the operator leaving advertising on: with
`no_advertise` set in the cluster configuration, `INFO` carries no
`connect_urls` and the pool stays exactly what you configured. That switch,
and the cluster behind it, belong to [Topologies → Your first
cluster](/learn/topologies/your-first-cluster).

## The connect timeout bounds the dial

Dialing a server isn't instant. The client resolves the hostname, opens a
TCP socket, and waits for the server to answer. Any of those steps can hang:
a wrong DNS entry, a firewall that drops packets, a server that's up but
overloaded. Without a bound, the client waits indefinitely.

The **connect timeout** is that bound. It caps how long a single dial may
block before the client gives up and tries the next URL in the pool. The
default is two seconds in most clients — five in Rust, twenty in
JavaScript — so check what yours uses. Two seconds is enough for a healthy
network and quick to move past a dead server; set the timeout deliberately
when your client's default is longer or your network is slower.

The timeout and a server pool complement each other. A pool gives the client
other URLs to try, and the timeout decides how long it waits on one URL before
trying the next. One unreachable server in the pool costs you one timeout, then
the client moves on to the next URL.

Here we cover only the options that change how a connection behaves under
fault; the exact option names and defaults live in your client's API
reference, while [Reference](/reference/) covers the wire protocol and server
configuration.

## The connect handshake

Naming a connection and pointing it at a pool decides which server the client
goes to. The **connect handshake** is what happens once it gets
there: the short exchange that turns a TCP socket into a working NATS
connection.

It runs in four steps, in order:

1. **TCP dial.** The client opens a socket to the chosen server. The connect
   timeout bounds this step.
2. **Server INFO.** The server immediately sends an `INFO` message
   describing itself: its `server_id`, its `max_payload`, whether
   authentication is required (`auth_required`), whether TLS is required
   (`tls_required`), and more.
3. **Client CONNECT.** The client replies with a `CONNECT` message carrying
   its name, any credentials, and the protocol features it supports, and
   immediately follows it with a `PING`.
4. **Server `PONG` or `-ERR`.** If the server accepts the connection it
   answers the `PING` with a `PONG`, and the connection is **CONNECTED** and
   messages may flow. If it rejects the connection it sends `-ERR` (for
   example `Authorization Violation`) and closes the socket. In verbose mode
   the server also acknowledges the `CONNECT` itself with `+OK`, but clients
   turn verbose off by default, so the `PONG` is what confirms the
   connection.

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
session later. A failed connect also isn't always a dead socket: the server
can accept the TCP connection and then reject it with an `-ERR` —
`maximum connections exceeded` when it's at its connection limit, for
example — so a retry loop around connect needs a wait between attempts,
just like the reconnect backoff on the next page.

**One URL is a single point of failure at connect time.** A connection
opened against a single server has nowhere to go if that server is
unreachable, and the connect fails. Don't hardcode one URL for a
production client. Pass the whole pool (several URLs, or several IPs behind
one name) so the client can fail over while it's still connecting.

**A one-URL configuration that depends on discovery fails where discovery
is off.** Give a client a single URL against a cluster and it usually still
fails over, because the first `INFO` filled its pool with the rest of the
cluster. That safety holds only while the operator leaves advertising on
and the advertised addresses are reachable from your client's network; with
`no_advertise` set, or with addresses your client can't dial, the pool is
one URL again — a single point of failure at connect and reconnect time.
Configure every server you want the client to rely on, and treat discovered
servers as additions.

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

<div class="nats-example" data-type="learn-resilient-clients-connecting-handle-connect-error" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Where you are

`order-svc` now opens its connection deliberately:

- It carries a name (`order-svc`), so the server can identify it.
- It points at a server pool (`n1`/`n2`/`n3`), randomized by default, so
  one unreachable server isn't fatal at connect time.
- Its pool grows with the servers the cluster advertises in
  `connect_urls`, so reconnect can land on a server you never configured.
- It bounds each dial with a connect timeout, so a blocked server costs
  one timeout and no more.

And you can read the connect handshake: TCP, the server's `INFO`, the
client's `CONNECT`, and the `PONG` that confirms CONNECTED, plus what
`auth_required` and `max_payload` in `INFO` mean for the client.

## What's next

The connection is open. The next fault to survive is the server going away
*after* it's open. [Reconnection](/learn/resilient-clients/reconnection)
makes `order-svc` cycle the same pool with backoff and jitter, and buffer its
publishes until it rejoins.

Continue to
[Reconnection](/learn/resilient-clients/reconnection).

## See also

- [Topologies → Your first cluster](/learn/topologies/your-first-cluster) —
  what the `n1`/`n2`/`n3` pool actually is on the server side.
- [TLS & Auth](/learn/resilient-clients/tls-and-auth) — supplying the
  credentials the handshake may demand when `auth_required` is set.
