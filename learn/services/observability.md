---
id: observability
title: "Observability"
sidebar_position: 5
description: Read the per-endpoint stats the framework keeps for you, and signal service errors that those stats record
---

# Observability

Your `OrderInventory` service answers on `orders.inventory.check`, and the
[discovery page](/learn/services/discovery) lets you enumerate it and target a
single instance by ID. So far you can find the service, and this page shows you
how it's doing.

The framework keeps a running tally for every endpoint (how many requests it's
handled, how many failed, how long each took) without a single line of metrics
code on your part. This page reads that tally, then shows the one way a handler
influences it: by returning a service error.

There are two new ideas here: **per-endpoint stats** and the **service error**
that the stats record.

## Per-endpoint stats the framework keeps for you

Every endpoint you add carries a counter set that the framework updates on each
request, under the service lock, before your handler ever sees the next one. You
don't register the counter set, increment it, or flush it yourself. It's part of
what `AddEndpoint` gives you.

Five fields matter for day-to-day work:

- **`num_requests`**: total requests this endpoint has handled
- **`num_errors`**: how many of those ended in a service error
- **`last_error`**: the description string of the most recent error
- **`processing_time`**: total handler time across all requests, in nanoseconds
- **`average_processing_time`**: `processing_time` divided by `num_requests`,
  in nanoseconds

You read them through the third discovery verb, **STATS**, on the `$SRV`
prefix. The same three address levels from the discovery page apply:
`$SRV.STATS` hits every service, `$SRV.STATS.OrderInventory` hits every instance
of one service, and `$SRV.STATS.OrderInventory.<id>` hits one instance.

Send a few requests to `orders.inventory.check`, then read the accumulated
stats back:

<div class="nats-example" data-type="learn-services-observability-serviceStats" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The response is one `stats_response` per instance, and each lists its endpoints
with the five counters above. After three successful `check` requests you'd
see `num_requests: 3`, `num_errors: 0`, and a non-zero `average_processing_time`
that reflects how long your handler ran.

The CLI has a shortcut that does the STATS query and formats the table for you:

```bash
nats service stats OrderInventory
```

```
╭──────────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                  OrderInventory Service Statistics                                   │
├────────────────────────┬──────────┬──────────┬─────────────┬────────┬─────────────────┬──────────────┤
│ ID                     │ Endpoint │ Requests │ Queue Group │ Errors │ Processing Time │ Average Time │
├────────────────────────┼──────────┼──────────┼─────────────┼────────┼─────────────────┼──────────────┤
│ IcpremQQGTYS0fK1iyfQ86 │ check    │ 3        │ q           │ 0      │ 1.236ms         │ 412µs        │
├────────────────────────┼──────────┼──────────┼─────────────┼────────┼─────────────────┼──────────────┤
│                        │          │ 3        │             │ 0      │ 1.236ms         │ 412µs        │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

The counters tracked here are per endpoint, not per service: a service with
`check` and a second endpoint keeps a separate row for each. That's the level
where you reason about load, telling you which handler is busy and which one is
slow.

[Reference](/reference/services/stats-response) documents the full set of
fields in the STATS response, including the per-endpoint `queue_group` and an
optional custom `data` blob. We only need the five counters here.

## A service error increments the error count

Of those five fields, four move on their own. Only `num_errors` and
`last_error` depend on you: they move when a handler returns a service error
instead of a normal response.

A service error is a response that carries two headers: `Nats-Service-Error`
holds a human-readable description, and `Nats-Service-Error-Code` holds a short
code string like `"400"`. You don't set those headers by hand. The handler
calls `req.Error(code, description, data)`, and the framework attaches both
headers, sends the response, and bumps `num_errors` and `last_error` for that
endpoint in the same step.

Here's the `check` handler returning a service error when the order total
isn't a positive amount, followed by the stats showing the error recorded:

<div class="nats-example" data-type="learn-services-observability-serviceError" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Watch the stats accumulate as requests flow, and the one errored request bump
the error counter while the rest tick the request counter:

<div class="nats-flow" data-scenario="serviceStatsAnimated" data-width="600" data-height="350"></div>

A service error is still a delivered reply, not a transport failure. The request
reached the handler, the handler chose to answer with an error, and that answer
came back over the same reply subject as any success. This is different from
**no-responders**, where nothing is listening at all. That case belongs to
request-reply itself and is covered in
[request-reply](/learn/core-nats/request-reply).

When to return a service error is your call. Bad input is one reason to call
`req.Error`, a downstream dependency that's unavailable is another, and a
business rule that rejects the order is a third; calling `req.Error` means the
failure is both reported to the caller and counted in the stats. A handler that
responds normally instead of reporting the failure leaves `num_errors` at zero
and hides the problem.

## Pitfalls

Two traps catch people the first time they rely on service stats. Both have the
same cause: a service error looks like a normal reply unless you check for it.

**A service error arrives as headers, not as a failed call.** The framework
sends the error response over the reply subject like any success, so the
caller's `Request` returns a message with no transport error. If the caller
only checks "did I get a reply," every service error reads as a success, and
the `num_errors` you can see in stats is invisible to the code making the
request. Do check `Nats-Service-Error-Code` on every response; do not treat a
returned message as proof the request succeeded.

Handling it takes one header read on the reply. The CLI shows the headers
directly; in code you read `Nats-Service-Error-Code` and branch on whether
it's set. Send a request the handler rejects, inspect the headers on the reply,
and confirm the error in the stats:

<div class="nats-example" data-type="learn-services-observability-serviceError" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**Stats are per instance, and `Reset()` zeroes them.** Each running instance
keeps its own counters, so `$SRV.STATS.OrderInventory` returns one
`stats_response` per instance and you must sum `num_requests` across IDs
yourself to get a service-wide total; the server keeps no aggregate for you.
And a call to `Reset()` on an instance sets its counters back to zero
and resets the `started` timestamp, so a dashboard that assumes
monotonically increasing counters will see a drop. Do aggregate across IDs in
the reader; do not assume the numbers only ever grow.

For richer observability, a custom `StatsHandler` can attach your own
`data` blob to each endpoint's stats, and the server can emit
service-latency advisories that measure round-trip time from outside the
service. Both are separate mechanisms layered on top of the counters this
page reads; their schemas live in [Reference](/reference/services/).

## Where you are

`OrderInventory` now reports on itself. You can read its per-endpoint stats
through `$SRV.STATS` or the `nats service stats` shortcut, you can see
`num_requests` and `average_processing_time` move as traffic flows, and you can
make a handler return a service error so `num_errors` and `last_error` record
the failure. You also know to read `Nats-Service-Error-Code` on the caller side
so an error never passes for a success.

## What's next

One service answering one request at a time is a single point of contention.
The last mechanism is **scaling**: run more instances of `OrderInventory` and
let the default queue group `"q"` spread requests across them, with no
coordinator and no config change.

Continue to [Scaling](/learn/services/scaling).

## See also

- [Discovery](/learn/services/discovery) — the PING and INFO verbs that sit
  alongside STATS on the `$SRV` prefix.
- [Monitoring](/learn/monitoring) — exporting server and service metrics to
  Prometheus and building dashboards on top of them.
- [Reference](/reference/services/) — the full STATS response schema and every
  field it carries.
