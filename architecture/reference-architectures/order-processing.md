---
id: order-processing
title: "Event-driven order processing"
description: "The Acme ORDERS platform from the Learn deep dives, designed for production: event log, work queues, exactly-once billing, replay"
tags: [jetstream, core-nats]
---

# Event-driven order processing

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

Acme takes orders through a web front end and processes them through
billing, shipping, and audit services. One stream holds every order event.
Billing and shipping each read it through their own durable pull consumer.
Audit reads it with an ordered consumer. Everything runs on a single
three-server cluster in one account per environment.

## Requirements

_Placeholder numbers, to be replaced with the canonical scenario figures._

- Peak of 5,000 orders per minute, each producing three to five events.
- Every event kept for 30 days; billing must never miss or double-charge.
- Shipping work shared by a pool of workers that can be scaled during peaks.
- Audit must be able to replay any day's events in order.
- One region. Two environments, staging and production.

## Topology

A [single cluster](/architecture/topologies/single-cluster): `east`, three
servers, JetStream on all three.

## Accounts and security

One account per environment, `ACME` in each cluster, so staging and
production share nothing. One user per service, with publish permission on
the subjects it emits and subscribe permission on its consumer's delivery
subjects. Config-file authentication is enough for a single team; see
[Which auth model?](/architecture/decisions/auth-model).

## Subjects

```text
orders.created
orders.paid
orders.shipped
orders.cancelled
```

The second token is the event. A third token for the region is added when
the platform goes multi-region, without changing the stream.

## Streams and consumers

| Asset | Config | Why |
| --- | --- | --- |
| Stream `ORDERS` | Subjects `orders.>`, limits retention, `MaxAge` 30d, R3, file storage, duplicate window 2m | One log for all order events. Limits retention because three readers need every event. |
| Consumer `billing` | Durable pull, filter `orders.created`, explicit ack, `AckWait` 30s, `MaxDeliver` 5 | One reader role, one consumer. Ack after the charge is recorded. |
| Consumer `shipping` | Durable pull, filter `orders.paid`, explicit ack, `MaxAckPending` 500 | Shared by the whole worker pool. |
| Audit reader | Ordered consumer, start at a time | Single reader, in order, no acks. Disposable. |

Publishers set `Nats-Msg-Id` to the order event's ID so a retried publish
doesn't store a duplicate.

## Sizing

_Placeholder: storage from event size × rate × 30 days × R3; throughput
headroom; worker count for shipping from task duration and peak rate._

## Failure modes

| Failure | Effect | Response |
| --- | --- | --- |
| One server down | Leader elections; a few seconds of pause | None needed. |
| Billing worker crashes mid-charge | Event redelivered after 30s | Billing is idempotent on the event ID. |
| An order event can't be processed | Redelivered 5 times, then the max-deliveries advisory | Copied to `ORDERS_DLQ` and alerted. |
| Shipping falls behind at peak | Pending count grows | Scale the worker pool. |
| Bad deploy processed a day wrongly | Audit replays from that day | Ordered consumer from the timestamp; billing reprocesses through a new consumer. |

## Operations

Monitor pending and redelivered per consumer, stream bytes against
`MaxBytes`, and the max-deliveries advisory. Back up `ORDERS` nightly with a
snapshot. Upgrade one server at a time.

## Rules applied

[CONS-1](/architecture/rules/consumers#cons-1),
[CONS-2](/architecture/rules/consumers#cons-2),
[CONS-3](/architecture/rules/consumers#cons-3),
[CONS-4](/architecture/rules/consumers#cons-4),
[CONS-5](/architecture/rules/consumers#cons-5).

## Related

- [Durable work queue](/architecture/patterns/persistence/durable-work-queue),
  [Event log](/architecture/patterns/persistence/event-log),
  [Exactly-once processing](/architecture/patterns/persistence/exactly-once-processing).
- Learn: the [JetStream deep dive](/learn/jetstream/) builds this same
  scenario step by step.
