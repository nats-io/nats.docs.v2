---
id: reconnection
title: Reconnection
sidebar_position: 3
description: Survive a server going away — reconnect with backoff and jitter across the pool, and buffer publishes through the gap
---

# Reconnection

On the last page `order-svc` opened a connection with a name, a server
pool, and a sane connect timeout. That connection works right up until
the server it landed on goes away: a restart, a deploy, a node lost in
the `n1`/`n2`/`n3` cluster. A naive client stops there.

This page makes the connection survive that. When the link drops, the
client cycles the server pool, waits between tries, and rejoins. While
it's away, the publishes the application keeps making are retained: they
queue and flush once the link is back. By the end, `order-svc` and the
JetStream consumers continue through a server going away without the
application being affected.

Two new ideas carry the page: reconnect with backoff and jitter, and
the reconnect buffer. We define each before we use it. Backoff builds
on the state a dropped connection moves into, the RECONNECTING state,
so that's where we start.

## The disconnect, and the RECONNECTING state

A **disconnect** is the moment the client notices the link is gone. The
client's read loop sees the socket close, or a keepalive PING goes
unanswered, and the connection leaves the CONNECTED state. The client
fires a disconnect callback so the application can log it, but it
doesn't close. Instead it moves to a new state: **RECONNECTING**.

In RECONNECTING the client is trying to re-establish the connection. It
walks the server pool (the same list of URLs from the connecting page),
dialing each in turn. The cluster is server-side; from the client's seat
it's just a pool of addresses to try. When one of them answers and the
handshake completes, the client returns to CONNECTED and fires a
reconnect callback.

```
CONNECTED ──disconnect──▶ RECONNECTING ──PONG──▶ CONNECTED
                              │
                              └──pool exhausted, retries spent──▶ CLOSED
```

Reconnect is on by default in every client. The option that governs it
is `AllowReconnect`; leave it true. Turning it off makes the connection
close on the first disconnect, which is rarely what a service wants.

## Backoff and jitter

The client doesn't retry the pool at full rate. After it has tried every
URL once and none answered, it pauses before the next sweep. That pause
is **backoff**: a fixed wait plus jitter before each sweep. Without it, a
client whose server just died would spin a tight dial loop and consume CPU
against a pool that isn't ready yet. Go, Java, Python, and JavaScript use
the same wait on every sweep by default; you can opt into a wait that grows
over successive attempts with a custom reconnect-delay callback. The Rust
and .NET clients grow the wait on each attempt by default.

The base wait is `ReconnectWait`, default two seconds. On top of that
the client adds **jitter**, a small random amount mixed into the wait so
a thousand clients that all lost the same server don't retry in lockstep
and overload the remaining server. The default jitter is 100ms on a
plaintext link and 1s on a TLS link, because a TLS handshake costs more
and you want the retries spread wider.

`MaxReconnect` bounds how many attempts the client makes before it gives
up and moves to CLOSED. The default varies by client: 60 attempts in Go,
Java, and Python; 10 in JavaScript; and unlimited in Rust and C#, which
already retry forever. For a long-lived service, unlimited is what you
want. **A negative `MaxReconnect` means retry without limit.** Set it to
`-1` for `order-svc` in the clients that default to a bounded count, so a
long outage never closes the connection out from under the service; Rust
and C# need no change (Rust expresses "unlimited" by leaving its
max-reconnects option unset).

Here's `order-svc` connecting to the pool with reconnect tuned for a
long-lived service: unlimited retries, a two-second base wait, and
jitter left at its sensible default.

<div class="nats-example" data-type="learn-resilient-clients-reconnection-reconnect-options" data-languages="cli,js,go,python,java,rust,csharp"></div>

The published message is the same canonical order shape used everywhere
in this chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The full set of connection options lives in [Reference](/reference/).
Here we cover only the ones that change how a connection behaves under
fault.

## Observe a reconnect

You don't need a cluster to see this. Point a subscriber at a single
`nats-server`, then kill and restart that server underneath it. The
client logs the disconnect, cycles its pool, and rejoins on its own.

In one terminal, start a server:

```bash
nats-server
```

In a second terminal, subscribe with reconnect logging on:

```bash
nats sub "orders.>" --connection-name order-svc
```

Now go back to the first terminal, stop the server with `Ctrl+C`, and
start it again. The subscriber prints a disconnect, then a reconnect a
moment later, and resumes receiving without you restarting it. The
subscription was re-sent automatically on the new connection; you
didn't re-issue `nats sub`.

Against the real `n1`/`n2`/`n3` pool the same thing happens, except the
client rejoins on a *different* server while the failed one is still
down. Why the node went away, and how the surviving nodes carry the
load, is the cluster's job; see [Topologies](/learn/topologies). From
the client's seat it's one disconnect and one reconnect.

## The reconnect buffer

A reconnecting client has a problem the subscriber demo doesn't show:
what about the publishes the application makes *while the link is down*?
`order-svc` doesn't stop creating orders just because its server
restarted.

The answer is the **reconnect buffer**: a client-side queue that holds
outbound publishes during RECONNECTING and flushes them, in order, the
moment the connection is back. The application calls `publish` as
normal; the client holds the publishes through the gap. The default size
is 8 MB in the Go and Java clients (`ReconnectBufSize`) and 2 MB in
Python; the Rust client instead applies backpressure on a bounded queue,
covered below.

Flush is not a delivery guarantee. On reconnect the client first
restores its subscriptions, then re-sends the buffered publishes over
the new connection in the order they were made. Each one is still a
plain core publish, carrying the same at-most-once guarantee as any
other. The buffer holds the publishes through the gap, but it doesn't
turn a publish into a durable, acknowledged write. For the exact flush
sequence and option knobs, see [Reference](/reference/).

That buffer is bounded on purpose. If the outage runs long enough that
publishes accumulate past the limit, the client protects itself rather
than consuming unbounded memory — but how it does so differs by client.
Go, Java, and Python fail the next publish (in Go the error is
`ErrReconnectBufExceeded`), so you catch the error and shed load. The Rust
client instead applies backpressure: its publish blocks on a bounded queue
until there's room rather than returning an error. Either way, an
overflowing buffer is a signal to slow down; don't ignore it.

One thing the reconnect buffer does *not* do is restore a JetStream
consumer's place in the stream. When the connection comes back the
consumer re-subscribes, but where it was up to (what it had
acknowledged) is the JetStream layer's bookkeeping, not the
connection's. That boundary lives in
[JetStream → Acknowledgment](/learn/jetstream/acknowledgment).

<div class="nats-flow" data-scenario="reconnectBackoffAnimated" data-width="600" data-height="350"></div>

## Pitfalls

A few traps turn a working reconnect into a silent failure. Each comes
back to this page's two ideas: backoff and the reconnect buffer.

**A bounded retry limit gives up on a long outage.** `MaxReconnect`
defaults to a finite count in several clients (60 in Go, Java, and Python;
10 in JavaScript). A service that exhausts that count during a long run of
bad luck (a rolling cluster upgrade, a long network partition) moves to
CLOSED and never comes back on its own. For anything long-lived, set
`MaxReconnect` to `-1` so the client retries forever, and watch the
reconnect-error callback so the outage is visible in your logs rather than
silent. (The Rust and C# clients already retry forever by default.)

Wire up unlimited retries and a callback that records every failed
attempt, so a long outage is logged rather than silently fatal:

<div class="nats-example" data-type="learn-resilient-clients-reconnection-handle-reconnect-errors" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A zero wait or a jitter-free delay overloads the remaining server.** If
you replace the default wait with a custom delay of zero, the client spins
a tight CPU loop against a pool that isn't ready. If you strip the jitter
and leave a bare fixed delay, a fleet of clients that all lost the same
server retry in lockstep and hit the one remaining server at the same
instant. Keep a non-zero wait, and keep the jitter that spreads those
retries across time.

**A full reconnect buffer stalls or drops your next publish.** The
reconnect buffer is bounded, not infinite (8 MB by default in Go and Java,
2 MB in Python). A long outage with a busy publisher overflows it, and
depending on the client the overflowing publish either fails with an error
(Go: `ErrReconnectBufExceeded`) or blocks under backpressure (Rust).
Either way, back off publishing and let the buffer drain once the link
returns instead of hammering publish in a tight loop.

**A stale connection on an overloaded server can go undetected for
minutes.** A disconnect is usually instant, but a connection that's merely
wedged (the server alive but not reading) is only caught by the
missed-keepalive path. The client declares the link stale once the
outstanding pings exceed `MaxPingsOut`, so with the defaults — a two-minute
ping interval and two allowed outstanding pings — detection waits for the
third unanswered ping, up to about six minutes. Under heavy load, lower the
ping interval (and, if you need to, `MaxPingsOut`) so a wedged link is
detected in seconds instead of minutes. The full set of keepalive options
is in [Reference](/reference/).

## Where you are

`order-svc` and the JetStream consumers now survive a server going away.
You have:

- a connection that detects a disconnect and enters RECONNECTING instead
  of dying
- backoff plus jitter cycling the `n1`/`n2`/`n3` pool, with
  `MaxReconnect` set to `-1` for unlimited retries on a long-lived
  service
- subscriptions that auto-restore, and publishes that buffer through the
  gap and flush on reconnect

The connection rides through a fault. What it doesn't yet do is exit
*cleanly*: a `Ctrl+C` today drops whatever is in flight.

## What's next

The next mechanism is **drain and shutdown**: telling a connection to
unsubscribe, deliver the last in-flight messages to your handlers, flush
pending publishes, and only then close, so a deploy or a SIGTERM never
loses work.

Continue to [Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown).

## See also

- [Topologies](/learn/topologies) — why a server went away and how the
  surviving nodes carry the load.
- [JetStream → Acknowledgment](/learn/jetstream/acknowledgment) — what a
  consumer's position does across a reconnect.
- [Reference](/reference/) — the full set of reconnect and keepalive
  options.
