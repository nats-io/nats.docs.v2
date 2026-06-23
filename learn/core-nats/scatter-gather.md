---
id: scatter-gather
title: "5. Scatter-gather"
sidebar_position: 6
description: Fan one request to many responders and gather every reply by count or deadline
---

# 5. Scatter-gather

The inventory service answered one request with one reply, which is the
common case of a single question producing a single answer.

Some questions have several answers. "What would it cost to ship this
order?" is one of them. Acme works with three carriers, and each one
quotes a different price. The order service wants all three quotes, then
picks the cheapest.

That's **scatter-gather**: fan one request out to every responder, then
gather the replies that come back. This page builds it on `shipping.quote`
with three quote providers.

<div class="nats-flow" data-scenario="requestReplyScatterGather" data-width="800" data-height="450"></div>

## Why one request can produce many replies

Recall how request-reply works. The client subscribes to a unique
`_INBOX` subject, then publishes the request carrying that inbox as its
reply subject. Every responder publishes its answer back to the inbox.

Nothing in that mechanism limits the number of responders. The request
is an ordinary publish to `shipping.quote`. If three providers subscribe
to `shipping.quote`, all three receive a copy (that's plain
publish-subscribe), and all three can reply to the inbox.

The single-reply case felt like one answer only because two things were
true. There was one responder, and the client stopped listening after
the first reply. Remove the first assumption and you have many responders.
Remove the second and the client gathers all of them.

This works only when the responders are **not** in a queue group. A queue
group would hand each request to exactly one member, which is load
balancing, not scatter-gather. Scatter-gather needs every responder to
see the request, so every responder subscribes plainly. We make that
explicit in the CLI demo below, because the CLI's default trips on it.

## Set up three quote providers

A provider subscribes to `shipping.quote`, reads the order, and replies
with a price. Run three of them, each quoting a different number.

<div class="nats-example"
     data-type="learn-core-nats-scatter-gather-provider"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

There's one trap to know about with `nats reply`. By default, the CLI
subscribes inside a queue group named `NATS-RPLY-22`. Three
`nats reply` instances left on that default would form one queue group,
and only one of them would ever answer. That's the load-balancing
behavior from the previous page, not what we want here.

To make each provider an independent responder, give each one its own
queue group name with `--queue`. A queue group of one member behaves like
a plain subscriber: it receives every matching request. The CLI source
for the snippet above runs the three providers with distinct names
(`carrier-a`, `carrier-b`, `carrier-c`), so all three see each request.

The client library form has no such trap. A library subscribes plainly
unless you ask for a queue group, so three plain subscribers on
`shipping.quote` already scatter correctly.

## Gather by count

Now the gather side. The client sends one request to `shipping.quote` and
collects replies until it's heard from every provider.

<div class="nats-example"
     data-type="learn-core-nats-scatter-gather-gather"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The CLI uses `--replies 3`: keep reading from the inbox until three
replies arrive, then stop. With the three providers running, the output
shows three quotes, one per carrier. The client compares the prices and
keeps the lowest.

A library does the same thing by hand. It subscribes to a fresh inbox,
publishes the request with that inbox as the reply subject, then loops
reading from the subscription and appending each reply to a list. After
the third reply it breaks out and unsubscribes. The loop, the count, and
the unsubscribe are all yours to manage. There's no single `request()`
call that returns a list, because the client can't know how many
responders exist.

## Gather by deadline

Counting replies assumes you know how many providers there are. Often you
don't. Carriers come and go; one might be down. Waiting for a fixed count
of three would hang forever if only two answer.

The safer approach gathers by **deadline** instead. Collect every reply
that arrives within a time budget, then act on whatever you have.

From the CLI, `--replies 0` switches to deadline mode: it waits until the
overall `--timeout` elapses, returning all replies seen in that window.

```bash
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
```

With three providers up, all three quotes arrive well inside two seconds.
With one provider down, the client still returns after two seconds with
the two quotes it received. A slow or missing carrier delays a decision by
at most the deadline; it never blocks it forever.

A deadline changes the rule from waiting for every responder to waiting
only for whoever answers in time, which is the only safe assumption when
the responder set isn't fixed.

## Delivery guarantees

Scatter-gather inherits the at-most-once delivery of core NATS. A reply
dropped in transit is just absent from the gathered set; nothing
redelivers it. If your client crashes after the second reply, the third is
gone.

That's acceptable for a shipping quote: re-asking is cheap and the
answer is fresh each time. It's not acceptable when each reply must
survive a crash and be handled reliably. Recoverable work of that kind
belongs in [JetStream](/learn/jetstream), not in a core NATS gather.

Because nothing redelivers a lost reply, the order in which replies land
carries no meaning either: a provider that's slow this second may be fast
the next. Treat the gathered set as whatever answers happened to arrive,
never as a ranked list.

The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
[Reference](/reference/protocols/client). We only need the behavior here.

## Pitfalls

Scatter-gather looks like one more request, so it inherits the habits of
single-reply request-reply. These are the common mistakes.

**Taking only the first reply.** A plain `nats request` stops after one
reply, because its `--replies` flag defaults to `1`. Point it at three
providers and you get whichever carrier answered first; the other two
quotes are discarded and you never learn there were more. Don't reach for
a single `request()` call when you mean to gather: that call is built to
return the first reply and unsubscribe. Subscribe to the inbox yourself
and read in a loop, or use `--replies 0` from the CLI.

<div class="nats-example"
     data-type="learn-core-nats-scatter-gather-first-reply-trap"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**No deadline, so you wait for replies that never come.** Gathering by a
fixed count assumes you know how many providers are up. If you wait for
three and only two answer (a carrier is down), a hand-rolled loop with no
time budget blocks forever on the reply that never lands. Always bound the
wait: gather by deadline (`--replies 0 --timeout 2s`) so a missing carrier
costs you the deadline, not the whole request.

**Reading the gathered set as ranked.** Replies arrive in whatever order
the providers happen to answer, and core NATS is at-most-once, so a dropped
reply is just absent. The first quote back isn't the best one, and a
short set isn't an error. Compare every reply you received on its merits
(here, the lowest `quote_cents`) and never treat arrival order as
priority. Replies that must survive a crash and be handled reliably belong
in [JetStream](/learn/jetstream), not in a core gather.

## Where you are

The Acme ORDERS world now talks in four shapes over one local
`nats-server`:

- `warehouse`, `notifications`, and `analytics` each receive a copy of
  every order message (publish-subscribe).
- Regional wildcards let one subscriber span `orders.us.created` and
  `orders.eu.created`.
- The `inventory` service answers single requests on
  `orders.inventory.check` (request-reply).
- A `packers` queue group shares the work on `orders.created`, one packer
  per order.
- Three providers answer one `shipping.quote` request, and the client
  gathers every reply within a deadline and picks the cheapest.

That's the whole of core NATS: subjects, interest, reply inboxes, and
queue groups. Everything is ephemeral and at-most-once, and nothing is
remembered after it's delivered.

## What's next

The next page maps the road beyond the foundation: where to go when you
need persistence, services, resilience, security, or scale across regions.
Continue to [Where to go next](/learn/core-nats/where-next).

## See also

- [Concepts → Request-reply](/concepts/request-reply) — the five-minute
  overview of the pattern this page extends.
- [Learn → Services](/learn/services) — when many responders become a
  managed service that aggregates results for you.
- [Reference](/reference/) — gather helper signatures per client library.
