---
id: reconnection
title: 2. Reconnection
sidebar_position: 3
description: Survive a server going away — reconnect with backoff and jitter across the pool, and buffer publishes through the gap
---

# 2. Reconnection

On the last page `order-svc` opened a connection with a name, a server
pool, and a sane connect timeout. That connection works right up until
the server it landed on goes away — a restart, a deploy, a node lost in
the `n1`/`n2`/`n3` cluster. A naive client would simply die there.

This page makes the connection survive that. When the link drops, the
client does not give up: it cycles the server pool, waits a little
between tries, and rejoins. While it is away, the publishes the
application keeps making do not vanish — they queue and flush once the
link is back. By the end, `order-svc` and the JetStream consumers ride
through a server going away without the application noticing.

Two new ideas carry the page: **reconnect with backoff and jitter**, and
the **reconnect buffer**. We define each before we use it.

## The disconnect, and the RECONNECTING state

A **disconnect** is the moment the client notices the link is gone. The
client's read loop sees the socket close, or a keepalive PING goes
unanswered, and the connection leaves the CONNECTED state. The client
fires a disconnect callback so the application can log it — but it does
not close. Instead it moves to a new state: **RECONNECTING**.

In RECONNECTING the client is trying to re-establish the connection. It
walks the server pool — the same list of URLs from the connecting page —
dialing each in turn. The cluster is server-side; from the client's seat
it is just a pool of addresses to try. When one of them answers and the
handshake completes, the client returns to CONNECTED and fires a
reconnect callback.

```
CONNECTED ──disconnect──▶ RECONNECTING ──+OK──▶ CONNECTED
                              │
                              └──pool exhausted, retries spent──▶ CLOSED
```

Reconnect is on by default in every client. The option that governs it
is `AllowReconnect` — leave it true. Turning it off makes the connection
close on the first disconnect, which is rarely what a service wants.

## Backoff and jitter

The client does not hammer the pool. After it has tried every URL once
and none answered, it pauses before the next sweep. That pause is
**backoff**: the growing wait between reconnect attempts. Without it, a
client whose server just died would spin a tight dial loop and burn CPU
against a pool that is not ready yet.

The base wait is `ReconnectWait`, default two seconds. On top of that the
client adds **jitter** — a small random amount mixed into the wait so a
thousand clients that all lost the same server do not retry in lockstep
and stampede the survivor. The default jitter is 100ms on a plaintext
link and 1s on a TLS link, because a TLS handshake costs more and you
want the herd spread wider.

`MaxReconnect` bounds how many attempts the client makes before it gives
up and moves to CLOSED. The default is 60. For a long-lived service that
is the wrong value: you want it to keep trying forever. **A negative
`MaxReconnect` means retry without limit** — set it to `-1` for
`order-svc` so a long outage never closes the connection out from under
the service.

Here is `order-svc` connecting to the pool with reconnect tuned for a
long-lived service: unlimited retries, a two-second base wait, and
jitter left at its sensible default.

<div class="nats-example" data-type="learn-resilient-clients-reconnection-reconnect-options" data-languages="cli,js,go,python,java,rust,csharp"></div>

The published message is the same canonical order shape used everywhere
in this chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The full set of connection options is documented in
[Reference](/reference/). We cover only the ones that change how a
connection behaves under fault here.

## Watch a reconnect happen

You do not need a cluster to see this. Point a subscriber at a single
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
subscription was re-sent automatically on the new connection — you did
not re-issue `nats sub`.

Against the real `n1`/`n2`/`n3` pool the same thing happens, except the
client rejoins on a *different* server while the failed one is still
down. Why the node went away, and how the surviving nodes carry the load,
is the cluster's job — see [Topologies](/learn/topologies). From the
client's seat it is one disconnect and one reconnect.

## The reconnect buffer

A reconnecting client has a problem the subscriber demo hides: what about
the publishes the application makes *while the link is down*? `order-svc`
does not stop creating orders just because its server restarted.

The answer is the **reconnect buffer**: a client-side queue that holds
outbound publishes during RECONNECTING and flushes them, in order, the
moment the connection is back. The application calls `publish` as
normal; the client absorbs the gap. The default size is 8 MB
(`ReconnectBufSize`).

That buffer is bounded on purpose. If the outage runs long enough that
publishes pile past 8 MB, the next publish fails rather than letting the
client consume unbounded memory. In Go the error is
`ErrReconnectBufExceeded`; every client surfaces the same condition under
its own spelling. Treat that error as a signal to slow down or shed load,
not as something to ignore.

One thing the reconnect buffer does *not* do is restore a JetStream
consumer's place in the stream. When the connection comes back the
consumer re-subscribes, but where it was up to — what it had acknowledged
— is the JetStream layer's bookkeeping, not the connection's. That
boundary lives in
[JetStream → Acknowledgment](/learn/jetstream/acknowledgment).

<div class="nats-flow" data-scenario="reconnectBackoffAnimated" data-width="600" data-height="350"></div>

## Pitfalls

A few traps turn a working reconnect into a silent failure. Each is
scoped to this page's two ideas: backoff, and the reconnect buffer.

**The default retry limit gives up on a long outage.** `MaxReconnect`
defaults to 60. A service that hits a 60-attempt run of bad luck — a
rolling cluster upgrade, a long network partition — exhausts the count,
the connection moves to CLOSED, and it never comes back on its own. For
anything long-lived, set `MaxReconnect` to `-1` so the client retries
forever, and watch the reconnect-error callback so the outage is visible
in your logs rather than silent.

Wire up unlimited retries and a callback that records every failed
attempt, so a long outage is loud, not lethal:

<div class="nats-example" data-type="learn-resilient-clients-reconnection-handle-reconnect-errors" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A zero or fixed retry delay stampedes the survivor.** If you replace
the default backoff with a custom delay of zero, the client spins a tight
CPU loop against a pool that is not ready. If you make it a fixed delay
with no jitter, a fleet of clients that all lost the same server retry in
lockstep and hammer the one survivor at the same instant. Always keep a
non-zero wait, and always keep jitter — that is exactly what the herd
spreads across.

**A full reconnect buffer drops your next publish.** The reconnect buffer
is 8 MB by default, not infinite. A long outage with a busy publisher
overflows it, and the publish that overflows fails. Do not treat that
error as noise: catch it, back off publishing, and let the buffer drain
once the link returns rather than retrying the publish in a tight loop.

**A stale connection on an overloaded server hides for two minutes.** A
disconnect is usually instant, but a connection that is merely wedged —
the server alive but not reading — is only caught by the missed-keepalive
path, which can take up to two minutes at the default ping interval.
Under heavy load, lower the ping interval so a wedged link is detected in
seconds, not minutes. The full set of keepalive options is documented in
[Reference](/reference/).

## Where you are

`order-svc` and the JetStream consumers now survive a server going away.
You have:

- A connection that detects a disconnect and enters RECONNECTING instead
  of dying.
- Backoff plus jitter cycling the `n1`/`n2`/`n3` pool, with
  `MaxReconnect` set to `-1` for unlimited retries on a long-lived
  service.
- Subscriptions that auto-restore and publishes that buffer through the
  gap and flush on reconnect.

The connection rides through a fault. What it does not yet do is exit
*cleanly* — a `Ctrl+C` today drops whatever is in flight.

## What is next

The next mechanism is **drain and shutdown**: telling a connection to
unsubscribe, deliver the last in-flight messages to your handlers, flush
pending publishes, and only then close — so a deploy or a SIGTERM never
loses work.

Continue to [3. Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown).

## See also

- [Topologies](/learn/topologies) — why a server went away and how the
  surviving nodes carry the load.
- [JetStream → Acknowledgment](/learn/jetstream/acknowledgment) — what a
  consumer's position does across a reconnect.
- [Reference](/reference/) — the full set of reconnect and keepalive
  options.
