---
id: endpoints-and-groups
title: "Endpoints and groups"
sidebar_position: 3
description: Give a service more than one endpoint, and organize endpoints under a group subject prefix
---

# Endpoints and groups

The previous page gave you a running `OrderInventory` service with exactly
one endpoint, `check`, answering on `orders.inventory.check`. That's the
smallest useful shape: one service, one handler, one subject.

Real services rarely stay that small. A service usually answers more than
one kind of request, and once it does you want those subjects organized
rather than scattered. This page adds the two pieces that do that: a
service can hold multiple endpoints, and a group gives a set of
endpoints a shared subject prefix.

By the end you'll have a second service, `ShippingQuote`, alongside
`OrderInventory`, and you'll know how to lay out several endpoints under
one prefix.

## A service can hold multiple endpoints

An **endpoint** is a named handler on a subject. You met one on the last
page; nothing stops a service from having several. Each call to
`AddEndpoint(name, handler)` registers another named handler, and the
endpoint's subject **defaults to its name**.

Add a second service the same way you added the first. `ShippingQuote`
promotes the Core NATS `shipping.quote` providers into a named service. It
has one endpoint, `quote`, and because you want it to answer on
`shipping.quote` rather than on the bare name `quote`, you set the subject
explicitly:

<div class="nats-example" data-type="learn-services-endpoints-and-groups-secondService" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Two services now run against the same `nats-server`. `OrderInventory`
answers on `orders.inventory.check`; `ShippingQuote` answers on
`shipping.quote`. Each is independent, with its own name, its own version,
and its own discovery. The framework gave each a unique service ID without
you asking.

When the subject should match the endpoint name, you can omit it. An
endpoint named `quote` with no subject set answers on `quote`. You set the
subject explicitly only when the wire subject and the endpoint name differ,
which is the common case once subjects carry structure like
`orders.inventory.check`.

The handler contract is unchanged from the last page: you read the request
with `req.Data()` and reply with `req.Respond()`. Adding endpoints doesn't
change how a single request
is served; it only adds more named handlers to the same running service.

## A group is a subject prefix

Once a service grows past one endpoint, the subjects start to repeat. Two
inventory endpoints would naturally be `orders.inventory.check` and
`orders.inventory.reserve`: the same `orders.inventory` stem, twice. A
**group** captures that stem once.

`AddGroup("orders.inventory")` returns a group, and any endpoint you add
to that group answers on `{group}.{endpoint}`. An endpoint named `check`
inside the `orders.inventory` group answers on `orders.inventory.check`;
an endpoint named `reserve` answers on `orders.inventory.reserve`. You
write the prefix once and the framework joins it to each endpoint name.

<div class="nats-example" data-type="learn-services-endpoints-and-groups-addGroup" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The subject a caller sends to is always `{group}.{endpoint}`. There's no
separate routing layer; the group is just a way to build the subject. A
client that knows the subject doesn't need to know whether the endpoint
was added directly or through a group. The wire looks identical either way.

Groups also nest. A group added inside another group combines both
prefixes, so the subject becomes `{outer}.{inner}.{endpoint}`. You rarely
need more than one level for a service this size, but the prefixes stack
the way you'd expect.

## A group can set the queue group

Every endpoint joins a **queue group**, the load-balancing group that
makes the server deliver each request to exactly one member. The default
name is `"q"`, and you've been using it without touching it: all
instances of `OrderInventory` share `"q"`, so a request goes to one of
them, not all of them. The queue group mechanism itself lives in
[Core NATS](/learn/core-nats/queue-groups); here it's just the default a
service endpoint already uses.

The queue group is set at three levels, and each level overrides the one
above it. The service sets a default. A group can override it for every
endpoint under it. A single endpoint can override it again. If none of
them set anything, the endpoint falls back to `"q"`.

You override the queue group on an endpoint with one option. Here `check`
joins a custom queue group instead of the default `"q"`:

<div class="nats-example" data-type="learn-services-endpoints-and-groups-customQueueGroup" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Most services never need this. The default `"q"` already load-balances all
instances of a service against each other, which is what you want almost
every time. Reach for an override only when you want a subset of endpoints
to load-balance separately. The full set of endpoint and group options is
documented in [Reference](/reference/). We only need the behavior here.

<div class="nats-flow" data-scenario="serviceEndpointsAnimated" data-width="600" data-height="350"></div>

The animation isolates the routing rule. It puts two endpoints on one
service, `check` on `orders.inventory.check` and a grouped `quote` on
`shipping.quote`, and shows the subject on each request selecting the
handler: a request to `orders.inventory.check` runs `check`, a request to
`shipping.quote` runs `quote`, and only the endpoint whose subject matches
runs. In this chapter those two subjects belong to two separate services,
`OrderInventory` and `ShippingQuote`, but the selection rule is identical
when one service hosts several endpoints.

## Pitfalls

Endpoints and groups have two common pitfalls: one about the queue group,
and one about what can't be undone.

**Disabling the queue group turns an endpoint into broadcast.** Overriding
the queue group changes *who* load-balances with whom. Disabling it
entirely is a sharper change: an endpoint with no queue group is a plain
subscription, so **every instance** receives **every** request instead of
one instance receiving each. For a request-reply endpoint that means the
caller gets one reply per instance and the rest are noise. Do not disable
the queue group to "make sure a request is handled": that's exactly what
the default `"q"` already guarantees, with one handler, not N. Disable it
only when you genuinely want all instances to act, which is rare for a
service that responds.

You control this with one option. Override the queue group when you want a
subset of endpoints to load-balance separately; never disable it on an
endpoint that responds. Send a request and inspect the endpoint to confirm
which queue group it joined (the default `"q"`, an override, or none):

<div class="nats-example" data-type="learn-services-endpoints-and-groups-customQueueGroup" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**Endpoints are immutable once added.** There's no remove. You can't
detach an endpoint, rename it, or change its subject on a running service.
The same holds for the metadata you attach to a service or endpoint: it's
fixed at creation. If a service's shape needs to change, you stop it and
start a new one with the new layout. Decide the endpoint names and subjects
before the service goes live, deliberately and the first time, the same
way you pick a stream name in JetStream.

You handle this by inspecting the shape, not editing it. Read back the
running service to see exactly which endpoints, subjects, and queue groups
it registered; to change any of them, stop the service and start a
replacement:

<div class="nats-example" data-type="learn-services-endpoints-and-groups-immutableEndpoints" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Where you are

You now have:

- Two services running against one `nats-server`: `OrderInventory`
  answering on `orders.inventory.check`, and `ShippingQuote` answering on
  `shipping.quote`.
- The shape to add more endpoints to either, with subjects that default to
  the endpoint name.
- A group to give related endpoints a shared subject prefix, and the three
  levels at which a queue group can be set.

Both services still do exactly what their Core NATS responders did.
They've only gained structure: names, subjects, and the framework's
load-balancing default underneath.

## What's next

Two services are running, each with its own name and endpoints. The next
page asks the server what's out there: the `$SRV` discovery verbs let any
client learn which services exist, what endpoints they expose, and which
instances are answering.

Continue to [Discovery](/learn/services/discovery).

## See also

- [Queue groups](/learn/core-nats/queue-groups) — how the load-balancing
  group under every endpoint actually works.
- [Scatter-gather](/learn/core-nats/scatter-gather) — the request pattern
  the `ShippingQuote` providers used before becoming a named service.
- [Reference](/reference/) — the full set of endpoint and group
  configuration options.
