---
id: drain-and-shutdown
title: "Drain & Shutdown"
sidebar_position: 5
description: Exit a connection without dropping in-flight work by draining instead of closing
---

# Drain & Shutdown

The last page made the connection's state machine observable — every
transition wired to a callback, the current state readable for a health
check. This page drives one of those transitions on purpose: the clean
exit, when your own process goes away. When a deploy rolls out, a pod is
rescheduled, or an operator sends SIGTERM, your client has a few seconds to
disconnect cleanly.

The naive shutdown discards in-flight work. The `warehouse` subscriber
has messages sitting in its buffer that its handler hasn't run yet.
`order-svc` has a publish that hasn't reached the server. If the process
just exits, all of that is gone. This page replaces the naive shutdown
with one that finishes its in-flight work first.

Two concepts do that: the difference between close and drain, and the
drain timeout that bounds how long drain is allowed to take. After those,
the page narrows the same idea twice: a drain scoped to one subscription,
and flush, the server round trip that drain uses internally.

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
so nothing buffered is lost. In most client libraries this is the
`Drain()` call; the C# client instead drains on dispose when you set
`DrainSubscriptionsOnDispose`.

Drain runs in two phases. In nats.go and nats.py the connection reports
each phase as a state — **DRAINING_SUBS**, then **DRAINING_PUBS** — while
the other clients keep the phases internal. First the client sends an UNSUB
for every subscription so the server stops delivering new messages, then it
lets the handlers finish every in-flight message already in the buffers.
Once the subscriptions are quiet, it flushes every pending publish to the
server. Only then does it close.

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

The `nats` CLI shows the close case on SIGINT: press Ctrl-C against a
running `nats sub` and the process just exits, abandoning in-flight
messages. `nats reply`, by contrast, installs an interrupt handler that
calls `Drain()` on Ctrl-C — the right place for the call. It exits as soon
as `Drain()` returns, though, without waiting for the background drain to
complete, so it shows where the drain belongs rather than a finished drain.
That's the Go pitfall from the previous paragraph in practice: exiting on
`Drain()`'s return abandons the work drain was meant to save. In client
code the full pattern is `Drain()` wired to a SIGTERM handler that waits
for CLOSED before the process exits.

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-drain-on-signal" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
the shutdown forever. The **drain timeout** prevents that. In nats.go and
nats.py it's the deadline for the subscription phase: if the in-flight
handlers don't finish within it, drain stops waiting, discards the messages
that are left, and moves on to the final flush and close anyway. (The
pending-publish flush has its own short bound — five seconds, hardcoded, in
nats.go. In nats.java the timeout you pass to `drain()` covers the final
flush too.) The client surfaces a drain-timeout error (`ErrDrainTimeout` in
nats.go) so you know the shutdown was cut short rather than completed.

The default is generous (30 seconds in nats.go), but the right value
depends on your slowest handler. If a `warehouse` handler can take five
seconds to write an order to a database, a one-second drain timeout will
cut it off mid-write every deploy. Size the timeout to your handler
latency rather than to a round number.

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-drain-timeout" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Here we cover only the options that change how a connection behaves under
fault; the exact option names and defaults live in your client's API
reference, while [Reference](/reference/) covers the wire protocol and
server configuration.

## Draining a single subscription

`Drain()` on the connection winds down everything the connection holds:
every subscription, then the pending publishes, then the socket. Often the
shutdown is smaller than that — one subscriber rotates out for a deploy
while the process and its other subscriptions keep working. For that, most
clients put drain on the subscription itself: it unsubscribes, so the
server stops sending, lets the handler finish the messages already
buffered for that one subscription, and leaves the connection and every
other subscription open.

The `warehouse` subscribers run as a queue group ([Core NATS →
Queue groups](/learn/core-nats/queue-groups) covers the mechanism):
several members share the `orders.>` load. Rotating one member out is the canonical use. Drain that
member's subscription and it finishes the orders it holds while the server
keeps delivering new orders to the remaining members; nothing is dropped
and the group never stops consuming.

The call is `Subscription.Drain()` in Go and `sub.drain()` in JavaScript
and Python. Java puts `drain(Duration)` on both a `Subscription` and a
`Dispatcher`, returning a future that completes when the drain does. In
Rust, `Subscriber::drain()` unsubscribes immediately and the subscriber's
stream ends once the remaining messages are delivered.

C# is the exception: it has no drain call on a single subscription.
Disposing a subscription unsubscribes and completes its message channel at
once, so messages still on their way from the server are dropped. The
drain it does offer is the connection-level opt-in from earlier on this
page, `DrainSubscriptionsOnDispose`. It defaults to `false`; when set,
disposing the connection first drains each remaining subscription — an
UNSUB, then a PING/PONG round trip (bounded by `DrainPingTimeout`, five
seconds by default) that lets the last messages arrive before the channel
completes. Leave it off and a dispose silently drops whatever the handler
hadn't reached yet, so set it on any C# service whose subscriptions do
real work.

The CLI can't demonstrate a per-subscription drain: `nats sub` holds
exactly one subscription, and Ctrl-C closes it, as this page covered. The
CLI example runs one `warehouse` queue-group member — the subscriber a
client would then rotate out with a subscription drain:

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-drain-subscription" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Flush

Drain's last phase pushes every pending publish to the server before the
connection closes. You can ask for that barrier on its own, with nothing
shutting down. A **flush** sends a PING to the server and waits for the
PONG. The server processes what a connection sends in order, so when the
PONG comes back, the server has also received everything the client wrote
before the PING — including every buffered publish. For a fire-and-forget
publish, that round trip is the only confirmation there is: after a flush
returns, the orders `order-svc` published are on the server.

Flush confirms receipt by the server and stops there: it doesn't tell you
any subscriber saw the message, and it isn't an acknowledgment that a
message was stored — storage confirmations are JetStream publish acks
([JetStream → Publishing](/learn/jetstream/publishing)).

In Go the call is `Flush()`, with a fixed ten-second timeout, or
`FlushTimeout()` with a bound you pick. Python's `nc.flush()`, Java's
`flush(Duration)`, and JavaScript's `await nc.flush()` do the same round
trip. C# has no flush call; `PingAsync()` is the same PING/PONG and
returns the elapsed time. The Rust client differs in substance: its
`client.flush()` resolves once the buffered writes have reached the
socket, without waiting for the server's PONG, so it confirms the bytes
left the client rather than that the server received them.

Drain already ends with this flush, so a drained shutdown doesn't need one
of its own. Call flush at the checkpoints drain doesn't cover: after
`order-svc` publishes a burst of orders and before the code treats the
batch as sent, or before a close on an error path where you still want the
buffered writes to reach the server.

The same round trip, timed, is the client's latency probe. Go has `RTT()`,
Python `rtt()`, Java `RTT()`, and JavaScript `rtt()`; C#'s `PingAsync()`
returns the duration directly, and Rust's async client exposes neither the
probe nor a round-trip flush. The `nats` CLI has the probe as `nats rtt`:
for each server it can reach, it runs five round trips and prints the
averaged time per address. Flush itself is a library call with no CLI
equivalent, so the CLI example shows `nats rtt` against the pool; the
flush itself is the client-library call:

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-flush" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## When the server drains first

Drain is usually something your client initiates. But the server can ask
for it. A server entering a graceful shutdown signals **lame duck**: its
INFO message carries a flag (`ldm`) telling connected clients it's about
to go away. A client that watches for it can stop publishing and
reconnect to another server in the pool before the link is cut, rather than
waiting to be disconnected.

That INFO also updates the server list a reconnecting client picks from:
the departing server sends `connect_urls` holding only the *other*
servers, with its own address removed, so a reconnecting client won't
pick the server that's leaving. The advertised list, and the
`no_advertise` switch that empties it, are covered earlier in this chapter
under [Discovered
servers](/learn/resilient-clients/connecting#discovered-servers).

Detecting lame duck is a callback your client sets, one of the connection
events from the [last page](/learn/resilient-clients/connection-events). *Why* a server enters lame duck
(a rolling upgrade, a node drain) is a server-side decision covered in
[Topologies](/learn/topologies/your-first-cluster). Here it's just a
hint the client may act on.

## Pitfalls

Three mistakes turn a clean shutdown back into a lossy one.

**Publishing after you call drain.** Drain can't be reversed. Code that
calls `Drain()` and *then* tries to emit a final "shutting down" event is
racing the drain: depending on which phase the connection has reached, the
publish either slips through unnoticed or comes back with a draining error
(`ErrConnectionDraining` in nats.go) and the event is lost. You can't count
on either outcome. Drain last, after the application has stopped producing
work, so no publish ever has to win that race.

Handle the draining error instead of letting it look like success:

<div class="nats-example" data-type="learn-resilient-clients-drain-and-shutdown-publish-after-drain" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
timeout keeps a stuck handler from hanging the shutdown forever. A single
`warehouse` queue-group member can rotate out with a subscription drain
while the rest of the group keeps consuming, and a flush confirms the
server received `order-svc`'s publishes without shutting anything down.
The connection that survives a server going away now also survives its own
process going away.

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
- [JetStream → Publishing](/learn/jetstream/publishing) — the publish ack,
  the storage confirmation that flush is not.
- [Core NATS → Queue groups](/learn/core-nats/queue-groups) — the queue
  group whose member a subscription drain rotates out.
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster)
  — why a server enters lame duck and signals its clients to leave.
- [Reference](/reference/) — the wire protocol and server configuration;
  the drain timeout and every other connection option, with its default,
  live in your client's API reference.
