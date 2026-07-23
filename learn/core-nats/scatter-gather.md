---
id: scatter-gather
title: "Scatter-gather"
sidebar_position: 7
description: Fan one request to many responders and gather every reply by count or deadline
---

# Scatter-gather

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

Recall how request-reply works: the client subscribes to a unique
`_INBOX` subject and publishes the request carrying that inbox as its
reply subject. Nothing in that mechanism limits the number of responders.
If three providers subscribe to `shipping.quote`, all three receive the
request (plain publish-subscribe) and all three can reply to the inbox.
The single reply you saw earlier was just one responder plus a client
that stopped after the first answer.

This works only when the responders are not in a queue group — a queue
group hands each request to one member, which is load balancing, not
scatter-gather. Every responder must subscribe plainly. The CLI demo below
makes that explicit, because the CLI's default does the opposite.

## Set up three quote providers

A provider subscribes to `shipping.quote`, reads the order, and replies
with a price. Run three of them, each quoting a different number.

<div class="nats-example"
     data-type="learn-core-nats-scatter-gather-provider"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The CLI uses `--replies 3`: read from the inbox until three replies
arrive, then stop — or until replies stop arriving, whichever comes
first. With the three providers running, the output shows three quotes,
one per carrier. The client compares the prices and keeps the lowest.

A library does the same thing, and how much you hand-roll depends on the
client. A plain `request()` returns only the first reply — on its own it
never returns a list, because the client can't know how many responders
exist.
Some clients ship a gather helper that returns many: nats.js has
`requestMany` and orbit.go has `RequestMany` (both follow ADR-47,
"Request Many", with count, stall, and sentinel stop conditions), and the
.NET client has `RequestManyAsync`. Where no helper exists, you build the
loop yourself: subscribe to a fresh inbox, publish the request with that
inbox as the reply subject, then read from the subscription and append
each reply to a list until your count or deadline is reached, then
unsubscribe.

## Gather by deadline

Counting replies assumes you know how many providers there are. Often you
don't. Carriers come and go; one might be down. Write that gather yourself
with no read deadline, and waiting for a fixed count of three blocks
forever if only two answer — the read for the third reply never returns.

The safer approach gathers by **deadline** instead. Collect every reply
that arrives within a time budget, then act on whatever you have.

From the CLI, `--replies 0` switches to deadline mode: `--timeout` becomes
the whole collection window. The command reads replies for the full window
and returns when it closes, so `--replies 0 --timeout 2s` gathers everything
that arrives in those two seconds. It's a fixed, predictable budget, and
`--reply-timeout` has no effect in this mode — it only bounds the gap
between replies when you gather by count.

```bash
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
```

With three providers up, all three quotes arrive within milliseconds, but the
command still holds open for the full two seconds before returning the set.
With one provider down, you get the two quotes that answered and wait out the
same two-second window. If no provider is subscribed at all, the command
returns right away with a no responders signal instead of waiting — though a
provider that's subscribed but slow to answer still costs the full `--timeout`.
Either way the wait is bounded; it never blocks forever.

A deadline changes the rule from waiting for every responder to waiting
only for whoever answers in time, which is the only safe assumption when
the responder set isn't fixed.

There's a third way to end a gather: a **sentinel**. With
`--wait-for-empty`, the command keeps collecting until a reply arrives with
an empty payload, which a responder sends to mark the end of the set. This
counts replies rather than watching a single deadline, so if the sentinel
never comes the `--reply-timeout` bounds the gap between replies and the
wait still ends.

## Delivery guarantees

Scatter-gather is [at-most-once](/learn/core-nats/publish-subscribe#at-most-once-delivery)
like everything else: a reply dropped in transit is just absent from the
gathered set, nothing redelivers it, and arrival order carries no meaning.
Treat the set as whatever answers happened to arrive, not a ranked list.
That's fine for a shipping quote — re-asking is cheap. When each reply must
survive a crash, that's [JetStream](/learn/jetstream), not a core gather.

## Pitfalls

**Taking only the first reply.** A plain `nats request` stops after one
reply, because its `--replies` flag defaults to `1`. Point it at three
providers and you get whichever carrier answered first; the other two
quotes are discarded and you never learn there were more. A plain
`request()` in a client library does the same. When you mean to gather,
use `--replies 0` from the CLI, reach for your client's gather helper
where it has one (nats.js `requestMany`, orbit.go `RequestMany`), or
subscribe to the inbox yourself and read in a loop.

<div class="nats-example"
     data-type="learn-core-nats-scatter-gather-first-reply-trap"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**No deadline, so you wait for replies that never come.** A hand-rolled
gather that reads with no deadline blocks forever if a provider is down —
the read for the missing reply never returns. Bound the wait: gather by
deadline (`--replies 0 --timeout 2s`) so a missing carrier just leaves its
quote out of the set.

**Reading the gathered set as ranked.** Arrival order isn't priority and a
short set isn't an error. Compare every reply on its merits (here, the
lowest `quote_cents`).

## Where you are

The Acme ORDERS world now talks in four shapes over one local
`nats-server`:

- `notifications` and `analytics` each receive their own copy of every
  `orders.created` message (publish-subscribe).
- Regional analytics spans `orders.us.created` and `orders.eu.created`
  with `orders.*.created`, and an audit service reads the whole hierarchy
  on `orders.>`.
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

The next page adds a third piece to every message, beside its subject
and payload: headers, a set of key/value metadata. You'll put a
request id and a trace id on the orders flow and read the status header
the server uses to signal no responders. Continue to [Message
headers](/learn/core-nats/headers).

## See also

- [Concepts → Request-reply](/concepts/request-reply) — the five-minute
  overview of the pattern this page extends.
- [Learn → Services](/learn/services) — when many responders become a
  managed service that aggregates results for you.
- [Reference](/reference/) — gather helper signatures per client library.
