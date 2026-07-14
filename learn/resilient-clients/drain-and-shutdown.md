---
id: drain-and-shutdown
title: "Drain & Shutdown"
sidebar_position: 4
description: Exit a connection without dropping in-flight work by draining instead of closing
---

# Drain & Shutdown

The last page made `order-svc`'s connection survive a server going away.
This page handles the opposite event: your own process going away. When a
deploy rolls out, a pod is rescheduled, or an operator sends SIGTERM, your
client has a few seconds to disconnect cleanly.

The naive shutdown discards in-flight work. The `warehouse` subscriber
has messages sitting in its buffer that its handler hasn't run yet.
`order-svc` has a publish that hasn't reached the server. If the process
just exits, all of that is gone. This page replaces the naive shutdown
with one that finishes its in-flight work first.

Two concepts do that: the difference between **close** and **drain**, and
the **drain timeout** that bounds how long drain is allowed to take.

## Close drops in-flight work

A **close** is an abrupt teardown: the client shuts the TCP socket right
away, sends no UNSUB, and doesn't wait for in-flight work. In the client
libraries this is the `Close()` call. It flushes whatever is already in the
write buffer on its way out, but it stops delivering buffered inbound
messages to your handlers and drops the reconnect buffer. Killing the
process with `SIGKILL` is harsher still: it loses the write buffer too.

Two kinds of work are in flight at shutdown, and close treats them
differently.

An **in-flight message** is one the server has already delivered to the
subscriber but the handler hasn't finished; it's sitting in the
subscription's buffer waiting its turn. When `warehouse` closes, every
buffered `orders.created` event that hasn't run yet is dropped, and the
handler never sees it.

A pending publish is the other kind: `order-svc` called publish, but the
bytes are still in the client's write buffer, not yet on the wire. A
library `Close()` flushes that buffer as it tears down, so a clean close
usually still gets the order to the server; an abrupt exit — a crash or a
`SIGKILL` — loses it, because the write buffer dies with the process.

Close is the right call only when you're tearing down a connection you no
longer care about, such as a failed health check, a test, or an error path
where the work is already lost. For a planned shutdown, use drain instead.

## Drain finishes in-flight work, then closes

A **drain** is a graceful shutdown that flushes before it closes. Instead
of dropping in-flight work, the client winds the connection down in order
so nothing buffered is lost. In the client libraries this is the
`Drain()` call.

Drain runs in two phases, and the connection reports each one as a state.
First it enters **DRAINING_SUBS**: the client sends an UNSUB for every
subscription so the server stops delivering new messages, then it lets the
handlers finish every in-flight message already in the buffers. Once the
subscriptions are quiet, it enters **DRAINING_PUBS**: it flushes every
pending publish to the server. Only then does it close.

The order matters. Drain stops new work from arriving, lets existing work
complete, then pushes out anything queued before it closes last, whereas a
close goes straight to the close without those steps.

The animation shows these side by side. Close shuts the connection while
messages are still buffered; drain delivers those last messages to the
handlers, flushes the pending publish, and only then closes.

<div class="nats-flow" data-scenario="drainVsCloseAnimated" data-width="600" data-height="350"></div>

## Drain on a shutdown signal

The place to call drain is your process's shutdown handler. When the
runtime receives SIGTERM, instead of letting the process exit, you start
the drain and wait for the connection to report CLOSED before the process
exits. The `warehouse` subscriber drains its buffered orders; `order-svc`
flushes its pending publish. Both exit having handled everything they had.

How you wait for completion depends on the client. In JavaScript and Python
`await nc.drain()` resolves only once the drain is done. In Go `Drain()`
returns immediately and drains in the background, so you register a closed
handler (`nats.ClosedHandler`) and wait on it — returning from `Drain()` is
not the signal that draining finished, and a process that exits on that
return loses the very work drain was meant to save.

The `nats` CLI shows both sides of this on SIGINT. Press Ctrl-C against a
running `nats sub` and the process just exits, abandoning in-flight
messages — that's the close case. `nats reply`, by contrast, installs an
interrupt handler that calls `Drain()`: Ctrl-C against a running `nats
reply` unsubscribes, lets its in-flight requests finish, and then closes.
The client tabs show the real `Drain()` call wired to a SIGTERM handler.

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-drain-on-signal" data-languages="cli,js,go,python,java,rust,csharp"></div>

The message moving through the drain is the same order event as every
other page:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The two phases from above also decide what a late publish does. While the
connection is draining its subscriptions (DRAINING_SUBS), most clients still
accept a publish — deliberately, so a handler can send its reply as it
finishes. Once the connection moves on to flushing publishes (DRAINING_PUBS)
it refuses new ones, and a publish then returns a draining error
(`ErrConnectionDraining` in nats.go, the equivalent in each library). So a
publish issued right after `Drain()` races the phase change: it may slip
through or it may be rejected. That race, not a guaranteed error, is why
drain is the last thing your shutdown does, after the application has
stopped producing.

## The drain timeout bounds how long drain waits

Drain waits for handlers to finish, so a handler that hangs would hang
the shutdown forever. The **drain timeout** prevents that. It's the
deadline drain is allowed to take; if the in-flight handlers and the
pending flush don't complete within it, drain stops waiting, discards
whatever is left, and closes anyway. The client surfaces a drain-timeout
error (`ErrDrainTimeout` in nats.go) so you know the shutdown was cut
short rather than completed.

The default is generous (30 seconds in nats.go), but the right value
depends on your slowest handler. If a `warehouse` handler can take five
seconds to write an order to a database, a one-second drain timeout will
cut it off mid-write every deploy. Size the timeout to your handler
latency rather than to a round number.

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-drain-timeout" data-languages="cli,js,go,python,java,rust,csharp"></div>

The full set of connection options is documented in
[Reference](/reference/). Here we cover only the ones that change how a
connection behaves under fault.

## When the server drains first

Drain is usually something your client initiates. But the server can ask
for it. A server entering a graceful shutdown signals **lame duck**: its
INFO message carries a flag (`ldm`) telling connected clients it's about
to go away. A client that watches for it can stop publishing and
reconnect to another server in the pool before the link is cut, rather than
waiting to be disconnected.

Detecting lame duck is a callback your client sets, the same shape as the
reconnect callbacks from the last page. *Why* a server enters lame duck
(a rolling upgrade, a node drain) is a server-side decision covered in
[Topologies](/learn/topologies/your-first-cluster). Here it's just a
hint the client may act on.

## Pitfalls

Three mistakes turn a clean shutdown back into a lossy one. Each comes
back to this page's two concepts: drain versus close, and the drain
timeout.

**Publishing after you call drain.** Drain can't be reversed. Code that
calls `Drain()` and *then* tries to emit a final "shutting down" event is
racing the drain: depending on which phase the connection has reached, the
publish either slips through unnoticed or comes back with a draining error
(`ErrConnectionDraining` in nats.go) and the event is lost. You can't count
on either outcome. Drain last, after the application has stopped producing
work, so no publish ever has to win that race.

Handle the draining error instead of letting it look like success:

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-publish-after-drain" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A drain timeout shorter than your slowest handler.** When the timeout
fires, in-flight work is discarded rather than finished. Set it below the
time a handler actually needs and every deploy silently drops the orders
that were mid-handle. Measure your slowest handler and set the drain
timeout above it, with margin. Pick a number that covers the work rather
than a round one.

**Assuming a core drain acks your JetStream messages.** Drain winds down
the *connection*: it unsubscribes, finishes in-flight messages, and
flushes publishes. It does not acknowledge a JetStream consumer's
messages for you. An in-flight message from the `analytics` consumer that
the handler finishes during drain still needs its acknowledgment sent
before the connection closes, or JetStream will redeliver it to the next
client. Acknowledge JetStream work explicitly; how a consumer's position
moves is [JetStream → Acknowledgment](/learn/jetstream/acknowledgment),
not the connection's job.

## Where you are

`order-svc` and the `warehouse`, `notifications`, and `analytics`
subscribers now exit cleanly. A SIGTERM triggers a drain, not a close:
buffered orders are handled, pending publishes are flushed, and the drain
timeout keeps a stuck handler from hanging the shutdown forever. The
connection that survived a server going away on the last page now also
survives its own process going away.

## What's next

A connection can be lost from the outside (a server dying), and now it
can be torn down cleanly from the inside. The next failure is internal and
quieter: a subscriber whose handler can't keep up, so its buffer
fills faster than it drains. That's the **slow consumer**, and left
unbounded it grows until the process is killed.

Continue to [Slow Consumers](/learn/resilient-clients/slow-consumers).

## See also

- [JetStream → Acknowledgment](/learn/jetstream/acknowledgment) — what
  happens to a consumer's position for messages in flight at drain.
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster)
  — why a server enters lame duck and signals its clients to leave.
- [Reference](/reference/) — every connection option, including the drain
  timeout and its default.
