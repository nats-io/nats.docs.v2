---
id: index
title: "Patterns"
description: "Reusable designs for messaging, persistence, state, and integration, each with when to use it and when not to"
---
# Patterns

A pattern is a design you can apply as-is. Each page states the problem, the NATS solution, the config that implements it, and the failure modes to plan for. Find yours in the catalog below by the problem you have.

## Catalog

### Messaging

| Pattern | Use it to |
| --- | --- |
| [Request-reply services](/architecture/patterns/messaging/request-reply-services) | Expose a service as a subject, scale it with a queue group, and find it without a discovery system |
| [Load balancing with queue groups](/architecture/patterns/messaging/queue-groups) | Spread a subject's traffic across workers with no broker-side configuration |
| [Fan-out](/architecture/patterns/messaging/fan-out) | Deliver one message to many subscribers with interest-based routing and wildcards |
| [Scatter-gather](/architecture/patterns/messaging/scatter-gather) | Ask many responders one question and collect the answers within a deadline |
| [Subject hierarchies](/architecture/patterns/messaging/subject-hierarchies) | Design a subject tree that routes, filters, and authorizes at once |

### Persistence

| Pattern | Use it to |
| --- | --- |
| [Event log](/architecture/patterns/persistence/event-log) | Keep an append-only, replayable record of what happened, with retention by age or size |
| [Durable work queue](/architecture/patterns/persistence/durable-work-queue) | Share tasks across workers so each is processed at least once and survives worker and server restarts |
| [Exactly-once processing](/architecture/patterns/persistence/exactly-once-processing) | Combine publish deduplication, double acknowledgment, and idempotent handlers |
| [Ordered processing per key](/architecture/patterns/persistence/ordered-processing) | Keep per-entity order without partitions: subject design, subject-mapping partitions, and single-reader consumers |
| [Retry and dead letter](/architecture/patterns/persistence/retry-and-dead-letter) | Retry with backoff, cap deliveries, and route poison messages somewhere a person can see them |
| [Replay and reprocessing](/architecture/patterns/persistence/replay-and-reprocessing) | Rebuild state or backfill a new consumer from history without disturbing live traffic |
| [Aggregation with sources and mirrors](/architecture/patterns/persistence/aggregation-with-sources) | Combine many streams into one, or copy one elsewhere, without changing publishers |

### State

| Pattern | Use it to |
| --- | --- |
| [Configuration and feature flags](/architecture/patterns/state/configuration-distribution) | Push configuration to every instance with a watch instead of polling |
| [Locks and leader election](/architecture/patterns/state/leader-election) | Elect a leader or hold a lock with create, compare-and-set, and TTL |
| [Workflow state](/architecture/patterns/state/workflow-state) | Track a multi-step process in Key-Value while the steps run over streams |
| [Materialized views](/architecture/patterns/state/materialized-views) | Keep a query-ready projection of a stream in Key-Value |

### Integration

| Pattern | Use it to |
| --- | --- |
| [Large payloads](/architecture/patterns/integration/large-payloads) | Move data above the payload limit through Object Store and pass a reference in the message |
| [Versioning with subject mapping](/architecture/patterns/integration/subject-mapping-and-versioning) | Evolve subjects and split traffic on the server without redeploying clients |
| [Sharing across accounts](/architecture/patterns/integration/cross-account-sharing) | Expose a service or a stream to another account with imports and exports |
| [Bridging external systems](/architecture/patterns/integration/external-bridges) | Connect HTTP, MQTT, Kafka, and databases to NATS with connectors, gateways, and the MQTT listener |

