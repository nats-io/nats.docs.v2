---
id: scaling
title: "6. Scaling"
sidebar_position: 6
description: Run N instances of a service and let the default queue group balance the load, then stop one cleanly
---

# 6. Scaling

`OrderInventory` answers every request, reports its endpoints through
discovery, and keeps per-endpoint stats. So far one instance does all of
that. This page runs more than one.

This page assumes you have read the [Core NATS](/learn/core-nats) deep dive —
you know how [request-reply](/learn/core-nats/request-reply) and
[queue groups](/learn/core-nats/queue-groups) work. Scaling needs nothing on top
of that. The framework already put every endpoint into a queue group when you
created the service (you saw this happen on the
[first page](/learn/services/your-first-service)). That queue group is the entire
scaling story. You start more copies of the service, and the server spreads
requests across them.

This page teaches two things: how running N instances load-balances for free,
and how to stop an instance without dropping the work it is holding.

## Run more instances

**Horizontal scaling** means running more than one copy of the same service.
Each copy is an **instance** — one running service with its own service ID. All
instances of `OrderInventory` share the same service name and the same version;
only the auto-generated service ID differs.

You do not register instances anywhere. You do not configure a load balancer.
You start a second instance the same way you started the first, with the same
`Name`, `Version`, and endpoint. The framework auto-generates a fresh service ID
and the new instance joins the work.

What makes the requests spread is the **default queue group `"q"`**. Every
endpoint joins it unless you override it. When several instances subscribe to
`orders.inventory.check` under the same queue group, the server delivers each
request to exactly **one** member of that group. Two instances, one request in
— one instance handles it. This is the queue-group behavior from Core NATS, now
applied automatically across instances; the mechanics live on
[Queue groups](/learn/core-nats/queue-groups).

Start a second instance, send a burst of orders, and watch them spread:

<div class="nats-example" data-type="learn-services-scaling-runInstances" data-languages="cli,js,go,python,java,rust,csharp"></div>

Six requests across two instances land roughly three and three. The split is
not round-robin you control; it is the server handing each message to whichever
queue-group member is ready. Add a third instance and the same six spread three
ways. There is no coordinator deciding this — the queue group does it on the
server, per request.

<div class="nats-flow" data-scenario="serviceScalingAnimated" data-width="600" data-height="350"></div>

The animation shows five `OrderInventory` instances sharing queue group `"q"`.
Each request lights exactly one instance, and the next request can light a
different one. That is the whole scaling model: more members, the same group,
one delivery per request.

Disabling the queue group breaks this. You met `WithEndpointQueueGroupDisabled`
on [endpoints and groups](/learn/services/endpoints-and-groups): with it, an
endpoint subscribes plainly instead of joining a group, so **every** instance
receives **every** request. That is broadcast, not scaling — useful for fan-out
work, wrong for load balancing. Keep the queue group on when you want to scale.

## Stop an instance cleanly

Scaling up is half the job. Scaling down — or rolling out a new version, or
shutting an instance for maintenance — means stopping an instance. Stopping it
abruptly drops any request it was mid-handle.

The framework gives you a graceful stop. Calling `Stop()` on a service
**drains** its in-flight requests first: it lets the handler finish the work it
already accepted, then unsubscribes the endpoint and the `$SRV` discovery verbs,
and only then exits. From the caller's side the instance simply stops appearing
in discovery and stops pulling from the queue group; nothing in flight is lost.

Because the endpoint leaves the queue group as part of the stop, the remaining
instances pick up every new request automatically. There is no window where a
request lands on a queue group whose only member just vanished. Stop one
instance and the others absorb the load:

<div class="nats-example" data-type="learn-services-scaling-stopService" data-languages="cli,js,go,python,java,rust,csharp"></div>

After the stop, a PING returns one fewer reply, and `nats service stats`
aggregates the survivors. Roll a new version by starting fresh instances, then
stopping the old ones one at a time — at every moment at least one instance is
in the queue group answering orders.

When a service needs durable state to survive a stop — a count that must not
reset, a queue of work that must outlive the process — that state does not
belong in the instance. A service stores nothing; it is at-most-once
request-reply. Put durable state behind [JetStream](/learn/jetstream). Draining
the connection itself on shutdown, beyond the framework's `Stop()`, belongs to
[resilient clients](/learn/resilient-clients).

The full set of service lifecycle and queue-group fields is documented in
[Reference](/reference/). We only need the behavior here.

## Pitfalls

Scaling out turns one quiet assumption into a bug: that there is only one of
you. Each instance runs the same handler on its own connection, and they do not
share memory. Two traps follow from that.

**Instances do not share memory — protect external state.** If a handler
increments a counter, caches a value, or reserves stock in a local variable,
each instance keeps its own copy. Run three instances and you have three
independent counters, three caches, three views of "remaining stock," and they
drift apart. Do not assume one instance owns the truth. Keep handlers
stateless, and when work genuinely needs shared state, push it into an external
store — a database, or a [JetStream](/learn/jetstream) stream or key-value
bucket that all instances read and write through. The instances stay
interchangeable; the state lives in one place they all agree on.

**A blocking handler starves its instance.** Handlers run synchronously on the
service's connection. While one handler blocks — a slow database call, a sleep,
a lock it cannot get — that instance answers no other request. The queue group
hides this for a while, routing around the busy instance to its peers, but if
every instance blocks, the whole service stalls. Do not do slow work inline in a
handler. Keep handlers fast, move long work off the request path, and add more
instances so a momentary stall on one is absorbed by the rest.

The fix for both is the same discipline: instances are disposable, so make
stopping one safe. A graceful stop drains in-flight work and hands new requests
to the survivors, which is exactly what you want when an instance is slow,
overloaded, or being replaced. Stop one and watch the rest carry on:

<div class="nats-example" data-type="learn-services-scaling-stopService" data-languages="cli,js,go,python,java,rust,csharp"></div>

If the request after the stop still gets an answer, the queue group rebalanced
cleanly and no order was dropped.

## Where you are

You now have:

- More than one `OrderInventory` instance, all sharing the name, version, and
  default queue group `"q"`.
- Requests spreading across instances with no coordinator — one delivery per
  request, decided on the server.
- A graceful `Stop()` that drains in-flight work and leaves the queue group, so
  the survivors absorb the load with nothing dropped.

Scaling is simply "run more, the queue group balances." Scaling down is "stop
one cleanly, the rest pick it up."

## What is next

That is the framework end to end: a named, versioned service with endpoints and
groups, made discoverable and observable through `$SRV`, and scaled by running
more instances. The last page recaps the whole game and points to where the
remaining details live.

Continue to [7. Where to go next](/learn/services/where-next).

## See also

- [Queue groups](/learn/core-nats/queue-groups) — the load-balancing mechanism
  the default queue group `"q"` is built on.
- [JetStream](/learn/jetstream) — durable state for work that must survive an
  instance stopping.
- [Reference](/reference/) — the full set of service lifecycle and queue-group
  configuration fields.
