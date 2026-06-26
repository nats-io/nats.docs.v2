---
id: slow-consumers
title: Slow Consumers
sidebar_position: 5
description: Bound a subscription's in-memory buffer so a slow handler surfaces backlog instead of silently exhausting memory
---

# Slow Consumers

So far the connection survives a server going away and exits cleanly on a
signal. Those faults come from the *outside* (the network, the server, a
deploy). This page covers a fault that comes from the *inside*: the
application itself can't keep up with the messages arriving for it.

`warehouse` subscribes to `orders.>` and does real work per message:
reserve stock, write a row, call an API. When orders arrive faster than
that work finishes, the gap has to go somewhere. It goes into an in-memory
queue whose default limits are generous, large enough that a high-rate or
large-message workload can fill them and start dropping messages before you
ever think to look. This page sizes that queue to *your* workload and makes
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
messages and 64 MB in the Go client, with similar defaults in the others.
Those caps stop the buffer from growing without end, but they're sized
for a typical workload, not yours. A high-rate subject or large messages
can fill 64 MB in seconds, and a `warehouse` that stays behind hits that
default and starts dropping messages, often well before you'd have set a
limit yourself. The defaults serve as a backstop rather than a workload-specific tuning.

A **slow consumer** is a subscriber whose pending buffer fills faster
than the handler drains it, which is what the name describes. On the default limits a
slow consumer drops messages on a busy enough day; the fix is to set
limits sized to your own workload, and to make the drops visible.

## Pending limits

The fix is to cap the buffer. **Pending limits** are the maximum number
of messages and the maximum number of bytes the client will hold in one
subscription's pending buffer. Whichever limit is hit first applies. You
set them per subscription, right after you subscribe.

Set `warehouse`'s pending limits so its buffer is bounded instead of
open-ended. The CLI can't set this knob; it's a client-library call. So
the CLI tab shows the closest thing, a plain subscribe, and the client
tabs carry the actual limit:

<div class="nats-example" data-type="learn-resilient-clients-slow-consumers-pending-limits" data-languages="cli,js,go,python,java,rust,csharp"></div>

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

The full set of connection options is documented in
[Reference](/reference/). Here we cover only the ones that change how a
connection behaves under fault.

## The slow-consumer signal

A bounded buffer raises a new question: what happens to the message that
arrives when the buffer is already full? The client doesn't block the connection
or silently corrupt the buffer. Instead the client drops the message
and fires the **async error callback**
with a slow-consumer error.

This is the **slow-consumer signal**: the overflow that would have grown
the buffer is dropped, and the drop is reported. In Go the error is
`ErrSlowConsumer`; every client surfaces the same condition under its own
spelling. The subscription stays active; it is not closed. Once the
handler catches up and the buffer has room, new messages arrive normally
again. The signal tells you that, for this stretch, the application
couldn't keep up and messages were lost.

The callback is the live alert, but you can also inspect the state
directly. The subscription's status becomes `SubscriptionSlowConsumer`
when overflow occurs, and `PendingLimits()` reports the buffer's current
message and byte counts. That's useful for a health check that watches how
close a subscription is running to its limits before it starts dropping.

That signal is only useful if something is listening for it. The async
error callback is set on the connection. It's the single place the
client reports asynchronous problems that aren't tied to one API call: a
slow consumer, a permission violation, a protocol error. A connection
with no async error callback discards these reports, and dropped
messages become invisible.

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
the reconnect logic from the previous page.

So the same phrase covers two outcomes. A *local* slow consumer drops
individual messages and keeps the connection; you tune it with pending
limits and the async error callback. A *server-side* slow consumer loses
the entire connection; you fix it by reading faster or by spreading the
load. Tracking the server's view (the `SlowConsumers` metric and the
advisories it emits) belongs with [Monitoring](/learn/monitoring). This
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

**A nil async error callback hides every dropped message.** Pending
limits without a callback are an incomplete fix: the buffer is bounded, but the
overflow is dropped silently and you never learn the application lost
data. The slow-consumer signal only reaches you if the connection has an
async error callback set. Always set one, and log the slow-consumer error
visibly — a quiet drop is worse than a crash because you don't even know
it happened.

Set up bounded limits *and* a callback that records every slow-consumer
drop, so a backlog is reported instead of causing silent data loss:

<div class="nats-example" data-type="learn-resilient-clients-slow-consumers-handle-slow-consumer" data-languages="cli,js,go,python,java,rust,csharp"></div>

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
- [Monitoring](/learn/monitoring) — the server's view of slow consumers
  and the advisories it emits
- [Reference](/reference/) — the full set of subscription and buffer
  options
