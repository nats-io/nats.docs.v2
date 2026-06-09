---
id: advisories-and-events
title: "4. Advisories & events"
sidebar_position: 4
description: Subscribe to JetStream advisories and system events to learn about things you never polled for
---

# 4. Advisories & events

The two pages before this one read state on demand. You `curl` the
monitoring port `:8222` and it answers with the numbers as they are right
now. That works when you know *which* number to ask about and *when* to
ask. It does nothing for events that happen between two polls.

The `shipping` consumer falling behind is a number you can poll for — its
lag climbs and you see it on the next scrape. But a poison order that
exhausts its deliveries is not a level you read; it is a moment that
passes. By the time your next scrape runs, the order is gone and the
counter that ticked is buried in an aggregate. You need NATS to tell you
the instant it happens.

This page covers the two streams of events NATS publishes for exactly
that: **advisories** on the `$JS.EVENT.ADVISORY.*` subjects, and **system
events** on the `$SYS.*` subjects. Both arrive as ordinary messages you
subscribe to. Neither is something you ask for — they push to you.

## Advisories: JetStream tells you what happened

An **advisory** is a transient JSON message that JetStream publishes once,
the moment something noteworthy happens to a stream or a consumer. It is a
normal NATS message on a well-known subject. You subscribe to it the same
way you subscribe to any subject.

Advisories live under one subject tree:

```
$JS.EVENT.ADVISORY.>
```

Every JetStream advisory lands somewhere under that prefix. The leaf of
the subject names the event and the entities it is about. When a message
on the `shipping` consumer exhausts its delivery attempts, the server
publishes one advisory here:

```
$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.shipping
```

The stream name and consumer name are baked into the subject, so a
subscriber can filter to exactly the events it cares about — all
advisories for `ORDERS`, or only max-delivery events for `shipping` — by
choosing the right wildcard.

Subscribe to the whole advisory tree and watch the deployment talk back:

<div class="nats-example" data-type="learn-monitoring-advisories-and-events-subscribeAdvisories" data-languages="cli,js,go,python,java,rust,csharp"></div>

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

That is the whole event. Stream sequence `987` was delivered five times,
never acked, and JetStream gave up on it. The `max_deliver` advisory is
the only built-in signal that this happened. There is no dead-letter
queue waiting to catch the order — if no one is subscribed when the
advisory fires, the fact that order `987` was dropped is lost.

The `max_deliver` advisory is one type among several. JetStream also
publishes a `consumer_action` advisory when a consumer is created or
deleted, a `nak` advisory when a handler explicitly negative-acks a
message, and a `terminated` advisory when a message is removed from
delivery. Each is a different leaf under `$JS.EVENT.ADVISORY.>`, and each
carries its own JSON body. The full set of advisory types and their
schemas is documented in
[Reference → Advisories](/reference/system/advisory). We only need the
`max_deliver` advisory here, because it is the one that tells you an order
slipped through.

### The leader-elected advisory you only observe

One advisory deserves a special note. When the leader of a replicated
stream or consumer changes, JetStream publishes a leader-elected advisory
naming the new leader. You will see it in the same `$JS.EVENT.ADVISORY.>`
subscription, and a flapping leader showing up here is worth watching.

But this page stops at *observing* that it happened. *Why* a leader
changed — how the election ran, what quorum is, which peer won — is
clustering mechanics, not monitoring. When you want to understand the
election behind the advisory, that lives in
[Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders). Here,
the advisory is a fact you receive, not a process you explain.

## System events: the server tells you who connected

The second stream of events is broader than JetStream. A **system event**
is a message the server publishes on the `$SYS.*` subjects to report
server- and account-level activity — connections opening and closing, and
a periodic server heartbeat.

The two you will reach for first are the connection events. Every time a
client connects, the server publishes:

```
$SYS.ACCOUNT.ORDERS.CONNECT
```

and the matching `$SYS.ACCOUNT.ORDERS.DISCONNECT` when it leaves. The
body names the client and the account, so this is how you watch
`order-svc` and `analytics-reader` come and go without polling `/connz` on
a timer.

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
subscriber that connects *after* receives nothing — the message was
published once and is already gone.

## Pitfalls

These traps are scoped to this page's two concepts: advisories and system
events. Each one comes down to the same property — these are messages that
pass, not levels you read.

**Advisories are transient.** An advisory is published exactly once, the
moment its event fires, and it is not stored in any stream. If you are not
subscribed at that instant, you never learn the event happened. A live
`nats subscribe '$JS.EVENT.ADVISORY.>'` in a terminal is fine for a demo,
but it dies when the terminal closes, and every advisory after that is
gone. Do not rely on a watching human or an ad-hoc subscription — give
advisories a durable home that is always listening.

The fix is to point a stream at the advisory subjects. A stream is always
subscribed, stores what it captures, and lets you read events back long
after they fired:

<div class="nats-example" data-type="learn-monitoring-advisories-and-events-persistAdvisories" data-languages="cli,js,go,python,java,rust,csharp"></div>

**A `max_deliver` advisory is the only built-in signal a message was
dropped.** JetStream has no dead-letter queue. When the `shipping`
consumer exhausts its deliveries on a poison order, the order is removed
from delivery and the only record is one advisory message. Subscribe to
`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.>` — or capture it in the
stream above — or poison orders disappear silently. What to *do* with a
dropped order, such as routing it to a parking subject, is an
acknowledgment pattern covered in
[JetStream → Acknowledgment](/learn/jetstream/acknowledgment).

**A leader-elected advisory reports a flap, not its cause.** Seeing
repeated leader-elected advisories for `ORDERS` tells you the cluster is
unstable, and that is worth watching. It does not tell you why. Treat
the advisory as a symptom to watch and take the *why* — election timing,
quorum, peer health — to
[Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders). Do
not try to diagnose the election from the advisory body alone.

## Where you are

You now have a second way to watch the `ORDERS` deployment, one that does
not depend on polling. You can:

- Subscribe to `$JS.EVENT.ADVISORY.>` and see a `max_deliver` advisory the
  instant a poison order exhausts its deliveries on the `shipping`
  consumer.
- Read the advisory body — `stream`, `consumer`, `stream_seq`,
  `deliveries` — to know exactly which order was dropped and how many
  attempts it took.
- Subscribe to `$SYS.ACCOUNT.ORDERS.CONNECT` and `DISCONNECT` to watch
  clients come and go, and read the `STATSZ` heartbeat from each node.
- Capture advisories in a durable stream so a transient event is never
  missed.

You have read state on demand from the monitoring port, computed lag from
consumer state, and now received events you never asked for. The last
lens turns all of it into stored history, charts, and threshold checks.

## What is next

The next page wires the production loop: an **exporter** that scrapes
`:8222`, **Prometheus** that stores the numbers as time series, **Grafana**
that charts them, and `nats server check` that fires when lag crosses a
threshold.

Continue to
[4. Prometheus & dashboards](/learn/monitoring/prometheus-and-dashboards).

## See also

- [Reference → Advisories](/reference/system/advisory) — every advisory
  and system-event subject and its JSON schema.
- [JetStream → Acknowledgment](/learn/jetstream/acknowledgment) — what to
  do with a message that hit `max_deliver`.
- [Clustering → RAFT and leaders](/learn/clustering/raft-and-leaders) —
  the election behind a leader-elected advisory.
