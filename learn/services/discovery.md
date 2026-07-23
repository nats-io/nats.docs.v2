---
id: discovery
title: "Discovery"
sidebar_position: 4
description: Learn what services exist and what they answer using the $SRV discovery verbs
---

# Discovery

Your `OrderInventory` service answers on `orders.inventory.check`, and
`ShippingQuote` answers on `shipping.quote`. To call them, you had to know
those subjects in advance. This page removes that requirement.

Every service the framework creates also answers a second, automatic set
of subjects: the **discovery verbs**. Through them, a caller can ask the
running system what services exist, what each one answers, and how it's
doing, without anyone hard-coding a subject or maintaining a registry on
the side.

You add no code to get this. The moment `AddService` returned on the
`your-first-service` page, the framework subscribed to these subjects for
you. This page shows how to use them.

## The three discovery verbs

Discovery is **learning what services exist and what they answer** through
a fixed set of subjects under the `$SRV` prefix. Every service answers
three verbs there:

- **PING**: checks whether a service is present. The reply carries the
  service name, instance id, and version. Use it to find services and
  measure round-trip time.
- **INFO**: reports what a service answers. The reply adds the description
  and the list of endpoints, each with its subject and queue group.
- **STATS**: reports how a service is doing. The reply adds per-endpoint
  counters. We read those on the next page; for now, it's enough to know
  the verb exists.

The verbs are uppercase, and so are their subjects. A service doesn't
publish to `$SRV` itself; it subscribes there and replies to your
requests, the same request-reply you already know.

## Three levels of address

Each verb answers at three levels, narrowing from every service down to
one instance:

| Subject | Who answers |
|---|---|
| `$SRV.INFO` | every service in the account |
| `$SRV.INFO.OrderInventory` | every instance named `OrderInventory` |
| `$SRV.INFO.OrderInventory.<id>` | the one instance with that id |

The same three levels work for `PING` and `STATS`. The first level is how
you enumerate an unfamiliar system. The second narrows to one service
name. The third reaches a single **instance**: one running copy of a
service, identified by the **service id** the framework generated for it.

Ask `OrderInventory` to describe itself at the name level, and read the
endpoint list out of the reply:

<div class="nats-example" data-type="learn-services-discovery-discoverInfo" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The reply tells you the `check` endpoint listens on
`orders.inventory.check` in queue group `"q"`. That's the same fact you
configured by hand earlier, but now any caller can read it back from the
live service instead of trusting documentation.

The `$SRV.PING`/`INFO`/`STATS` wire format and JSON response schemas are
documented in [Reference](/reference/services/). We only need the behavior here.

## Discovery is broadcast, not load-balanced

One detail on this page works differently than you might expect. The
endpoints you built answer in a **queue group**, so each request goes to
exactly one instance. The discovery verbs do **not**. A
`$SRV.INFO.OrderInventory` request reaches *every* instance named
`OrderInventory`, and every one of them replies.

That's deliberate. The point of discovery is to get a response from every
instance, all three of them, not whichever one happened to answer first.
So a caller doesn't wait for a single reply; it waits a short deadline and
collects however many responses arrive in that window.

<div class="nats-flow" data-scenario="serviceDiscoveryAnimated" data-width="600" data-height="350"></div>

The animation shows it: one `$SRV.INFO.OrderInventory` request fans out to
all three instances, and three INFO replies come back. The single targeted
query at the end, `$SRV.STATS.OrderInventory.id2`, reaches only `id2`,
because the third address level pins the request to one instance.

## Targeting one instance

When you already know an id (from a PING or INFO reply), you can address
that instance alone. This is how you inspect or compare a single copy of a
service that's running many.

The third level reaches exactly one instance, so you expect a single
reply and don't need a deadline loop:

<div class="nats-example" data-type="learn-services-discovery-targetInstance" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Collecting replies with the CLI

For interactive use, the `nats` CLI wraps the broadcast loop. `nats
service list` enumerates every service and instance it can find; `nats
service info` formats one service's endpoints; `nats service ping`
measures round-trip time to each responder:

```bash
nats service list
nats service info OrderInventory
nats service ping
```

These run the same `$SRV` requests internally and gather the replies
by deadline. They're the fastest way to see what's running while you
develop; the programmatic verbs above are what your own tooling uses.

## Pitfalls

Two mistakes are common the first time you query discovery. Both come from
the broadcast behavior above.

**Discovery is broadcast: a single reply is not the whole answer.** A
plain request returns the first response and stops. Against
`$SRV.INFO.OrderInventory` that gives you one instance and silently hides
the rest, so five running instances appear as one. Don't treat a discovery
request like a normal request-reply call. Wait a deadline and collect
every reply, exactly as the CLI does:

<div class="nats-example" data-type="learn-services-discovery-discoverInfo" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The reverse holds too: when you want one specific instance, use the
`$SRV.STATS.OrderInventory.<id>` level instead of filtering a broadcast.
It reaches that instance directly and returns one reply.

**`$SRV` is a reserved subject prefix: do not publish to it yourself.**
The framework owns the entire `$SRV` tree; services subscribe there to
answer PING, INFO, and STATS. Publishing your own messages under `$SRV`
collides with that machinery and corrupts what callers discover. Keep your
own subjects under your own prefixes (`orders.*`, `shipping.*`) and let
the framework own `$SRV`. Who may even see `$SRV` across account
boundaries is a separate question, covered in
[Security](/learn/security).

## Where you are

You can now discover the system instead of memorizing it. With `$SRV`
PING, INFO, and STATS, you can enumerate every service in the account,
ask one service which endpoints it answers, and target a single instance
by its id. You also know the catch: discovery is broadcast, so you gather
replies by deadline rather than taking the first one.

`OrderInventory` and `ShippingQuote` are still running. Nothing about them
changed; you just learned to ask them what they are.

## What's next

INFO told you *what* a service answers. The STATS verb tells you *how
it's doing*: request counts, error counts, and processing time per
endpoint. The next page reads those counters and shows how a handler
records an error.

Continue to [Observability](/learn/services/observability).

## See also

- [Request-reply](/learn/core-nats/request-reply) — the mechanism every
  `$SRV` reply rides on.
- [Observability](/learn/services/observability) — what the STATS verb
  reports and how to read it.
- [Reference](/reference/services/) — the `$SRV` wire format and response schemas.
