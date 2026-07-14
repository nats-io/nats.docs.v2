---
id: where-next
title: "Where to go next"
sidebar_position: 7
description: Recap the Services mental model and point to the chapters and Reference that take it further
---

# Where to go next

You started this chapter with a hand-rolled request-reply responder: a
subscriber on `orders.inventory.check` that read a request and published a
reply. You end it with `OrderInventory`, a named, versioned service that
answers the same subject, announces itself on `$SRV`, counts every request,
and load-balances across as many instances as you start. The behavior on the
wire never changed; the framework added everything around it.

This page doesn't teach anything new. It collects the model you built into
one place and points you at the chapters and Reference that take it further.

## The core idea

Every page in this chapter circled the same idea, which is worth restating on
its own.

A **service** is a request-reply responder the framework formalizes. You
hand it a name and a version, and it auto-generates a unique service ID,
subscribes the discovery verbs, and tracks stats for you. The responder you
already knew how to write now has an identity.

An **endpoint** is a named handler on a subject, and a **group** is a
subject-prefix namespace that organizes endpoints. One service can expose
many endpoints; a group makes them answer on `{prefix}.{endpoint}`. This is
how one running service covers more than one subject.

The three **discovery verbs** on `$SRV` (PING, INFO, and STATS) make a
service discoverable and observable without extra wiring. Ask `$SRV.INFO`
and every matching instance tells you its endpoints; ask `$SRV.STATS` and it
tells you its counters.

The default **queue group** `"q"` scales the service. Run more instances with
the same name and version, and the server delivers each request to exactly
one of them. There's no coordinator and no config; you scale by running more
instances.

Those four pieces are the service, the endpoint and group, discovery, and the
queue group. Everything else in this chapter is a refinement of them.

## Where the reference details live

This chapter is unversioned and concept-first. The exact config fields, their
valid ranges, and the wire format of the discovery verbs live in
**Reference**, which is versioned and exhaustive. When you need the precise
type of a service config field, the full endpoint option list, or the JSON
schema of an INFO response, that's where to look.

The [Reference root](/reference/) is the entry point. The handoff phrases
throughout this chapter ("the full set of service configuration fields is
documented in Reference") all point into it. The `$SRV` wire format and its
PING, INFO, and STATS response schemas live under
[the services reference](/reference/services/).

## Sibling deep dives

A service is built on top of pieces other chapters teach in full, and it
leaves gaps that other chapters fill. Follow whichever one matches the
question you're asking now.

The [Core NATS deep dive](/learn/core-nats) covers the lower layer this one
builds on. [Request-reply](/learn/core-nats/request-reply) is the mechanism
every endpoint uses, and [queue groups](/learn/core-nats/queue-groups) are
exactly the load balancing that the default group `"q"` gives you. If anything
in this chapter seemed to skip a step, that step is covered there.

The [JetStream deep dive](/learn/jetstream) is where you go when a service
needs to remember something. A service is at-most-once request-reply: it
stores nothing, and when an instance stops, its in-flight work is gone. The
moment your handler needs durable state, say an order that must survive a
restart, that state belongs in a stream, not in the service.

The [Resilient Clients deep dive](/learn/resilient-clients) covers the
connection underneath every instance: reconnect, drain beyond the framework's
`Stop()`, slow-consumer handling, and error callbacks. This chapter assumed a
healthy local connection; production connections aren't always healthy.

The [Security deep dive](/learn/security) covers subject isolation for `$SRV`
subjects, account access control, and cross-account service placement.

The [Monitoring deep dive](/learn/monitoring) goes past per-endpoint stats to
the server-side view: exporting metrics to Prometheus and building the
dashboards that tell you a service is slow before a caller complains. The
service-latency advisory schema itself lives in
[Reference](/reference/services/).

The [Topologies deep dive](/learn/topologies) covers running services across
more than one server: how `$SRV` and service subjects propagate across leaf
nodes and gateways, and how to place instances in more than one region.

## Where you are

This is the end of the chapter. The whole arc is complete, and no new
scenario state is introduced here. Your `OrderInventory` service (with its
`check` endpoint on `orders.inventory.check`) and your `ShippingQuote`
service (with its `quote` endpoint on `shipping.quote`) are still running in
your session exactly as you left them on the previous page, load-balancing
across whatever instances you started. You can keep experimenting, or stop
them gracefully when you're done; each `Stop()` drains in-flight requests
and unsubscribes the discovery verbs.

You hold the core model: a service is a named, versioned, discoverable
request-reply responder; endpoints and groups organize it; the `$SRV` verbs
make it discoverable and observable; and the queue group scales it. That model
is the foundation for everything else you'll build on the framework.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects the
action items from all of them in one place: a last pass before you trust a
service with real orders. Each group links back to the page that explains the
why.

### Your first service — see [Pitfalls](/learn/services/your-first-service#pitfalls)

- [ ] Unmarshal `req.Data()` inside the handler and respond with a service error on bad input, rather than letting a malformed request crash the handler.
- [ ] Pick a `Name` that matches the allowed character set and a `Version` that's valid SemVer; an invalid value fails service creation outright.

### Endpoints and groups — see [Pitfalls](/learn/services/endpoints-and-groups#pitfalls)

- [ ] Override an endpoint's queue group only when you mean to change who load-balances with whom; the change is silent and easy to get wrong.
- [ ] Remember that disabling the queue group turns an endpoint into broadcast (every instance answers) instead of load balancing.
- [ ] Treat endpoints and metadata as immutable once added; there's no remove, so name and shape them deliberately the first time.

### Discovery — see [Pitfalls](/learn/services/discovery#pitfalls)

- [ ] Collect discovery responses with a deadline-or-count loop; discovery is broadcast, so a single request returns only one instance, not all of them.
- [ ] Treat `$SRV` as a reserved subject prefix; never publish to it yourself, or you collide with the framework's control plane.

### Observability — see [Pitfalls](/learn/services/observability#pitfalls)

- [ ] Check `Nats-Service-Error-Code` on every reply; a service error rides in headers, not as a transport failure, so an unchecked failed call looks like success.
- [ ] Aggregate stats across instance IDs yourself; counters are per-instance, and `Reset()` zeroes them.

### Scaling — see [Pitfalls](/learn/services/scaling#pitfalls)

- [ ] Protect any external state your instances share (a database or a stream) rather than assuming a single instance; the framework holds no shared memory across instances.
- [ ] Keep handlers non-blocking, or run more instances; a blocking handler stalls every other request on that instance.

## See also

- [Reference](/reference/) — every service config field, endpoint option,
  and `$SRV` wire schema, versioned and exhaustive.
- [Core NATS deep dive](/learn/core-nats) — the request-reply and queue-group
  foundation this chapter is built on.
- [JetStream deep dive](/learn/jetstream) — where service state goes when it
  has to survive a restart.
