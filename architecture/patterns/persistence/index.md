---
id: index
title: "Persistence patterns"
description: "Patterns built on streams and consumers: logs, durable queues, exactly-once, ordering, retry, replay"
---
# Persistence patterns

These patterns need JetStream. Each one is a stream and consumer configuration paired with a client behaviour.

## Pages

| Pattern | Use it to |
| --- | --- |
| [Event log](/architecture/patterns/persistence/event-log) | Keep an append-only, replayable record of what happened, with retention by age or size |
| [Durable work queue](/architecture/patterns/persistence/durable-work-queue) | Share tasks across workers so each is processed at least once and survives worker and server restarts |
| [Exactly-once processing](/architecture/patterns/persistence/exactly-once-processing) | Combine publish deduplication, double acknowledgment, and idempotent handlers |
| [Ordered processing per key](/architecture/patterns/persistence/ordered-processing) | Keep per-entity order without partitions: subject design, subject-mapping partitions, and single-reader consumers |
| [Retry and dead letter](/architecture/patterns/persistence/retry-and-dead-letter) | Retry with backoff, cap deliveries, and route poison messages somewhere a person can see them |
| [Replay and reprocessing](/architecture/patterns/persistence/replay-and-reprocessing) | Rebuild state or backfill a new consumer from history without disturbing live traffic |
| [Aggregation with sources and mirrors](/architecture/patterns/persistence/aggregation-with-sources) | Combine many streams into one, or copy one elsewhere, without changing publishers |

