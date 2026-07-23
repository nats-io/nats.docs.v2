---
id: slow-consumers
title: Slow Consumers
sidebar_position: 6
description: Bound a subscription's in-memory buffer so a slow handler surfaces backlog instead of silently exhausting memory
---

# Slow Consumers

So far the connection survives a server going away and exits cleanly on a
signal. Those faults come from the *outside* (the network, the server, a
deploy). This page covers a fault that comes from the *inside*: the
application itself can't keep up with the messages arriving for it.

`warehouse` subscribes to `orders.>` and does real work per message:
reserve stock, write a row, call an API. When orders arrive faster than
that work finishes, the client queues the extra messages in memory. That
queue's default limits are generous, large enough that a high-rate or
large-message workload can fill them and start dropping messages before you
think to look. This page sizes that queue to *your* workload and makes
the overflow visible.

Two new ideas carry the page: the subscription pending buffer with its
pending limits, and the slow-consumer signal. We'll define each before we
use it.

## The subscription pending buffer

When you subscribe asynchronously, handing the client a callback to run
per message, the client doesn't run your callback the instant a message
arrives off the socket. It places the message in a per-subscription
queue and lets your handler drain that queue at its own pace. That queue
is the **subscription pending buffer**: messages that have arrived for a
subscription but the handler hasn't processed yet.

The buffer exists so a brief burst doesn't block the read loop. A
handler that takes 50ms can absorb a short spike of fast arrivals because
the buffer holds them while it catches up. This is normal and healthy.
The problem is what the buffer does by default when the burst is *not*
brief.

By default the pending buffer has generous built-in limits: 500,000
messages and 64 MB in the Go client, and similarly large caps in Python
and Java. Those caps stop the buffer from growing without end, but they're
sized for a typical workload, not yours. A high-rate subject or large
messages can fill 64 MB in seconds, and a `warehouse` that stays behind
hits that default and starts dropping messages, often well before you'd
have set a limit yourself. The defaults serve as a backstop rather than a
workload-specific tuning.

The size and the full-buffer behavior vary by client, though. The Rust
client defaults to a 65,536-message buffer per subscription, and JavaScript
leaves the buffer unbounded and never drops on the client side — its
slow-consumer option only raises a status. C# defaults to a 1,024-message
channel, and its two APIs differ on overflow: the low-level `NatsConnection`
drops the newest queued message and raises a `MessageDropped` event, while
the `NatsClient` wrapper waits instead, which blocks the read loop rather
than dropping. Check your client's default before you rely on one.

A **slow consumer** is a subscriber whose pending buffer fills faster
than the handler drains it. On the default limits a
slow consumer drops messages on a busy enough day; the fix is to set
limits sized to your own workload, and to make the drops visible.

## Pending limits

The fix is to cap the buffer. **Pending limits** are the maximum number
of messages and the maximum number of bytes the client will hold in one
subscription's pending buffer. Whichever limit is hit first applies. Where
you set them varies by client: Go and Java set them on the subscription
after subscribing, Python and C# pass them as subscribe options, and Rust
sets a single `subscription_capacity` on the connection options that applies
to every subscription. Rust and C# cap message count only, not bytes.

Set `warehouse`'s pending limits so its buffer is bounded instead of
open-ended. The CLI can't set this knob; it's a client-library call. So
the CLI example shows the closest thing, a plain subscribe, and the text
above names the actual limit calls:

<div class="nats-example" data-type="learn-resilient-clients-slow-consumers-pending-limits" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The messages flowing through carry the same canonical order shape used
everywhere in this chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Choose the numbers by sizing rather than by guessing. A limit sized to
roughly the handler's latency times the subject's peak rate gives the
buffer enough room to absorb a normal burst without letting a stuck
handler hold an open-ended backlog. Too tight and you drop messages during
traffic that the handler could have caught up on; too loose and you waste
memory holding a backlog the handler will never catch up on.

Here we cover only the options that change what happens when the handler
falls behind; the exact option names and defaults live in your client's
API reference, while [Reference](/reference/) covers the wire protocol and
server configuration.

## The slow-consumer signal

A bounded buffer raises a new question: what happens to the message that
arrives when the buffer is already full? Most clients drop that message
and fire the **async error callback** with a slow-consumer error rather
than blocking the read loop.

This is the **slow-consumer signal**: the overflow that would have grown
the buffer is dropped, and the drop is reported. In Go the error is
`ErrSlowConsumer`, and most clients report an equivalent — though, as noted
above, the behavior isn't universal (JavaScript, for one, raises a
slow-consumer status without dropping the message). The subscription stays
active; it is not closed. Once the
handler catches up and the buffer has room, new messages arrive normally
again. The signal tells you that, for this stretch, the application
couldn't keep up and messages were lost.

The callback is the live alert, but you can also inspect the state
directly. In Go, the subscription's status becomes `SubscriptionSlowConsumer`
when overflow occurs, and `Pending()` reports the buffer's current message
and byte counts, which you compare against the caps that `PendingLimits()`
returns. That's useful for a health check that watches how close a
subscription is running to its limits before it starts dropping.
(`Dropped()` gives the running count of messages already dropped.) Other
clients expose the same pending and dropped counts under their own names.

That signal is only useful if something is listening for it. The async
error callback is set on the connection. It's the single place the
client reports asynchronous problems that aren't tied to one API call: a
slow consumer, a permission violation, a protocol error. In Go a connection
with no async error callback discards these reports, and dropped messages
become invisible; Rust, JavaScript, and C# behave the same way unless you
wire up their event callback, status iterator, or logger. Java and Python
fall back to a default handler that writes the report to the client's
logger, which only helps if you collect those logs. Either way, set your
own callback and route it somewhere you watch.

<div class="nats-flow" data-scenario="slowConsumerAnimated" data-width="600" data-height="350"></div>

The animation shows the sequence: `order-svc` publishes fast, the
server delivers to `warehouse`, the pending buffer fills, and the message
that overflows is dropped while the async error callback fires. The
handler is still working through the backlog the whole time.

## Two different "slow consumers"

The signal above is the *client's* view: your handler is slow, your
buffer overflows, your callback fires, and the connection lives on.
There's a second, distinct failure that has the same name from the
*server's* side, and the two are worth keeping apart because they need
different fixes.

If a client reads off its socket so slowly that the server can't finish
writing to it within the server's per-client write deadline, the server
gives up on that client and closes the *whole connection*. From the
client's perspective this doesn't look like a dropped message and an async
error. It looks like a disconnect with a read error, which then drives
the reconnect logic from [Reconnection](/learn/resilient-clients/reconnection).

So the same phrase covers two outcomes. A *local* slow consumer drops
individual messages and keeps the connection; you tune it with pending
limits and the async error callback. A *server-side* slow consumer loses
the entire connection; you fix it by reading faster or by spreading the
load. Tracking the server's view (the `slow_consumers` counter on `/varz`)
belongs with [Monitoring](/learn/monitoring). This
page stops at what the client sees and controls.

When one subscriber genuinely can't keep up with a subject's rate, the
real answer is usually not a bigger buffer but more subscribers sharing
the load. A queue group spreads `orders.>` across a pool of
`warehouse` workers so each handles a fraction of the rate. That pattern
is Core NATS, covered in [Core NATS](/learn/core-nats); pending limits
protect each individual member of that pool.

## Pitfalls

A few mistakes turn a slow handler into a silent outage. Each is scoped to
this page's two ideas: pending limits and the slow-consumer signal.

**The default limits are a backstop rather than a workload-specific tuning.** The pending buffer
ships with roomy defaults (500,000 messages and 64 MB in the Go client)
that a high-rate or large-message subject can fill in seconds. A
subscriber that falls behind during a busy hour hits those defaults and
starts dropping messages, often before you'd have set a limit at all.
Always set pending limits on a subscription that does real per-message
work, and size them to the handler's latency and the subject's peak rate
rather than relying on caps sized for someone else's workload.

**An unwatched async error callback hides every dropped message.** Pending
limits without a callback are an incomplete fix: the buffer is bounded, but the
overflow is dropped silently and you never learn the application lost
data. The slow-consumer signal only reaches you if the connection has an
async error callback set. Always set one, and log the slow-consumer error
visibly — a quiet drop is worse than a crash because you don't even know
it happened.

Set up bounded limits *and* a callback that reports slow-consumer overflow,
so a backlog is reported instead of causing silent data loss. The callback
fires when the subscription enters the slow-consumer state, not once per
dropped message; in Go, read `Dropped()` for the running count of lost
messages:

<div class="nats-example" data-type="learn-resilient-clients-slow-consumers-handle-slow-consumer" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**Don't confuse the local drop with the server-side disconnect.** A burst
of slow-consumer errors on the async callback means your handler is too
slow and individual messages are being dropped; the connection is fine.
A disconnect with a read error means the *server* gave up writing to a
client that drained its socket too slowly: a different failure with a
different fix. Treating one as the other leads you to change the wrong setting.
Watch the async-error rate and the disconnect rate separately.

## Where you are

`warehouse`, `notifications`, and `analytics` no longer drop orders
silently when traffic outruns the handler. You have:

- pending limits sized to each subscription's own workload, instead of
  the one-size-fits-all defaults that drop messages on a busy enough day
- an async error callback that surfaces the slow-consumer signal, so a
  dropped message is logged rather than lost in silence
- a clear line between a local overflow (drops messages, keeps the
  connection) and a server-side slow consumer (loses the whole
  connection)

The connection now survives outside faults and inside backlog. What it
doesn't yet do is make a *request* resilient: a `request()` that times
out or finds no responder still fails on the first try.

## What's next

The next mechanism is **request-reply resilience**: telling "the
responder is slow" apart from "no responder exists at all", and retrying
each case correctly without sending the same order twice.

Continue to [Request-Reply Resilience](/learn/resilient-clients/request-reply-resilience).

## See also

- [Core NATS](/learn/core-nats) — queue groups, the way to spread a busy
  subject across many subscribers
- [Monitoring](/learn/monitoring) — the server's view of slow consumers,
  the `slow_consumers` counter on `/varz`
- [Reference](/reference/) — the wire protocol and server configuration;
  the subscription and buffer option names and defaults live in your
  client's API reference
