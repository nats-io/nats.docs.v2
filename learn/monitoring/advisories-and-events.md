---
id: advisories-and-events
title: "Advisories & events"
sidebar_position: 4
description: Subscribe to JetStream advisories and system events to learn about things you never polled for
---

# Advisories & events

The two pages before this one read state on demand. You `curl` the
monitoring port `:8222` and it answers with the numbers as they are right
now. That works when you know *which* number to ask about and *when* to
ask. It does nothing for events that happen between two polls.

The `shipping` consumer falling behind is a number you can poll for: its
lag climbs and you see it on the next scrape. But a poison order that
exhausts its deliveries is a one-time event rather than a level you read.
By the time your next scrape runs, the moment has passed and the counter
that ticked is now part of an aggregate. You need NATS to tell you the
instant it happens.

This page covers the two streams of events NATS publishes for exactly
that: advisories on the `$JS.EVENT.ADVISORY.*` subjects, and system
events on the `$SYS.*` subjects. Both arrive as ordinary messages you
subscribe to. You don't request either one; the server pushes them to you.

## Advisories

An **advisory** is a transient JSON message that JetStream publishes once,
the moment something noteworthy happens to a stream or a consumer. It's a
normal NATS message on a well-known subject. You subscribe to it the same
way you subscribe to any subject.

Advisories live under one subject tree:

```
$JS.EVENT.ADVISORY.>
```

Every JetStream advisory lands somewhere under that prefix. The leaf of
the subject names the event and the entities it's about. When a message
on the `shipping` consumer exhausts its delivery attempts, the server
publishes one advisory here:

```
$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.shipping
```

The stream name and consumer name are baked into the subject, so a
subscriber can choose a wildcard that matches exactly the events it
cares about: all advisories for `ORDERS`, or only max-delivery events
for `shipping`.

Subscribe to the whole advisory tree and receive these events from the
deployment:

<div class="nats-example" data-type="learn-monitoring-advisories-and-events-subscribeAdvisories" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

When the poison order finally exceeds its delivery limit, one message
arrives. Its body names the stream, the consumer, the sequence that
failed, and how many times delivery was attempted:

```json
{
  "type": "io.nats.jetstream.advisory.v1.max_deliver",
  "stream": "ORDERS",
  "consumer": "shipping",
  "stream_seq": 987,
  "deliveries": 5
}
```

That is the whole event: stream sequence `987` was delivered five times,
never acked, and JetStream stopped attempting delivery. The message itself
stays in the `ORDERS` stream under its retention policy; what stops is
delivery to `shipping`. The `max_deliver` advisory is the only built-in
signal that this happened. There's no dead-letter queue, and the advisory
is published once. If no one is subscribed when it fires, you never learn
that order `987` stopped being delivered.

The `max_deliver` advisory is one type among several. JetStream also
publishes a `consumer_action` advisory when a consumer is created or
deleted, a `nak` advisory when a handler explicitly negative-acks a
message, and a `terminated` advisory when a message is removed from
delivery. Each is a different leaf under `$JS.EVENT.ADVISORY.>`, and each
carries its own JSON body. The full set of advisory types and their
schemas is documented in
[Reference → JetStream advisories](/reference/jetstream/advisory). We only need the
`max_deliver` advisory here, because it's the one that tells you an order
slipped through.

### The leader-elected advisory

One advisory is worth calling out separately. When the leader of a replicated
stream or consumer changes, JetStream publishes a leader-elected advisory
naming the new leader. You'll see it in the same `$JS.EVENT.ADVISORY.>`
subscription, and a flapping leader showing up here is worth watching.

This page covers *observing* that it happened. *Why* a leader
changed (how the election ran, what quorum is, which peer won) is
clustering mechanics rather than monitoring. When you want to understand the
election behind the advisory, that lives in
[Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders). Here,
the advisory is a fact you receive, and this page does not explain the process.

## System events

The second stream of events is broader than JetStream. A **system event**
is a message the server publishes on the `$SYS.*` subjects to report
server- and account-level activity: connections opening and closing, and
a periodic server heartbeat.

The two you'll reach for first are the connection events. Every time a
client connects, the server publishes:

```
$SYS.ACCOUNT.ORDERS.CONNECT
```

and the matching `$SYS.ACCOUNT.ORDERS.DISCONNECT` when it leaves. The
account is baked into the subject, so `$SYS.ACCOUNT.ORDERS.CONNECT` watches
`order-svc` in the `ORDERS` account. `analytics-reader` lives in the
`ANALYTICS` account and publishes on `$SYS.ACCOUNT.ANALYTICS.CONNECT`
instead. Subscribe to `$SYS.ACCOUNT.*.CONNECT` to watch clients across
every account come and go without polling `/connz` on a timer.

Alongside connections, each server publishes a `STATSZ` heartbeat on
`$SYS.SERVER.<id>.STATSZ` on a fixed interval. It carries the same kind of
summary numbers as `/varz`, pushed instead of pulled, so a listener has a
steady pulse from every node in the `east` cluster.

System events are published into the **system account**, not your
application account. To subscribe to `$SYS.*` you connect as a system
user, which is a separate privilege from the `ORDERS` account `order-svc`
uses. Setting that up is a security task, covered in
[Security → Authorization](/learn/security/authorization). The full set of
`$SYS.*` subjects is documented in
[Reference → Advisories](/reference/system/advisory). We only need the
connect and disconnect events here.

<div class="nats-flow" data-scenario="advisoryFlowAnimated" data-width="600" data-height="350"></div>

The animation shows the property that makes advisories tricky. The
JetStream layer publishes one advisory the instant the poison order hits
its limit. A subscriber attached *before* that moment receives it. A
subscriber that connects *after* receives nothing: the message was
published once and is already gone.

## Pitfalls

These pitfalls are scoped to this page's two concepts: advisories and system
events. Each one comes down to the same property: these are messages that
pass by, whereas the monitoring endpoints expose levels you read.

**Advisories are transient.** An advisory is published exactly once, the
moment its event fires, and it is not stored in any stream. If you're not
subscribed at that instant, you never learn the event happened. A live
`nats subscribe '$JS.EVENT.ADVISORY.>'` in a terminal is fine for a demo,
but it stops when the terminal closes, and every advisory after that is
gone. Don't rely on a watching human or an ad-hoc subscription; capture
advisories in a durable destination that is always subscribed.

The fix is to point a stream at the advisory subjects. A stream is always
subscribed and stores what it captures, so you can read events back long
after they fired:

<div class="nats-example" data-type="learn-monitoring-advisories-and-events-persistAdvisories" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**A `max_deliver` advisory is the only built-in signal a message was
dropped.** JetStream has no dead-letter queue. When the `shipping`
consumer exhausts its deliveries on a poison order, the order is removed
from delivery and the only record is one advisory message. Subscribe to
`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.>`, or capture it in the
stream above; otherwise poison orders disappear silently. What to *do*
with a dropped order, such as routing it to a parking subject, is an
acknowledgment pattern covered in
[JetStream → Acknowledgment](/learn/jetstream/acknowledgment).

**A leader-elected advisory reports a flap, not its cause.** Seeing
repeated leader-elected advisories for `ORDERS` tells you the cluster is
unstable, and that's worth watching. It doesn't tell you why. Treat
the advisory as a symptom to watch and take the *why* (election timing,
quorum, peer health) to
[Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders).
Don't try to diagnose the election from the advisory body alone.

## Where you are

You now have a second way to watch the `ORDERS` deployment, one that
doesn't depend on polling. You can:

- Subscribe to `$JS.EVENT.ADVISORY.>` and see a `max_deliver` advisory the
  instant a poison order exhausts its deliveries on the `shipping`
  consumer.
- Read the advisory body (`stream`, `consumer`, `stream_seq`,
  `deliveries`) to know exactly which order was dropped and how many
  attempts it took.
- Subscribe to `$SYS.ACCOUNT.ORDERS.CONNECT` and `DISCONNECT` to watch
  clients come and go, and read the `STATSZ` heartbeat from each node.
- Capture advisories in a durable stream so a transient event is never
  missed.

You've read state on demand from the monitoring port, computed lag from
consumer state, and now received events you never asked for. The last
page turns all of it into stored history, charts, and threshold checks.

## What's next

The next page wires the production loop: an **exporter** that scrapes
`:8222`, **Prometheus** that stores the numbers as time series, **Grafana**
that charts them, and `nats server check` that fires when lag crosses a
threshold.

Continue to
[Prometheus & dashboards](/learn/monitoring/prometheus-and-dashboards).

## See also

- [Reference → JetStream advisories](/reference/jetstream/advisory) — every
  JetStream advisory subject and its JSON schema.
- [Reference → System events](/reference/system/advisory) — every `$SYS.*`
  system-event subject and its JSON schema.
- [JetStream → Acknowledgment](/learn/jetstream/acknowledgment) — what to
  do with a message that hit `max_deliver`.
- [Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders) —
  the election behind a leader-elected advisory.
